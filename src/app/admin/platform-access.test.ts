import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const nav = read("src/components/PlatformCategoryNav.tsx");
const appShell = read("src/components/AppShell.tsx");

// Platform utilities (/admin/*) must be gated to platform_staff/superadmin only.
// Org owners and members must NOT be able to see or open them.
describe("platform utility access control", () => {
  it("marks the System Reliance nav section as platform-only and filters it", () => {
    expect(nav).toContain("platformOnly: true");
    expect(nav).toContain("canViewPlatform");
    expect(nav).toContain("cat.platformOnly");
  });

  it("AppShell only reveals platform nav to platform staff", () => {
    expect(appShell).toContain('canViewPlatform={tier === "platform_staff"}');
  });

  it("gates every nav-linked /admin page to platform staff (not owner-level)", () => {
    const platformPages = [
      "src/app/admin/audit/page.tsx",
      "src/app/admin/ai-knowledge/page.tsx",
      "src/app/admin/billing/page.tsx",
      "src/app/admin/config/page.tsx",
      "src/app/admin/config/flags/page.tsx",
      "src/app/admin/config/branding/page.tsx",
      "src/app/admin/config/emails/page.tsx",
      "src/app/admin/demo/page.tsx",
    ];
    for (const p of platformPages) {
      const src = read(p);
      expect(src, `${p} must guard with canViewPlatform`).toContain("canViewPlatform");
      // The old owner-level guards must not gate these platform pages.
      expect(src, `${p} must not use owner-level isAdminOrAbove`).not.toContain("isAdminOrAbove(");
      expect(src, `${p} must not use owner-level isAdminRole`).not.toContain("isAdminRole(");
    }
  });

  it("gates mutating admin actions to platform staff", () => {
    for (const p of [
      "src/app/admin/config/actions.ts",
      "src/app/admin/users/actions.ts",
      "src/app/admin/moderation/actions.ts",
    ]) {
      const src = read(p);
      expect(src, `${p} must guard with canViewPlatform`).toContain("canViewPlatform(");
      expect(src, `${p} must not gate at owner level`).not.toContain("isAdminOrAbove(");
    }
  });
});
