import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const foundationPage = readFileSync(join(process.cwd(), "src/app/foundation/page.tsx"), "utf8");
const myWorkPage = readFileSync(join(process.cwd(), "src/app/my-work/page.tsx"), "utf8");
const documentsPage = readFileSync(join(process.cwd(), "src/app/documents/page.tsx"), "utf8");
const trainingMatrixPage = readFileSync(join(process.cwd(), "src/app/training-matrix/page.tsx"), "utf8");
const operationsPage = readFileSync(join(process.cwd(), "src/app/operations/page.tsx"), "utf8");
const adminDemoPage = readFileSync(join(process.cwd(), "src/app/admin/demo/page.tsx"), "utf8");
const dataLayer = readFileSync(join(process.cwd(), "src/lib/supabase/data.ts"), "utf8");

describe("role permission surfaces", () => {
  it("centralizes owner and assigned-member enforcement in the data layer", () => {
    expect(dataLayer).toContain('from "@/lib/role-permissions"');
    expect(dataLayer).toContain("canManageWorkspace(context)");
    expect(dataLayer).toContain("canUpdateAssignedWorkspaceTask(context, task.assigned_to)");
    expect(dataLayer).toContain("canEditWorkspaceTaskGovernance(context)");
    expect(dataLayer).toContain("normalizeWorkspaceRole(data.role)");
    expect(dataLayer).not.toContain('context.role !== "owner"');
    expect(dataLayer).not.toContain('context.role === "owner"');
  });

  it("keeps Foundation and My Work owner controls separate from assigned-member task updates", () => {
    expect(foundationPage).toContain("canManage={adminAccess.isOwner}");
    expect(foundationPage).toContain("canManage={adminAccess.signedIn}");
    expect(foundationPage).toContain("canEditAssignment={adminAccess.isOwner}");
    expect(myWorkPage).toContain('requestedView ?? (adminAccess.isOwner ? "all" : "my_open")');
    expect(myWorkPage).toContain("canEditAssignment={adminAccess.isOwner}");
  });

  it("gates create surfaces for documents and operations to onboarded workspace users", () => {
    expect(documentsPage).toContain("canCreateWorkspaceRecord(auth)");
    expect(documentsPage).toContain('href="/login?next=/documents"');
    expect(operationsPage).toContain("canCreateWorkspaceRecord(auth)");
    expect(operationsPage).toContain('href="/login?next=/operations"');
  });

  it("keeps training readonly and admin seeding owner-only until the next CRUD slice", () => {
    expect(trainingMatrixPage).toContain("Training remains human validated");
    expect(trainingMatrixPage).not.toContain("<form");
    expect(adminDemoPage).toContain("canManageWorkspace(auth)");
    expect(adminDemoPage).toContain("canSeedDemo");
  });
});
