-- Fix risk_cells schema to match application code expectations.
--
-- The original migration used abbreviated cell_type values ('precursor', 'failure', etc.)
-- and 'moderate' for severity, but all application code (risk-dashboard-service,
-- chemical-service, capa-service, continuous-scoring-service) uses:
--   cell_type: 'precursor_cell', 'control_cell', 'failure_cell', 'behavior_cell',
--              'event_cell', 'improvement_cell'
--   severity:  'low', 'medium', 'high', 'critical'
--
-- Also adds:
--   - archived_at column (risk-dashboard-service queries .is("archived_at", null))
--   - Unique constraint on (organization_id, linked_record_type, linked_record_id)
--     so that upsert({ onConflict: "linked_record_type,linked_record_id" }) works.

-- ── 1. Drop old check constraints ─────────────────────────────────────────────
alter table public.risk_cells
  drop constraint if exists risk_cells_cell_type_check,
  drop constraint if exists risk_cells_severity_check,
  drop constraint if exists risk_cells_status_check;

-- ── 2. Add archived_at column (if not present) ────────────────────────────────
alter table public.risk_cells
  add column if not exists archived_at timestamptz;

-- ── 3. Re-add corrected check constraints ─────────────────────────────────────
alter table public.risk_cells
  add constraint risk_cells_cell_type_check
    check (cell_type in (
      'precursor_cell', 'control_cell', 'failure_cell',
      'behavior_cell',  'event_cell',   'improvement_cell'
    )),
  add constraint risk_cells_severity_check
    check (severity in ('low', 'medium', 'high', 'critical')),
  add constraint risk_cells_status_check
    check (status in ('active', 'resolved', 'acknowledged', 'archived'));

-- ── 4. Unique constraint for upsert idempotency ───────────────────────────────
-- Allows upsert({ onConflict: "organization_id,linked_record_type,linked_record_id" })
-- to work. No WHERE clause — Supabase upsert can't reference partial index conditions.
create unique index if not exists risk_cells_linked_record_upsert_idx
  on public.risk_cells (organization_id, linked_record_type, linked_record_id)
  where linked_record_type is not null and linked_record_id is not null;

-- Non-partial alias used when linked fields may be null (plain inserts still work).
-- The app always provides both fields, so the partial index above is the conflict target.

-- ── 5. Index on archived_at for the IS NULL filter ────────────────────────────
create index if not exists risk_cells_archived_at_idx
  on public.risk_cells (organization_id, archived_at)
  where archived_at is null;

-- ── 6. Update existing rows that may have old cell_type values ────────────────
update public.risk_cells set cell_type = 'precursor_cell'   where cell_type = 'precursor';
update public.risk_cells set cell_type = 'control_cell'     where cell_type = 'control';
update public.risk_cells set cell_type = 'failure_cell'     where cell_type = 'failure';
update public.risk_cells set cell_type = 'behavior_cell'    where cell_type = 'behavior';
update public.risk_cells set cell_type = 'event_cell'       where cell_type = 'event';
update public.risk_cells set severity  = 'medium'           where severity  = 'moderate';
