import { assessBioRisk } from "@/lib/bio-ai/engine";
import type { AuditEvent, BioAiAssessment, BioAiInput, CompanyProfile, DocumentMetadata } from "@/lib/bio-ai/types";
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

  if (error || !data) return demoDocuments;

  return data.map((document) => ({
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
    gaps: document.gaps ?? []
  }));
}

export async function getDocument(documentId: string): Promise<DocumentMetadata> {
  const documents = await listDocuments();
  return documents.find((document) => document.id === documentId) ?? documents[0] ?? demoDocuments[0];
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

  return data.map((event) => ({
    id: event.id,
    organizationId: event.organization_id,
    actorId: event.actor_id,
    eventType: event.event_type,
    summary: event.summary,
    payload: event.payload,
    createdAt: event.created_at
  }));
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
