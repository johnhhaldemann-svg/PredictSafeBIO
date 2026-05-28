import { assessBioRisk } from "@/lib/bio-ai/engine";
import { randomUUID } from "node:crypto";
import type {
  AuditEvent,
  BioAiAssessment,
  BioAiInput,
  BioAiSignal,
  CompanyProfile,
  DocumentMetadata,
  HumanReviewStatus
} from "@/lib/bio-ai/types";
import { demoAuditEvents, demoCompanyProfile, demoDocuments } from "@/lib/demo-data";
import { generateDocumentGapRecommendations, generateDocumentUpdateRecommendations } from "@/lib/documents/recommendations";
import { createSupabaseServerClient } from "./server";
import { isSupabaseConfigured } from "./env";

export type SavedAssessmentSummary = {
  id: string;
  workflow: string;
  area: string;
  score: number;
  level: BioAiAssessment["level"];
  confidence: BioAiAssessment["confidence"];
  humanReviewRequired: boolean;
  humanReviewStatus: HumanReviewStatus | string;
  reviewedAt?: string | null;
  createdAt?: string;
};

export type SavedAssessmentDetail = SavedAssessmentSummary & {
  input: BioAiInput;
  output: BioAiAssessment;
  signals: BioAiSignal[];
  auditEvents: AuditEvent[];
  humanReviewStatus: HumanReviewStatus | string;
  reviewerNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

export type DocumentRecommendationRecord = {
  id: string;
  recommendationType: "gap" | "draft_update";
  title: string;
  label: string;
  humanReviewRequired: boolean;
  payload: Record<string, unknown>;
  createdBy?: string | null;
  createdAt?: string;
};

export type DocumentRecommendationRun = {
  runKey: string;
  createdAt?: string;
  auditEvent?: AuditEvent;
  recommendations: DocumentRecommendationRecord[];
};

export type SaveDocumentMetadataInput = {
  title: string;
  documentType: DocumentMetadata["documentType"];
  status: DocumentMetadata["status"];
  ownerRole: DocumentMetadata["ownerRole"];
  area?: string | null;
  relatedProcess?: string | null;
  revision?: string | null;
  effectiveDate?: string | null;
  nextReviewDate?: string | null;
  gaps?: string[];
  file?: File | null;
};

type ProfileContext = {
  userId: string;
  organizationId: string;
  role: string;
};

export type AuthSummary = {
  configured: boolean;
  signedIn: boolean;
  userEmail?: string;
  organizationId?: string;
  role?: string;
  needsOnboarding: boolean;
};

export async function getAuthSummary(): Promise<AuthSummary> {
  if (!isSupabaseConfigured()) {
    return { configured: false, signedIn: false, needsOnboarding: false };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { configured: true, signedIn: false, needsOnboarding: false };
    }

    const { data } = await supabase.from("profiles").select("organization_id,role").eq("id", user.id).maybeSingle();
    return {
      configured: true,
      signedIn: true,
      userEmail: user.email ?? undefined,
      organizationId: data?.organization_id ?? undefined,
      role: data?.role ?? undefined,
      needsOnboarding: !data?.organization_id
    };
  } catch {
    return { configured: false, signedIn: false, needsOnboarding: false };
  }
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const context = await getProfileContext();
  if (!context) return demoCompanyProfile;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return demoCompanyProfile;

  return {
    id: data.id,
    organizationId: data.organization_id,
    companyName: data.company_name,
    primarySite: data.primary_site,
    operatingAreas: data.operating_areas ?? [],
    programs: data.programs ?? [],
    qualitySystemScope: data.quality_system_scope ?? [],
    biosafetyLevels: data.biosafety_levels ?? [],
    reviewOwnerRoles: data.review_owner_roles ?? [],
    documentFamilies: data.document_families ?? [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function listAssessments(): Promise<SavedAssessmentSummary[]> {
  const context = await getProfileContext();
  if (!context) {
    return [
      demoAssessmentSummary("demo-critical-contamination", {
        siteName: "Demo Biotech Site",
        area: "QC Microbiology Lab",
        workflow: "Sterility assay review",
        batchOrLot: "LOT-0001",
        controlEffectiveness: "partial",
        contaminationSuspected: true,
        productQualityImpactPotential: true,
        gxpImpact: true,
        signals: [{ type: "contamination_event", label: "Unexpected microbial growth", severity: "high" }]
      }),
      demoAssessmentSummary("demo-training-gap", {
        siteName: "Demo Biotech Site",
        area: "Cell Therapy Suite",
        workflow: "Media change",
        controlEffectiveness: "effective",
        missingRequiredTraining: true,
        signals: [{ type: "training_gap", label: "Expired aseptic technique training", severity: "low" }]
      })
    ];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assessments")
    .select("id,input_snapshot,score,level,confidence,human_review_required,human_review_status,reviewed_at,created_at")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((row) => {
    const input = row.input_snapshot as BioAiInput;
    return {
      id: row.id,
      workflow: input.workflow ?? "Untitled workflow",
      area: input.area ?? "Unassigned area",
      score: row.score,
      level: row.level,
      confidence: row.confidence,
      humanReviewRequired: row.human_review_required,
      humanReviewStatus: row.human_review_status,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at
    };
  });
}

export async function getAssessmentDetail(assessmentId: string): Promise<SavedAssessmentDetail | null> {
  const context = await getProfileContext();
  if (!context) {
    return demoAssessmentDetail(assessmentId);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assessments")
    .select("id,input_snapshot,output_snapshot,score,level,confidence,human_review_required,human_review_status,reviewer_notes,reviewed_by,reviewed_at,created_at")
    .eq("organization_id", context.organizationId)
    .eq("id", assessmentId)
    .maybeSingle();

  if (error || !data) return null;

  const { data: signals } = await supabase
    .from("assessment_signals")
    .select("payload")
    .eq("organization_id", context.organizationId)
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });

  const { data: auditRows } = await supabase
    .from("audit_events")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  const input = data.input_snapshot as BioAiInput;
  const output = data.output_snapshot as BioAiAssessment;
  const auditEvents = (auditRows ?? [])
    .filter((event) => {
      const payload = event.payload as Record<string, unknown> | null;
      return payload?.assessmentId === assessmentId;
    })
    .map(mapAuditEvent);

  return {
    id: data.id,
    workflow: input.workflow ?? "Untitled workflow",
    area: input.area ?? "Unassigned area",
    score: data.score,
    level: data.level,
    confidence: data.confidence,
    humanReviewRequired: data.human_review_required,
    humanReviewStatus: data.human_review_status,
    reviewerNotes: data.reviewer_notes,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    createdAt: data.created_at,
    input,
    output,
    signals: (signals ?? []).map((signal) => signal.payload as BioAiSignal),
    auditEvents
  };
}

export async function updateAssessmentReview(
  assessmentId: string,
  status: HumanReviewStatus,
  reviewerNotes: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in and finish onboarding before updating review status." };
  }

  const supabase = await createSupabaseServerClient();
  const reviewedAt = new Date().toISOString();
  const { data: assessment, error } = await supabase
    .from("assessments")
    .update({
      human_review_status: status,
      reviewer_notes: reviewerNotes || null,
      reviewed_by: context.userId,
      reviewed_at: reviewedAt
    })
    .eq("organization_id", context.organizationId)
    .eq("id", assessmentId)
    .select("id,score,level")
    .single();

  if (error || !assessment) {
    return { ok: false, message: error?.message ?? "Assessment review status could not be updated." };
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "human_review_status_changed",
    summary: `Assessment review status changed to ${status}.`,
    payload: { assessmentId, status, reviewerNotes, reviewedAt, level: assessment.level, score: assessment.score }
  });

  return { ok: true };
}

export async function listDocuments(): Promise<DocumentMetadata[]> {
  const context = await getProfileContext();
  if (!context) return demoDocuments;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return data.map(mapDocument);
}

export async function getDocument(documentId: string): Promise<DocumentMetadata | null> {
  const context = await getProfileContext();
  if (!context) {
    return demoDocuments.find((document) => document.id === documentId) ?? demoDocuments[0] ?? null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("id", documentId)
    .maybeSingle();

  if (error || !data) return null;
  return mapDocument(data);
}

export async function getDocumentRecommendationHistory(documentId: string): Promise<DocumentRecommendationRun[]> {
  const context = await getProfileContext();
  if (!context) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_recommendations")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const { data: auditRows } = await supabase
    .from("audit_events")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("event_type", "document_recommendation_generated")
    .order("created_at", { ascending: false })
    .limit(100);

  const audits = (auditRows ?? []).map(mapAuditEvent).filter((event) => {
    const payload = event.payload as Record<string, unknown> | undefined;
    return payload?.documentId === documentId;
  });

  const grouped = new Map<string, DocumentRecommendationRecord[]>();
  for (const row of data) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const runKey = typeof payload.runId === "string" ? payload.runId : row.created_at ?? row.id;
    const record: DocumentRecommendationRecord = {
      id: row.id,
      recommendationType: row.recommendation_type,
      title: row.title,
      label: row.label,
      humanReviewRequired: row.human_review_required,
      payload,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
    grouped.set(runKey, [...(grouped.get(runKey) ?? []), record]);
  }

  return [...grouped.entries()].map(([runKey, recommendations]) => {
    const createdAt = recommendations[0]?.createdAt;
    const auditEvent =
      audits.find((event) => (event.payload as Record<string, unknown> | undefined)?.runId === runKey) ??
      audits.find((event) => event.createdAt === createdAt);
    return { runKey, createdAt, auditEvent, recommendations };
  });
}

export async function listAuditEvents(): Promise<AuditEvent[]> {
  const context = await getProfileContext();
  if (!context) return demoAuditEvents;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return demoAuditEvents;

  return data.map(mapAuditEvent);
}

export async function saveAssessment(input: BioAiInput) {
  const context = await getProfileContext();
  if (!context) {
    return {
      ok: false,
      status: 401,
      message: isSupabaseConfigured()
        ? "Sign in and create a profile with an organization before saving assessments."
        : "Supabase environment variables are not configured; assessment can run locally but cannot be saved yet."
    };
  }

  const supabase = await createSupabaseServerClient();
  const assessment = assessBioRisk(input);
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      organization_id: context.organizationId,
      created_by: context.userId,
      input_snapshot: input,
      output_snapshot: assessment,
      score: assessment.score,
      level: assessment.level,
      confidence: assessment.confidence,
      human_review_required: assessment.humanReviewRequired,
      human_review_status: assessment.humanReviewRequired ? "draft_human_review_required" : "routine_monitoring"
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, message: error?.message ?? "Could not save assessment." };
  }

  const signals = input.signals ?? [];
  if (signals.length > 0) {
    await supabase.from("assessment_signals").insert(
      signals.map((signal) => ({
        organization_id: context.organizationId,
        assessment_id: data.id,
        signal_type: signal.type,
        label: signal.label,
        payload: signal
      }))
    );
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "assessment_saved",
    summary: `Assessment saved with ${assessment.level} risk and score ${assessment.score}.`,
    payload: { assessmentId: data.id, level: assessment.level, score: assessment.score }
  });

  return { ok: true, status: 201, id: data.id, assessment };
}

