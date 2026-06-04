import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260528194359_map_aligned_foundation.sql"), "utf8");

const mapAlignedTables = [
  "organization_memberships",
  "permission_roles",
  "sites",
  "labs",
  "reference_sources",
  "reference_sections",
  "reference_rule_mappings",
  "document_library_catalog",
  "document_versions",
  "document_approvals",
  "training_requirements",
  "training_assignments",
  "competency_assessments",
  "biological_materials",
  "biosafety_risk_assessments",
  "lab_specific_manuals",
  "risk_acknowledgements",
  "incidents",
  "incident_evidence",
  "incident_investigation_steps",
  "capa_records",
  "capa_actions",
  "equipment",
  "equipment_events",
  "temperature_logs",
  "materials",
  "samples",
  "sample_chain_of_custody",
  "chemical_inventory",
  "waste_records",
  "audits",
  "audit_findings",
  "audit_evidence",
  "tasks",
  "notifications"
];

describe("map-aligned Supabase foundation migration", () => {
  it("creates each database-map table with org-scoped access controls", () => {
    for (const table of mapAlignedTables) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`grant select, insert, update, delete on public.${table} to authenticated`);
    }
  });

  it("keeps policies scoped through authenticated organization membership", () => {
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("profiles.id = (select auth.uid())");
    expect(migration).not.toMatch(/create policy[\s\S]+using \(true\)/i);
  });
});
