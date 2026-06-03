/**
 * platform-config-service.ts
 *
 * Phase 5 — Live platform branding & settings.
 * Reads from platform_config table. Superadmins can update without redeploy.
 */

import { getSupabaseAdminClient } from "./admin";

export type PlatformConfigEntry = {
  key: string;
  value: string;
  category: string;
  label: string;
  description: string;
  updated_at: string;
};

export type PlatformBranding = {
  platform_name: string;
  platform_tagline: string;
  primary_color: string;
  logo_url: string;
  footer_text: string;
  support_email: string;
  support_url: string;
  privacy_policy_url: string;
  terms_url: string;
};

// ── Defaults (used when DB is empty or unreachable) ──────────────────────────
const DEFAULTS: PlatformBranding = {
  platform_name:      "PredictSafeBIO",
  platform_tagline:   "Biosafety Intelligence",
  primary_color:      "#2563eb",
  logo_url:           "",
  footer_text:        "© 2026 PredictSafeBIO. All rights reserved.",
  support_email:      "support@predictsafe-bio.com",
  support_url:        "",
  privacy_policy_url: "",
  terms_url:          "",
};

// ── List all config entries ───────────────────────────────────────────────────

export async function listPlatformConfig(): Promise<PlatformConfigEntry[]> {
  const admin = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("platform_config")
    .select("*")
    .order("category")
    .order("label");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r: any) => ({
    key: r.key,
    value: r.value,
    category: r.category,
    label: r.label,
    description: r.description,
    updated_at: r.updated_at,
  }));
}

// ── Get branding as typed object ──────────────────────────────────────────────

export async function getPlatformBranding(): Promise<PlatformBranding> {
  const entries = await listPlatformConfig();
  const map: Record<string, string> = {};
  for (const e of entries) map[e.key] = e.value;

  return {
    platform_name:      map.platform_name      || DEFAULTS.platform_name,
    platform_tagline:   map.platform_tagline    || DEFAULTS.platform_tagline,
    primary_color:      map.primary_color       || DEFAULTS.primary_color,
    logo_url:           map.logo_url            ?? DEFAULTS.logo_url,
    footer_text:        map.footer_text         || DEFAULTS.footer_text,
    support_email:      map.support_email       || DEFAULTS.support_email,
    support_url:        map.support_url         ?? DEFAULTS.support_url,
    privacy_policy_url: map.privacy_policy_url  ?? DEFAULTS.privacy_policy_url,
    terms_url:          map.terms_url           ?? DEFAULTS.terms_url,
  };
}

// ── Update a config value ─────────────────────────────────────────────────────

export async function updatePlatformConfig(
  key: string,
  value: string,
  actorId: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("platform_config")
    .update({ value, updated_by: actorId, updated_at: new Date().toISOString() })
    .eq("key", key);

  return { error: error?.message ?? null };
}

// ── Bulk update (used by branding form) ──────────────────────────────────────

export async function updatePlatformConfigBulk(
  updates: Record<string, string>,
  actorId: string
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const admin = getSupabaseAdminClient();

  for (const [key, value] of Object.entries(updates)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from("platform_config")
      .update({ value, updated_by: actorId, updated_at: now })
      .eq("key", key);
    if (error) return { error: error.message };
  }

  return { error: null };
}
