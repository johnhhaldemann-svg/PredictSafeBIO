/**
 * GET /api/cron/trial-expiry
 *
 * Vercel Cron Job — runs daily at 09:00 UTC.
 * Finds organizations whose trial ends in exactly 3 days and sends
 * the trial_expiring email to their org owner.
 *
 * Auth: protected by CRON_SECRET header (set in Vercel env vars).
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/trial-expiry", "schedule": "0 9 * * *" }] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSystemEmail, EmailTemplates } from "@/lib/email-service";

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or an authorized caller)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  const now = new Date();

  // Window: trials ending between 2.5 and 3.5 days from now
  const windowStart = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000).toISOString();

  // Find trialing subscriptions expiring in ~3 days
   
  const { data: expiring, error } = await (admin as any)
    .from("subscriptions")
    .select("id, organization_id, trial_end_at")
    .eq("status", "trialing")
    .gte("trial_end_at", windowStart)
    .lte("trial_end_at", windowEnd);

  if (error) {
    console.error("[cron/trial-expiry] DB error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

   
  const subs = (expiring ?? []) as any[];
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const orgId = sub.organization_id;
    const trialEnd = new Date(sub.trial_end_at);
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const expiryDate = trialEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    // Get org owner email
     
    const { data: profile } = await (admin as any)
      .from("profiles")
      .select("id")
      .eq("organization_id", orgId)
      .in("role", ["owner", "admin", "superadmin", "company_admin"])
      .limit(1)
      .maybeSingle();

     
    const userId = (profile as any)?.id;
    if (!userId) continue;

     
    const { data: authUser } = await (admin as any).auth.admin.getUserById(userId);
     
    const email = (authUser?.user as any)?.email;
    if (!email) continue;

    const { error: emailError } = await sendSystemEmail(
      EmailTemplates.TRIAL_EXPIRING,
      email,
      {
        days_remaining: String(daysRemaining),
        expiry_date:    expiryDate,
      }
    );

    if (emailError) {
      console.error(`[cron/trial-expiry] Email failed for org ${orgId}:`, emailError);
      failed++;
    } else {
      sent++;
    }
  }

  console.info(`[cron/trial-expiry] Processed ${subs.length} trials — sent: ${sent}, failed: ${failed}`);

  return NextResponse.json({
    ok: true,
    processed: subs.length,
    sent,
    failed,
    window: { start: windowStart, end: windowEnd },
  });
}
