-- PredictSafe vertical abstraction (Phase 1).
-- Tags each organization with its industry vertical so the engine can resolve
-- the correct VerticalPack (src/lib/foundation/vertical-registry.ts).
-- Additive + backfilled by default: every existing org becomes biotech_pharma
-- (PredictSafe BIO), preserving current behavior. general_manufacturing
-- (PredictSafe MFG) is the first non-bio vertical.

alter table public.organizations
  add column if not exists industry_vertical text not null default 'biotech_pharma';

alter table public.organizations
  drop constraint if exists organizations_industry_vertical_check;

alter table public.organizations
  add constraint organizations_industry_vertical_check
  check (industry_vertical in ('biotech_pharma', 'general_manufacturing'));
