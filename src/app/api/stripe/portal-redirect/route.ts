/**
 * POST /api/stripe/portal-redirect
 *
 * Form-based wrapper — calls /api/stripe/portal and redirects to the Stripe portal URL.
 * Allows the "Manage payment & invoices" button to work without client-side JS.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  const portalRes = await fetch(`${origin}/api/stripe/portal`, {
    method: "POST",
    headers: { Cookie: req.headers.get("cookie") ?? "" },
  });

  if (!portalRes.ok) {
    return NextResponse.redirect(new URL("/account/billing?error=portal_unavailable", req.url));
  }

  const { url } = (await portalRes.json()) as { url?: string };

  if (!url) {
    return NextResponse.redirect(new URL("/account/billing?error=portal_unavailable", req.url));
  }

  return NextResponse.redirect(url);
}
