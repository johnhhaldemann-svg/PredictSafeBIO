import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260528223000_ergonomic_level1_screening.sql"), "utf8");
const level2Migration = readFileSync(join(process.cwd(), "supabase/migrations/20260529211000_ergonomic_level2_inspections.sql"), "utf8");

const ergonomicTables = [
  "inspection_records",
  "ergonomic_self_assessments",
  "ergonomic_risk_signals",
  "ergonomic_advanced_evaluation_requests"
];

describe("ergonomic Level 1 Supabase migration", () => {
  it("creates org-scoped ergonomic screening tables with RLS and grants", () => {
    for (const table of ergonomicTables) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`organization_id uuid not null references public.organizations(id) on delete cascade`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`grant select, insert, update, delete on public.${table} to authenticated`);
    }
  });

  it("keeps Level 1 free of measurement and equation columns", () => {
    const selfAssessmentTable = migration.split("create table public.ergonomic_self_assessments")[1].split("create table public.ergonomic_risk_signals")[0];

    expect(selfAssessmentTable).not.toMatch(/measurement|photo|equation|multiplier|horizontal|vertical|distance/i);
    expect(selfAssessmentTable).toContain("task_type text not null");
    expect(selfAssessmentTable).toContain("discomfort_level text not null");
    expect(selfAssessmentTable).toContain("body_parts text[]");
    expect(selfAssessmentTable).toContain("frequency text not null");
  });

  it("places advanced measurement scope only in Level 2 request records", () => {
    expect(migration).toContain("create table public.ergonomic_advanced_evaluation_requests");
    expect(migration).toContain("'measurements'");
    expect(migration).toContain("'industrial ergonomic equation data points'");
  });

  it("uses same-org RLS without user_metadata authorization", () => {
    expect(migration).toContain("profiles.id = (select auth.uid())");
    expect(migration).not.toMatch(/user_metadata|raw_user_meta_data/i);
  });
});

describe("ergonomic Level 2 Supabase migration", () => {
  it("creates an org-scoped Level 2 measurement inspection table", () => {
    expect(level2Migration).toContain("create table public.ergonomic_level2_inspections");
    expect(level2Migration).toContain("organization_id uuid not null references public.organizations(id) on delete cascade");
    expect(level2Migration).toContain("advanced_evaluation_request_id uuid references public.ergonomic_advanced_evaluation_requests");
    expect(level2Migration).toContain("inspection_record_id uuid references public.inspection_records");
    expect(level2Migration).toContain("measurement_payload jsonb not null");
    expect(level2Migration).toContain("photo_evidence jsonb not null");
    expect(level2Migration).toContain("specialist_notes text not null");
    expect(level2Migration).toContain("formal_recommendations text[]");
  });

  it("secures Level 2 with grants, RLS, indexes, and same-org policies", () => {
    expect(level2Migration).toContain("grant select, insert, update, delete on public.ergonomic_level2_inspections to authenticated");
    expect(level2Migration).toContain("alter table public.ergonomic_level2_inspections enable row level security");
    expect(level2Migration).toContain("profiles.id = (select auth.uid())");
    expect(level2Migration).toContain("ergonomic_level2_inspections_org_created_at_idx");
    expect(level2Migration).not.toMatch(/user_metadata|raw_user_meta_data/i);
  });
});