export async function persistDocumentRecommendations(document: DocumentMetadata) {
  const context = await getProfileContext();
  const gapRecommendations = generateDocumentGapRecommendations(document);
  const updateRecommendations = generateDocumentUpdateRecommendations(document);

  if (!context || !document.id) {
    return { ok: false, gapRecommendations, updateRecommendations };
  }

  const supabase = await createSupabaseServerClient();
  const rows = [
    ...gapRecommendations.map((recommendation) => ({
      organization_id: context.organizationId,
      document_id: document.id,
      recommendation_type: "gap",
      title: recommendation.title,
      payload: recommendation,
      created_by: context.userId
    })),
    ...updateRecommendations.map((recommendation) => ({
      organization_id: context.organizationId,
      document_id: document.id,
      recommendation_type: "draft_update",
      title: recommendation.title,
      payload: recommendation,
      created_by: context.userId
    }))
  ];

  if (rows.length > 0) {
    const runId = randomUUID();
    const generatedAt = new Date().toISOString();
    await supabase.from("document_recommendations").insert(
      rows.map((row) => ({
        ...row,
        payload: { ...(row.payload as Record<string, unknown>), runId, generatedAt }
      }))
    );
    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "document_recommendation_generated",
      summary: `Generated draft document recommendations for ${document.title}.`,
      payload: { documentId: document.id, count: rows.length, runId, generatedAt }
    });
  }

  return { ok: true, gapRecommendations, updateRecommendations };
}

