create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

insert into public.organization_memberships (organization_id, user_id, role)
select organization_id, id, role
from public.profiles
where organization_id is not null
on conflict (organization_id, user_id) do nothing;

create table public.permission_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_key text not null,
  display_name text not null,
  module_permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, role_key)
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  location text,
  status text not null default 'active' check (status in ('active', 'inactive', 'planned')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.labs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  name text not null,
  biosafety_level text,
  controlled_area_type text,
  storage_path_prefix text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reference_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  source_type text not null default 'guidance',
  publisher text,
  source_url text,
  version_label text,
  status text not null default 'active' check (status in ('active', 'archived', 'draft')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reference_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference_source_id uuid not null references public.reference_sources(id) on delete cascade,
  section_key text not null,
  title text not null,
  category text not null default 'general',
  content_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reference_source_id, section_key)
);

create table public.reference_rule_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference_section_id uuid references public.reference_sections(id) on delete set null,
  rule_key text not null,
  trigger_conditions jsonb not null default '{}'::jsonb,
  ai_action_type text not null,
  risk_driver_category text not null default 'controls',
  recommended_owner_role text,
  document_family text,
  draft_only boolean not null default true,
  human_review_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, rule_key)
);

create table public.document_library_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  catalog_key text not null,
  title text not null,
  document_family text not null,
  baseline_template_label text,
  required_for jsonb not null default '{}'::jsonb,
  reference_rule_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, catalog_key)
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.document_metadata(id) on delete cascade,
  version_label text not null,
  change_summary text,
  storage_bucket text,
  storage_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.document_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.document_metadata(id) on delete cascade,
  document_version_id uuid references public.document_versions(id) on delete set null,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewer_role text not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.training_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid references public.document_metadata(id) on delete set null,
  role_key text,
  title text not null,
  frequency_months integer,
  required_for jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  training_requirement_id uuid not null references public.training_requirements(id) on delete cascade,
  assigned_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'assigned' check (status in ('assigned', 'completed', 'expired', 'waived')),
  due_date date,
  completed_at timestamptz,
  expires_at timestamptz,
  evidence_bucket text,
  evidence_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.competency_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  training_assignment_id uuid references public.training_assignments(id) on delete cascade,
  assessor_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'passed', 'needs_action')),
  notes text,
  assessed_at timestamptz,
  evidence_bucket text,
  evidence_path text,
  created_at timestamptz not null default now()
);

create table public.biological_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lab_id uuid references public.labs(id) on delete set null,
  name text not null,
  material_type text not null default 'biological',
  biosafety_level text,
  storage_location text,
  risk_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.biosafety_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lab_id uuid references public.labs(id) on delete set null,
  biological_material_id uuid references public.biological_materials(id) on delete set null,
  initial_risk_level text,
  residual_risk_level text,
  controls jsonb not null default '[]'::jsonb,
  status text not null default 'draft_human_review_required',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lab_specific_manuals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lab_id uuid references public.labs(id) on delete cascade,
  document_id uuid references public.document_metadata(id) on delete set null,
  certification_status text not null default 'draft',
  annual_review_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.risk_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  biosafety_risk_assessment_id uuid references public.biosafety_risk_assessments(id) on delete cascade,
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledgement_status text not null default 'pending' check (acknowledgement_status in ('pending', 'acknowledged', 'declined')),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lab_id uuid references public.labs(id) on delete set null,
  incident_type text not null,
  title text not null,
  severity text not null default 'medium',
  status text not null default 'open' check (status in ('open', 'investigating', 'contained', 'closed')),
  occurred_at timestamptz,
  reported_by uuid references auth.users(id) on delete set null,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.incident_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  evidence_type text not null,
  storage_bucket text,
  storage_path text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.incident_investigation_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  step_type text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'complete', 'blocked')),
  owner_id uuid references auth.users(id) on delete set null,
  notes text,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.capa_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_incident_id uuid references public.incidents(id) on delete set null,
  source_assessment_id uuid references public.assessments(id) on delete set null,
  title text not null,
  status text not null default 'draft_human_review_required',
  owner_role text,
  due_date date,
  effectiveness_check_due date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.capa_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  capa_record_id uuid not null references public.capa_records(id) on delete cascade,
  action_type text not null default 'corrective',
  title text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'complete', 'blocked')),
  owner_id uuid references auth.users(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lab_id uuid references public.labs(id) on delete set null,
  equipment_tag text not null,
  name text not null,
  equipment_type text,
  status text not null default 'active' check (status in ('active', 'inactive', 'out_of_service', 'quarantined')),
  qualification_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, equipment_tag)
);

create table public.equipment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  event_type text not null,
  status text not null default 'open',
  occurred_at timestamptz,
  impact_assessment text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.temperature_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete cascade,
  measured_at timestamptz not null,
  value numeric not null,
  unit text not null default 'C',
  status text not null default 'in_range' check (status in ('in_range', 'excursion', 'unknown')),
  created_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  material_code text not null,
  name text not null,
  material_type text not null default 'reagent',
  lot_number text,
  status text not null default 'available',
  storage_location text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, material_code)
);

