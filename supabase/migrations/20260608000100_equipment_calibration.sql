-- ============================================================================
-- Equipment & Calibration Registry
-- Tracks safety-critical and GxP-controlled equipment, PM schedules, and
-- calibration records. Overdue items surface in the Risk Monitor.
-- ============================================================================

create table if not exists public.equipment_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  equipment_type text not null default 'other'
    check (equipment_type in (
      'bsc','fume_hood','autoclave','centrifuge','balance',
      'temperature_unit','ph_meter','pipette','gas_detector','eyewash','other'
    )),
  location text,
  department text,
  serial_number text,
  manufacturer text,
  last_calibrated date,
  calibration_frequency text not null default 'annual'
    check (calibration_frequency in ('monthly','quarterly','semiannual','annual','biennial','as_needed')),
  next_due date,
  certificate_url text,
  status text not null default 'current'
    check (status in ('current','due_soon','overdue','retired')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists equipment_records_org_idx    on public.equipment_records(organization_id);
create index if not exists equipment_records_status_idx on public.equipment_records(status);

grant select, insert, update, delete on public.equipment_records to authenticated;

alter table public.equipment_records enable row level security;

create policy "equipment_records_member_all"
  on public.equipment_records for all to authenticated
  using (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ))
  with check (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ));
