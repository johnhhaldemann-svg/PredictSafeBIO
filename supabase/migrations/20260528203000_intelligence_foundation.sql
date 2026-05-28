create table public.company_intake_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  version_label text not null default 'v1',
  active boolean not null default true,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, version_label)
);

create table public.company_intake_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_profile_id uuid references public.company_profiles(id) on delete set null,
  intake_template_id uuid references public.company_intake_templates(id) on delete set null,
  question_key text not null,
  answer_value jsonb not null default '{}'::jsonb,
  triggers_documents jsonb not null default '[]'::jsonb,
  triggers_programs jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.compliance_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_name text not null,
  program_type text not null default 'core',
  description text,
  owner_role text,
  reviewer_role text,
  status text not null default 'draft_human_review_required',
  review_frequency_months integer,
  linked_documents jsonb not null default '[]'::jsonb,
  linked_training jsonb not null default '[]'::jsonb,
  linked_methods jsonb not null default '[]'::jsonb,
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, program_name)
);

create table public.compliance_methods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  method_name text not null,
  method_type text not null default 'deterministic',
  purpose text,
  input_requirements jsonb not null default '[]'::jsonb,
  decision_rules jsonb not null default '[]'::jsonb,
  output_requirements jsonb not null default '[]'::jsonb,
  ai_allowed_actions jsonb not null default '[]'::jsonb,
  ai_prohibited_actions jsonb not null default '[]'::jsonb,
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, method_name)
);

create table public.program_method_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.compliance_programs(id) on delete cascade,
  method_id uuid not null references public.compliance_methods(id) on delete cascade,
  document_id uuid references public.document_metadata(id) on delete set null,
  training_requirement_id uuid references public.training_requirements(id) on delete set null,
  audit_checklist_ref text,
  required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (program_id, method_id)
);

create table public.applicability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_code text not null,
  name text not null,
  condition jsonb not null default '{}'::jsonb,
  required_programs jsonb not null default '[]'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  required_records jsonb not null default '[]'::jsonb,
  required_training jsonb not null default '[]'::jsonb,
  risk_level_if_missing text not null default 'moderate',
  human_reviewer_role text,
  draft_only boolean not null default true,
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, rule_code)
);

create table public.biorisk_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_code text not null,
  risk_family text not null,
  severity_weight numeric not null default 0.35,
  likelihood_weight numeric not null default 0.20,
  detectability_weight numeric not null default 0.10,
  worker_exposure_weight numeric not null default 0,
  compliance_weight numeric not null default 0,
  sample_patient_weight numeric not null default 0,
  environmental_weight numeric not null default 0,
  repeat_issue_multiplier numeric not null default 1.0,
  missing_data_penalty numeric not null default 0,
  risk_band_thresholds jsonb not null default '{"low":40,"moderate":60,"high":80}'::jsonb,
  draft_only boolean not null default true,
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, rule_code)
);

create table public.compliance_evidence_map (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  lab_id uuid references public.labs(id) on delete set null,
  requirement_name text not null,
  control_name text not null,
  evidence_type text not null,
  source_table text,
  source_record_id uuid,
  required_frequency text,
  evidence_status text not null default 'missing',
  audit_ready boolean not null default false,
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.change_impact_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  change_type text not null,
  source_table text,
  source_record_id uuid,
  impact_summary text not null,
  document_impacts jsonb not null default '[]'::jsonb,
  training_impacts jsonb not null default '[]'::jsonb,
  risk_impacts jsonb not null default '[]'::jsonb,
  equipment_impacts jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  status text not null default 'draft_human_review_required',
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_readiness_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  lab_id uuid references public.labs(id) on delete set null,
  overall_score integer not null check (overall_score between 0 and 100),
  documents_score integer not null check (documents_score between 0 and 100),
  training_score integer not null check (training_score between 0 and 100),
  capa_score integer not null check (capa_score between 0 and 100),
  incidents_score integer not null check (incidents_score between 0 and 100),
  equipment_score integer not null check (equipment_score between 0 and 100),
  evidence_score integer not null check (evidence_score between 0 and 100),
  top_gaps jsonb not null default '[]'::jsonb,
  draft_only boolean not null default true,
  human_review_required boolean not null default true,
  generated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index company_intake_templates_org_idx on public.company_intake_templates(organization_id);
create index company_intake_responses_org_idx on public.company_intake_responses(organization_id);
create index company_intake_responses_template_idx on public.company_intake_responses(intake_template_id);
create index compliance_programs_org_idx on public.compliance_programs(organization_id);
create index compliance_methods_org_idx on public.compliance_methods(organization_id);
create index program_method_links_org_idx on public.program_method_links(organization_id);
create index program_method_links_program_idx on public.program_method_links(program_id);
create index program_method_links_method_idx on public.program_method_links(method_id);
create index applicability_rules_org_idx on public.applicability_rules(organization_id);
create index biorisk_scoring_rules_org_idx on public.biorisk_scoring_rules(organization_id);
create index compliance_evidence_map_org_idx on public.compliance_evidence_map(organization_id);
create index compliance_evidence_map_lab_idx on public.compliance_evidence_map(lab_id);
create index change_impact_events_org_idx on public.change_impact_events(organization_id);
create index change_impact_events_source_idx on public.change_impact_events(source_table, source_record_id);
create index audit_readiness_scores_org_idx on public.audit_readiness_scores(organization_id, generated_at desc);
create index audit_readiness_scores_lab_idx on public.audit_readiness_scores(lab_id, generated_at desc);

grant select, insert, update, delete on public.company_intake_templates to authenticated;
grant select, insert, update, delete on public.company_intake_responses to authenticated;
grant select, insert, update, delete on public.compliance_programs to authenticated;
grant select, insert, update, delete on public.compliance_methods to authenticated;
grant select, insert, update, delete on public.program_method_links to authenticated;
grant select, insert, update, delete on public.applicability_rules to authenticated;
grant select, insert, update, delete on public.biorisk_scoring_rules to authenticated;
grant select, insert, update, delete on public.compliance_evidence_map to authenticated;
grant select, insert, update, delete on public.change_impact_events to authenticated;
grant select, insert, update, delete on public.audit_readiness_scores to authenticated;
revoke update, delete on public.audit_events from authenticated;

alter table public.company_intake_templates enable row level security;
alter table public.company_intake_responses enable row level security;
alter table public.compliance_programs enable row level security;
alter table public.compliance_methods enable row level security;
alter table public.program_method_links enable row level security;
alter table public.applicability_rules enable row level security;
alter table public.biorisk_scoring_rules enable row level security;
alter table public.compliance_evidence_map enable row level security;
alter table public.change_impact_events enable row level security;
alter table public.audit_readiness_scores enable row level security;

create policy "company_intake_templates_member_all"
  on public.company_intake_templates for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "company_intake_responses_member_all"
  on public.company_intake_responses for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "compliance_programs_member_all"
  on public.compliance_programs for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "compliance_methods_member_all"
  on public.compliance_methods for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "program_method_links_member_all"
  on public.program_method_links for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "applicability_rules_member_all"
  on public.applicability_rules for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "biorisk_scoring_rules_member_all"
  on public.biorisk_scoring_rules for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "compliance_evidence_map_member_all"
  on public.compliance_evidence_map for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "change_impact_events_member_all"
  on public.change_impact_events for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "audit_readiness_scores_member_all"
  on public.audit_readiness_scores for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
