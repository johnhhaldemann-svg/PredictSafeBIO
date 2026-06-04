import type {
  AiKnowledgeEntry,
  AiKnowledgeQuality,
  AiKnowledgeReviewDecision,
  AiKnowledgeReviewSummary,
  AiKnowledgeType,
  BioAiAssessment,
  BioAiInput
} from "@/lib/bio-ai/types";
import { createSupabaseServerClient } from "./server";
import { isSupabaseConfigured } from "./env";
import { getAuthSummary } from "./account-service";
import { withAuditTrace } from "@/lib/audit-trace";

// ---------------------------------------------------------------------------
// Log an assessment input to the knowledge review queue
// ---------------------------------------------------------------------------

export async function logAssessmentKnowledgeEntry(
  input: BioAiInput,
  assessment: BioAiAssessment,
  organizationId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const signalLabels = (input.signals ?? []).map((s) => s.label).filter(Boolean);
    const summary = [
      input.workflow ? `Workflow: ${input.workflow}` : null,
      input.area ? `Area: ${input.area}` : null,
      signalLabels.length > 0 ? `Signals: ${signalLabels.slice(0, 4).join(", ")}` : null,
      `Risk level: ${assessment.level}`,
      assessment.humanReviewRequired ? "Human review required." : null
    ].filter(Boolean).join(". ");

    await supabase.from("ai_knowledge_entries").insert({
      organization_id: organizationId,
      knowledge_type: "assessment_input",
      source_module: input.labId ? "lab" : "foundation",
      source_record_id: input.labId ?? input.siteId ?? null,
      label: input.workflow ?? input.area ?? "Unnamed assessment",
      content_summary: summary,
      content_json: { input, assessment } as unknown as Record<string, unknown>,
      ai_risk_level: assessment.level,
      ai_confidence: assessment.confidence,
      ai_human_review_required: assessment.humanReviewRequired,
      submitted_by: user?.id ?? null,
      review_status: "pending"
    });

    // Notify owners when the entry needs review
    if (assessment.humanReviewRequired || assessment.level === "high" || assessment.level === "critical") {
      void notifyKnowledgeOwners({
        entryId: "new",
        organizationId,
        label: input.workflow ?? input.area ?? "Unnamed assessment",
        aiRiskLevel: assessment.level,
        aiHumanReviewRequired: assessment.humanReviewRequired
      }).catch(() => {});
    }
  } catch {
    // Non-blocking: knowledge logging must never break assessment save.
  }
}

// ---------------------------------------------------------------------------
// Log a generic knowledge entry
// ---------------------------------------------------------------------------

export async function logKnowledgeEntry(
  entry: {
    knowledgeType: AiKnowledgeType;
    sourceModule?: string | null;
    sourceRecordId?: string | null;
    label: string;
    contentSummary: string;
    contentJson?: Record<string, unknown>;
    aiRiskLevel?: string | null;
    aiConfidence?: string | null;
    aiHumanReviewRequired?: boolean;
  },
  organizationId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ai_knowledge_entries").insert({
      organization_id: organizationId,
      knowledge_type: entry.knowledgeType,
      source_module: entry.sourceModule ?? null,
      source_record_id: entry.sourceRecordId ?? null,
      label: entry.label,
      content_summary: entry.contentSummary,
      content_json: entry.contentJson ?? {},
      ai_risk_level: entry.aiRiskLevel ?? null,
      ai_confidence: entry.aiConfidence ?? null,
      ai_human_review_required: entry.aiHumanReviewRequired ?? false,
      submitted_by: user?.id ?? null,
      review_status: "pending"
    });
  } catch {
    // Non-blocking
  }
}

// ---------------------------------------------------------------------------
// List knowledge entries for owner review
// ---------------------------------------------------------------------------

