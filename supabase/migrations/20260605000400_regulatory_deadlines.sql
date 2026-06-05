-- Regulatory deadlines — cross-tenant compliance calendar
--
-- Surfaces upcoming regulatory obligations on the Super Admin Command Center
-- and (later) per-org views. A row with organization_id = NULL is a
-- platform-wide / "All Sites" obligation visible to every tenant; a row with an
-- organization_id is scoped to that single org.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.regulatory_deadlines (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade, -- NULL = platform-wide / all tenants
  title           text not null,
  regulation_ref  text not null default '',
  site_label      text not null default 'All Sites',
  due_date        date not null,
  status          text not null default 'upcoming'
                    check (status in ('upcoming', 'due_soon', 'overdue', 'complete')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists regulatory_deadlines_due_idx
  on public.regulatory_deadlines(due_date);
create index if not exists regulatory_deadlines_org_due_idx
  on public.regulatory_deadlines(organization_id, due_date);

grant select, insert, update, delete on public.regulatory_deadlines to authenticated;

alter table public.regulatory_deadlines enable row level security;

-- Read: platform-wide rows are visible to everyone; org rows to that org's
-- members; platform staff / superadmin see all rows.
create policy "regulatory_deadlines_select"
  on public.regulatory_deadlines for select to authenticated
  using (
    organization_id is null
    or organization_id in (
      select organization_id from public.profiles where profiles.id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('superadmin', 'platform_staff')
    )
  );

-- Write: org owners may manage their org's rows; platform staff / superadmin may
-- manage any row, including platform-wide (NULL) obligations.
create policy "regulatory_deadlines_insert"
  on public.regulatory_deadlines for insert to authenticated
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'owner'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('superadmin', 'platform_staff')
    )
  );

create policy "regulatory_deadlines_update"
  on public.regulatory_deadlines for update to authenticated
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'owner'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('superadmin', 'platform_staff')
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'owner'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('superadmin', 'platform_staff')
    )
  );

create policy "regulatory_deadlines_delete"
  on public.regulatory_deadlines for delete to authenticated
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'owner'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('superadmin', 'platform_staff')
    )
  );

-- Seed: platform-wide (NULL org) federal EHS reference deadlines so the Command
-- Center renders real obligations out of the box. These are recurring US federal
-- deadlines; org-specific deadlines are added per tenant later.
insert into public.regulatory_deadlines (organization_id, title, regulation_ref, site_label, due_date)
values
  (null, 'EPA TRI Reporting (Form R)',          'EPCRA §313',          'All Sites', date '2026-07-01'),
  (null, 'OSHA 300A Posting Period Begins',      'OSHA 29 CFR 1904',    'All Sites', date '2027-02-01'),
  (null, 'EPCRA Tier II Inventory Report',       'EPCRA Tier II',       'All Sites', date '2027-03-01'),
  (null, 'OSHA Form 300A Electronic Submission', 'OSHA 29 CFR 1904.41', 'All Sites', date '2027-03-02')
on conflict do nothing;
