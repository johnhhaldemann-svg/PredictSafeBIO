-- ============================================================================
-- Emergency Response Plans & Drills
-- Tracks documented ERPs by scenario type and drill history.
-- Required under OSHA 29 CFR 1910.38 and NFPA 45.
-- ============================================================================

create table if not exists public.emergency_response_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_type text not null default 'other'
    check (plan_type in (
      'chemical_spill','biological_release','fire','medical',
      'power_failure','severe_weather','other'
    )),
  title text not null,
  description text,
  last_reviewed date,
  next_drill_date date,
  status text not null default 'draft'
    check (status in ('draft','current','needs_review')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.emergency_drills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid references public.emergency_response_plans(id) on delete set null,
  drill_date date not null,
  drill_type text,
  participants_count int,
  outcome text not null default 'satisfactory'
    check (outcome in ('satisfactory','needs_improvement','unsatisfactory')),
  notes text,
  conducted_by text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists erp_org_idx              on public.emergency_response_plans(organization_id);
create index if not exists emergency_drills_org_idx on public.emergency_drills(organization_id);
create index if not exists emergency_drills_plan_idx on public.emergency_drills(plan_id);

grant select, insert, update, delete on public.emergency_response_plans to authenticated;
grant select, insert, update, delete on public.emergency_drills             to authenticated;

alter table public.emergency_response_plans enable row level security;
alter table public.emergency_drills             enable row level security;

create policy "erp_member_all"
  on public.emergency_response_plans for all to authenticated
  using (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ))
  with check (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ));

create policy "emergency_drills_member_all"
  on public.emergency_drills for all to authenticated
  using (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ))
  with check (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ));