create table public.samples (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sample_identifier text not null,
  material_id uuid references public.materials(id) on delete set null,
  lab_id uuid references public.labs(id) on delete set null,
  status text not null default 'active',
  storage_location text,
  disposition text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sample_identifier)
);

create table public.sample_chain_of_custody (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sample_id uuid not null references public.samples(id) on delete cascade,
  transfer_type text not null default 'transfer',
  from_location text,
  to_location text,
  transferred_by uuid references auth.users(id) on delete set null,
  received_by uuid references auth.users(id) on delete set null,
  transferred_at timestamptz not null default now(),
  condition_notes text,
  created_at timestamptz not null default now()
);

create table public.chemical_inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lab_id uuid references public.labs(id) on delete set null,
  chemical_name text not null,
  hazard_class text,
  sds_storage_bucket text,
  sds_storage_path text,
  quantity text,
  storage_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.waste_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lab_id uuid references public.labs(id) on delete set null,
  waste_type text not null,
  status text not null default 'open',
  container_label text,
  disposal_vendor text,
  disposal_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  audit_type text not null default 'internal',
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  scheduled_for date,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  audit_id uuid not null references public.audits(id) on delete cascade,
  finding_level text not null default 'observation' check (finding_level in ('observation', 'minor', 'major', 'critical')),
  title text not null,
  status text not null default 'open',
  source_module text,
  source_record_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  audit_id uuid references public.audits(id) on delete cascade,
  audit_finding_id uuid references public.audit_findings(id) on delete cascade,
  source_module text,
  source_record_id uuid,
  storage_bucket text,
  storage_path text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_module text,
  source_record_id uuid,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'complete', 'blocked')),
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  notification_type text not null default 'task',
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index organization_memberships_org_idx on public.organization_memberships(organization_id);
create index organization_memberships_user_idx on public.organization_memberships(user_id);
create index permission_roles_org_idx on public.permission_roles(organization_id);
create index sites_org_idx on public.sites(organization_id);
create index labs_org_idx on public.labs(organization_id);
create index labs_site_idx on public.labs(site_id);
create index reference_sources_org_idx on public.reference_sources(organization_id);
create index reference_sections_org_idx on public.reference_sections(organization_id);
create index reference_sections_source_idx on public.reference_sections(reference_source_id);
create index reference_rule_mappings_org_idx on public.reference_rule_mappings(organization_id);
create index document_library_catalog_org_idx on public.document_library_catalog(organization_id);
create index document_versions_org_idx on public.document_versions(organization_id);
create index document_versions_document_idx on public.document_versions(document_id);
create index document_approvals_org_idx on public.document_approvals(organization_id);
create index document_approvals_document_idx on public.document_approvals(document_id);
create index training_requirements_org_idx on public.training_requirements(organization_id);
create index training_assignments_org_idx on public.training_assignments(organization_id);
create index training_assignments_user_idx on public.training_assignments(assigned_user_id);
create index competency_assessments_org_idx on public.competency_assessments(organization_id);
create index biological_materials_org_idx on public.biological_materials(organization_id);
create index biosafety_risk_assessments_org_idx on public.biosafety_risk_assessments(organization_id);
create index lab_specific_manuals_org_idx on public.lab_specific_manuals(organization_id);
create index risk_acknowledgements_org_idx on public.risk_acknowledgements(organization_id);
create index incidents_org_idx on public.incidents(organization_id);
create index incident_evidence_org_idx on public.incident_evidence(organization_id);
create index incident_investigation_steps_org_idx on public.incident_investigation_steps(organization_id);
create index capa_records_org_idx on public.capa_records(organization_id);
create index capa_actions_org_idx on public.capa_actions(organization_id);
create index equipment_org_idx on public.equipment(organization_id);
create index equipment_events_org_idx on public.equipment_events(organization_id);
create index temperature_logs_org_idx on public.temperature_logs(organization_id);
create index materials_org_idx on public.materials(organization_id);
create index samples_org_idx on public.samples(organization_id);
create index sample_chain_of_custody_org_idx on public.sample_chain_of_custody(organization_id);
create index chemical_inventory_org_idx on public.chemical_inventory(organization_id);
create index waste_records_org_idx on public.waste_records(organization_id);
create index audits_org_idx on public.audits(organization_id);
create index audit_findings_org_idx on public.audit_findings(organization_id);
create index audit_evidence_org_idx on public.audit_evidence(organization_id);
create index tasks_org_idx on public.tasks(organization_id);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index notifications_org_idx on public.notifications(organization_id);
create index notifications_user_idx on public.notifications(user_id);

