-- Add project_id to document_metadata so documents can be scoped to a project.
-- Nullable: existing org-level documents are unaffected (project_id = NULL).
-- Resolves: TODO in src/app/project/[projectId]/documents/page.tsx

ALTER TABLE document_metadata
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_metadata_project_id
  ON document_metadata (project_id)
  WHERE project_id IS NOT NULL;

COMMENT ON COLUMN document_metadata.project_id IS
  'Optional project association. NULL = org-level document visible to all projects.';
