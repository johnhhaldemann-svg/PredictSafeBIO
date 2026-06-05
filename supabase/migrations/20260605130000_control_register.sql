-- ============================================================================
-- Control Register (Phase 2 — diagram Stage 5: Control Selection & Planning)
-- Additive migration. Org-scoped, RLS mirrors existing domain tables.
-- Ties a control to a hazard and ranks it by the hierarchy of controls.
-- Feeds the Predictive AI Safety Engine: controls reduce a hazard's residual
-- predicted risk; overdue verification raises it again.
-- ============================================================================

create table if not exists public.controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hazard_id uuid references public.hazards(id) on delete cascade,
  name text not null,
  -- Hierarchy of controls (NIOSH), most to least effective
  control_type text not null default 'administrative'
    check (control_type in ('elimination', 'substitution', 'engineering', 'administrative', 'ppe')),
  status text not null default 'planned'
    check (status in ('planned', 'in_place', 'verified', 'retired')),
  description text,
  owner_role text,
  verification_due date,
  last_verified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists controls_org_idx on public.controls(organization_id);
create index if not exists controls_hazard_idx on public.controls(hazard_id);

grant select, insert, update, delete on public.controls to authenticated;

alter table public.controls enable row level security;

create policy "controls_member_all"
  on public.controls for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
