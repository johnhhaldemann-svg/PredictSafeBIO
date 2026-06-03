-- Expand audit_type to support all biotech-specific inspection types.
-- The existing constraint (if any) is dropped and replaced with an expanded
-- allow-list. New types are grouped by category for readability.

-- 1. Drop the old check constraint if it exists
ALTER TABLE audits DROP CONSTRAINT IF EXISTS audits_audit_type_check;

-- 2. Add a new, expanded check constraint
ALTER TABLE audits
  ADD CONSTRAINT audits_audit_type_check CHECK (
    audit_type IN (
      -- Audit / Program Reviews
      'internal',
      'external',
      'regulatory',
      'supplier',
      'self',
      'pre_regulatory',
      -- Lab & Biosafety
      'lab_safety',
      'biosafety',
      'bloodborne_pathogens',
      'chemical_hygiene',
      -- Physical Safety — Frequent
      'eyewash',
      'waste_management',
      'fire_safety',
      'emergency_equipment',
      'first_aid',
      'spill_kit',
      -- Physical Safety — Periodic
      'ppe',
      'loto',
      'ergonomics',
      -- Environmental
      'waste_disposal',
      'stormwater',
      -- Equipment & Facility
      'equipment',
      'facility',
      -- Compliance / Admin
      'training_records',
      'incident_followup'
    )
  );

-- 3. Add an index to make queries by audit_type fast
CREATE INDEX IF NOT EXISTS idx_audits_audit_type
  ON audits (organization_id, audit_type, status);

-- 4. Add a comment documenting the field
COMMENT ON COLUMN audits.audit_type IS
  'Inspection / audit category. Expanded from 5 to 25 types covering all biotech EHS '
  'program areas. AI scheduling rules keyed to this field drive required-task surfacing '
  'on the Inspections page.';
