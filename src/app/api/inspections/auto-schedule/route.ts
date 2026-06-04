/**
 * POST /api/inspections/auto-schedule
 *
 * On-demand trigger for the AI inspection scheduler.
 * Called from:
 *   - Onboarding completion (seeds the full compliance calendar)
 *   - Admin "Refresh schedule" button
 *
 * Auth: requires a valid Supabase session (owner or admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileContext } from "@/lib/supabase/data-helpers";
import { isAdminRole } from "@/lib/role-permissions";

export async function POST(_req: NextRequest) {
  const context = await getProfileContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  // Only owners / admins may trigger a schedule refresh
  if (!isAdminRole(context.role)) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/inspection-scheduler`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ org_id: context.organizationId }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
