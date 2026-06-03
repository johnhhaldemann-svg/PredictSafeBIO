-- Risk Cells & Archive Records
-- Creates placeholder tables so future AMAYA predictive risk cell intelligence
-- can connect without rebuilding the core data model (spec Section 11, step 11).
--
-- risk_cells: precursor/control/failure/behavior/event cell logic stub.
-- archive_records: closed project metadata and retention controls.

-- ── risk_cells ────────────────────────────────────────────────────────────────
create table public.risk_cells (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  cell_type       text not null default 'precursor'
                    check (cell_type in ('precursor', 'control', 'failure', 'behavior', 'event')),
  label           text not null,
  description     text,
  severity        text check (severity in ('low', 'moderate', 'high', 'critical')),
  linked_record_type text,  -- e.g. 'assessment', 'observation', 'incident'
  linked_record_id   uuid,
  payload         jsonb not null default '{}'::jsonb,
  status          text not null default 'active'
                    check (status in ('active', 'resolved', 'archived')),
  environment     text not null default 'production'
                    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive')),
  is_archived     boolean not null default false,
  deleted_at      timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index risk_cells_organization_id_idx on public.risk_cells(organization_id, created_at desc);
create index risk_cells_project_id_idx      on public.risk_cells(project_id) where project_id is not null;
create index risk_cells_cell_type_idx       on public.risk_cells(organization_id, cell_type, severity);
create index risk_cells_not_deleted_idx     on public.risk_cells(organization_id) where deleted_at is null;

alter table public.risk_cells enable row level security;
grant select, insert, update, delete on public.risk_cells to authenticated;

create policy "risk_cells_select_org"
  on public.risk_cells for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

create policy "risk_cells_write_safety_roles"
  on public.risk_cells for insert
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('owner', 'company_admin', 'project_admin', 'safety_manager', 'auditor')
    )
  );

create policy "risk_cells_update_safety_roles"
  on public.risk_cells for update
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('owner', 'company_admin', 'project_admin', 'safety_manager', 'auditor')
    )
  );

create policy "risk_cells_delete_admin"
  on public.risk_cells for delete
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('owner', 'company_admin')
    )
  );

-- ── archive_records ───────────────────────────────────────────────────────────
-- Read-only historical compliance records, legal retention, and audit trail.
-- No standard delete. Only super_admin can insert/update (via service role in practice).
create table public.archive_records (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id      uuid references public.projects(id) on delete set null,
  record_type     text not null,  -- 'project', 'assessment', 'document', 'incident', etc.
  original_id     uuid not null,  -- ID of the source record that was archived
  title           text not null,
  snapshot        jsonb not null default '{}'::jsonb,  -- full record snapshot at archive time
  retention_until date,           -- date after which record may be purged per legal policy
  archived_by     uuid references auth.users(id) on delete set null,
  archived_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
  -- NO deleted_at — archive records are immutable by spec.
  -- NO updated_at — archive records are write-once.
);

create index archive_records_organization_id_idx on public.archive_records(organization_id, archived_at desc);
create index archive_records_project_id_idx      on public.archive_records(project_id) where project_id is not null;
create index archive_records_record_type_idx     on public.archive_records(organization_id, record_type);
create index archive_records_original_id_idx     on public.archive_records(original_id);

alter table public.archive_records enable row level security;
grant select on public.archive_records to authenticated;
-- INSERT/UPDATE only via service role (server-side archive workflow). No client-side writes.

-- Read-only for all authenticated org members; only owners via service role can insert.
create policy "archive_records_select_org"
  on public.archive_records for select
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

-- No DELETE policy — archive records have no delete path for standard users.
-- Purge (if ever needed) must go through a server-side compliance workflow.
