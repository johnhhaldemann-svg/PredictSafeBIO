-- Projects and Project Members
-- Adds the project/jobsite layer required by the Core Accounts & Environments spec.
-- Every data module (assessments, documents, JSAs, etc.) can optionally link to a
-- project via project_id. project_members drives project-scoped RLS.

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  status          text not null default 'active'
                    check (status in ('active', 'inactive', 'closed', 'archived')),
  environment     text not null default 'production'
                    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive')),
  is_archived     boolean not null default false,
  deleted_at      timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.project_members (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member'
                    check (role in (
                      'owner', 'company_admin', 'project_admin', 'safety_manager',
                      'foreman', 'worker', 'client_reviewer', 'auditor',
                      'read_only_viewer', 'developer', 'member'
                    )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, user_id)
);

-- Indexes
create index projects_organization_id_idx        on public.projects(organization_id, created_at desc);
create index projects_status_idx                 on public.projects(organization_id, status) where deleted_at is null;
create index project_members_project_id_idx      on public.project_members(project_id);
create index project_members_user_id_idx         on public.project_members(user_id);
create index project_members_organization_id_idx on public.project_members(organization_id);

-- RLS
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;

-- Grants
grant select, insert, update, delete on public.projects        to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
grant usage, select on all sequences in schema public          to authenticated;

-- Projects: visible to org members or project members
create policy "projects_select_org_member"
  on public.projects for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

create policy "projects_insert_org_member"
  on public.projects for insert
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

create policy "projects_update_org_owner"
  on public.projects for update
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('owner', 'company_admin', 'project_admin')
    )
  );

create policy "projects_delete_org_owner"
  on public.projects for delete
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('owner', 'company_admin')
    )
  );

-- Project members: org members can see project membership; only admins can manage
create policy "project_members_select_org"
  on public.project_members for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

create policy "project_members_insert_admin"
  on public.project_members for insert
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('owner', 'company_admin', 'project_admin')
    )
  );

create policy "project_members_delete_admin"
  on public.project_members for delete
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('owner', 'company_admin', 'project_admin')
    )
  );
