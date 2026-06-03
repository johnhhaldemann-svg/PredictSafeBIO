-- Phase 4 — Billing & Subscriptions
-- Tables: subscription_plans, subscriptions, billing_events, manual_billing_overrides
--
-- PCI compliance: card data is NEVER stored here.
-- Stripe handles all payment processing. We store only Stripe IDs and metadata.
-- billing_events is immutable (INSERT only, no DELETE policy) — audit requirement.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. subscription_plans — tier definitions (managed by superadmin)
create table if not exists public.subscription_plans (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,          -- "Free", "Basic", "Pro"
  tier             text not null unique
    check (tier in ('free', 'basic', 'pro', 'enterprise')),
  price_cents      integer not null default 0,   -- monthly price in USD cents
  currency         text not null default 'usd',
  stripe_price_id  text,                   -- Stripe Price ID (price_xxx) — null for free tier
  features         jsonb not null default '[]'::jsonb,  -- feature list array
  max_providers    integer,               -- null = unlimited
  max_patients     integer,
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;

-- All authenticated users can see active plans (for checkout UI)
create policy "subscription_plans_select"
  on public.subscription_plans for select
  using (is_active = true or exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and role in ('superadmin', 'admin', 'owner', 'company_admin')
  ));

-- Only superadmins can manage plans
create policy "subscription_plans_superadmin_all"
  on public.subscription_plans for all
  using (exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and role = 'superadmin'
  ));

-- 2. subscriptions — one per organization
create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  plan_id                  uuid not null references public.subscription_plans(id),
  -- Stripe identifiers (no card data ever stored here)
  stripe_customer_id       text unique,    -- cus_xxx
  stripe_subscription_id   text unique,    -- sub_xxx
  -- Status mirrors Stripe subscription status
  status                   text not null default 'active'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused', 'incomplete')),
  -- Billing periods (synced from Stripe webhooks)
  trial_end_at             timestamptz,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  canceled_at              timestamptz,
  -- Last invoice data (cached from Stripe, no raw card data)
  last_invoice_id          text,          -- in_xxx
  last_invoice_status      text,
  last_payment_at          timestamptz,
  -- Manual override flags
  is_manually_managed      boolean not null default false,
  override_note            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Org members see their own subscription
create policy "subscriptions_org_select"
  on public.subscriptions for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

-- Superadmins see all
create policy "subscriptions_superadmin_select"
  on public.subscriptions for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and role = 'superadmin'
  ));

-- Only service role (via webhook handler) can insert/update
-- We do NOT create app-layer insert/update policies — all writes go through
-- the service-role client in the webhook handler.

create index if not exists idx_subscriptions_org       on public.subscriptions(organization_id);
create index if not exists idx_subscriptions_status    on public.subscriptions(status);
create index if not exists idx_subscriptions_stripe_cust on public.subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_stripe_sub  on public.subscriptions(stripe_subscription_id);
create index if not exists idx_subscriptions_plan      on public.subscriptions(plan_id);

-- 3. billing_events — immutable payment & event log
--    NEVER DELETE from this table. It is the source of truth for revenue audit.
create table if not exists public.billing_events (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete set null,
  subscription_id   uuid references public.subscriptions(id) on delete set null,
  -- Stripe event deduplication — one row per stripe event
  stripe_event_id   text unique,          -- evt_xxx
  event_type        text not null,        -- Stripe event type string
  -- Payment data (no card numbers — amounts only)
  amount_cents      integer,
  currency          text,
  invoice_id        text,                 -- in_xxx
  -- Full Stripe event payload for audit
  payload           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
  -- NO updated_at — this table is append-only
);

alter table public.billing_events enable row level security;

-- Superadmins see all billing events
create policy "billing_events_superadmin_select"
  on public.billing_events for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and role in ('superadmin', 'admin', 'owner', 'company_admin')
  ));

-- Org members see their own billing history
create policy "billing_events_org_select"
  on public.billing_events for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

-- INSERT only via service role (no app-layer insert policy — webhook uses service role)

create index if not exists idx_billing_events_org     on public.billing_events(organization_id, created_at desc);
create index if not exists idx_billing_events_sub     on public.billing_events(subscription_id, created_at desc);
create index if not exists idx_billing_events_type    on public.billing_events(event_type, created_at desc);
create index if not exists idx_billing_events_stripe  on public.billing_events(stripe_event_id);

-- 4. manual_billing_overrides — superadmin grants trials, discounts, extensions
create table if not exists public.manual_billing_overrides (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  override_type    text not null
    check (override_type in ('free_trial', 'discount_pct', 'extension_days', 'plan_downgrade', 'plan_upgrade')),
  -- Value semantics depend on type:
  --   free_trial      → value = trial days (integer)
  --   discount_pct    → value = percentage off (0-100)
  --   extension_days  → value = extra days added
  --   plan_downgrade/upgrade → value = target plan tier ('free'/'basic'/'pro')
  value            text not null,
  expires_at       timestamptz,
  reason           text not null,    -- required note explaining why
  is_active        boolean not null default true,
  applied_at       timestamptz,      -- when the override was actually applied to Stripe
  created_by       uuid not null references auth.users(id) on delete restrict,
  created_at       timestamptz not null default now()
);

alter table public.manual_billing_overrides enable row level security;

-- Superadmins see and manage all overrides
create policy "manual_overrides_superadmin_all"
  on public.manual_billing_overrides for all
  using (exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and role in ('superadmin', 'admin', 'owner', 'company_admin')
  ));

-- Org members can see overrides applied to their org
create policy "manual_overrides_org_select"
  on public.manual_billing_overrides for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

create index if not exists idx_manual_overrides_org    on public.manual_billing_overrides(organization_id, created_at desc);
create index if not exists idx_manual_overrides_active on public.manual_billing_overrides(is_active, expires_at);

-- 5. Seed the three default plans
insert into public.subscription_plans (name, tier, price_cents, stripe_price_id, features, max_providers, max_patients, sort_order)
values
  (
    'Free',
    'free',
    0,
    null,
    '["1 provider profile","Up to 5 patient bios","Basic bio moderation","Email support"]'::jsonb,
    1,
    5,
    0
  ),
  (
    'Basic',
    'basic',
    4900,
    null,
    '["Up to 10 provider profiles","Up to 50 patient bios","Priority moderation queue","NPI verification","Analytics dashboard","Email support"]'::jsonb,
    10,
    50,
    1
  ),
  (
    'Pro',
    'pro',
    9900,
    null,
    '["Unlimited provider profiles","Unlimited patient bios","Instant moderation","Full analytics + CSV exports","API access","Dedicated support","Custom domain"]'::jsonb,
    null,
    null,
    2
  )
on conflict (tier) do nothing;
