/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Billing Portal session and redirects the customer there.
 * The portal lets customers:
 *   - Update their payment method
 *   - View and download invoice PDFs
 *   - Cancel or reactivate their subscription
 *
 * Auth: requires admin/owner role.
 * PCI: No card data touches our server — Stripe hosts the portal entirely.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminOrAbove } from "@/lib/role-permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // Auth gate
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  let stripe: import("stripe").default;
  try {
     
    const Stripe = require("stripe");
    stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  } catch {
    return NextResponse.json({ error: "Stripe package not installed" }, { status: 503 });
  }

  // Look up Stripe customer ID for this org
  const orgId = profile?.organization_id;
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
   
  const { data: sub } = await (admin as any)
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", orgId)
    .maybeSingle();

   
  const customerId = (sub as any)?.stripe_customer_id;

  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer found. Upgrade to a paid plan first." },
      { status: 404 }
    );
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/account/billing`,
  });

  return NextResponse.json({ url: session.url });
}
