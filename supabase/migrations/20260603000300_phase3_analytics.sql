-- Phase 3 — Analytics & Metrics
-- Adds: profile_views event table (PHI-free — no individual viewer tracking)
--
-- HIPAA compliance notes:
--   • No viewer_id stored — counts only, not identity-linked
--   • organization_id only — org-level attribution, never individual
--   • All export queries aggregate; raw exports exclude PHI columns
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profile_views (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.provider_profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  -- No viewer_id — we track impressions, not individuals (HIPAA)
  viewed_at       timestamptz not null default now()
);

alter table public.profile_views enable row level security;

-- Any authenticated org member can record a view for their org
create policy "profile_views_insert"
  on public.profile_views for insert
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

-- Admins can read all views (for aggregate analytics only)
create policy "profile_views_admin_select"
  on public.profile_views for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin')
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and role = 'superadmin'
    )
  );

-- Indexes for analytics queries
create index if not exists idx_profile_views_profile
  on public.profile_views(profile_id, viewed_at desc);

create index if not exists idx_profile_views_day
  on public.profile_views(date_trunc('day', viewed_at), profile_id);

create index if not exists idx_profile_views_org
  on public.profile_views(organization_id, viewed_at desc);
