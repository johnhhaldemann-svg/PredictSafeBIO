-- Expand Role System
-- Replaces the two-role (owner/member) system with the full 11-role set
-- required by the Core Accounts & Environments spec (Section 3 & 7).
--
-- Roles:
--   owner              Platform owner / Super Admin — all orgs, all environments
--   developer          Internal technical account — logs, API keys, test envs
--   company_admin      Client org admin — manages users, projects, company settings
--   project_admin      Jobsite/project lead — manages one project, approves records
--   safety_manager     Creates/reviews JSAs, permits, audits, observations, incidents
--   foreman            Submits field records; cannot delete approved records
--   worker             View docs, acknowledge training, submit basic reports
--   client_reviewer    Read-only: plans, documents, dashboards, closeout evidence
--   auditor            Performs audits, creates findings, exports reports
--   read_only_viewer   View approved records only; no edit/delete
--   member             Legacy catch-all (backward-compatible; maps to worker level)

-- 1. Add role check constraint to profiles
--    (profiles.role is currently free-text with default 'member')
alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'owner', 'developer', 'company_admin', 'project_admin',
    'safety_manager', 'foreman', 'worker',
    'client_reviewer', 'auditor', 'read_only_viewer', 'member'
  ));

-- 2. Expand workspace_invitations role constraint to match
alter table public.workspace_invitations
  drop constraint if exists workspace_invitations_role_check;

alter table public.workspace_invitations
  add constraint workspace_invitations_role_check
  check (role in (
    'owner', 'developer', 'company_admin', 'project_admin',
    'safety_manager', 'foreman', 'worker',
    'client_reviewer', 'auditor', 'read_only_viewer', 'member'
  ));

-- 3. Tighten audit_events RLS so only admins/auditors can SELECT
--    (all authenticated users can still INSERT via existing insert policy)
drop policy if exists "audit_events_member_select" on public.audit_events;

create policy "audit_events_admin_auditor_select"
  on public.audit_events for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('owner', 'developer', 'company_admin', 'project_admin', 'auditor')
    )
  );

-- 4. Tighten organizations: super_admin (owner) can see all orgs;
--    others see only their own
drop policy if exists "organizations_select_member" on public.organizations;

create policy "organizations_select_member"
  on public.organizations for select
  using (
    -- own org
    id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
    -- OR platform owner can see all
    or exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'owner'
    )
  );

-- 5. Restrict document deletes: read_only_viewer and client_reviewer cannot delete
drop policy if exists "document_metadata_member_all" on public.document_metadata;

create policy "document_metadata_read_select"
  on public.document_metadata for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

create policy "document_metadata_write_roles"
  on public.document_metadata for insert
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role not in ('read_only_viewer', 'worker')
    )
  );

create policy "document_metadata_update_roles"
  on public.document_metadata for update
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role not in ('read_only_viewer', 'client_reviewer', 'worker')
    )
  );

create policy "document_metadata_delete_admin"
  on public.document_metadata for delete
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('owner', 'company_admin', 'project_admin', 'safety_manager')
    )
  );
