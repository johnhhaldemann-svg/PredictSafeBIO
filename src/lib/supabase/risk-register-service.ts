// Manual v1.1 — Risk Register service (§6) with qualified-reviewer enforcement.
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { isUserQualifiedFor } from "./qualified-person-service";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type RiskStatus = "draft" | "pending_review" | "active" | "restricted" | "overdue" | "closed_with_evidence" | "retired";
export type ControlType = "engineering" | "administrative" | "ppe" | "training" | "inspection" | "permit" | "committee";

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Qualified Review",
  active: "Active",
  restricted: "Restricted",
  overdue: "Overdue",
  closed_with_evidence: "Closed with Evidence",
  retired: "Retired / Obsolete",
};

// CSS status classes that already exist in globals.css
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

// Restricted decisions per the manual — require a Qualified Reviewer.
const RESTRICTED_STATUS_CHANGES: RiskStatus[] = ["active", "restricted", "closed_with_evidence"];

export type RiskRegisterEntry = {
  id: string;
  area: string | null;
  process: string | null;
  riskItem: string;
  sourceBasis: string | null;
  controlType: ControlType | null;
  controlDescription: string | null;
  frequency: string | null;
  qualifiedReviewerName: string | null;
  evidenceRequired: string[];
  inherentRisk: RiskLevel | null;
  residualRisk: RiskLevel | null;
  status: RiskStatus;
  overdue: boolean;
  openCapaCount: number;
  dueDate: string | null;
  programName: string | null;
};

export type ServiceResult = { ok: true; message: string } | { ok: false; message: string };

function mapRow(r: Record<string, unknown>): RiskRegisterEntry {
  const reviewer = r.reviewer as Record<string, unknown> | null;
  return {
    id: r.id as string,
    area: (r.area as string) ?? null,
    process: (r.process as string) ?? null,
    riskItem: r.risk_item as string,
    sourceBasis: (r.source_basis as string) ?? null,
    controlType: (r.control_type as ControlType) ?? null,
    controlDescription: (r.control_description as string) ?? null,
    frequency: (r.frequency as string) ?? null,
    qualifiedReviewerName: (reviewer?.full_name as string) ?? null,
    evidenceRequired: (r.evidence_required as string[]) ?? [],
    inherentRisk: (r.inherent_risk as RiskLevel) ?? null,
    residualRisk: (r.residual_risk as RiskLevel) ?? null,
    status: (r.status as RiskStatus) ?? "draft",
    overdue: (r.overdue as boolean) ?? false,
    openCapaCount: (r.open_capa_count as number) ?? 0,
    dueDate: (r.due_date as string) ?? null,
    programName: (r.program_name as string) ?? null,
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
      .order("created_at", { ascending: false });
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

export async function createRiskRegisterEntry(input: {
  riskItem: string; area?: string; process?: string; sourceBasis?: string;
  controlType?: ControlType; controlDescription?: string; frequency?: string;
  inherentRisk?: RiskLevel; residualRisk?: RiskLevel; dueDate?: string | null; programName?: string;
}): Promise<ServiceResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Workspace not connected." };
  const ctx = await getProfileContext();
  if (!ctx) return { ok: false, message: "Sign in to add a register entry." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("risk_register_entries").insert({
    organization_id: ctx.organizationId,
    risk_item: input.riskItem,
    area: input.area ?? null,
    process: input.process ?? null,
    source_basis: input.sourceBasis ?? null,
    control_type: input.controlType ?? null,
    control_description: input.controlDescription ?? null,
    frequency: input.frequency ?? null,
    inherent_risk: input.inherentRisk ?? null,
    residual_risk: input.residualRisk ?? null,
    due_date: input.dueDate || null,
    program_name: input.programName ?? null,
    status: "draft",
    created_by: ctx.userId,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Risk register entry created (Draft — Human Review Required)." };
}

/** Change status. Restricted transitions require a Qualified Reviewer (manual §11). */
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
