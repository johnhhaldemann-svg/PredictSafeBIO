-- Auto-assignment fields for the inspection / audit scheduling engine.
-- Adds:
--   assigned_to      — which profile (user) owns this inspection task
--   auto_generated   — true when the AI scheduler created the record
--   next_due_date    — precomputed next due date (denormalized for fast calendar queries)

-- 1. assigned_to — nullable FK to the user responsible for completing the inspection
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. auto_generated — flag records created by the AI scheduler vs. manually by a user
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false;

-- 3. next_due_date — optional: populated by the scheduler so calendar queries are cheap
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS next_due_date date;

-- 4. Indexes for dashboard and calendar queries
CREATE INDEX IF NOT EXISTS idx_audits_assigned_to
  ON audits (organization_id, assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_audits_auto_generated
  ON audits (organization_id, auto_generated, status);

CREATE INDEX IF NOT EXISTS idx_audits_next_due_date
  ON audits (organization_id, next_due_date, status);

-- 5. Comments
COMMENT ON COLUMN audits.assigned_to IS
  'User responsible for completing this inspection. Set by the AI scheduler based on '
  'inspection category → role mapping, or manually by an org owner.';

COMMENT ON COLUMN audits.auto_generated IS
  'True when this planned inspection was created automatically by the AI compliance '
  'calendar engine rather than by a user clicking "Schedule now".';

COMMENT ON COLUMN audits.next_due_date IS
  'Precomputed due date for this inspection cycle, set by the scheduler. '
  'Used for calendar views without recomputing from completion history.';
