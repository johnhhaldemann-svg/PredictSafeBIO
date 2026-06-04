create table public.biotype_foundations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  biotype_key text not null,
  display_name text not null,
  focus text not null,
  applicable_programs jsonb not null default '[]'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  required_records jsonb not null default '[]'::jsonb,
  required_training jsonb not null default '[]'::jsonb,
  risk_drivers jsonb not null default '[]'::jsonb,
  common_tools jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  draft_only boolean not null default true,
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, biotype_key)
);

create table public.organization_biotype_selections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_profile_id uuid references public.company_profiles(id) on delete set null,
  primary_biotype_key text not null,
  secondary_biotype_keys jsonb not null default '[]'::jsonb,
  selection_status text not null default 'draft_human_review_required',
  selection_reason text,
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.biotype_rule_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  biotype_foundation_id uuid references public.biotype_foundations(id) on delete cascade,
  rule_key text not null,
  source_module text,
  source_record_id uuid,
  required_programs jsonb not null default '[]'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  required_records jsonb not null default '[]'::jsonb,
  required_training jsonb not null default '[]'::jsonb,
  risk_driver text,
  draft_only boolean not null default true,
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, rule_key)
);

create index biotype_foundations_org_idx on public.biotype_foundations(organization_id);
create index biotype_foundations_key_idx on public.biotype_foundations(organization_id, biotype_key);
create index organization_biotype_selections_org_idx on public.organization_biotype_selections(organization_id);
create index organization_biotype_selections_company_profile_idx on public.organization_biotype_selections(company_profile_id);
create index biotype_rule_mappings_org_idx on public.biotype_rule_mappings(organization_id);
create index biotype_rule_mappings_foundation_idx on public.biotype_rule_mappings(biotype_foundation_id);

grant select, insert, update, delete on public.biotype_foundations to authenticated;
grant select, insert, update, delete on public.organization_biotype_selections to authenticated;
grant select, insert, update, delete on public.biotype_rule_mappings to authenticated;

alter table public.biotype_foundations enable row level security;
alter table public.organization_biotype_selections enable row level security;
alter table public.biotype_rule_mappings enable row level security;

create policy "biotype_foundations_member_all"
  on public.biotype_foundations for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "organization_biotype_selections_member_all"
  on public.organization_biotype_selections for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "biotype_rule_mappings_member_all"
  on public.biotype_rule_mappings for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
