-- ============================================================================
-- Manual v1.1 alignment — Program Applicability Log (§5)
-- Records why each program was activated / disabled / left pending.
-- ============================================================================
create table if not exists public.program_applicability_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_name text not null,
  status text not null default 'pending' check (status in ('enabled','disabled','pending')),
  trigger_type text check (trigger_type in ('setup_answer','manual_override','regulatory','equipment','material')),
  trigger_description text,
  activated_by uuid references public.profiles(id) on delete set null,
  activated_at timestamptz not null default now(),
  disabled_rationale text,
  revalidation_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pal_org_idx on public.program_applicability_log(organization_id);
create index if not exists pal_org_status_idx on public.program_applicability_log(organization_id, status);

grant select, insert, update, delete on public.program_applicability_log to authenticated;
alter table public.program_applicability_log enable row level security;

create policy "pal_member_all"
  on public.program_applicability_log for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
