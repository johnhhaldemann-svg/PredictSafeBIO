-- ============================================================================
-- ROLLBACK — Manual v1.1 alignment (DESTRUCTIVE)
-- ----------------------------------------------------------------------------
-- This is NOT an auto-applied migration. It lives in docs/ on purpose so that
-- `supabase db push` never runs it. Run it MANUALLY only if you want to remove
-- everything the manual v1.1 work added to the database.
--
-- What it does:
--   * Drops the 7 new tables + program_catalog (this also deletes the seeded
--     demo data: questionnaire answers, applicability log, risk register,
--     calendar, qualified persons, MOC, AI log).
--   * Removes the columns added to compliance_programs, risk_cells,
--     capa_records, inspection_records, tasks (+ their check constraints).
--
-- It does NOT touch any pre-existing table, row, or the superadmin console.
-- How to run: Supabase SQL editor, or ask Claude to run it via the Supabase
-- MCP (execute_sql) against project mygxjnvzdljmdriokvvx.
-- ============================================================================

begin;

-- 1) Reverse added columns on tasks
alter table public.tasks drop column if exists qualified_reviewer_id;
alter table public.tasks drop column if exists escalation_triggered;
alter table public.tasks drop column if exists evidence_required;
alter table public.tasks drop column if exists risk_register_entry_id;

-- 2) Reverse added columns on inspection_records
alter table public.inspection_records drop constraint if exists inspection_risk_classification_chk;
alter table public.inspection_records drop column if exists linked_risk_register_id;
alter table public.inspection_records drop column if exists trend_category;
alter table public.inspection_records drop column if exists risk_classification;

-- 3) Reverse added columns on capa_records
alter table public.capa_records drop constraint if exists capa_effectiveness_status_chk;
alter table public.capa_records drop column if exists recurrence_count;
alter table public.capa_records drop column if exists effectiveness_checked_at;
alter table public.capa_records drop column if exists effectiveness_status;
alter table public.capa_records drop column if exists root_cause;
alter table public.capa_records drop column if exists interim_control;

-- 4) Reverse added columns on risk_cells
drop index if exists public.risk_cells_rre_idx;
alter table public.risk_cells drop constraint if exists risk_cells_confidence_range;
alter table public.risk_cells drop column if exists confidence;
alter table public.risk_cells drop column if exists program_name;
alter table public.risk_cells drop column if exists risk_register_entry_id;

-- 5) Reverse added columns on compliance_programs (leaves the original 10 rows intact)
alter table public.compliance_programs drop column if exists requires_qualified_review;
alter table public.compliance_programs drop column if exists disabled_rationale;
alter table public.compliance_programs drop column if exists activation_trigger;

-- 6) Drop the new tables (children first; cascade clears any remaining FKs)
drop table if exists public.compliance_calendar_items cascade;
drop table if exists public.ai_recommendation_log cascade;
drop table if exists public.management_of_change_records cascade;
drop table if exists public.qualified_person_registry cascade;
drop table if exists public.program_applicability_log cascade;
drop table if exists public.client_setup_questionnaire_responses cascade;
drop table if exists public.risk_register_entries cascade;
drop table if exists public.program_catalog cascade;

commit;
