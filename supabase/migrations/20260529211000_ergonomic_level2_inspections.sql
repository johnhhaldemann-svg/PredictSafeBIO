create table public.ergonomic_level2_inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  advanced_evaluation_request_id uuid references public.ergonomic_advanced_evaluation_requests(id) on delete set null,
  inspection_record_id uuid references public.inspection_records(id) on delete set null,
  source_self_assessment_id uuid references public.ergonomic_self_assessments(id) on delete set null,
  source_audit_id uuid references public.audits(id) on delete set null,
  evaluator_id uuid references auth.users(id) on delete set null,
  source_context text not null check (source_context in ('request', 'audit')),
  status text not null default 'draft' check (status in ('draft', 'submitted_for_review', 'in_review', 'recommendations_issued', 'closed')),
  task_type text not null check (task_type in ('lifting', 'pushing_pulling', 'reaching_overhead', 'repetitive_work', 'other')),
  task_description text not null,
  location text,
  department_trade text,
  measurement_payload jsonb not null default '{}'::jsonb,
  photo_evidence jsonb not null default '{}'::jsonb,
  specialist_notes text not null,
  formal_recommendations text[] not null default '{}',
  corrective_action_recommended boolean not null default false,
  risk_summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ergonomic_level2_inspections_org_created_at_idx on public.ergonomic_level2_inspections(organization_id, created_at desc);
create index ergonomic_level2_inspections_request_idx on public.ergonomic_level2_inspections(advanced_evaluation_request_id);
create index ergonomic_level2_inspections_audit_idx on public.ergonomic_level2_inspections(source_audit_id);
create index ergonomic_level2_inspections_status_idx on public.ergonomic_level2_inspections(organization_id, status, created_at desc);

grant select, insert, update, delete on public.ergonomic_level2_inspections to authenticated;

alter table public.ergonomic_level2_inspections enable row level security;

create policy "ergonomic_level2_inspections_member_all"
  on public.ergonomic_level2_inspections for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
