"use server";

import { getAuthSummary } from "@/lib/supabase/account-service";
import { isSuperAdmin } from "@/lib/role-permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import { getPlatformData, type PlatformData } from "@/lib/supabase/platform-service";
import {
  getAiEngineStatus,
  getDbStats,
  runAdHocAssessment,
  type AdHocAssessmentInput,
  type AiEngineStatus,
  type DbTableStat,
} from "@/lib/supabase/superadmin-service";
import type { BioAiAssessment } from "@/lib/bio-ai/types";

/**
 * Server actions backing the interactive Superadmin console.
 *
 * Every action is gated on the caller's *session* role (superadmin) — not a URL
 * key — and writes an audit_events row recording who ran what. Results are plain
 * serializable objects so they can be returned straight to the client console.
 */

type ActionResult<T> =
  | { ok: true; data: T; ranAt: string }
  | { ok: false; error: string };

/** Resolve the signed-in superadmin, or null if the caller is not authorized. */
async function requireSuperadmin() {
  const auth = await getAuthSummary();
  if (!isSuperAdmin(auth)) return null;
  return auth;
}

/** Best-effort audit log of a superadmin console action. Never throws. */
async function logRun(
  organizationId: string | undefined,
  actorId: string | undefined,
  check: string,
  summary: string
): Promise<void> {
  if (!organizationId || !isSupabaseServiceConfigured()) return;
  try {
    const admin = getSupabaseAdminClient();
    await (admin as never as ReturnType<typeof getSupabaseAdminClient>)
      .from("audit_events")
      .insert({
        organization_id: organizationId,
        actor_id: actorId ?? null,
        event_type: "platform_check_run",
        summary,
        payload: { check, surface: "superadmin_console" },
      });
  } catch {
    /* audit logging is best-effort — never block the check itself */
  }
}

export async function runPlatformChecksAction(): Promise<ActionResult<PlatformData>> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, error: "Not authorized." };

  const data = await getPlatformData();
  await logRun(auth.organizationId, auth.userId, "platform", "Ran platform configuration & security checks.");
  return { ok: true, data, ranAt: new Date().toISOString() };
}

export async function runAiEngineChecksAction(): Promise<ActionResult<AiEngineStatus>> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, error: "Not authorized." };

  const data = await getAiEngineStatus();
  await logRun(
    auth.organizationId,
    auth.userId,
    "ai_engine",
    `Ran AI-engine diagnostics — smoke test ${data.smokeTestResult}.`
  );
  return { ok: true, data, ranAt: new Date().toISOString() };
}

export async function refreshDbStatsAction(): Promise<ActionResult<DbTableStat[]>> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, error: "Not authorized." };

  const data = await getDbStats();
  await logRun(auth.organizationId, auth.userId, "data_map", "Refreshed database record-distribution map.");
  return { ok: true, data, ranAt: new Date().toISOString() };
}

export async function runAdHocAssessmentAction(
  input: AdHocAssessmentInput
): Promise<ActionResult<BioAiAssessment>> {
  const auth = await requireSuperadmin();
  if (!auth) return { ok: false, error: "Not authorized." };

  try {
    const data = runAdHocAssessment(input);
    await logRun(
      auth.organizationId,
      auth.userId,
      "adhoc_assessment",
      `Ran ad-hoc assessment (${input.signalType}) — score ${data.score}, level ${data.level}.`
    );
    return { ok: true, data, ranAt: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Engine threw an exception." };
  }
}
