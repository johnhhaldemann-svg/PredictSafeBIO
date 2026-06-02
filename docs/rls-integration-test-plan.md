# RLS Integration Test Plan

Multi-tenancy enforcement requires a live Supabase project with two real organizations.
The unit tests in `src/lib/supabase/multi-tenancy.test.ts` cover the query-construction contract.
These integration tests cover the actual Postgres RLS policies.

## Pre-requisites

- A dedicated Supabase test project (separate from demo and production).
- `SUPABASE_SERVICE_ROLE_KEY` for the test project (to bypass RLS during seeding).
- Two deterministic org IDs: `ORG_A` and `ORG_B`.

## Setup: Seed two orgs

```sql
-- Run with service role (bypasses RLS)
INSERT INTO organizations (id, name) VALUES
  ('org-aaaaaaaa-0000-0000-0000-000000000000', 'Test Org A'),
  ('org-bbbbbbbb-1111-1111-1111-111111111111', 'Test Org B');

-- Create users and profiles scoped to each org.
-- See Supabase Auth docs for creating test users via service role.
```

## Tables to cover

All eight MVP tables must be tested:

| Table | Expected RLS column |
|---|---|
| `assessments` | `organization_id` |
| `assessment_signals` | `organization_id` |
| `document_metadata` | `organization_id` |
| `document_recommendations` | `organization_id` |
| `audit_events` | `organization_id` |
| `tasks` | `organization_id` |
| `compliance_evidence_map` | `organization_id` |
| `training_assignments` | `organization_id` |

## Test assertions (per table)

For each table:

1. Insert 3 rows for Org A using the service role key.
2. Insert 3 rows for Org B using the service role key.
3. Query using an Org A JWT (authenticated client).
   - Expected: 3 rows returned (Org A rows only).
   - Expected: 0 rows from Org B visible.
4. Repeat with an Org B JWT.
   - Expected: 3 rows returned (Org B rows only).

## Running with Supabase CLI

```bash
supabase test db
```

Or with a dedicated test script:

```ts
// scripts/test-rls.mts
import { createClient } from "@supabase/supabase-js";

const serviceClient = createClient(TEST_URL, SERVICE_ROLE_KEY);
const orgAClient   = createClient(TEST_URL, ORG_A_ANON_JWT);
const orgBClient   = createClient(TEST_URL, ORG_B_ANON_JWT);

const tables = ["assessments", "document_metadata", "audit_events", "tasks"];

for (const table of tables) {
  // Org A can only see Org A rows
  const { count: orgACount } = await orgAClient.from(table).select("id", { count: "exact", head: true });
  console.assert(orgACount === 3, `${table}: Org A sees ${orgACount} rows (expected 3)`);

  // Org A cannot see Org B rows
  const { count: leakCount } = await orgAClient
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ORG_B);
  console.assert(leakCount === 0, `${table}: Org A leaked ${leakCount} Org B rows`);
}
```

## When to run

- After any new migration that adds a table or modifies RLS policies.
- Before each demo or pilot deployment.
- After any Supabase project upgrade.

## Boundary

These tests verify Supabase RLS. They do not replace application-level organization_id
scoping in `data.ts` (which is verified by `multi-tenancy.test.ts`). Both layers are required.
