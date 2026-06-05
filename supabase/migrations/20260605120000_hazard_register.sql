-- ============================================================================
-- Hazard Register (Phase 1 — diagram Stage 3: Hazard Identification)
-- Additive migration. Org-scoped, RLS mirrors existing domain tables.
-- A first-class hazard inventory that also seeds the Predictive AI Safety
-- Engine with leading indicators (each hazard becomes a risk_cell precursor).
-- ============================================================================

create table if not exists public.hazards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lab_id uuid references public.labs(id) on delete set null,
  name text not null,
  -- Diagram Stage 3 domains: biological, chemical, ergonomic, radiation,
  -- laser, electrical, fire, equipment, other
  hazard_type text not null default 'other',
  -- Predictive linkage: maps to a bio-ai risk family id (risk-families.ts)
  risk_family text,
  bsl_level text,
  containment text,
  location text,
  associated_material text,
  status text not null default 'identified'
    check (status in ('identified', 'assessed', 'controlled', 'retired')),
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists hazards_org_idx on public.hazards(organization_id);
create index if not exists hazards_lab_idx on public.hazards(lab_id);

grant select, insert, update, delete on public.hazards to authenticated;

alter table public.hazards enable row level security;

create policy "hazards_member_all"
  on public.hazards for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
