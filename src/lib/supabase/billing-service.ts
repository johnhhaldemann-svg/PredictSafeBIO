/**
 * billing-service.ts
 *
 * Phase 4 — Billing & Subscriptions.
 * All mutations go through Stripe or the service-role client.
 * No card data is ever read or written here.
 */

import { getSupabaseAdminClient } from "./admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SubscriptionPlan = {
  id: string;
  name: string;
  tier: "small_lab" | "growth" | "enterprise" | "strategic";
  price_cents: number;
  currency: string;
  stripe_price_id: string | null;
  features: string[];
  max_providers: number | null;
  max_patients: number | null;
  is_active: boolean;
  sort_order: number;
};

export type Subscription = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  plan_id: string;
  plan_name: string;
  plan_tier: string;
  price_cents: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  trial_end_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  last_payment_at: string | null;
  is_manually_managed: boolean;
  created_at: string;
};

export type BillingEvent = {
  id: string;
  organization_id: string | null;
  organization_name: string | null;
  stripe_event_id: string | null;
  event_type: string;
  amount_cents: number | null;
  currency: string | null;
  invoice_id: string | null;
  created_at: string;
};

export type ManualOverride = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  override_type: string;
  value: string;
  expires_at: string | null;
  reason: string;
  is_active: boolean;
  applied_at: string | null;
  created_by: string;
  creator_name: string | null;
  created_at: string;
};

export type RevenueSummary = {
  mrr_cents: number;               // Monthly Recurring Revenue
  arr_cents: number;               // ARR = MRR * 12
  active_subscriptions: number;
  trialing_subscriptions: number;
  canceled_this_month: number;
  churn_rate_pct: number;
  by_tier: Record<string, { count: number; mrr_cents: number }>;
  revenue_30d_cents: number;       // actual payments last 30 days
};

// ── Plans ─────────────────────────────────────────────────────────────────────

export async function listPlans(includeInactive = false): Promise<SubscriptionPlan[]> {
  const admin = getSupabaseAdminClient();
   
  let q = (admin as any).from("subscription_plans").select("*").order("sort_order");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data } = await q;
   
  return ((data ?? []) as any[]).map((p: any) => ({
    id: p.id,
    name: p.name,
    tier: p.tier,
    price_cents: p.price_cents,
    currency: p.currency,
    stripe_price_id: p.stripe_price_id ?? null,
    features: p.features ?? [],
    max_providers: p.max_providers ?? null,
    max_patients: p.max_patients ?? null,
    is_active: p.is_active,
    sort_order: p.sort_order,
  }));
}

