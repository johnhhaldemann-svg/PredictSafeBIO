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

  it("exposes profile, password, and company profile update surfaces", () => {
    expect(page).toContain("updateAccountProfileAction");
    expect(page).toContain("updateCompanyProfileAction");
    expect(page).toContain('href="/account/password"');
    expect(page).toContain('name="returnTo" value="/account"');
  });
});
