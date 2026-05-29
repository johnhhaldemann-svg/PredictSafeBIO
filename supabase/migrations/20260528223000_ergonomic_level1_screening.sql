create table public.inspection_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inspection_type text not null,
  title text not null,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'in_review', 'closed')),
  source_module text,
  source_record_id uuid,
  location text,
  department_trade text,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ergonomic_self_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inspection_record_id uuid references public.inspection_records(id) on delete set null,
  task_type text not null check (task_type in ('lifting', 'pushing_pulling', 'reaching_overhead', 'repetitive_work', 'other')),
  discomfort_level text not null check (discomfort_level in ('easy', 'somewhat_tiring', 'very_tiring', 'extremely_tiring')),
  body_parts text[] not null default '{}',
  frequency text not null check (frequency in ('rarely', 'sometimes', 'often', 'all_day')),
  comments text,
  location text,
  department_trade text,
  submitter_id uuid references auth.users(id) on delete set null,
  risk_score integer not null check (risk_score between 0 and 9),
  risk_level text not null check (risk_level in ('low', 'moderate', 'high', 'severe')),
  main_risk_drivers text[] not null default '{}',
  recommended_next_steps text[] not null default '{}',
  ai_insight text not null,
  escalation_status text not null default 'none' check (
    escalation_status in (
      'none',
      'monitor',
      'supervisor_review_recommended',
      'advanced_evaluation_requested',
      'corrective_action_recommended'
    )
  ),
  repeated_moderate_flag boolean not null default false,
  corrective_action_recommended boolean not null default false,
  level_2_request_id uuid,
  signal_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ergonomic_risk_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  self_assessment_id uuid not null references public.ergonomic_self_assessments(id) on delete cascade,
  signal_type text not null default 'ergonomic_level_1_screening',
  payload jsonb not null default '{}'::jsonb,
  risk_score integer not null check (risk_score between 0 and 9),
  risk_level text not null check (risk_level in ('low', 'moderate', 'high', 'severe')),
  escalation_status text not null,
  created_at timestamptz not null default now()
);

create table public.ergonomic_advanced_evaluation_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  self_assessment_id uuid not null references public.ergonomic_self_assessments(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'assigned', 'in_review', 'completed', 'cancelled')),
  request_reason text,
  level_2_scope text[] not null default array[
    'measurements',
    'photos',
    'industrial ergonomic equation data points',
    'specialist review',
    'formal recommendations',
    'corrective actions'
  ],
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ergonomic_self_assessments
  add constraint ergonomic_self_assessments_level_2_request_fk
  foreign key (level_2_request_id)
  references public.ergonomic_advanced_evaluation_requests(id)
  on delete set null;

create index inspection_records_org_created_at_idx on public.inspection_records(organization_id, created_at desc);
create index inspection_records_type_idx on public.inspection_records(organization_id, inspection_type, created_at desc);
create index ergonomic_self_assessments_org_created_at_idx on public.ergonomic_self_assessments(organization_id, created_at desc);
create index ergonomic_self_assessments_context_idx on public.ergonomic_self_assessments(
  organization_id,
  task_type,
  location,
  department_trade,
  created_at desc
);
create index ergonomic_self_assessments_risk_idx on public.ergonomic_self_assessments(organization_id, risk_level, created_at desc);
create index ergonomic_risk_signals_org_created_at_idx on public.ergonomic_risk_signals(organization_id, created_at desc);
create index ergonomic_risk_signals_self_assessment_idx on public.ergonomic_risk_signals(self_assessment_id);
create index ergonomic_advanced_evaluation_requests_org_created_at_idx on public.ergonomic_advanced_evaluation_requests(
  organization_id,
  created_at desc
);
create index ergonomic_advanced_evaluation_requests_self_assessment_idx on public.ergonomic_advanced_evaluation_requests(
  self_assessment_id
);

grant select, insert, update, delete on public.inspection_records to authenticated;
grant select, insert, update, delete on public.ergonomic_self_assessments to authenticated;
grant select, insert, update, delete on public.ergonomic_risk_signals to authenticated;
grant select, insert, update, delete on public.ergonomic_advanced_evaluation_requests to authenticated;

alter table public.inspection_records enable row level security;
alter table public.ergonomic_self_assessments enable row level security;
alter table public.ergonomic_risk_signals enable row level security;
alter table public.ergonomic_advanced_evaluation_requests enable row level security;

create policy "inspection_records_member_all"
  on public.inspection_records for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "ergonomic_self_assessments_member_all"
  on public.ergonomic_self_assessments for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "ergonomic_risk_signals_member_all"
  on public.ergonomic_risk_signals for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "ergonomic_advanced_evaluation_requests_member_all"
  on public.ergonomic_advanced_evaluation_requests for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