export async function listKnowledgeEntries(filters?: {
  reviewStatus?: string;
  knowledgeType?: string;
  humanReviewOnly?: boolean;
  limit?: number;
}): Promise<AiKnowledgeEntry[]> {
  if (!isSupabaseConfigured()) return demoEntries();
  try {
    const auth = await getAuthSummary();
    if (!auth.organizationId) return [];
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("ai_knowledge_entries")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(filters?.limit ?? 100);

    if (filters?.reviewStatus && filters.reviewStatus !== "all") {
      query = query.eq("review_status", filters.reviewStatus);
    }
    if (filters?.knowledgeType && filters.knowledgeType !== "all") {
      query = query.eq("knowledge_type", filters.knowledgeType);
    }
    if (filters?.humanReviewOnly) {
      query = query.eq("ai_human_review_required", true);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(rowToEntry);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Summary counts
// ---------------------------------------------------------------------------

export async function getKnowledgeReviewSummary(): Promise<AiKnowledgeReviewSummary> {
  const empty: AiKnowledgeReviewSummary = {
    totalEntries: 0, pendingCount: 0, approvedCount: 0,
    flaggedCount: 0, rejectedCount: 0, junkCount: 0, humanReviewRequiredCount: 0
  };
  if (!isSupabaseConfigured()) return demoSummary();
  try {
    const entries = await listKnowledgeEntries();
    return {
      totalEntries: entries.length,
      pendingCount:   entries.filter((e) => e.reviewStatus === "pending").length,
      approvedCount:  entries.filter((e) => e.reviewStatus === "approved").length,
      flaggedCount:   entries.filter((e) => e.reviewStatus === "flagged").length,
      rejectedCount:  entries.filter((e) => e.reviewStatus === "rejected").length,
      junkCount:      entries.filter((e) => e.qualityClassification === "junk").length,
      humanReviewRequiredCount: entries.filter((e) => e.aiHumanReviewRequired).length
    };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Review decision: approve / flag / reject
// ---------------------------------------------------------------------------

export async function reviewKnowledgeEntry(
  decision: AiKnowledgeReviewDecision
): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseConfigured()) return { ok: true, message: "demo" };
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Not authenticated." };

    const auth = await getAuthSummary();
    if (auth.role !== "owner" && auth.role !== "company_admin") {
      return { ok: false, message: "Only owners can review knowledge entries." };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("ai_knowledge_entries")
      .update({
        review_status:          decision.reviewStatus,
        quality_classification: decision.qualityClassification ?? null,
        review_notes:           decision.reviewNotes ?? null,
        excluded_from_engine:   decision.excludedFromEngine ?? (decision.reviewStatus === "rejected"),
        reviewed_by:            user.id,
        reviewed_at:            now,
        updated_at:             now
      })
      .eq("id", decision.entryId);

    if (error) return { ok: false, message: error.message };

    const eventType =
      decision.reviewStatus === "approved" ? "ai_knowledge_entry_approved" :
      decision.reviewStatus === "flagged"  ? "ai_knowledge_entry_flagged"  :
                                             "ai_knowledge_entry_rejected";

    await supabase.from("audit_events").insert({
      organization_id: auth.organizationId,
      actor_id: user.id,
      event_type: eventType,
      summary: `Knowledge entry ${decision.entryId} marked ${decision.reviewStatus}${decision.qualityClassification ? ` (${decision.qualityClassification})` : ""}`,
      payload: withAuditTrace(
        { entryId: decision.entryId, reviewStatus: decision.reviewStatus },
        { sourceModule: "ai_knowledge_entries", sourceRecordId: decision.entryId, draftOnly: false }
      )
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error." };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function rowToEntry(row: Record<string, unknown>): AiKnowledgeEntry {
  return {
    id:                      row.id as string,
    organizationId:          row.organization_id as string,
    knowledgeType:           row.knowledge_type as AiKnowledgeType,
    sourceModule:            (row.source_module ?? null) as string | null,
    sourceRecordId:          (row.source_record_id ?? null) as string | null,
    label:                   (row.label ?? "") as string,
    contentSummary:          (row.content_summary ?? "") as string,
    contentJson:             (row.content_json ?? undefined) as Record<string, unknown> | undefined,
    aiRiskLevel:             (row.ai_risk_level ?? null) as AiKnowledgeEntry["aiRiskLevel"],
    aiConfidence:            (row.ai_confidence ?? null) as AiKnowledgeEntry["aiConfidence"],
    aiHumanReviewRequired:   Boolean(row.ai_human_review_required),
    submittedBy:             (row.submitted_by ?? null) as string | null,
    submittedAt:             (row.submitted_at ?? row.created_at) as string,
    reviewStatus:            (row.review_status ?? "pending") as AiKnowledgeEntry["reviewStatus"],
    reviewedBy:              (row.reviewed_by ?? null) as string | null,
    reviewedAt:              (row.reviewed_at ?? null) as string | null,
    reviewNotes:             (row.review_notes ?? null) as string | null,
    qualityClassification:   (row.quality_classification ?? null) as AiKnowledgeEntry["qualityClassification"],
    excludedFromEngine:      Boolean(row.excluded_from_engine),
    createdAt:               row.created_at as string,
    updatedAt:               row.updated_at as string
  };
}

function demoSummary(): AiKnowledgeReviewSummary {
  return { totalEntries: 7, pendingCount: 4, approvedCount: 2, flaggedCount: 1, rejectedCount: 0, junkCount: 1, humanReviewRequiredCount: 3 };
}

function demoEntries(): AiKnowledgeEntry[] {
  const now = new Date().toISOString();
  const base = { submittedAt: now, createdAt: now, updatedAt: now, organizationId: "demo-org" };
  return [
    { ...base, id: "demo-ke-001", knowledgeType: "assessment_input", label: "BSL-2 Cell Culture ΓÇö human-derived sample processing", contentSummary: "Workflow: Human-derived sample processing. Area: BSL-2 Cell Culture Lab. Risk level: critical. Human review required.", aiRiskLevel: "critical", aiConfidence: "high", aiHumanReviewRequired: true, reviewStatus: "pending" },
    { ...base, id: "demo-ke-002", knowledgeType: "foundation_context", label: "Applicability rule: Biosafety ΓÇö BSL-2 biological materials", contentSummary: "Required programs: Biosafety, Waste Management, Document Control. Risk level if missing: high.", aiRiskLevel: "high", aiConfidence: "medium", aiHumanReviewRequired: true, reviewStatus: "pending" },
    { ...base, id: "demo-ke-003", knowledgeType: "risk_signal", label: "Equipment event ΓÇö BSC-001 certification overdue", contentSummary: "Signal type: equipment_event. Severity: high. Repeat finding. Control gap: BSC not current.", aiRiskLevel: "high", aiConfidence: "high", aiHumanReviewRequired: false, reviewStatus: "approved", qualityClassification: "validated_knowledge", reviewedAt: now },
    { ...base, id: "demo-ke-004", knowledgeType: "assessment_input", label: "Ergonomic self-assessment ΓÇö repetitive pipetting", contentSummary: "Discomfort: moderate wrist pain. Frequency: daily. Risk level: moderate.", aiRiskLevel: "moderate", aiConfidence: "medium", aiHumanReviewRequired: false, reviewStatus: "approved", qualityClassification: "reasonable_knowledge", reviewedAt: now },
    { ...base, id: "demo-ke-005", knowledgeType: "risk_signal", label: "Test submission ΓÇö placeholder only", contentSummary: "No real signals. Area: test. Workflow: test.", aiRiskLevel: "low", aiConfidence: "low", aiHumanReviewRequired: false, reviewStatus: "flagged", qualityClassification: "junk", reviewNotes: "Test submission ΓÇö no real safety data.", reviewedAt: now },
    { ...base, id: "demo-ke-006", knowledgeType: "foundation_context", label: "Chemical hygiene ΓÇö hazardous chemical operations", contentSummary: "Rule: CHEM-001. Required programs: Chemical Hygiene, Waste Management. Risk level: high.", aiRiskLevel: "high", aiConfidence: "medium", aiHumanReviewRequired: false, reviewStatus: "pending" },
    { ...base, id: "demo-ke-007", knowledgeType: "ergonomic_assessment", label: "Level-2 ergonomic inspection ΓÇö sample prep station", contentSummary: "Inspection: RULA. Score: 6. Immediate corrective action recommended.", aiRiskLevel: "high", aiConfidence: "high", aiHumanReviewRequired: true, reviewStatus: "pending" }
  ];
}

// ---------------------------------------------------------------------------
// Notify all workspace owners when a knowledge entry needs review
// ---------------------------------------------------------------------------

export async function notifyKnowledgeOwners(opts: {
  entryId: string;
  organizationId: string;
  label: string;
  aiRiskLevel?: string | null;
  aiHumanReviewRequired?: boolean;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createSupabaseServerClient();

    // Find all owner-role users in the org
    const { data: owners, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", opts.organizationId)
      .in("role", ["owner", "company_admin", "safety_manager"]);

    if (error || !owners || owners.length === 0) return;

    const isHighRisk = opts.aiRiskLevel === "critical" || opts.aiRiskLevel === "high";
    const notificationType = isHighRisk
      ? "ai_knowledge_high_risk"
      : "ai_knowledge_pending_review";

    const title = isHighRisk
      ? "High-risk AI knowledge entry requires review"
      : "New AI knowledge entry pending review";

    const riskLabel = opts.aiRiskLevel ? ` (${opts.aiRiskLevel} risk)` : "";
    const humanFlag = opts.aiHumanReviewRequired ? " Human review required." : "";
    const body = `"${opts.label}"${riskLabel} was submitted to the Safety Engine.${humanFlag} Review it at AI Knowledge.`;

    // Insert one notification per owner, skipping anyone already notified today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const since = today.toISOString();

    for (const owner of owners) {
      // Deduplicate: skip if already sent this notification type for this entry today
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", opts.organizationId)
        .eq("user_id", owner.id)
        .eq("notification_type", notificationType)
        .gte("created_at", since);

      if ((count ?? 0) > 0) continue;

      await supabase.from("notifications").insert({
        organization_id: opts.organizationId,
        user_id: owner.id,
        notification_type: notificationType,
        title,
        body
      });
    }
  } catch {
    // Non-blocking
  }
}

// ---------------------------------------------------------------------------
// Lightweight pending count ΓÇö used by AppShell nav badge (owners only)
// ---------------------------------------------------------------------------

export async function getKnowledgePendingCount(organizationId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 4; // demo count
  try {
    const supabase = await createSupabaseServerClient();
    const { count, error } = await supabase
      .from("ai_knowledge_entries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("review_status", "pending")
      .is("deleted_at", null);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