export async function seedDemoWorkspace(): Promise<
  { ok: true; assessmentId: string; documentId: string; seedLabel: string } | { ok: false; message: string }
> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in and finish onboarding before seeding demo records." };
  }
  if (context.role !== "owner") {
    return { ok: false, message: "Only organization owners can seed demo records." };
  }

  const supabase = await createSupabaseServerClient();
  const seedRunId = randomUUID();
  const seedLabel = `Demo seed ${seedRunId.slice(0, 8)}`;
  const input: BioAiInput = {
    siteName: "PredictSafeBIO Demo Biotech",
    area: "QC Microbiology Lab",
    workflow: `${seedLabel} sterility assay review`,
    batchOrLot: seedLabel.toUpperCase().replace(/\s+/g, "-"),
    controlEffectiveness: "partial",
    contaminationSuspected: true,
    productQualityImpactPotential: true,
    gxpImpact: true,
    signals: [{ type: "contamination_event", label: "Seeded unexpected microbial growth", severity: "high" }]
  };
  const assessment = assessBioRisk(input);
  const { data: assessmentRow, error: assessmentError } = await supabase
    .from("assessments")
    .insert({
      organization_id: context.organizationId,
      created_by: context.userId,
      input_snapshot: input,
      output_snapshot: assessment,
      score: assessment.score,
      level: assessment.level,
      confidence: assessment.confidence,
      human_review_required: assessment.humanReviewRequired,
      human_review_status: "draft_human_review_required"
    })
    .select("id")
    .single();

  if (assessmentError || !assessmentRow) {
    return { ok: false, message: assessmentError?.message ?? "Could not seed demo assessment." };
  }

  await supabase.from("assessment_signals").insert(
    (input.signals ?? []).map((signal) => ({
      organization_id: context.organizationId,
      assessment_id: assessmentRow.id,
      signal_type: signal.type,
      label: signal.label,
      payload: signal
    }))
  );

  const documentInput: SaveDocumentMetadataInput = {
    title: `${seedLabel} Sterility Assay Review SOP`,
    documentType: "sop",
    status: "in_review",
    ownerRole: "qa",
    area: "QC Microbiology Lab",
    relatedProcess: `${seedLabel} sterility assay review`,
    revision: "0.1",
    gaps: [`${seedLabel} batch impact wording needs owner review`, `${seedLabel} QA timing is not explicit`]
  };
  const documentResult = await saveDocumentMetadata(documentInput);
  if (!documentResult.ok || !documentResult.document?.id) {
    return { ok: false, message: documentResult.message ?? "Could not seed demo document." };
  }
  await persistDocumentRecommendations(documentResult.document);

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "demo_seed_created",
    summary: `${seedLabel}: demo assessment, document metadata, draft recommendations, and audit trail were seeded.`,
    payload: { assessmentId: assessmentRow.id, documentId: documentResult.document.id, seedRunId, seedLabel }
  });

  return { ok: true, assessmentId: assessmentRow.id, documentId: documentResult.document.id, seedLabel };
}

