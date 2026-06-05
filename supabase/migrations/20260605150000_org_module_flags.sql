-- Per-module on/off flags for each organization (Ticket 2: Controls tab module toggles).
-- Absence of a key means the module is enabled by default.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS module_flags JSONB NOT NULL DEFAULT '{}';
