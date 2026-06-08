// Manual v1.1 — Management of Change service (§9 / Appendix I).
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

export type MocStatus = "draft" | "in_review" | "approved" | "approved_with_restrictions" | "rejected";

export const MOC_STATUS_LABELS: Record<MocStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  approved_with_restrictions: "Approved w/ Restrictions",
  rejected: "Rejected",
};
export const MOC_STATUS_CLASS: Record<MocStatus, string> = {
  draft: "status-pill", in_review: "status-needs-review", approved: "status-ok",
  approved_with_restrictions: "status-moderate", rejected: "status-critical",
};

export type MocRecord = {
  id: string;
  changeType: string | null;
  changeDescription: string | null;
  affectedPrograms: string[];
  specializedScreenFlags: string[];
  status: MocStatus;
  routingRequired: string[];
  postChangeReviewDue: string | null;
  submittedAt: string | null;
};

export type ServiceResult = { ok: true; message: string } | { ok: false; message: string };

/** Auto-route based on affected programs / specialized screens (manual §10 committees). */
export function deriveRouting(affectedPrograms: string[], flags: string[]): string[] {
  const all = [...affectedPrograms, ...flags].join(" ").toLowerCase();
  const roles = new Set<string>(["EHS Manager"]);
  if (all.includes("biosafety") || all.includes("ibc") || all.includes("biological")) roles.add("Biosafety Officer / IBC");
  if (all.includes("radiation")) roles.add("Radiation Safety Officer");
  if (all.includes("laser")) roles.add("Laser Safety Officer");
  if (all.includes("chemical")) roles.add("Chemical Hygiene Officer");
  if (all.includes("psm") || all.includes("process safety") || all.includes("scale")) roles.add("Process Safety Reviewer");
  if (all.includes("gxp") || all.includes("part 11") || all.includes("quality") || all.includes("data integrity")) roles.add("Quality / Data Integrity Reviewer");
  if (all.includes("clia") || all.includes("hipaa") || all.includes("diagnostic")) roles.add("Quality / Data Integrity Reviewer");
  if (all.includes("select agent") || all.includes("biosecurity")) roles.add("Responsible Official / Biosecurity Reviewer");
  if (all.includes("controlled subst") || all.includes("dea")) roles.add("Controlled Substance Custodian");
  return Array.from(roles);
}

function mapRow(r: Record<string, unknown>): MocRecord {
  return {
    id: r.id as string,
    changeType: (r.change_type as string) ?? null,
    changeDescription: (r.change_description as string) ?? null,
    affectedPrograms: (r.affected_programs as string[]) ?? [],
    specializedScreenFlags: (r.specialized_screen_flags as string[]) ?? [],
    status: (r.status as MocStatus) ?? "draft",
    routingRequired: (r.routing_required as string[]) ?? [],
    postChangeReviewDue: (r.post_change_review_due as string) ?? null,
    submittedAt: (r.submitted_at as string) ?? null,
  };
}

export async function listMocRecords(): Promise<MocRecord[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const ctx = await getProfileContext();
    if (!ctx) return [];
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("management_of_change_records")
      .select("*").eq("organization_id", ctx.organizationId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch { return []; }
}

export async function createMocRecord(input: {
  changeType: string; changeDescription: string; affectedPrograms: string[];
  specializedScreenFlags: string[]; newHazards?: string; changedControls?: string; residualRisk?: string;
}): Promise<ServiceResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Workspace not connected." };
  const ctx = await getProfileContext();
  if (!ctx) return { ok: false, message: "Sign in to submit a change." };
  const supabase = await createSupabaseServerClient();
  const routing = deriveRouting(input.affectedPrograms, input.specializedScreenFlags);
  const reviewDue = new Date(); reviewDue.setDate(reviewDue.getDate() + 30);
  const { error } = await supabase.from("management_of_change_records").insert({
    organization_id: ctx.organizationId,
    change_type: input.changeType,
    change_description: input.changeDescription,
    affected_programs: input.affectedPrograms,
    specialized_screen_flags: input.specializedScreenFlags,
    new_hazards: input.newHazards ?? null,
    changed_controls: input.changedControls ?? null,
    residual_risk: input.residualRisk ?? null,
    status: "in_review",
    routing_required: routing,
    submitted_by: ctx.userId,
    submitted_at: new Date().toISOString(),
    post_change_review_due: reviewDue.toISOString().slice(0, 10),
    revalidation_required: true,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Change submitted for review. Routed to: ${routing.join(", ")}.` };
}

export async function mocAwaitingReviewCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const ctx = await getProfileContext();
    if (!ctx) return 0;
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase.from("management_of_change_records")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId).eq("status", "in_review");
    return count ?? 0;
  } catch { return 0; }
}
