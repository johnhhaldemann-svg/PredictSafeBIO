import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260529123000_harden_foundation_fk_indexes.sql"), "utf8");

describe("foundation foreign-key index hardening migration", () => {
  it("creates missing public foreign-key indexes without changing authorization rules", () => {
    expect(migration).toContain("pg_constraint");
    expect(migration).toContain("pg_index");
    expect(migration).toContain("create index if not exists");
    expect(migration).toContain("where con.contype = 'f'");
    expect(migration).toContain("and n.nspname = 'public'");
    expect(migration).not.toMatch(/user_metadata/i);
    expect(migration).not.toMatch(/security definer/i);
  });
});
