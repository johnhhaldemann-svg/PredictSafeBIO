/**
 * plan-limits-service.ts
 *
 * Phase 6 — Plan limit enforcement.
 *
 * Checks an organization's current usage against their subscription plan limits.
 * Call checkPlanLimits() before inserting a new provider profile or patient bio.
 *
 * Small Lab:  10 users, 20 assessments
 * Growth:     50 users, unlimited assessments
 * Enterprise: 200 users, unlimited assessments
 * Strategic:  unlimited
 *
 * Design:
 * - Returns { allowed: true } when under limit OR when org has no subscription (defaults to Free).
 * - Returns { allowed: false, reason, limit, current, upgradeUrl } when at/over limit.
 * - Uses admin client — no RLS interference.
 * - Never throws; returns { allowed: true } on DB errors (fail-open for availability).
 */

import { getSupabaseAdminClient } from "./admin";

export type LimitCheckResult =
  | { allowed: true; current: number; limit: number | null }
  | { allowed: false; reason: string; current: number; limit: number; upgradeUrl: string };

export type OrgUsage = {
  provider_count: number;
  patient_count: number;
  plan_tier: string;
  plan_name: string;
  max_providers: number | null;
  max_patients: number | null;
};

// ── Get current usage + limits for an org ────────────────────────────────────

export async function getOrgUsage(organizationId: string): Promise<OrgUsage> {
  const admin = getSupabaseAdminClient();

  const [providerRes, patientRes, subRes] = await Promise.all([
     
    (admin as any)
      .from("provider_profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),

     
    (admin as any)
      .from("patient_bios")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),

     
    (admin as any)
      .from("subscriptions")
      .select("plan_id, subscription_plans ( name, tier, max_providers, max_patients )")
      .eq("organization_id", organizationId)
      .in("status", ["active", "trialing"])
      .maybeSingle(),
  ]);

   
  const plan = (subRes.data as any)?.subscription_plans ?? null;

  return {
    provider_count: providerRes.count ?? 0,
    patient_count:  patientRes.count ?? 0,
    plan_tier:      plan?.tier      ?? "free",
    plan_name:      plan?.name      ?? "Free",
    max_providers:  plan?.max_providers ?? 1,   // default to Free tier limits
    max_patients:   plan?.max_patients  ?? 5,
  };
}

// ── Check if a new provider can be created ────────────────────────────────────

export async function checkProviderLimit(
  organizationId: string
): Promise<LimitCheckResult> {
  try {
    const usage = await getOrgUsage(organizationId);

    if (usage.max_providers === null) {
      return { allowed: true, current: usage.provider_count, limit: null };
    }

    if (usage.provider_count < usage.max_providers) {
      return { allowed: true, current: usage.provider_count, limit: usage.max_providers };
    }

    return {
      allowed: false,
      reason: `Your ${usage.plan_name} plan allows up to ${usage.max_providers} provider profile${usage.max_providers === 1 ? "" : "s"}. You have ${usage.provider_count}.`,
      current: usage.provider_count,
      limit: usage.max_providers,
      upgradeUrl: "/account/billing",
    };
  } catch {
    // Fail open — don't block users if the limit check itself fails
    return { allowed: true, current: 0, limit: null };
  }
}

// ── Check if a new personnel record can be created ────────────────────────────

export async function checkPersonnelLimit(
  organizationId: string
): Promise<LimitCheckResult> {
  try {
    const usage = await getOrgUsage(organizationId);

    if (usage.max_patients === null) {
      return { allowed: true, current: usage.patient_count, limit: null };
    }

    if (usage.patient_count < usage.max_patients) {
      return { allowed: true, current: usage.patient_count, limit: usage.max_patients };
    }

    return {
      allowed: false,
      reason: `Your ${usage.plan_name} plan allows up to ${usage.max_patients} personnel record${usage.max_patients === 1 ? "" : "s"}. You have ${usage.patient_count}.`,
      current: usage.patient_count,
      limit: usage.max_patients,
      upgradeUrl: "/account/billing",
    };
  } catch {
    return { allowed: true, current: 0, limit: null };
  }
}

// ── Usage meter for display (0–100 pct) ──────────────────────────────────────

export function usagePct(current: number, limit: number | null): number {
  if (limit === null) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

export function usageStatus(pct: number): "ok" | "warning" | "critical" {
  if (pct >= 100) return "critical";
  if (pct >= 80)  return "warning";
  return "ok";
}
