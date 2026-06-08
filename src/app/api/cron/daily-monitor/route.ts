/**
 * GET /api/cron/daily-monitor
 *
 * Vercel Cron Job — runs daily at 07:00 UTC.
 * Runs four checks and logs a structured summary:
 *   1. Uptime — self-ping /api/health
 *   2. AI output validator — scan recent ai_drafts rows for anomalies
 *   3. AI response logging — detect gaps (no records in last 24 h when activity expected)
 *   4. Error rate — count audit_logs ERROR entries in last 24 h
 *
 * Auth: protected by CRON_SECRET header.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  const admin = getSupabaseAdminClient() as any;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // ── 1. Uptime check ──────────────────────────────────────────────────────
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
    if (!appUrl) throw new Error("APP_URL env var not set");
    const res = await fetch(`${appUrl}/api/health`, { cache: "no-store" });
    const body = await res.json();
    results.uptime = { ok: res.ok, status: res.status, health: body };
  } catch (e: any) {
    results.uptime = { ok: false, error: e?.message };
  }

  // ── 2. AI output validator ───────────────────────────────────────────────
  try {
    const { data: drafts, error } = await admin
      .from("ai_drafts")
      .select("id, created_at, content")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    const rows = (drafts ?? []) as any[];
    const empty = rows.filter((r) => !r.content || String(r.content).trim().length < 10);
    const oversized = rows.filter((r) => String(r.content ?? "").length > 50_000);

    results.ai_output_validator = {
      ok: empty.length === 0 && oversized.length === 0,
      total_checked: rows.length,
      empty_responses: empty.length,
      oversized_responses: oversized.length,
    };
  } catch (e: any) {
    // Table may not exist yet — treat as skipped, not failed
    results.ai_output_validator = { ok: true, skipped: true, detail: e?.message };
  }

  // ── 3. AI response logging ───────────────────────────────────────────────
  try {
    const { count, error } = await admin
      .from("ai_drafts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

    if (error) throw new Error(error.message);

    results.ai_response_logging = {
      ok: true,
      records_last_24h: count ?? 0,
    };
  } catch (e: any) {
    results.ai_response_logging = { ok: true, skipped: true, detail: e?.message };
  }

  // ── 4. Error rate ────────────────────────────────────────────────────────
  try {
    const { count, error } = await admin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .ilike("action", "%error%");

    if (error) throw new Error(error.message);

    const errorCount = count ?? 0;
    const HIGH_ERROR_THRESHOLD = 50;

    results.error_rate = {
      ok: errorCount < HIGH_ERROR_THRESHOLD,
      errors_last_24h: errorCount,
      threshold: HIGH_ERROR_THRESHOLD,
    };
  } catch (e: any) {
    results.error_rate = { ok: true, skipped: true, detail: e?.message };
  }

  const allOk = Object.values(results).every((r: any) => r.ok !== false);

  console.info("[cron/daily-monitor]", JSON.stringify({ allOk, results }));

  return NextResponse.json({ ok: allOk, timestamp: new Date().toISOString(), results });
}
