import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const changePlanPage = readFileSync(join(process.cwd(), "src/app/change-plan/page.tsx"), "utf8");
const platformOutline = readFileSync(join(process.cwd(), "src/lib/platform-outline.ts"), "utf8");
const appShell = readFileSync(join(process.cwd(), "src/components/AppShell.tsx"), "utf8");
const workbenchClient = readFileSync(join(process.cwd(), "src/components/WorkbenchClient.tsx"), "utf8");
const workbenchPage = readFileSync(join(process.cwd(), "src/app/workbench/page.tsx"), "utf8");
const changePlanActions = readFileSync(join(process.cwd(), "src/app/change-plan/actions.ts"), "utf8");
const dataLayer = readFileSync(join(process.cwd(), "src/lib/supabase/data.ts"), "utf8");

describe("command center and change plan", () => {
  it("adds a command-center first screen while preserving BioRisk scoring", () => {
    expect(workbenchClient).toContain("PredictSafeBIO Command Center");
    expect(workbenchClient).toContain("category.statusLabel");
    expect(workbenchClient).toContain("BioRisk Scoring Engine");
    expect(workbenchClient).toContain("PredictSafeBIO Intelligence Platform Architecture");
    expect(workbenchPage).toContain("listAssessments");
    expect(workbenchPage).toContain("getAuditReadinessConsoleSummary");
    expect(workbenchPage).toContain("listChangePlanItems");
    expect(workbenchClient).toContain("changePlanItemCount");
  });

  it("keeps curated starter rows and adds persistence-backed helpers", () => {
    expect(platformOutline).toContain("changePlanRows");
    expect(platformOutline).toContain("changePlanPriorities");
    expect(platformOutline).toContain("changePlanStatuses");
    expect(platformOutline).toContain("Version Control");
    expect(platformOutline).toContain("Roles & Permissions");
    expect(platformOutline).toContain("Integrations & APIs");
    expect(platformOutline).toContain("Trend Analysis");
    expect(platformOutline).toContain("Training Matrix");
    expect(dataLayer).toContain("listChangePlanItems");
    expect(dataLayer).toContain("createChangePlanItem");
    expect(dataLayer).toContain("updateChangePlanItem");
    expect(dataLayer).toContain('from("change_plan_items")');
  });

  it("renders the additions and change plan table with owner-only language", () => {
    expect(changePlanPage).toContain("Additions & Change Plan");
    expect(changePlanPage).toContain("New Capability / Feature");
    expect(changePlanPage).toContain("Notes / Requirement Detail");
    expect(changePlanPage).toContain("Owner roadmap controls enabled");
    expect(changePlanPage).toContain("Owner controls available - seed starter rows");
    expect(changePlanPage).toContain("Read-only change plan");
    expect(changePlanPage).toContain("Curated starter rows");
    expect(changePlanPage).toContain("Seed rows");
    expect(changePlanPage).toContain("Add item");
  });

  it("wires owner-only server actions for create and update controls", () => {
    expect(changePlanPage).toContain("seedDefaultChangePlanItemsAction");
    expect(changePlanPage).toContain("createChangePlanItemAction");
    expect(changePlanPage).toContain("updateChangePlanItemAction");
    expect(changePlanActions).toContain("seedDefaultChangePlanItems");
    expect(changePlanActions).toContain("createChangePlanItem");
    expect(changePlanActions).toContain("updateChangePlanItem");
    expect(dataLayer).toContain("Only organization owners can manage Change Plan rows.");
  });

  it("adds Change Plan navigation and visible gap module cards", () => {
    expect(appShell).toContain("Change Plan");
    expect(appShell).toContain("/change-plan");
    expect(changePlanPage).toContain("Visible Gap Modules");
    expect(workbenchClient).toContain("gapModuleCards");
  });
});
