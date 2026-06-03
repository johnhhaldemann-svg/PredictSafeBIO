/**
 * Assessment domain service.
 * Extracted from data.ts — all assessment read/write operations live here.
 */

import { assessBioRisk } from "@/lib/bio-ai/engine";
import { withAuditTrace } from "@/lib/audit-trace";
import type {
  AuditEvent,
  BioAiAssessment,
  BioAiInput,
  BioAiSignal,
  HumanReviewStatus
} from "@/lib/bio-ai/types";
import { demoAuditEvents } from "@/lib/demo-data";
import { isSupabaseConfigured } from "./env";
import { createSupabaseServerClient } from "./server";
import { getProfileContext, mapAuditEvent } from "./data-helpers";
import { logAssessmentKnowledgeEntry } from "./knowledge-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  assignedReviewerId?: string | null;
  assignedReviewerName?: string | null;
  reviewDueDate?: string | null;
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

// ---------------------------------------------------------------------------
// Private demo helpers
// ---------------------------------------------------------------------------

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
    humanReviewStatus: assessment.humanReviewRequired
      ? "draft_human_review_required"
      : "reviewed_monitoring",
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
    humanReviewStatus: output.humanReviewRequired
      ? "draft_human_review_required"
      : "routine_monitoring"
  };
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

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
    .select(
      "id,input_snapshot,score,level,confidence,human_review_required,human_review_status,reviewed_at,created_at,assigned_reviewer_id,review_due_date,reviewer:profiles!assessments_assigned_reviewer_id_fkey(full_name)"
    )
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((row) => {
    const input = row.input_snapshot as BioAiInput;
    const reviewer = row.reviewer as { full_name?: string | null } | null;
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
      createdAt: row.created_at,
      assignedReviewerId: row.assigned_reviewer_id ?? null,
      assignedReviewerName: reviewer?.full_name ?? null,
      reviewDueDate: row.review_due_date ?? null
    };
  });
}

export async function getAssessmentDetail(
  assessmentId: string
): Promise<SavedAssessmentDetail | null> {
  const context = await getProfileContext();
  if (!context) return demoAssessmentDetail(assessmentId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assessments")
    .select(
      "id,input_snapshot,output_snapshot,score,level,confidence,human_review_required,human_review_status,reviewer_notes,reviewed_by,reviewed_at,created_at,assigned_reviewer_id,review_due_date,reviewer:profiles!assessments_assigned_reviewer_id_fkey(full_name)"
    )
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

  const reviewer = data.reviewer as { full_name?: string | null } | null;
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
    assignedReviewerId: data.assigned_reviewer_id ?? null,
    assignedReviewerName: reviewer?.full_name ?? null,
    reviewDueDate: data.review_due_date ?? null,
    input,
    output,
    signals: (signals ?? []).map((signal) => signal.payload as BioAiSignal),
    auditEvents
  };
}

export async function updateAssessmentReview(
  assessmentId: string,
  status: HumanReviewStatus,
  reviewerNotes: string,
  assignedReviewerId?: string | null,
  reviewDueDate?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in and finish onboarding before updating review status." };
  }

  const supabase = await createSupabaseServerClient();
  const reviewedAt = new Date().toISOString();

  // Only owners can change assignment/due date — enforced server-side
  const isOwner = context.role === "owner" || context.role === "admin" || context.role === "company_admin";
  const updatePayload: Record<string, unknown> = {
    human_review_status: status,
    reviewer_notes: reviewerNotes || null,
    reviewed_by: context.userId,
    reviewed_at: reviewedAt
  };
  if (isOwner) {
    if (assignedReviewerId !== undefined) updatePayload.assigned_reviewer_id = assignedReviewerId || null;
    if (reviewDueDate !== undefined) updatePayload.review_due_date = reviewDueDate || null;
  }

  const { data: assessment, error } = await supabase
    .from("assessments")
    .update(updatePayload)
    .eq("organization_id", context.organizationId)
    .eq("id", assessmentId)
    .select("id,score,level")
    .single();

  if (error || !assessment) {
    return {
      ok: false,
      message: error?.message ?? "Assessment review status could not be updated."
    };
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "human_review_status_changed",
    summary: `Assessment review status changed to ${status}.`,
    payload: withAuditTrace(
      {
        assessmentId,
        status,
        reviewerNotes,
        reviewedAt,
        assignedReviewerId: assignedReviewerId ?? null,
        reviewDueDate: reviewDueDate ?? null,
        level: assessment.level,
        score: assessment.score
      },
      {
        sourceModule: "assessment",
        sourceRecordId: assessmentId,
        targetModule: "assessment",
        targetRecordId: assessmentId,
        draftOnly: status !== "reviewed_monitoring" && status !== "routine_monitoring"
      }
    )
  });

  return { ok: true };
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
      human_review_status: assessment.humanReviewRequired
        ? "draft_human_review_required"
        : "routine_monitoring"
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
    payload: withAuditTrace(
      {
        assessmentId: data.id,
        level: assessment.level,
        score: assessment.score,
        sourceTrace: assessment.sourceTrace
      },
      {
        sourceModule: "assessment",
        sourceRecordId: data.id,
        targetModule: "assessment",
        targetRecordId: data.id,
        draftOnly: assessment.humanReviewRequired
      }
    )
  });

  // Log to AI knowledge review queue (non-blocking).
  void logAssessmentKnowledgeEntry(input, assessment, context.organizationId).catch(() => {});

  return { ok: true, status: 201, id: data.id, assessment };
}
