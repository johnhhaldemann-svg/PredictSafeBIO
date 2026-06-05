/**
 * POST /api/stripe/checkout-redirect
 *
 * Form-based wrapper around /api/stripe/checkout.
 * Accepts multipart/form-data or urlencoded, calls the checkout API,
 * and redirects the browser to Stripe's hosted checkout URL.
 *
 * This allows the UpgradeButton to work without client-side JS.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminOrAbove } from "@/lib/role-permissions";

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const access = {
    signedIn: true,
    userId: user.id,
    organizationId: profile?.organization_id,
    role: profile?.role,
  };

  if (!isAdminOrAbove(access)) {
    return NextResponse.redirect(new URL("/account", req.url));
  }

  // Parse form body
  const formData = await req.formData();
  const planId = String(formData.get("planId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");

  if (!planId || !organizationId) {
    return NextResponse.redirect(new URL("/account/billing?billing=error", req.url));
  }

  // Tenant boundary: only allow checkout for the caller's own organization.
  if (organizationId !== profile?.organization_id) {
    return NextResponse.redirect(new URL("/account/billing?billing=error", req.url));
  }

  // Call our JSON checkout API
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const checkoutRes = await fetch(`${origin}/api/stripe/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward auth cookie so the checkout route can verify the session
      Cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ planId, organizationId }),
  });

  if (!checkoutRes.ok) {
    const text = await checkoutRes.text().catch(() => "");
    console.error("[checkout-redirect] Checkout API error:", checkoutRes.status, text);
    return NextResponse.redirect(new URL("/account/billing?billing=canceled", req.url));
  }

  const { url } = (await checkoutRes.json()) as { url?: string };

  if (!url) {
    return NextResponse.redirect(new URL("/account/billing?billing=canceled", req.url));
  }

  return NextResponse.redirect(url);
}
