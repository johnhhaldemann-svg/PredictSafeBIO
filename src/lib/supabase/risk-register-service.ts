// Risk Register service v2 — regulatory-requirement-driven scoring.
// Inherent and residual risk are calculated from regulation + compliance gap;
// they are no longer manually entered.
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { isUserQualifiedFor } from "./qualified-person-service";
import {
  assessRegulatoryRisk,
  type RegulationFramework,
  type ComplianceGap,
  type ControlEffectivenessTier,
} from "@/lib/risk/scoring";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type RiskStatus = "draft" | "pending_review" | "active" | "restricted" | "overdue" | "closed_with_evidence" | "retired";
export type ControlType = "engineering" | "administrative" | "ppe" | "training" | "inspection" | "permit" | "committee";
export type { RegulationFramework, ComplianceGap };

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Qualified Review",
  active: "Active",
  restricted: "Restricted",
  overdue: "Overdue",
  closed_with_evidence: "Closed with Evidence",
  retired: "Retired / Obsolete",
};

export const RISK_STATUS_CLASS: Record<RiskStatus, string> = {
  draft: "status-pill",
  pending_review: "status-needs-review",
  active: "status-ok",
  restricted: "status-high",
  overdue: "status-overdue",
  closed_with_evidence: "status-current",
  retired: "status-unknown",
};

export const RISK_LEVEL_CLASS: Record<RiskLevel, string> = {
  low: "status-low", medium: "status-moderate", high: "status-high", critical: "status-critical",
};

// Restricted decisions require a Qualified Reviewer.
const RESTRICTED_STATUS_CHANGES: RiskStatus[] = ["active", "restricted", "closed_with_evidence"];

export type RiskRegisterEntry = {
  id: string;
  // Regulatory identity
  regulation: RegulationFramework | null;
  requirementDetail: string | null;
  activity: string | null;
  complianceGap: ComplianceGap | null;
  // Legacy / supplemental
  area: string | null;
  process: string | null;
  riskItem: string;
  sourceBasis: string | null;
  controlType: ControlType | null;
  controlDescription: string | null;
  frequency: string | null;
  programName: string | null;
  // Calculated risk (stored, not manually entered)
  inherentScore: number | null;
  residualScore: number | null;
  inherentRisk: RiskLevel | null;
  residualRisk: RiskLevel | null;
  riskControlPlanRequired: boolean;
  // Status & workflow
  qualifiedReviewerName: string | null;
  evidenceRequired: string[];
  status: RiskStatus;
  overdue: boolean;
  openCapaCount: number;
  dueDate: string | null;
};

export type ServiceResult = { ok: true; message: string } | { ok: false; message: string };

function mapRow(r: Record<string, unknown>): RiskRegisterEntry {
  const reviewer = r.reviewer as Record<string, unknown> | null;
  return {
    id: r.id as string,
    regulation: (r.regulation as RegulationFramework) ?? null,
    requirementDetail: (r.requirement_detail as string) ?? null,
    activity: (r.activity as string) ?? null,
    complianceGap: (r.compliance_gap as ComplianceGap) ?? null,
    area: (r.area as string) ?? null,
    process: (r.process as string) ?? null,
    riskItem: r.risk_item as string,
    sourceBasis: (r.source_basis as string) ?? null,
    controlType: (r.control_type as ControlType) ?? null,
    controlDescription: (r.control_description as string) ?? null,
    frequency: (r.frequency as string) ?? null,
    programName: (r.program_name as string) ?? null,
    inherentScore: (r.inherent_score as number) ?? null,
    residualScore: (r.residual_score as number) ?? null,
    inherentRisk: (r.inherent_risk as RiskLevel) ?? null,
    residualRisk: (r.residual_risk as RiskLevel) ?? null,
    riskControlPlanRequired: !!(r.risk_control_plan_required),
    qualifiedReviewerName: (reviewer?.full_name as string) ?? null,
    evidenceRequired: (r.evidence_required as string[]) ?? [],
    status: (r.status as RiskStatus) ?? "draft",
    overdue: (r.overdue as boolean) ?? false,
    openCapaCount: (r.open_capa_count as number) ?? 0,
    dueDate: (r.due_date as string) ?? null,
  };
}

