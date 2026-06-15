-- ============================================================================
-- Emergency Response: Steps + Contacts
-- Adds per-plan response step tracking and org-level emergency contact registry.
-- Extends core ERP tables from 20260608000200_emergency_response.sql
-- ============================================================================

-- ── Response steps ────────────────────────────────────────────────────────────
create table if not exists public.emergency_response_steps (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id)              on delete cascade,
  plan_id         uuid        not null references public.emergency_response_plans(id)   on delete cascade,
  step_number     int         not null default 0,
  text            text        not null,
  is_required     boolean     not null default false,
  completed_at    timestamptz,
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists er_steps_plan_idx on public.emergency_response_steps(plan_id);
create index if not exists er_steps_org_idx  on public.emergency_response_steps(organization_id);

grant select, insert, update, delete on public.emergency_response_steps to authenticated;
alter table public.emergency_response_steps enable row level security;

create policy "er_steps_member_all"
  on public.emergency_response_steps for all to authenticated
  using (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ))
  with check (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ));

-- ── Emergency contacts ────────────────────────────────────────────────────────
create table if not exists public.emergency_contacts (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id)            on delete cascade,
  plan_id         uuid        references public.emergency_response_plans(id)          on delete set null,
  name            text        not null,
  role            text        not null default '',
  phone           text        not null default '',
  contact_type    text        not null default 'internal'
                                check (contact_type in ('internal','external','emergency')),
  is_primary      boolean     not null default false,
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists er_contacts_org_idx  on public.emergency_contacts(organization_id);
create index if not exists er_contacts_plan_idx on public.emergency_contacts(plan_id);

grant select, insert, update, delete on public.emergency_contacts to authenticated;
alter table public.emergency_contacts enable row level security;

create policy "er_contacts_member_all"
  on public.emergency_contacts for all to authenticated
  using (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ))
  with check (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ));
