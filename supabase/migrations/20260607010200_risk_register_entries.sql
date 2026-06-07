-- ============================================================================
-- Manual v1.1 alignment — Risk Register Entries (§6) — core register.
-- Other manual tables FK to this (calendar, risk_cells, inspections, tasks).
-- ============================================================================
create table if not exists public.risk_register_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  area text,
  process text,
  risk_item text not null,
  source_basis text,
  control_type text check (control_type in ('engineering','administrative','ppe','training','inspection','permit','committee')),
  control_description text,
  frequency text check (frequency in ('daily','weekly','monthly','quarterly','annual','event_triggered','per_change','before_use','per_batch')),
  qualified_reviewer_id uuid references public.profiles(id) on delete set null,
  evidence_required text[] not null default '{}',
  inherent_risk text check (inherent_risk in ('low','medium','high','critical')),
  control_effectiveness text,
  residual_risk text check (residual_risk in ('low','medium','high','critical')),
  status text not null default 'draft'
    check (status in ('draft','pending_review','active','restricted','overdue','closed_with_evidence','retired')),
  overdue boolean not null default false,
  open_capa_count integer not null default 0,
  action_owner_id uuid references public.profiles(id) on delete set null,
  due_date date,
  audit_question text,
  ai_recommendation text,
  program_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rre_org_idx on public.risk_register_entries(organization_id);
create index if not exists rre_org_status_idx on public.risk_register_entries(organization_id, status);
create index if not exists rre_overdue_idx on public.risk_register_entries(organization_id) where overdue = true;

grant select, insert, update, delete on public.risk_register_entries to authenticated;
alter table public.risk_register_entries enable row level security;

create policy "rre_member_all"
  on public.risk_register_entries for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
