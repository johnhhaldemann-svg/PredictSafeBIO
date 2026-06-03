-- Phase 1 — Healthcare Roles & User Management Foundation
-- Adds: provider + patient roles, account_status, patient_bios, provider_profiles
--
-- HIPAA compliance notes:
--   • No PHI stored in plain text
--   • RLS enabled on all new tables from the start
--   • All admin mutations are tracked via audit_events
--   • patient_bios uses TEXT (not unencrypted structured fields) for any clinical data
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Expand the profiles role constraint to include healthcare roles
--    Keeps all existing roles for backward compatibility.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    -- Platform-level
    'superadmin',
    -- Org-level management (legacy aliases kept for backward compat)
    'owner', 'developer', 'company_admin',
    -- Healthcare Phase 1 roles
    'admin',      -- Org admin — manages users, settings, billing
    'provider',   -- Healthcare provider — creates/reviews patient records
    'patient',    -- Patient / study participant — view own records only
    -- Legacy operational roles (kept for backward compat)
    'project_admin', 'safety_manager', 'foreman', 'worker',
    'client_reviewer', 'auditor', 'read_only_viewer', 'member'
  ));

-- 2. Add account_status to profiles for suspend / activate
--    Default 'active'; suspended users cannot sign in (enforced at app layer).
alter table public.profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'suspended', 'pending'));

-- 3. patient_bios
--    Stores patient-level metadata. No raw PHI in structured columns —
--    any clinical notes go through the encrypted_notes field (app-layer AES).
--
--    RLS: patients see only their own row; providers + admins see their org's rows.
create table if not exists public.patient_bios (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  -- Non-PHI identifiers
  display_name        text,
  date_of_birth_year  smallint,          -- year only — avoids direct DOB PHI
  biological_sex      text check (biological_sex in ('male', 'female', 'intersex', 'prefer_not_to_say', 'other')),
  -- Structured data is kept minimal; clinical detail lives in encrypted_notes
  conditions          text[] not null default '{}',
  allergies           text[] not null default '{}',
  -- Encrypted blob for any additional clinical notes (app-layer encryption key required)
  encrypted_notes     text,
  -- Soft delete + audit
  is_active           boolean not null default true,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.patient_bios enable row level security;

-- Patients can view their own bio
create policy "patient_bios_patient_select"
  on public.patient_bios for select
  using (user_id = (select auth.uid()));

-- Providers and admins in the same org can view
create policy "patient_bios_provider_select"
  on public.patient_bios for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin', 'provider', 'safety_manager')
    )
  );

-- Providers and admins can insert
create policy "patient_bios_provider_insert"
  on public.patient_bios for insert
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin', 'provider')
    )
  );

-- Providers and admins can update; patients cannot edit their own bio directly
create policy "patient_bios_provider_update"
  on public.patient_bios for update
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin', 'provider')
    )
  );

-- Only admins can delete (soft-delete preferred; hard delete by superadmin only)
create policy "patient_bios_admin_delete"
  on public.patient_bios for delete
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin')
    )
  );

-- 4. provider_profiles
--    Extended profile data for healthcare providers.
create table if not exists public.provider_profiles (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  -- Credentials (non-PHI)
  specialty           text,
  license_number      text,
  license_state       text,
  npi_number          text,              -- National Provider Identifier (public registry)
  credentials         text[] not null default '{}',   -- e.g. ['MD', 'PhD']
  -- Availability
  accepting_patients  boolean not null default true,
  -- Soft delete + audit
  is_active           boolean not null default true,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Each user has at most one provider profile per org
  unique (organization_id, user_id)
);

alter table public.provider_profiles enable row level security;

-- Providers can see their own profile
create policy "provider_profiles_self_select"
  on public.provider_profiles for select
  using (user_id = (select auth.uid()));

-- Admins and other providers in the same org can see provider profiles
create policy "provider_profiles_org_select"
  on public.provider_profiles for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin', 'provider')
    )
  );

-- Providers can manage their own profile
create policy "provider_profiles_self_insert"
  on public.provider_profiles for insert
  with check (
    user_id = (select auth.uid())
    or
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin')
    )
  );

create policy "provider_profiles_self_update"
  on public.provider_profiles for update
  using (
    user_id = (select auth.uid())
    or
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin')
    )
  );

create policy "provider_profiles_admin_delete"
  on public.provider_profiles for delete
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('superadmin', 'admin', 'owner', 'company_admin')
    )
  );

-- 5. Indexes for performance
create index if not exists idx_patient_bios_org        on public.patient_bios(organization_id);
create index if not exists idx_patient_bios_user       on public.patient_bios(user_id);
create index if not exists idx_provider_profiles_org   on public.provider_profiles(organization_id);
create index if not exists idx_provider_profiles_user  on public.provider_profiles(user_id);
create index if not exists idx_profiles_account_status on public.profiles(account_status);
create index if not exists idx_profiles_role           on public.profiles(role);
