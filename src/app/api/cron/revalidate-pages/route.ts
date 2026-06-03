/**
 * GET /api/cron/revalidate-pages
 *
 * Vercel Cron Job — runs daily at 05:00 UTC.
 * Flushes Next.js cache for all live data pages so the first visitor
 * after 5 AM always gets a fresh server render, not stale cached HTML.
 *
 * Auth: protected by CRON_SECRET header (same as other cron routes).
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/revalidate-pages", "schedule": "0 5 * * *" }] }
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/** All pages that serve live Supabase data and should be revalidated daily. */
const LIVE_PAGES = [
  // Core workflow
  "/",
  "/my-work",
  "/workbench",
  "/foundation",

  // HSE modules
  "/chemical-inventory",
  "/waste-management",
  "/permits",
  "/pesticide",
  "/training-matrix",
  "/inspections",
  "/assessments",
  "/ergonomics/self-assessment",
  "/ergonomics/advanced-evaluation",

  // Operations
  "/operations",
  "/operations/capa",
  "/risk-command-center",

  // Documents
  "/documents",
  "/documents/version-control",

  // Account / settings
  "/account",
  "/account/billing",
  "/account/team",
  "/company-profile",
  "/change-plan",

  // Admin
  "/admin/analytics",
  "/admin/audit",
  "/admin/users",
  "/admin/organizations",
  "/admin/moderation",
  "/admin/billing",
  "/admin/platform",
] as const;

export async function GET(req: NextRequest) {
  // Verify caller is Vercel Cron or an authorized caller
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { path: string; ok: boolean }[] = [];

  for (const path of LIVE_PAGES) {
    try {
      revalidatePath(path);
      results.push({ path, ok: true });
    } catch (err) {
      console.error(`[cron/revalidate-pages] Failed to revalidate ${path}:`, err);
      results.push({ path, ok: false });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed    = results.filter((r) => !r.ok).length;

  console.info(
    `[cron/revalidate-pages] Revalidated ${succeeded}/${LIVE_PAGES.length} pages — failed: ${failed}`
  );

  return NextResponse.json({
    ok: true,
    revalidated: succeeded,
    failed,
    pages: results,
    timestamp: new Date().toISOString(),
  });
}
