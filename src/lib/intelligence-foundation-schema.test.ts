import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260528203000_intelligence_foundation.sql"), "utf8");

const foundationTables = [
  "company_intake_templates",
  "company_intake_responses",
  "compliance_programs",
  "compliance_methods",
  "program_method_links",
  "applicability_rules",
  "biorisk_scoring_rules",
  "compliance_evidence_map",
  "change_impact_events",
  "audit_readiness_scores"
];

describe("PredictSafeBIO Intelligence Foundation migration", () => {
  it("creates every packet foundation table with RLS and authenticated grants", () => {
    for (const table of foundationTables) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`grant select, insert, update, delete on public.${table} to authenticated`);
      expect(migration).toContain(`create index ${table}_org_idx on public.${table}(organization_id`);
    }
  });

  it("keeps customer tables organization-scoped and same-org protected", () => {
    for (const table of foundationTables) {
      const createBlock = migration.slice(migration.indexOf(`create table public.${table}`), migration.indexOf(");", migration.indexOf(`create table public.${table}`)));
      expect(createBlock).toContain("organization_id uuid not null references public.organizations(id) on delete cascade");
      expect(migration).toContain(`create policy "${table}_member_all"`);
    }
    expect(migration).toContain("profiles.id = (select auth.uid())");
    expect(migration).not.toMatch(/user_metadata|raw_user_meta_data/i);
  });

  it("keeps audit_events append-oriented for authenticated clients", () => {
    expect(migration).not.toContain("create table public.audit_logs");
    expect(migration).toContain("revoke update, delete on public.audit_events from authenticated");
  });
});
