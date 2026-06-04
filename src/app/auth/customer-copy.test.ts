import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const loginPage = readFileSync(join(process.cwd(), "src/app/login/page.tsx"), "utf8");
const signupPage = readFileSync(join(process.cwd(), "src/app/signup/page.tsx"), "utf8");
const onboardingPage = readFileSync(join(process.cwd(), "src/app/onboarding/page.tsx"), "utf8");

describe("customer-facing copy", () => {
  it("login page uses customer language and correct brand tagline", () => {
    expect(loginPage).toContain("Biosafety Intelligence");
    expect(loginPage).toContain("Sign in to access your organization");
    expect(loginPage).toContain("Workspace access");
    // No internal dev language
    expect(loginPage).not.toContain("AI Engine MVP");
    expect(loginPage).not.toContain("deterministic engine publicly");
    expect(loginPage).not.toContain("Secure access");
  });

  it("signup page uses customer language and correct brand tagline", () => {
    expect(signupPage).toContain("Biosafety Intelligence");
    expect(signupPage).toContain("Get started");
    expect(signupPage).toContain("biosafety management workspace");
    expect(signupPage).toContain("confirmation email");
    // No internal dev language in user-visible strings
    expect(signupPage).not.toContain("AI Engine MVP");
    expect(signupPage).not.toContain("Supabase Auth user");
    expect(signupPage).not.toContain("seed your organization");
    // Dev-only warning copy (shown to users) must not expose internal env var names or file paths
    expect(signupPage).not.toContain("<code>NEXT_PUBLIC_EMAIL_CONFIRMATION_DISABLED");
    expect(signupPage).not.toContain("<code>.env.local</code>");
  });

  it("onboarding page uses customer language with no demo references", () => {
    expect(onboardingPage).toContain("Set up your workspace");
    expect(onboardingPage).toContain("biosafety assessments");
    expect(onboardingPage).toContain("Create workspace");
    expect(onboardingPage).toContain("Operating context");
    // No internal dev language
    expect(onboardingPage).not.toContain("Seed your MVP workspace");
    expect(onboardingPage).not.toContain("demo company profile");
    expect(onboardingPage).not.toContain("live Supabase path");
    expect(onboardingPage).not.toContain("defaultValue={demoCompanyProfile");
  });

  it("onboarding form uses placeholder hints instead of demo defaults", () => {
    // Required fields have placeholders from demo profile as example hints
    expect(onboardingPage).toContain("placeholder={demoCompanyProfile.companyName}");
    expect(onboardingPage).toContain("placeholder={demoCompanyProfile.primarySite}");
    // Optional section is clearly labelled
    expect(onboardingPage).toContain("optional");
    // User name field has a helpful placeholder rather than the email address
    expect(onboardingPage).toContain('placeholder="e.g. Dr. Jane Smith"');
  });
});
