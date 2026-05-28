import { assessBioRisk } from "@/lib/bio-ai/engine";
import type { AuditEvent, BioAiAssessment, BioAiInput, BioAiSignal, CompanyProfile, DocumentMetadata } from "@/lib/bio-ai/types";
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
  createdAt?: string;
};

export type SavedAssessmentDetail = SavedAssessmentSummary & {
  input: BioAiInput;
  output: BioAiAssessment;
  signals: BioAiSignal[];
  auditEvents: AuditEvent[];
  humanReviewStatus: string;
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
};

export type AuthSummary = {
  configured: boolean;
  signedIn: boolean;
  userEmail?: string;
  organizationId?: string;
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

    const { data } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
    return {
      configured: true,
      signedIn: true,
      userEmail: user.email ?? undefined,
      organizationId: data?.organization_id ?? undefined,
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
    .select("id,input_snapshot,score,level,confidence,human_review_required,created_at")
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
    .select("id,input_snapshot,output_snapshot,score,level,confidence,human_review_required,human_review_status,created_at")
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
    createdAt: data.created_at,
    input,
    output,
    signals: (signals ?? []).map((signal) => signal.payload as BioAiSignal),
    auditEvents
  };
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
    await supabase.from("document_recommendations").insert(rows);
    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "document_recommendation_generated",
      summary: `Generated draft document recommendations for ${document.title}.`,
      payload: { documentId: document.id, count: rows.length }
    });
  }

  return { ok: true, gapRecommendations, updateRecommendations };
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

    const { data } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
    if (!data?.organization_id) return null;

    return { userId: user.id, organizationId: data.organization_id };
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
    humanReviewRequired: assessment.humanReviewRequired
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
