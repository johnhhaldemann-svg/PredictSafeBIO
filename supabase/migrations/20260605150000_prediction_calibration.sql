-- ============================================================================
-- Prediction calibration store (Phase 4 — the learn-from-outcomes loop)
-- Additive migration. Org-scoped, RLS mirrors existing domain tables.
-- Logs predictions so the Predictive AI Safety Engine can later compare them to
-- actual outcomes and calibrate. Until enough outcomes are confirmed, forecasts
-- remain uncalibrated "early indicators" (enforced in code).
-- ============================================================================

create table if not exists public.prediction_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_cell_id uuid references public.risk_cells(id) on delete set null,
  linked_record_type text,
  linked_record_id uuid,
  predicted_level text,
  predicted_score integer,
  predicted_at timestamptz not null default now(),
  outcome text not null default 'pending'
    check (outcome in ('pending', 'incident_occurred', 'near_miss', 'no_incident', 'controlled')),
  outcome_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prediction_outcomes_org_idx on public.prediction_outcomes(organization_id);
create index if not exists prediction_outcomes_outcome_idx on public.prediction_outcomes(outcome);

grant select, insert, update, delete on public.prediction_outcomes to authenticated;

alter table public.prediction_outcomes enable row level security;

create policy "prediction_outcomes_member_all"
  on public.prediction_outcomes for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
