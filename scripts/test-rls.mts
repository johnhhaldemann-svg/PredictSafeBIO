/**
 * RLS Integration Test Script
 *
 * Verifies that Postgres Row-Level Security policies enforce organization
 * boundaries across all MVP tables. Requires a dedicated Supabase test
 * project with two seeded organizations.
 *
 * Usage:
 *   npx tsx scripts/test-rls.mts
 *
 * Required environment variables (in .env.test or exported in shell):
 *   TEST_SUPABASE_URL          — URL of the dedicated test project
 *   TEST_SUPABASE_SERVICE_KEY  — Service role key (bypasses RLS for seeding)
 *   TEST_ORG_A_JWT             — Anon JWT for a signed-in user in Org A
 *   TEST_ORG_B_JWT             — Anon JWT for a signed-in user in Org B
 *   TEST_ORG_A_ID              — UUID of Org A
 *   TEST_ORG_B_ID              — UUID of Org B
 *
 * See docs/rls-integration-test-plan.md for full setup instructions.
 */

import { createClient } from "@supabase/supabase-js";

const TEST_URL = process.env.TEST_SUPABASE_URL!;
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY!;
const ORG_A_JWT = process.env.TEST_ORG_A_JWT!;
const ORG_B_JWT = process.env.TEST_ORG_B_JWT!;
const ORG_A = process.env.TEST_ORG_A_ID!;
const ORG_B = process.env.TEST_ORG_B_ID!;

if (!TEST_URL || !SERVICE_KEY || !ORG_A_JWT || !ORG_B_JWT || !ORG_A || !ORG_B) {
  console.error("Missing required environment variables. See script header for details.");
  process.exit(1);
}

const serviceClient = createClient(TEST_URL, SERVICE_KEY);
const orgAClient = createClient(TEST_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
  global: { headers: { Authorization: `Bearer ${ORG_A_JWT}` } }
});
const orgBClient = createClient(TEST_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
  global: { headers: { Authorization: `Bearer ${ORG_B_JWT}` } }
});

const ROWS_PER_ORG = 3;
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function seedAssessments() {
  for (const orgId of [ORG_A, ORG_B]) {
    for (let i = 0; i < ROWS_PER_ORG; i++) {
      await serviceClient.from("assessments").insert({
        organization_id: orgId,
        site_name: `Test Site ${i}`,
        area: "Test Area",
        workflow: "Test Workflow",
        score: 50,
        level: "moderate",
        confidence: "medium",
        human_review_status: "draft_human_review_required",
        payload: {}
      });
    }
  }
}

async function seedDocuments() {
  for (const orgId of [ORG_A, ORG_B]) {
    for (let i = 0; i < ROWS_PER_ORG; i++) {
      await serviceClient.from("document_metadata").insert({
        organization_id: orgId,
        title: `Test Document ${i}`,
        document_type: "sop",
        status: "draft"
      });
    }
  }
}

async function seedAuditEvents() {
  for (const orgId of [ORG_A, ORG_B]) {
    for (let i = 0; i < ROWS_PER_ORG; i++) {
      await serviceClient.from("audit_events").insert({
        organization_id: orgId,
        event_type: "assessment_run",
        summary: `Test audit event ${i}`,
        payload: {}
      });
    }
  }
}

// ---------------------------------------------------------------------------
// RLS assertion helpers
// ---------------------------------------------------------------------------

async function assertOrgIsolation(table: string, orgAClient: ReturnType<typeof createClient>, orgBClient: ReturnType<typeof createClient>) {
  console.log(`\n  Table: ${table}`);

  // Org A should see exactly ROWS_PER_ORG rows
  const { count: aCount } = await orgAClient
    .from(table)
    .select("id", { count: "exact", head: true });
  assert(aCount === ROWS_PER_ORG, `Org A sees exactly ${ROWS_PER_ORG} rows (got ${aCount})`);

  // Org A should see 0 rows when filtering by Org B's ID
  const { count: aLeakCount } = await orgAClient
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ORG_B);
  assert(aLeakCount === 0, `Org A cannot see Org B rows (leaked: ${aLeakCount})`);

  // Org B should see exactly ROWS_PER_ORG rows
  const { count: bCount } = await orgBClient
    .from(table)
    .select("id", { count: "exact", head: true });
  assert(bCount === ROWS_PER_ORG, `Org B sees exactly ${ROWS_PER_ORG} rows (got ${bCount})`);

  // Org B should see 0 rows when filtering by Org A's ID
  const { count: bLeakCount } = await orgBClient
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ORG_A);
  assert(bLeakCount === 0, `Org B cannot see Org A rows (leaked: ${bLeakCount})`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("PredictSafeBIO — RLS Integration Tests");
  console.log("========================================");
  console.log(`Test project: ${TEST_URL}`);
  console.log(`Org A: ${ORG_A}`);
  console.log(`Org B: ${ORG_B}`);

  console.log("\n[1/3] Seeding test data...");
  await seedAssessments();
  await seedDocuments();
  await seedAuditEvents();
  console.log("  Seeded 3 rows per table per org.");

  console.log("\n[2/3] Running RLS isolation assertions...");
  await assertOrgIsolation("assessments", orgAClient, orgBClient);
  await assertOrgIsolation("document_metadata", orgAClient, orgBClient);
  await assertOrgIsolation("audit_events", orgAClient, orgBClient);

  console.log("\n[3/3] Cleanup...");
  for (const table of ["assessments", "document_metadata", "audit_events"]) {
    await serviceClient.from(table).delete().in("organization_id", [ORG_A, ORG_B]);
  }
  console.log("  Test rows deleted.");

  console.log("\n========================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("RLS ISOLATION FAILURE — data leaks detected between organizations.");
    process.exit(1);
  } else {
    console.log("All RLS isolation checks passed.");
  }
}

main().catch((err) => {
  console.error("RLS test script failed:", err);
  process.exit(1);
});
