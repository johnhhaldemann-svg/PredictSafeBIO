-- ---------------------------------------------------------------------------
-- Risk Register v2: regulatory-requirement-driven scoring
--
-- Adds structured regulatory fields (regulation, requirement_detail, activity,
-- compliance_gap) so inherent/residual risk can be calculated rather than
-- manually selected.  Old free-text manual columns are kept nullable for
-- backward-compat with any existing rows, but new rows will use the computed
-- columns.  A generated/computed approach is intentionally avoided so the app
-- layer owns the scoring logic (scoring.ts).
-- ---------------------------------------------------------------------------

ALTER TABLE risk_register_entries
  ADD COLUMN IF NOT EXISTS regulation           text,
  ADD COLUMN IF NOT EXISTS requirement_detail   text,
  ADD COLUMN IF NOT EXISTS activity             text,
  ADD COLUMN IF NOT EXISTS compliance_gap       text
    CHECK (compliance_gap IN ('compliant','minor_gap','major_gap','non_compliant')),
  ADD COLUMN IF NOT EXISTS inherent_score       numeric,
  ADD COLUMN IF NOT EXISTS residual_score       numeric;

-- inherent_risk and residual_risk already exist as text columns; keep them so
-- existing rows and the rest of the app still work.  The service layer will
-- write them from the calculated band going forward.

COMMENT ON COLUMN risk_register_entries.regulation IS
  'Regulatory framework: NIH Guidelines | OSHA 1910.1030 | CDC/USDA Select Agents | EPA | FDA 21 CFR | Internal';
COMMENT ON COLUMN risk_register_entries.requirement_detail IS
  'Specific section or requirement, e.g. "Section III-D-3" or "29 CFR 1910.1030(d)(2)"';
COMMENT ON COLUMN risk_register_entries.activity IS
  'Work activity or material covered, e.g. "Cell culture with RG2 organism"';
COMMENT ON COLUMN risk_register_entries.compliance_gap IS
  'Current compliance status: compliant | minor_gap | major_gap | non_compliant';
COMMENT ON COLUMN risk_register_entries.inherent_score IS
  'Calculated inherent risk score (regulation severity × gap score), stored for sorting/reporting';
COMMENT ON COLUMN risk_register_entries.residual_score IS
  'Calculated residual score after control effectiveness multiplier is applied';
