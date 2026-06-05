-- ============================================================================
-- Exposure Map (Phase 3 — diagram Stage 2: Work & Exposure Mapping)
-- Additive migration. Org-scoped, RLS mirrors existing domain tables.
-- Models exposure pathways: who/what is exposed, in which lab, to which
-- material/hazard, by which route. Feeds the Predictive AI Safety Engine:
-- accumulating high-route, routine exposures fire early warnings.
-- ============================================================================

create table if not exists public.exposures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lab_id uuid references public.labs(id) on delete set null,
  hazard_id uuid references public.hazards(id) on delete set null,
  material text,
  person_role text,
  -- Exposure routes from the diagram, plus mucosal/other
  exposure_route text not null default 'other'
    check (exposure_route in ('inhalation', 'skin', 'injection', 'ingestion', 'mucosal', 'other')),
  frequency text not null default 'occasional'
    check (frequency in ('routine', 'occasional', 'rare')),
  status text not null default 'active'
    check (status in ('active', 'mitigated', 'retired')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists exposures_org_idx on public.exposures(organization_id);
create index if not exists exposures_lab_idx on public.exposures(lab_id);
create index if not exists exposures_hazard_idx on public.exposures(hazard_id);

grant select, insert, update, delete on public.exposures to authenticated;

alter table public.exposures enable row level security;

create policy "exposures_member_all"
  on public.exposures for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
