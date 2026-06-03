-- Standard Fields & Soft Delete
-- Adds the minimum required fields from spec Section 6 to all existing data tables:
--   environment, is_archived, deleted_at (soft delete), updated_at where missing.
-- Also adds status to tables that were missing it.
--
-- Non-negotiable rule: Use soft delete for compliance records (deleted_at NOT NULL = deleted).

-- ── organizations ─────────────────────────────────────────────────────────────
alter table public.organizations
  add column if not exists status      text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  add column if not exists environment text not null default 'production'
    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive')),
  add column if not exists is_archived boolean not null default false,
  add column if not exists deleted_at  timestamptz;

-- ── profiles ─────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_archived boolean not null default false,
  add column if not exists deleted_at  timestamptz;

-- ── company_profiles ──────────────────────────────────────────────────────────
alter table public.company_profiles
  add column if not exists status      text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  add column if not exists environment text not null default 'production'
    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive')),
  add column if not exists is_archived boolean not null default false,
  add column if not exists deleted_at  timestamptz;

-- ── assessments ───────────────────────────────────────────────────────────────
alter table public.assessments
  add column if not exists environment text not null default 'production'
    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive')),
  add column if not exists is_archived boolean not null default false,
  add column if not exists deleted_at  timestamptz,
  add column if not exists updated_at  timestamptz not null default now();

-- ── assessment_signals ────────────────────────────────────────────────────────
alter table public.assessment_signals
  add column if not exists environment text not null default 'production'
    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive')),
  add column if not exists is_archived boolean not null default false,
  add column if not exists deleted_at  timestamptz,
  add column if not exists updated_at  timestamptz not null default now();

-- ── document_metadata ─────────────────────────────────────────────────────────
alter table public.document_metadata
  add column if not exists environment text not null default 'production'
    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive')),
  add column if not exists is_archived boolean not null default false,
  add column if not exists deleted_at  timestamptz;

-- ── document_recommendations ──────────────────────────────────────────────────
alter table public.document_recommendations
  add column if not exists status      text not null default 'draft'
    check (status in ('draft', 'active', 'resolved', 'archived')),
  add column if not exists environment text not null default 'production'
    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive')),
  add column if not exists is_archived boolean not null default false,
  add column if not exists deleted_at  timestamptz,
  add column if not exists updated_at  timestamptz not null default now();

-- ── audit_events ──────────────────────────────────────────────────────────────
-- Audit log records are immutable by design — no deleted_at or is_archived.
-- Adding environment only so logs can be filtered by env.
alter table public.audit_events
  add column if not exists environment text not null default 'production'
    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive'));

-- ── change_plan_items ─────────────────────────────────────────────────────────
alter table public.change_plan_items
  add column if not exists environment text not null default 'production'
    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive')),
  add column if not exists is_archived boolean not null default false,
  add column if not exists deleted_at  timestamptz;

-- ── workspace_invitations ─────────────────────────────────────────────────────
alter table public.workspace_invitations
  add column if not exists environment text not null default 'production'
    check (environment in ('development', 'staging', 'demo', 'production', 'sandbox', 'archive'));

-- ── Soft-delete indexes ───────────────────────────────────────────────────────
-- Filter out soft-deleted rows efficiently in queries.
create index if not exists assessments_not_deleted_idx
  on public.assessments(organization_id, created_at desc)
  where deleted_at is null;

create index if not exists document_metadata_not_deleted_idx
  on public.document_metadata(organization_id, created_at desc)
  where deleted_at is null;

create index if not exists document_recommendations_not_deleted_idx
  on public.document_recommendations(organization_id, created_at desc)
  where deleted_at is null;

-- ── Environment indexes ───────────────────────────────────────────────────────
create index if not exists assessments_environment_idx
  on public.assessments(organization_id, environment);

create index if not exists document_metadata_environment_idx
  on public.document_metadata(organization_id, environment);
