import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "src", "app", "account", "page.tsx"), "utf8");

describe("account page", () => {
  it("keeps account identity fields visible and role/org read-only", () => {
    expect(page).toContain('"Email"');
    expect(page).toContain('"Full name"');
    expect(page).toContain('"Role"');
    expect(page).toContain('"Organization ID"');
    expect(page).not.toContain('name="role"');
    expect(page).not.toContain('name="organizationId"');
  });

  it("exposes profile and password surfaces and links company config to Company Settings", () => {
    expect(page).toContain("updateAccountProfileAction");
    expect(page).toContain('href="/account/password"');
    // Company editing now lives on the canonical Company Settings page.
    expect(page).toContain('href="/account/company"');
    expect(page).toContain("CompanyProfileSummary");
    expect(page).not.toContain("updateCompanyProfileAction");
  });
});
