create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_name text not null,
  primary_site text not null,
  operating_areas text[] not null default '{}',
  programs text[] not null default '{}',
  quality_system_scope text[] not null default '{}',
  biosafety_levels text[] not null default '{}',
  review_owner_roles text[] not null default '{}',
  document_families text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  input_snapshot jsonb not null,
  output_snapshot jsonb not null,
  score integer not null check (score between 0 and 100),
  level text not null check (level in ('low', 'moderate', 'high', 'critical')),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  human_review_required boolean not null default true,
  human_review_status text not null default 'draft_human_review_required',
  created_at timestamptz not null default now()
);

create table public.assessment_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  signal_type text not null,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.document_metadata (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  document_type text not null,
  status text not null default 'unknown',
  owner_role text not null,
  area text,
  related_process text,
  revision text,
  effective_date date,
  next_review_date date,
  last_reviewed_at timestamptz,
  gaps text[] not null default '{}',
  storage_bucket text,
  storage_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid references public.document_metadata(id) on delete cascade,
  recommendation_type text not null check (recommendation_type in ('gap', 'draft_update')),
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  label text not null default 'Draft - Human Review Required',
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_organization_id_idx on public.profiles(organization_id);
create index assessments_organization_id_created_at_idx on public.assessments(organization_id, created_at desc);
create index assessment_signals_assessment_id_idx on public.assessment_signals(assessment_id);
create index document_metadata_organization_id_idx on public.document_metadata(organization_id);
create index document_recommendations_document_id_idx on public.document_recommendations(document_id);
create index audit_events_organization_id_created_at_idx on public.audit_events(organization_id, created_at desc);

grant usage on schema public to authenticated;
grant select on public.organizations to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.company_profiles to authenticated;
grant select, insert, update, delete on public.assessments to authenticated;
grant select, insert, update, delete on public.assessment_signals to authenticated;
grant select, insert, update, delete on public.document_metadata to authenticated;
grant select, insert, update, delete on public.document_recommendations to authenticated;
grant select, insert on public.audit_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.company_profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_signals enable row level security;
alter table public.document_metadata enable row level security;
alter table public.document_recommendations enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles_select_same_org"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "organizations_select_member"
  on public.organizations for select
  using (id in (select organization_id from public.profiles where profiles.id = auth.uid()));

create policy "company_profiles_member_all"
  on public.company_profiles for all
  using (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()));

create policy "assessments_member_all"
  on public.assessments for all
  using (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()));

create policy "assessment_signals_member_all"
  on public.assessment_signals for all
  using (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()));

create policy "document_metadata_member_all"
  on public.document_metadata for all
  using (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()));

create policy "document_recommendations_member_all"
  on public.document_recommendations for all
  using (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()));

create policy "audit_events_member_select"
  on public.audit_events for select
  using (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()));

create policy "audit_events_member_insert"
  on public.audit_events for insert
  with check (organization_id in (select organization_id from public.profiles where profiles.id = auth.uid()));

-- Storage-ready structure. Create this bucket in Supabase Storage before enabling uploads:
-- bucket: biotech-documents
-- path convention: {organization_id}/{document_id}/{filename}
-- Keep document recommendation text draft-only and require human review before official use.
