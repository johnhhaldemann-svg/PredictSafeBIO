import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260530120000_change_plan_items.sql"),
  "utf8"
);
const archiveMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260530130000_change_plan_item_archive_status.sql"),
  "utf8"
);
const dataLayer = readFileSync(join(process.cwd(), "src/lib/supabase/data.ts"), "utf8");
const actions = readFileSync(join(process.cwd(), "src/app/change-plan/actions.ts"), "utf8");

describe("change plan schema and owner enforcement", () => {
  it("creates an org-scoped change plan table with constrained roadmap vocabulary", () => {
    expect(migration).toContain("create table public.change_plan_items");
    expect(migration).toContain("organization_id uuid not null references public.organizations(id) on delete cascade");
    expect(migration).toContain("created_by uuid references auth.users(id) on delete set null");
    expect(migration).toContain("priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low'))");
    expect(migration).toContain(
      "status text not null default 'Planned' check (status in ('Planned', 'In discovery', 'Ready for demo', 'Backlog'))"
    );
    expect(migration).toContain("change_plan_items_org_sort_idx");
    expect(migration).toContain("change_plan_items_org_status_idx");
  });

  it("enables RLS, explicit grants, member reads, and owner writes without user_metadata", () => {
    expect(migration).toContain("grant select, insert, update, delete on public.change_plan_items to authenticated");
    expect(migration).toContain("alter table public.change_plan_items enable row level security");
    expect(migration).toContain('create policy "change_plan_items_member_select"');
    expect(migration).toContain('create policy "change_plan_items_owner_insert"');
    expect(migration).toContain('create policy "change_plan_items_owner_update"');
    expect(migration).toContain('create policy "change_plan_items_owner_delete"');
    expect(migration).toContain("profiles.id = (select auth.uid())");
    expect(migration).toContain("profiles.role = 'owner'");
    expect(migration).not.toContain("user_metadata");
  });

  it("represents owner-only writes in server actions and data helpers", () => {
    expect(dataLayer).toContain("listChangePlanItems");
    expect(dataLayer).toContain("seedDefaultChangePlanItems");
    expect(dataLayer).toContain("createChangePlanItem");
    expect(dataLayer).toContain("updateChangePlanItem");
    expect(dataLayer).toContain('context.role !== "owner"');
    expect(actions).toContain("revalidatePath(\"/workbench\")");
    expect(actions).toContain("redirect(`/change-plan?");
  });

  it("extends roadmap status with a non-destructive archive option", () => {
    expect(archiveMigration).toContain("drop constraint if exists change_plan_items_status_check");
    expect(archiveMigration).toContain("'Archived'");
  });
});
