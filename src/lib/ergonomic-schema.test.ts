import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260528223000_ergonomic_level1_screening.sql"), "utf8");

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