export async function saveDocumentMetadata(input: SaveDocumentMetadataInput) {
  const context = await getProfileContext();
  if (!context) {
    return {
      ok: false,
      status: 401,
      message: isSupabaseConfigured()
        ? "Sign in and finish onboarding before saving document metadata."
        : "Supabase environment variables are not configured; document metadata cannot be saved yet."
    };
  }

  const supabase = await createSupabaseServerClient();
  const uploadFile = input.file && input.file.size > 0 ? input.file : null;
  const { data, error } = await supabase
    .from("document_metadata")
    .insert({
      organization_id: context.organizationId,
      title: input.title,
      document_type: input.documentType,
      status: input.status,
      owner_role: input.ownerRole,
      area: input.area || null,
      related_process: input.relatedProcess || null,
      revision: input.revision || null,
      effective_date: input.effectiveDate || null,
      next_review_date: input.nextReviewDate || null,
      gaps: input.gaps ?? [],
      created_by: context.userId
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, message: error?.message ?? "Could not save document metadata." };
  }

  let uploadWarning: string | undefined;
  let storageBucket: string | null = null;
  let storagePath: string | null = null;

  if (uploadFile) {
    storageBucket = "biotech-documents";
    const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
    storagePath = `${context.organizationId}/${data.id}/${safeName}`;
    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, buffer, {
      contentType: uploadFile.type || "application/octet-stream",
      upsert: false
    });

    if (uploadError) {
      uploadWarning = `Metadata saved, but file upload failed: ${uploadError.message}`;
      storageBucket = null;
      storagePath = null;
    } else {
      await supabase
        .from("document_metadata")
        .update({ storage_bucket: storageBucket, storage_path: storagePath, updated_at: new Date().toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("id", data.id);
    }
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "document_metadata_created",
    summary: `Document metadata created for ${input.title}.`,
    payload: { documentId: data.id, title: input.title, documentType: input.documentType, storageBucket, storagePath }
  });

  return {
    ok: true,
    status: 201,
    document: mapDocument({ ...data, storage_bucket: storageBucket, storage_path: storagePath }),
    message: uploadWarning
  };
}

