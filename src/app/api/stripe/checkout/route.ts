/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for upgrading a subscription.
 * The organization_id is embedded in session.metadata so the webhook
 * can link the Stripe subscription back to our org.
 *
 * Body: { planId: string; organizationId: string }
 * Returns: { url: string } — redirect to Stripe-hosted checkout
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminOrAbove } from "@/lib/role-permissions";

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

  // Stripe availability check
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Stripe not configured. Add STRIPE_SECRET_KEY to environment variables." },
      { status: 503 }
    );
  }

  let stripe: import("stripe").default;
  try {
     
    const Stripe = require("stripe");
    stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  } catch {
    return NextResponse.json({ error: "Stripe package not installed" }, { status: 503 });
  }

  const body = await req.json() as { planId?: string; organizationId?: string };
  const { planId, organizationId } = body;

  if (!planId || !organizationId) {
    return NextResponse.json({ error: "planId and organizationId are required" }, { status: 400 });
  }

  // Tenant boundary: a caller may only start checkout for their OWN organization.
  // Without this, an org admin could pass another org's id and (via the webhook)
  // hijack that org's subscription.
  if (organizationId !== profile?.organization_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Look up the Stripe price ID for this plan
  const { data: plan } = await supabase
    .from("subscription_plans" as never)
    .select("stripe_price_id, name, tier")
    .eq("id", planId)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

   
  const p = plan as any;
  if (!p.stripe_price_id) {
    return NextResponse.json(
      { error: "This plan does not have a Stripe price ID configured. Add it in Admin → Billing → Plans." },
      { status: 422 }
    );
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: p.stripe_price_id, quantity: 1 }],
    metadata: {
      organization_id: organizationId,
      plan_id:         planId,
    },
    success_url: `${origin}/account?billing=success`,
    cancel_url:  `${origin}/account?billing=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return NextResponse.json({ url: session.url });
}
