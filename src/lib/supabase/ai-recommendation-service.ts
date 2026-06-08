// Manual v1.1 — AI Recommendation Log service (§11 guardrails).
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

export const AI_DRAFT_BANNER = "DRAFT — Human Review Required";

/** Actions AI must never take autonomously (manual §11). */
export const AI_PROHIBITED_ACTIONS = [
  "auto-close CAPA",
  "approve a chemical",
  "certify compliance",
  "set a risk register entry to active",
  "sign a manifest",
  "approve BSL / radiation / laser controls",
] as const;

export type AiRecommendationInput = {
  sourceTable: string;
  sourceRecordId?: string | null;
  recommendationText: string;
  inputsCited: Record<string, unknown>;
  confidenceScore?: number | null;
};

/** Log an AI recommendation as DRAFT before it is shown to the user. Returns row id. */
export async function logAiRecommendation(input: AiRecommendationInput): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const ctx = await getProfileContext();
    if (!ctx) return null;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("ai_recommendation_log").insert({
      organization_id: ctx.organizationId,
      source_table: input.sourceTable,
      source_record_id: input.sourceRecordId ?? null,
      recommendation_text: input.recommendationText,
      inputs_cited: input.inputsCited ?? {},
      confidence_score: input.confidenceScore ?? null,
      status: "draft",
    }).select("id").single();
    if (error || !data) return null;
    return (data as Record<string, unknown>).id as string;
  } catch { return null; }
}

export async function recordAiReviewDecision(id: string, decision: "accepted" | "rejected" | "modified", rationale?: string, finalAction?: string) {
  if (!isSupabaseConfigured()) return;
  try {
    const ctx = await getProfileContext();
    if (!ctx) return;
    const supabase = await createSupabaseServerClient();
    await supabase.from("ai_recommendation_log").update({
      status: decision, reviewer_id: ctx.userId, reviewed_at: new Date().toISOString(),
      reviewer_rationale: rationale ?? null, final_action_taken: finalAction ?? null,
    }).eq("id", id).eq("organization_id", ctx.organizationId);
  } catch { /* best effort */ }
}

export async function pendingAiRecommendationCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const ctx = await getProfileContext();
    if (!ctx) return 0;
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from("ai_recommendation_log")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId)
      .eq("status", "draft");
    return count ?? 0;
  } catch { return 0; }
}