export async function upsertPlan(
  plan: Partial<SubscriptionPlan> & { tier: string },
  actorId: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
  const payload = {
    ...plan,
    created_by: actorId,
    updated_at: new Date().toISOString(),
  };
   
  const { error } = await (admin as any)
    .from("subscription_plans")
    .upsert(payload, { onConflict: "tier" });
  return { error: error?.message ?? null };
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function listSubscriptions(
  filters: { status?: string; tier?: string } = {}
): Promise<Subscription[]> {
  const admin = getSupabaseAdminClient();
   
  let q = (admin as any)
    .from("subscriptions")
    .select("*, organizations(name), subscription_plans(name, tier, price_cents)")
    .order("created_at", { ascending: false });

  if (filters.status) q = q.eq("status", filters.status);
  const { data } = await q;

   
  let rows = ((data ?? []) as any[]).map((s: any) => ({
    id: s.id,
    organization_id: s.organization_id,
    organization_name: s.organizations?.name ?? null,
    plan_id: s.plan_id,
    plan_name: s.subscription_plans?.name ?? "Unknown",
    plan_tier: s.subscription_plans?.tier ?? "free",
    price_cents: s.subscription_plans?.price_cents ?? 0,
    stripe_customer_id: s.stripe_customer_id ?? null,
    stripe_subscription_id: s.stripe_subscription_id ?? null,
    status: s.status,
    trial_end_at: s.trial_end_at ?? null,
    current_period_end: s.current_period_end ?? null,
    cancel_at_period_end: s.cancel_at_period_end,
    canceled_at: s.canceled_at ?? null,
    last_payment_at: s.last_payment_at ?? null,
    is_manually_managed: s.is_manually_managed,
    created_at: s.created_at,
  }));

  if (filters.tier) rows = rows.filter(r => r.plan_tier === filters.tier);
  return rows;
}

export async function getOrgSubscription(organizationId: string): Promise<Subscription | null> {
  const subs = await listSubscriptions();
  return subs.find(s => s.organization_id === organizationId) ?? null;
}

export async function setSubscription(
  organizationId: string,
  planId: string,
  stripeData: {
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    status?: string;
    current_period_start?: string;
    current_period_end?: string;
    trial_end_at?: string | null;
    cancel_at_period_end?: boolean;
    canceled_at?: string | null;
    last_invoice_id?: string;
    last_invoice_status?: string;
    last_payment_at?: string | null;
  }
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();
   
  const { error } = await (admin as any)
    .from("subscriptions")
    .upsert(
      {
        organization_id: organizationId,
        plan_id: planId,
        ...stripeData,
        updated_at: now,
      },
      { onConflict: "organization_id" }
    );
  return { error: error?.message ?? null };
}

// ── Billing events ────────────────────────────────────────────────────────────

export async function recordBillingEvent(event: {
  organization_id?: string | null;
  subscription_id?: string | null;
  stripe_event_id: string;
  event_type: string;
  amount_cents?: number | null;
  currency?: string | null;
  invoice_id?: string | null;
  payload: Record<string, unknown>;
}): Promise<{ error: string | null; alreadyProcessed: boolean }> {
  const admin = getSupabaseAdminClient();
  // Check idempotency — skip if already processed
   
  const { data: existing } = await (admin as any)
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", event.stripe_event_id)
    .maybeSingle();

  if (existing) return { error: null, alreadyProcessed: true };

   
  const { error } = await (admin as any).from("billing_events").insert(event);
  return { error: error?.message ?? null, alreadyProcessed: false };
}

export async function listBillingEvents(
  organizationId?: string,
  limit = 50
): Promise<BillingEvent[]> {
  const admin = getSupabaseAdminClient();
   
  let q = (admin as any)
    .from("billing_events")
    .select("*, organizations(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (organizationId) q = q.eq("organization_id", organizationId);
  const { data } = await q;

   
  return ((data ?? []) as any[]).map((e: any) => ({
    id: e.id,
    organization_id: e.organization_id ?? null,
    organization_name: e.organizations?.name ?? null,
    stripe_event_id: e.stripe_event_id ?? null,
    event_type: e.event_type,
    amount_cents: e.amount_cents ?? null,
    currency: e.currency ?? null,
    invoice_id: e.invoice_id ?? null,
    created_at: e.created_at,
  }));
}

// ── Manual overrides ──────────────────────────────────────────────────────────

export async function listManualOverrides(organizationId?: string): Promise<ManualOverride[]> {
  const admin = getSupabaseAdminClient();
   
  let q = (admin as any)
    .from("manual_billing_overrides")
    .select("*, organizations(name), profiles!manual_billing_overrides_created_by_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (organizationId) q = q.eq("organization_id", organizationId);
  const { data } = await q;

   
  return ((data ?? []) as any[]).map((o: any) => ({
    id: o.id,
    organization_id: o.organization_id,
    organization_name: o.organizations?.name ?? null,
    override_type: o.override_type,
    value: o.value,
    expires_at: o.expires_at ?? null,
    reason: o.reason,
    is_active: o.is_active,
    applied_at: o.applied_at ?? null,
    created_by: o.created_by,
    creator_name: o.profiles?.full_name ?? null,
    created_at: o.created_at,
  }));
}

export async function createManualOverride(
  actorId: string,
  override: {
    organization_id: string;
    override_type: string;
    value: string;
    expires_at?: string | null;
    reason: string;
  }
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
   
  const { error } = await (admin as any).from("manual_billing_overrides").insert({
    ...override,
    created_by: actorId,
  });
  return { error: error?.message ?? null };
}

export async function revokeManualOverride(
  overrideId: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
   
  const { error } = await (admin as any)
    .from("manual_billing_overrides")
    .update({ is_active: false })
    .eq("id", overrideId);
  return { error: error?.message ?? null };
}

// ── Revenue summary ───────────────────────────────────────────────────────────

export async function getRevenueSummary(): Promise<RevenueSummary> {
  const [subs, events] = await Promise.all([
    listSubscriptions(),
    listBillingEvents(undefined, 500),
  ]);

  const active    = subs.filter(s => s.status === "active");
  const trialing  = subs.filter(s => s.status === "trialing");

  // MRR = sum of active subscription monthly prices
  const mrr_cents = active.reduce((sum, s) => sum + s.price_cents, 0);

  // Canceled this month
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const canceled_this_month = subs.filter(
    s => s.canceled_at && new Date(s.canceled_at) >= monthStart
  ).length;

  // Simple churn = canceled / (active + canceled this month)
  const base = active.length + canceled_this_month;
  const churn_rate_pct = base > 0 ? Math.round((canceled_this_month / base) * 1000) / 10 : 0;

  // By tier
  const by_tier: Record<string, { count: number; mrr_cents: number }> = {};
  for (const s of active) {
    if (!by_tier[s.plan_tier]) by_tier[s.plan_tier] = { count: 0, mrr_cents: 0 };
    by_tier[s.plan_tier].count++;
    by_tier[s.plan_tier].mrr_cents += s.price_cents;
  }

  // Revenue last 30 days from billing_events
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const revenue_30d_cents = events
    .filter(e => e.event_type === "invoice.payment_succeeded" && e.created_at >= thirtyDaysAgo)
    .reduce((sum, e) => sum + (e.amount_cents ?? 0), 0);

  return {
    mrr_cents,
    arr_cents: mrr_cents * 12,
    active_subscriptions: active.length,
    trialing_subscriptions: trialing.length,
    canceled_this_month,
    churn_rate_pct,
    by_tier,
    revenue_30d_cents,
  };
}
