-- ============================================================================
-- Manual v1.1 alignment — Compliance Calendar Items (§7)
-- Dated work generated from risk_register_entries frequencies.
-- ============================================================================
create table if not exists public.compliance_calendar_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  risk_register_entry_id uuid references public.risk_register_entries(id) on delete set null,
  task_name text not null,
  task_type text check (task_type in ('inspection','training','certification','committee_meeting','permit','capa','equipment_check','waste_pickup','event_triggered')),
  frequency text check (frequency in ('daily','weekly','monthly','quarterly','annual','event_triggered','per_change','before_use','per_batch')),
  due_date date,
  completed_at timestamptz,
  owner_id uuid references public.profiles(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  evidence_id text,
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','completed','overdue','cancelled')),
  escalation_triggered boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cci_org_idx on public.compliance_calendar_items(organization_id);
create index if not exists cci_org_due_idx on public.compliance_calendar_items(organization_id, due_date);
create index if not exists cci_rre_idx on public.compliance_calendar_items(risk_register_entry_id);

grant select, insert, update, delete on public.compliance_calendar_items to authenticated;
alter table public.compliance_calendar_items enable row level security;

create policy "cci_member_all"
  on public.compliance_calendar_items for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
