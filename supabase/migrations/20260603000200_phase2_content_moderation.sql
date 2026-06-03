-- Phase 2 — Content Moderation
-- Adds: review workflow on provider_profiles, bio_reports (Flag & Report), NPI verification
--
-- HIPAA compliance notes:
--   • is_public=false hides a bio from public view but never deletes data (reversible)
--   • All moderation decisions are audit-logged via audit_events
--   • bio_reports RLS: reporters can see own reports; admins see all in org
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add moderation workflow columns to provider_profiles
--    Mirrors the pattern used by ai_knowledge_entries.

alter table public.provider_profiles
  add column if not exists review_status text not null default 'pending'
    check (review_status in (
      'pending',           -- submitted, awaiting first review
      'approved',          -- live and publicly visible
      'changes_requested', -- reviewer sent notes back to provider
      'rejected',          -- permanently declined
      'taken_down'         -- temporarily hidden (reversible)
    )),
  add column if not exists is_public boolean not null default false,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,

  -- NPI verification checklist (7 items stored as a jsonb checklist)
  -- Each item: { checked: boolean, checked_at: string|null, checked_by: string|null }
  add column if not exists npi_verified boolean not null default false,
  add column if not exists npi_verified_at timestamptz,
  add column if not exists npi_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists npi_verification_notes text,
  add column if not exists npi_checklist jsonb not null default '{
    "format_valid":        {"checked": false, "checked_at": null},
    "nppes_match":         {"checked": false, "checked_at": null},
    "license_provided":    {"checked": false, "checked_at": null},
    "license_state_valid": {"checked": false, "checked_at": null},
    "credentials_match":   {"checked": false, "checked_at": null},
    "specialty_match":     {"checked": false, "checked_at": null},
    "no_disciplinary":     {"checked": false, "checked_at": null}
  }'::jsonb;

-- Index for the pending review queue
create index if not exists idx_provider_profiles_review_status
  on public.provider_profiles(review_status, submitted_at desc)
  where is_active = true;

create index if not exists idx_provider_profiles_is_public
  on public.provider_profiles(is_public)
  where is_active = true;

-- 2. bio_reports — Flag & Report system
--    Users flag provider bios; admins triage the queue.
create table if not exists public.bio_reports (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,

  -- What is being reported
  target_type      text not null check (target_type in ('provider_profile', 'patient_bio')),
  target_id        uuid not null,

  -- Who reported it and why
  reporter_id      uuid not null references auth.users(id) on delete cascade,
  reason           text not null check (reason in (
    'inaccurate_credentials',  -- NPI, license, or specialty is wrong
    'inappropriate_content',   -- offensive or off-topic content
    'suspected_fraud',         -- impersonation or fabricated credentials
    'privacy_concern',         -- PHI or personal data exposure
    'outdated_information',    -- stale credentials or status
    'other'
  )),
  details          text,  -- optional free-text from reporter

  -- Triage state
  status           text not null default 'pending'
    check (status in (
      'pending',    -- awaiting admin review
      'reviewed',   -- admin looked at it, no action needed
      'actioned',   -- admin took action (bio taken down, rejected, etc.)
      'dismissed'   -- report dismissed as unfounded
    )),
  reviewed_by      uuid references auth.users(id) on delete set null,
  reviewed_at      timestamptz,
  reviewer_notes   text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.bio_reports enable row level security;

-- Reporters can see their own reports
create policy "bio_reports_reporter_select"
  on public.bio_reports for select
  using (reporter_id = (select auth.uid()));

-- Admins and superadmins see all reports in their org
create policy "bio_reports_admin_select"
  on public.bio_reports for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin')
    )
  );

-- Any authenticated org member can file a report
create policy "bio_reports_insert"
  on public.bio_reports for insert
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
    and reporter_id = (select auth.uid())
  );

-- Only admins can update (triage) reports
create policy "bio_reports_admin_update"
  on public.bio_reports for update
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin')
    )
  );

-- Indexes for report queue
create index if not exists idx_bio_reports_org_status
  on public.bio_reports(organization_id, status, created_at desc);

create index if not exists idx_bio_reports_target
  on public.bio_reports(target_type, target_id);

create index if not exists idx_bio_reports_reporter
  on public.bio_reports(reporter_id);

create index if not exists idx_bio_reports_pending
  on public.bio_reports(organization_id, created_at desc)
  where status = 'pending';

-- 3. updated_at trigger for bio_reports
create or replace function public.set_bio_reports_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bio_reports_updated_at
  before update on public.bio_reports
  for each row execute function public.set_bio_reports_updated_at();
