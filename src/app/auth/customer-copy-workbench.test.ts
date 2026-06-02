import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const forgotPasswordPage = readFileSync(join(process.cwd(), "src/app/forgot-password/page.tsx"), "utf8");
const workbenchClient = readFileSync(join(process.cwd(), "src/components/WorkbenchClient.tsx"), "utf8");

describe("workbench and password reset customer copy", () => {
  it("forgot-password page uses customer language", () => {
    expect(forgotPasswordPage).toContain("send you a link to reset your password");
    expect(forgotPasswordPage).not.toContain("Supabase recovery link");
    expect(forgotPasswordPage).not.toContain("Request a Supabase");
  });

  it("workbench save-error message does not reference Supabase", () => {
    expect(workbenchClient).toContain("Sign in to your workspace to save assessments.");
    expect(workbenchClient).not.toContain("save assessments to Supabase");
    expect(workbenchClient).not.toContain("finish onboarding to save assessments");
  });

  it("workbench activity panel uses customer language with no DevOps terminology", () => {
    expect(workbenchClient).toContain("Workspace Activity");
    expect(workbenchClient).toContain("Workspace active");
    expect(workbenchClient).toContain("No recent activity");
    expect(workbenchClient).toContain("Workspace activity confirmed");
    expect(workbenchClient).toContain("Complete your first workflow steps");
    // No internal DevOps terms
    expect(workbenchClient).not.toContain("Production Verification");
    expect(workbenchClient).not.toContain("Operating evidence ready");
    expect(workbenchClient).not.toContain("Operating evidence pending");
    expect(workbenchClient).not.toContain("Promotion blocked");
    expect(workbenchClient).not.toContain("promotion_blocked");
    expect(workbenchClient).not.toContain("Production-ready evidence present");
    expect(workbenchClient).not.toContain("Missing evidence checklist");
  });

  it("workbench evidence grid uses customer-facing row labels", () => {
    expect(workbenchClient).toContain("Connected workspace");
    expect(workbenchClient).toContain("Overall status");
    expect(workbenchClient).toContain("Getting started");
    expect(workbenchClient).not.toContain("Deployment status");
    expect(workbenchClient).not.toContain("Promotion readiness");
    expect(workbenchClient).not.toContain("promotion_ready");
  });
});
