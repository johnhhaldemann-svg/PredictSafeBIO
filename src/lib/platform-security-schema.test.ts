import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationRoot = join(process.cwd(), "supabase", "migrations");

function migration(name: string) {
  return readFileSync(join(migrationRoot, name), "utf8");
}

describe("platform security schema", () => {
  it("keeps MVP persistence tables behind organization-scoped RLS policies", () => {
    const foundation = migration("20260527000100_predictsafe_bio_foundation.sql");
    const optimized = migration("20260527000200_optimize_rls_and_fk_indexes.sql");

    for (const table of ["profiles", "organizations", "company_profiles", "assessments", "document_metadata", "document_recommendations"]) {
      expect(foundation).toContain(`alter table public.${table} enable row level security`);
    }

    for (const policy of [
      "profiles_select_same_org",
      "organizations_select_member",
      "company_profiles_member_all",
      "assessments_member_all",
      "document_metadata_member_all",
      "document_recommendations_member_all"
    ]) {
      expect(optimized).toContain(`create policy "${policy}"`);
    }
  });

  it("keeps document storage private with the full upload policy set", () => {
    const storage = migration("20260528000100_enable_document_storage.sql");

    expect(storage).toContain("insert into storage.buckets (id, name, public)");
    expect(storage).toContain("'biotech-documents', 'biotech-documents', false");

    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(storage).toContain(`biotech_documents_member_${operation}`);
      expect(storage).toContain(`on storage.objects for ${operation}`);
    }
  });

  it("keeps change-plan edits owner-only while members retain read access", () => {
    const changePlan = migration("20260530120000_change_plan_items.sql");

    expect(changePlan).toContain('create policy "change_plan_items_member_select"');
    expect(changePlan).toContain('create policy "change_plan_items_owner_insert"');
    expect(changePlan).toContain('create policy "change_plan_items_owner_update"');
    expect(changePlan).toContain('create policy "change_plan_items_owner_delete"');
  });
});
