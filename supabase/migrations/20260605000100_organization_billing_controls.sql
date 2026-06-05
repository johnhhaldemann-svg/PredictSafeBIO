-- Superadmin org-control fields surfaced in /admin/org/[orgId] Controls tab.
-- Read + written by updateOrgControlsAction; previously missing from the schema,
-- which caused "Save controls" to fail with a column-not-found error.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan_tier text;
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS seat_limit integer;
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS demo_mode boolean NOT NULL DEFAULT false;
