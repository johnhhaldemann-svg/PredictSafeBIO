import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260528214500_biotype_foundation_alignment.sql"), "utf8");

const biotypeTables = ["biotype_foundations", "organization_biotype_selections", "biotype_rule_mappings"];

describe("BioType Foundation alignment migration", () => {
  it("creates BioType tables with organization scope, RLS, grants, and indexes", () => {
    for (const table of biotypeTables) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain("organization_id uuid not null references public.organizations(id) on delete cascade");
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`grant select, insert, update, delete on public.${table} to authenticated`);
      expect(migration).toContain(`create index ${table}_org_idx on public.${table}(organization_id`);
    }
  });

  it("uses same-org policies without user-editable metadata authorization", () => {
    for (const table of biotypeTables) {
      expect(migration).toContain(`create policy "${table}_member_all"`);
    }

    expect(migration).toContain("profiles.id = (select auth.uid())");
    expect(migration).not.toMatch(/user_metadata|raw_user_meta_data/i);
    expect(migration).not.toContain("create table public.audit_logs");
  });
});
