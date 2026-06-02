import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const authActions = readFileSync(join(process.cwd(), "src/app/auth/actions.ts"), "utf8");
const documentActions = readFileSync(join(process.cwd(), "src/app/documents/actions.ts"), "utf8");
const documentsPage = readFileSync(join(process.cwd(), "src/app/documents/page.tsx"), "utf8");
const operationsPage = readFileSync(join(process.cwd(), "src/app/operations/page.tsx"), "utf8");
const adminDemoPage = readFileSync(join(process.cwd(), "src/app/admin/demo/page.tsx"), "utf8");
const changePlanPage = readFileSync(join(process.cwd(), "src/app/change-plan/page.tsx"), "utf8");
const documentDetailPage = readFileSync(join(process.cwd(), "src/app/documents/[id]/page.tsx"), "utf8");
const teamPage = readFileSync(join(process.cwd(), "src/app/account/team/page.tsx"), "utf8");
const accountPage = readFileSync(join(process.cwd(), "src/app/account/page.tsx"), "utf8");
const auditPage = readFileSync(join(process.cwd(), "src/app/admin/audit/page.tsx"), "utf8");

describe("user-visible message customer copy", () => {
  it("auth actions use customer language for connection and signup messages", () => {
    expect(authActions).toContain("Workspace is not connected");
    expect(authActions).toContain("Contact your administrator");
    expect(authActions).toContain("confirmation link to activate your account");
    expect(authActions).not.toContain("Supabase is not configured yet");
    expect(authActions).not.toContain("Add the project URL and publishable key");
    expect(authActions).not.toContain("Supabase confirmation link");
    expect(authActions).not.toContain("finish onboarding");
  });

  it("document actions and pages use sign-in prompts without finish-onboarding language", () => {
    expect(documentActions).toContain("Sign in to your workspace to save document recommendations");
    expect(documentActions).not.toContain("finish onboarding before persisting");
    expect(documentsPage).toContain("Sign in to create controlled document records");
    expect(documentsPage).not.toContain("finish onboarding before creating");
  });

  it("operations, admin demo, and account pages drop finish-onboarding language", () => {
    expect(operationsPage).toContain("Sign in to create HSE operations records");
    expect(operationsPage).not.toContain("finish onboarding before creating");
    expect(adminDemoPage).toContain("Sign in as an organization owner to seed demo records");
    expect(adminDemoPage).not.toContain("finish onboarding before seeding");
  });

  it("change-plan and document detail pages drop Supabase references", () => {
    expect(changePlanPage).toContain("Creates five starter change plan items for your organization");
    expect(changePlanPage).not.toContain("screenshot-aligned rows in Supabase");
    expect(documentDetailPage).toContain("Saves gap and draft update recommendations");
    expect(documentDetailPage).not.toContain("Persists gap and draft update recommendations to Supabase");
  });

  it("account and team pages drop Supabase references in user-visible copy", () => {
    expect(accountPage).toContain("same secure path as reset links");
    expect(accountPage).toContain("managed by your workspace owner");
    expect(accountPage).not.toContain("Supabase recovery-safe path");
    expect(teamPage).toContain("invitation email with a link to join your workspace");
    expect(teamPage).toContain("authentication settings");
    expect(teamPage).not.toContain("Supabase Auth invite email");
    expect(teamPage).not.toContain("Supabase Auth settings");
  });

  it("audit log filter uses human-readable labels not raw snake_case event names", () => {
    expect(auditPage).toContain("BioType selection updated");
    expect(auditPage).toContain("Review task status updated");
    expect(auditPage).toContain("Evidence readiness updated");
    expect(auditPage).toContain("Evidence Map");
    expect(auditPage).toContain("BioType Selection");
    expect(auditPage).toContain("Audit Readiness");
    // Label maps defined
    expect(auditPage).toContain("auditEventTypeLabels");
    expect(auditPage).toContain("sourceModuleLabels");
  });
});
