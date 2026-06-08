/**
 * GET /api/health
 *
 * Lightweight health check for pre-deploy verification and uptime monitoring.
 * Checks: env vars, DB connection, AI API key presence.
 *
 * Returns 200 if all checks pass, 503 if any critical check fails.
 * Optional ?secret=<PLATFORM_ADMIN_KEY> to include detailed output.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
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

  // 3. AI API key presence (no live call — avoid token spend on health checks)
  const anthropicKeySet = Boolean(process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-"));
  checks.ai_api = anthropicKeySet
    ? { ok: true }
    : { ok: false, detail: "ANTHROPIC_API_KEY missing or malformed" };

  const allOk = Object.values(checks).every((c) => c.ok);
  const elapsed = Date.now() - start;

  // Only expose details to admin callers
  const adminKey = process.env.PLATFORM_ADMIN_KEY;
  const reqSecret = req.nextUrl.searchParams.get("secret");
  const isAdmin = adminKey && reqSecret === adminKey;

  const body = isAdmin
    ? { ok: allOk, elapsed_ms: elapsed, checks }
    : { ok: allOk, elapsed_ms: elapsed };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
