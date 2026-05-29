# Database Build Prompt

Build or update the PredictSafeBIO database foundation without changing product logic.

## Scope

- Preserve `audit_events` as the audit trail.
- Add org-scoped tables only when they represent real platform state.
- Enable RLS on every exposed public table.
- Grant authenticated access only after RLS is enabled and policies are same-org scoped.

## Required Tables

- Core foundation tables already present.
- BioType tables: `biotype_foundations`, `organization_biotype_selections`, `biotype_rule_mappings`.

## Acceptance Criteria

- No `audit_logs` duplicate table.
- No `user_metadata` or `raw_user_meta_data` authorization.
- Every customer table has `organization_id`, RLS, grants, indexes, and same-org policies.
- Every generated AI-related record remains draft-only and human-review required.
