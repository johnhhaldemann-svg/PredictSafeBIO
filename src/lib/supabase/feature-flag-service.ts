/**
 * feature-flag-service.ts
 *
 * Phase 5 — DB-backed feature flags.
 * Reads from platform_feature_flags table (service-role client).
 * Falls back to env-var values when DB is unavailable.
 * Superadmins can toggle flags live without redeploying.
 */

import { getSupabaseAdminClient } from "./admin";

export type FeatureFlag = {
  id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  category: "general" | "ai" | "hipaa" | "billing" | string;
  updated_by: string | null;
  updated_at: string;
};

// ── Env-var fallbacks (used when DB is unreachable or key is not in DB) ───────
const ENV_FALLBACKS: Record<string, boolean> = {
  llm_draft_assist:   process.env.NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST === "true",
  risk_cells:         process.env.NEXT_PUBLIC_FEATURE_RISK_CELLS === "true",
  demo_mode:          process.env.NEXT_PUBLIC_FEATURE_DEMO_MODE === "true",
  audit_log:          process.env.AUDIT_LOG_ENABLED !== "false",
  invite_only_signup: process.env.NEXT_PUBLIC_INVITE_ONLY === "true",
  stripe_billing:     Boolean(process.env.STRIPE_SECRET_KEY),
};

// ── List all flags ────────────────────────────────────────────────────────────

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const admin = getSupabaseAdminClient();
   
  const { data, error } = await (admin as any)
    .from("platform_feature_flags")
    .select("*")
    .order("category")
    .order("label");

  if (error || !data) return [];

   
  return (data as any[]).map((f: any) => ({
    id: f.id,
    key: f.key,
    label: f.label,
    description: f.description,
    enabled: f.enabled,
    category: f.category,
    updated_by: f.updated_by ?? null,
    updated_at: f.updated_at,
  }));
}

// ── Read a single flag ────────────────────────────────────────────────────────

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
   
  const { data } = await (admin as any)
    .from("platform_feature_flags")
    .select("enabled")
    .eq("key", key)
    .maybeSingle();

  if (data !== null && data !== undefined) {
     
    return (data as any).enabled ?? false;
  }

  // Fallback to env var
  return ENV_FALLBACKS[key] ?? false;
}

// ── Toggle a flag ─────────────────────────────────────────────────────────────

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  actorId: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
   
  const { error } = await (admin as any)
    .from("platform_feature_flags")
    .update({
      enabled,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  return { error: error?.message ?? null };
}