export async function listRiskRegisterEntries(filters?: {
  status?: RiskStatus; risk?: RiskLevel; program?: string; siteId?: string;
}): Promise<RiskRegisterEntry[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const ctx = await getProfileContext();
    if (!ctx) return [];
    const supabase = await createSupabaseServerClient();
    let q = supabase.from("risk_register_entries")
      .select("*,reviewer:qualified_reviewer_id(full_name)")
      .eq("organization_id", ctx.organizationId)
      .order("inherent_score", { ascending: false, nullsFirst: false });
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.risk) q = q.eq("residual_risk", filters.risk);
    if (filters?.program) q = q.eq("program_name", filters.program);
    if (filters?.siteId) q = q.eq("site_id", filters.siteId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return [];
  }
}

export type CreateRiskRegisterInput = {
  regulation: RegulationFramework;
  requirementDetail: string;
  activity: string;
  complianceGap: ComplianceGap;
  controlTier?: ControlEffectivenessTier;
  // Supplemental
  area?: string;
  process?: string;
  sourceBasis?: string;
  controlType?: ControlType;
  controlDescription?: string;
  frequency?: string;
  programName?: string;
};

export async function createRiskRegisterEntry(input: CreateRiskRegisterInput): Promise<ServiceResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Workspace not connected." };
  const ctx = await getProfileContext();
  if (!ctx) return { ok: false, message: "Sign in to add a register entry." };

  // Calculate scores from regulation + gap
  const scoring = assessRegulatoryRisk(
    input.regulation,
    input.complianceGap,
    input.controlTier ?? "none"
  );

  // Build a human-readable risk item label from the regulatory inputs
  const riskItem = `${input.regulation} — ${input.requirementDetail || input.activity}`;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("risk_register_entries").insert({
    organization_id: ctx.organizationId,
    regulation: input.regulation,
    requirement_detail: input.requirementDetail,
    activity: input.activity,
    compliance_gap: input.complianceGap,
    risk_item: riskItem,
    area: input.area ?? null,
    process: input.process ?? null,
    source_basis: input.sourceBasis ?? null,
    control_type: input.controlType ?? null,
    control_description: input.controlDescription ?? null,
    frequency: input.frequency ?? null,
    program_name: input.programName ?? null,
    inherent_score: scoring.inherentScore,
    residual_score: scoring.residualScore,
    inherent_risk: scoring.inherentLevel,
    residual_risk: scoring.residualLevel,
    status: "draft",
    created_by: ctx.userId,
  });
  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    message: `Entry created — Inherent: ${scoring.inherentLevel.toUpperCase()}, Residual: ${scoring.residualLevel.toUpperCase()} (Draft — Human Review Required).`,
  };
}

/** Change status. Restricted transitions require a Qualified Reviewer. */
export async function updateRiskRegisterStatus(id: string, status: RiskStatus): Promise<ServiceResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Workspace not connected." };
  const ctx = await getProfileContext();
  if (!ctx) return { ok: false, message: "Sign in to update the entry." };

  if (RESTRICTED_STATUS_CHANGES.includes(status)) {
    const qualified = await isUserQualifiedFor(ctx.userId, ctx.organizationId, "risk_register_status");
    if (!qualified) return { ok: false, message: "This action requires a Qualified Reviewer." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("risk_register_entries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id).eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Status updated to ${RISK_STATUS_LABELS[status]}.` };
}

export async function overdueRiskRegisterCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const ctx = await getProfileContext();
    if (!ctx) return 0;
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase.from("risk_register_entries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId).eq("overdue", true);
    return count ?? 0;
  } catch { return 0; }
}