grant select, insert, update, delete on public.organization_memberships to authenticated;
grant select, insert, update, delete on public.permission_roles to authenticated;
grant select, insert, update, delete on public.sites to authenticated;
grant select, insert, update, delete on public.labs to authenticated;
grant select, insert, update, delete on public.reference_sources to authenticated;
grant select, insert, update, delete on public.reference_sections to authenticated;
grant select, insert, update, delete on public.reference_rule_mappings to authenticated;
grant select, insert, update, delete on public.document_library_catalog to authenticated;
grant select, insert, update, delete on public.document_versions to authenticated;
grant select, insert, update, delete on public.document_approvals to authenticated;
grant select, insert, update, delete on public.training_requirements to authenticated;
grant select, insert, update, delete on public.training_assignments to authenticated;
grant select, insert, update, delete on public.competency_assessments to authenticated;
grant select, insert, update, delete on public.biological_materials to authenticated;
grant select, insert, update, delete on public.biosafety_risk_assessments to authenticated;
grant select, insert, update, delete on public.lab_specific_manuals to authenticated;
grant select, insert, update, delete on public.risk_acknowledgements to authenticated;
grant select, insert, update, delete on public.incidents to authenticated;
grant select, insert, update, delete on public.incident_evidence to authenticated;
grant select, insert, update, delete on public.incident_investigation_steps to authenticated;
grant select, insert, update, delete on public.capa_records to authenticated;
grant select, insert, update, delete on public.capa_actions to authenticated;
grant select, insert, update, delete on public.equipment to authenticated;
grant select, insert, update, delete on public.equipment_events to authenticated;
grant select, insert, update, delete on public.temperature_logs to authenticated;
grant select, insert, update, delete on public.materials to authenticated;
grant select, insert, update, delete on public.samples to authenticated;
grant select, insert, update, delete on public.sample_chain_of_custody to authenticated;
grant select, insert, update, delete on public.chemical_inventory to authenticated;
grant select, insert, update, delete on public.waste_records to authenticated;
grant select, insert, update, delete on public.audits to authenticated;
grant select, insert, update, delete on public.audit_findings to authenticated;
grant select, insert, update, delete on public.audit_evidence to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

alter table public.organization_memberships enable row level security;
alter table public.permission_roles enable row level security;
alter table public.sites enable row level security;
alter table public.labs enable row level security;
alter table public.reference_sources enable row level security;
alter table public.reference_sections enable row level security;
alter table public.reference_rule_mappings enable row level security;
alter table public.document_library_catalog enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_approvals enable row level security;
alter table public.training_requirements enable row level security;
alter table public.training_assignments enable row level security;
alter table public.competency_assessments enable row level security;
alter table public.biological_materials enable row level security;
alter table public.biosafety_risk_assessments enable row level security;
alter table public.lab_specific_manuals enable row level security;
alter table public.risk_acknowledgements enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_evidence enable row level security;
alter table public.incident_investigation_steps enable row level security;
alter table public.capa_records enable row level security;
alter table public.capa_actions enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_events enable row level security;
alter table public.temperature_logs enable row level security;
alter table public.materials enable row level security;
alter table public.samples enable row level security;
alter table public.sample_chain_of_custody enable row level security;
alter table public.chemical_inventory enable row level security;
alter table public.waste_records enable row level security;
alter table public.audits enable row level security;
alter table public.audit_findings enable row level security;
alter table public.audit_evidence enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

create policy "organization_memberships_member_all"
  on public.organization_memberships for all
  to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "notifications_member_all"
  on public.notifications for all
  to authenticated
  using (
    organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid()))
    and (user_id is null or user_id = (select auth.uid()))
  )
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "permission_roles_member_all"
  on public.permission_roles for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "sites_member_all"
  on public.sites for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "labs_member_all"
  on public.labs for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "reference_sources_member_all"
  on public.reference_sources for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "reference_sections_member_all"
  on public.reference_sections for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "reference_rule_mappings_member_all"
  on public.reference_rule_mappings for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "document_library_catalog_member_all"
  on public.document_library_catalog for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "document_versions_member_all"
  on public.document_versions for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "document_approvals_member_all"
  on public.document_approvals for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "training_requirements_member_all"
  on public.training_requirements for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "training_assignments_member_all"
  on public.training_assignments for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "competency_assessments_member_all"
  on public.competency_assessments for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "biological_materials_member_all"
  on public.biological_materials for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "biosafety_risk_assessments_member_all"
  on public.biosafety_risk_assessments for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "lab_specific_manuals_member_all"
  on public.lab_specific_manuals for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "risk_acknowledgements_member_all"
  on public.risk_acknowledgements for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "incidents_member_all"
  on public.incidents for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "incident_evidence_member_all"
  on public.incident_evidence for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "incident_investigation_steps_member_all"
  on public.incident_investigation_steps for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "capa_records_member_all"
  on public.capa_records for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "capa_actions_member_all"
  on public.capa_actions for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "equipment_member_all"
  on public.equipment for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "equipment_events_member_all"
  on public.equipment_events for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "temperature_logs_member_all"
  on public.temperature_logs for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "materials_member_all"
  on public.materials for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "samples_member_all"
  on public.samples for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "sample_chain_of_custody_member_all"
  on public.sample_chain_of_custody for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "chemical_inventory_member_all"
  on public.chemical_inventory for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "waste_records_member_all"
  on public.waste_records for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "audits_member_all"
  on public.audits for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "audit_findings_member_all"
  on public.audit_findings for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "audit_evidence_member_all"
  on public.audit_evidence for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "tasks_member_all"
  on public.tasks for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
