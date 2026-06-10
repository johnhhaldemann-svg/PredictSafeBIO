/**
 * GET /api/health
 *
 * Lightweight health check for pre-deploy verification and uptime monitoring.
 *
 * Critical checks (gate the 200/503 status): core env vars + DB connection.
 * Warning checks (reported but non-blocking): AI API key presence — the app
 * still serves users without it; only AI-draft features degrade, so an AI-only
 * outage should not turn the uptime monitor red.
 *
 * Returns 200 if all *critical* checks pass, 503 otherwise.
 * Optional ?secret=<PLATFORM_ADMIN_KEY> to include the per-check breakdown.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Critical env vars — absence breaks core serving, so a miss fails the gate.
// ANTHROPIC_API_KEY is intentionally NOT here: it only powers AI-draft
// features and is reported as a non-blocking warning below.
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
];

// Project uses PUBLISHABLE_KEY as primary, ANON_KEY as alias — accept either
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(req: NextRequest) {
  const start = Date.now();
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1. Env vars
  const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  const anonKeyMissing = !supabaseAnonKey;
  const allMissing = anonKeyMissing
    ? [...missingVars, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
    : missingVars;
  checks.env_vars = allMissing.length === 0
    ? { ok: true }
    : { ok: false, detail: `Missing: ${allMissing.join(", ")}` };

  // 2. DB connection
  try {
    const admin = getSupabaseAdminClient();
    const { error } = await (admin as any)
      .from("organizations")
      .select("id", { count: "exact", head: true });
    checks.database = error
      ? { ok: false, detail: error.message }
      : { ok: true };
  } catch (e: any) {
    checks.database = { ok: false, detail: e?.message ?? "unknown error" };
  }

  // Critical checks gate the 200/503 status.
  const allOk = Object.values(checks).every((c) => c.ok);

  // ── Warning checks (non-blocking — reported but do NOT affect the status) ──
  const warnings: Record<string, { ok: boolean; detail?: string }> = {};

  // AI API key presence (no live call — avoid token spend on health checks).
  // Non-blocking: the app serves users without it; only AI features degrade.
  const anthropicKeySet = Boolean(process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-"));
  warnings.ai_api = anthropicKeySet
    ? { ok: true }
    : { ok: false, detail: "ANTHROPIC_API_KEY missing or malformed — AI-draft features degraded" };

  const degraded = Object.values(warnings).some((w) => !w.ok);
  const elapsed = Date.now() - start;

  // Only expose the per-check breakdown to admin callers
  const adminKey = process.env.PLATFORM_ADMIN_KEY;
  const reqSecret = req.nextUrl.searchParams.get("secret");
  const isAdmin = adminKey && reqSecret === adminKey;

  const body = isAdmin
    ? { ok: allOk, degraded, elapsed_ms: elapsed, checks, warnings }
    : { ok: allOk, degraded, elapsed_ms: elapsed };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
