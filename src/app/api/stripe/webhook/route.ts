/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events, verifies the signature, and syncs
 * subscription + billing state into our database. Idempotent via
 * recordBillingEvent() (keyed on stripe_event_id).
 *
 * Required env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import {
  setSubscription,
  recordBillingEvent,
  getOrgSubscription,
} from "@/lib/supabase/billing-service";

// Stripe needs the raw, unparsed body for signature verification.
export const runtime = "nodejs";

function isoOrNull(seconds: number | null | undefined): string | null {
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured (missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET)." },
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

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: import("stripe").default.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const organizationId = session.metadata?.organization_id;
        const planId = session.metadata?.plan_id;

        if (!organizationId || !planId) {
          console.warn("[stripe/webhook] checkout.session.completed missing metadata", {
            event_id: event.id,
            has_org: !!organizationId,
            has_plan: !!planId,
          });
        }

        if (organizationId && planId) {
          // Pull the subscription to capture period + status details.
          let sub: any = null;
          if (session.subscription) {
            sub = await stripe.subscriptions.retrieve(String(session.subscription));
          }

          await setSubscription(organizationId, planId, {
            stripe_customer_id: session.customer ? String(session.customer) : undefined,
            stripe_subscription_id: sub?.id ?? (session.subscription ? String(session.subscription) : undefined),
            status: sub?.status ?? "active",
            current_period_start: isoOrNull(sub?.current_period_start) ?? undefined,
            current_period_end: isoOrNull(sub?.current_period_end) ?? undefined,
            trial_end_at: isoOrNull(sub?.trial_end),
            cancel_at_period_end: sub?.cancel_at_period_end ?? false,
            last_payment_at: new Date().toISOString(),
          });
        }

        await recordBillingEvent({
          organization_id: organizationId ?? null,
          stripe_event_id: event.id,
          event_type: event.type,
          amount_cents: session.amount_total ?? null,
          currency: session.currency ?? null,
          invoice_id: session.invoice ? String(session.invoice) : null,
          payload: session as Record<string, unknown>,
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const organizationId = sub.metadata?.organization_id;
        const planId = sub.metadata?.plan_id;

        // Prefer metadata; fall back to the existing row so we keep the plan link.
        let orgId = organizationId ?? null;
        let resolvedPlanId = planId ?? null;
        if (!orgId || !resolvedPlanId) {
          // Best-effort: find our row by org if metadata is present, else skip the sync.
          if (orgId) {
            const existing = await getOrgSubscription(orgId);
            resolvedPlanId = resolvedPlanId ?? existing?.plan_id ?? null;
          }
        }

        if (orgId && resolvedPlanId) {
          await setSubscription(orgId, resolvedPlanId, {
            stripe_customer_id: sub.customer ? String(sub.customer) : undefined,
            stripe_subscription_id: sub.id,
            status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
            current_period_start: isoOrNull(sub.current_period_start) ?? undefined,
            current_period_end: isoOrNull(sub.current_period_end) ?? undefined,
            trial_end_at: isoOrNull(sub.trial_end),
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            canceled_at: isoOrNull(sub.canceled_at),
          });
        }

        await recordBillingEvent({
          organization_id: orgId,
          stripe_event_id: event.id,
          event_type: event.type,
          payload: sub as Record<string, unknown>,
        });
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const organizationId = invoice.subscription_details?.metadata?.organization_id ?? null;

        await recordBillingEvent({
          organization_id: organizationId,
          stripe_event_id: event.id,
          event_type: event.type,
          amount_cents: invoice.amount_paid ?? invoice.amount_due ?? null,
          currency: invoice.currency ?? null,
          invoice_id: invoice.id ?? null,
          payload: invoice as Record<string, unknown>,
        });
        break;
      }

      default: {
        // Record unhandled events for the billing audit trail (idempotent).
        await recordBillingEvent({
          organization_id: null,
          stripe_event_id: event.id,
          event_type: event.type,
          payload: (event.data.object ?? {}) as unknown as Record<string, unknown>,
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
