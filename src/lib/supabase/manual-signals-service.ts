// Manual v1.1 — dashboard signal counts (§6 dashboard / §11).
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { overdueRiskRegisterCount } from "./risk-register-service";
import { mocAwaitingReviewCount } from "./moc-service";
import { pendingAiRecommendationCount } from "./ai-recommendation-service";
import { expiringQualifiedPersonCount } from "./qualified-person-service";

export type ManualSignals = {
  overdueRiskRegister: number;
  programsPending: number;
  mocAwaitingReview: number;
  aiPendingReview: number;
  qualifiedExpiring: number;
};

async function programsPendingCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const ctx = await getProfileContext();
    if (!ctx) return 0;
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase.from("program_applicability_log")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId).eq("status", "pending");
    return count ?? 0;
  } catch { return 0; }
}

export async function getManualSignals(): Promise<ManualSignals> {
  const [overdueRiskRegister, programsPending, mocAwaitingReview, aiPendingReview, qualifiedExpiring] = await Promise.all([
    overdueRiskRegisterCount().catch(() => 0),
    programsPendingCount().catch(() => 0),
    mocAwaitingReviewCount().catch(() => 0),
    pendingAiRecommendationCount().catch(() => 0),
    expiringQualifiedPersonCount(30).catch(() => 0),
  ]);
  return { overdueRiskRegister, programsPending, mocAwaitingReview, aiPendingReview, qualifiedExpiring };
}