async function getProfileContext(): Promise<ProfileContext | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase.from("profiles").select("organization_id,role").eq("id", user.id).maybeSingle();
    if (!data?.organization_id) return null;

    return { userId: user.id, organizationId: data.organization_id, role: data.role ?? "member" };
  } catch {
    return null;
  }
}

function demoAssessmentSummary(id: string, input: BioAiInput): SavedAssessmentSummary {
  const assessment = assessBioRisk(input);
  return {
    id,
    workflow: input.workflow ?? "Untitled workflow",
    area: input.area ?? "Unassigned area",
    score: assessment.score,
    level: assessment.level,
    confidence: assessment.confidence,
    humanReviewRequired: assessment.humanReviewRequired,
    humanReviewStatus: assessment.humanReviewRequired ? "draft_human_review_required" : "reviewed_monitoring",
    reviewedAt: null
  };
}

function demoAssessmentDetail(id: string): SavedAssessmentDetail | null {
  const demoInputs: Record<string, BioAiInput> = {
    "demo-critical-contamination": {
      siteName: "Demo Biotech Site",
      area: "QC Microbiology Lab",
      workflow: "Sterility assay review",
      batchOrLot: "LOT-0001",
      controlEffectiveness: "partial",
      contaminationSuspected: true,
      productQualityImpactPotential: true,
      gxpImpact: true,
      signals: [{ type: "contamination_event", label: "Unexpected microbial growth", severity: "high" }]
    },
    "demo-training-gap": {
      siteName: "Demo Biotech Site",
      area: "Cell Therapy Suite",
      workflow: "Media change",
      controlEffectiveness: "effective",
      missingRequiredTraining: true,
      signals: [{ type: "training_gap", label: "Expired aseptic technique training", severity: "low" }]
    }
  };

  const input = demoInputs[id];
  if (!input) return null;

  const output = assessBioRisk(input);
  return {
    ...demoAssessmentSummary(id, input),
    input,
    output,
    signals: input.signals ?? [],
    auditEvents: demoAuditEvents,
    humanReviewStatus: output.humanReviewRequired ? "draft_human_review_required" : "routine_monitoring"
  };
}

function mapDocument(document: Record<string, any>): DocumentMetadata {
  return {
    id: document.id,
    organizationId: document.organization_id,
    title: document.title,
    documentType: document.document_type,
    status: document.status,
    ownerRole: document.owner_role,
    area: document.area,
    relatedProcess: document.related_process,
    revision: document.revision,
    effectiveDate: document.effective_date,
    nextReviewDate: document.next_review_date,
    lastReviewedAt: document.last_reviewed_at,
    storageBucket: document.storage_bucket,
    storagePath: document.storage_path,
    gaps: document.gaps ?? []
  };
}

function mapAuditEvent(event: Record<string, any>): AuditEvent {
  return {
    id: event.id,
    organizationId: event.organization_id,
    actorId: event.actor_id,
    eventType: event.event_type,
    summary: event.summary,
    payload: event.payload,
    createdAt: event.created_at
  };
}
