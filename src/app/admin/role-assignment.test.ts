import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const usersActions = read("src/app/admin/users/actions.ts");
const userDetailPage = read("src/app/admin/users/[id]/page.tsx");
const rolePermissions = read("src/lib/role-permissions.ts");

describe("role assignment security", () => {
  it("blocks non-superadmins from assigning platform roles (no self-escalation)", () => {
    // The action must check the actor is a super admin before granting a platform role.
    expect(usersActions).toContain("isSuperAdminActor");
    expect(usersActions).toContain("isPlatformRole(newRole) && !isSuperAdminActor");
    // And it must reject unknown role strings, not pass them straight to the DB.
    expect(usersActions).toContain("ASSIGNABLE_ROLE_VALUES.has(newRole)");
  });

  it("only offers platform roles in the UI when the actor is a super admin", () => {
    expect(userDetailPage).toContain("isActorSuperAdmin");
    expect(userDetailPage).toContain("ASSIGNABLE_PLATFORM_ROLES");
    // Owners/members are never assignable platform roles from the org-role list.
    expect(userDetailPage).toContain("ASSIGNABLE_ORG_ROLES");
  });
});

describe("role system cleanup integrity", () => {
  it("removed the non-functional per-feature grant systems", () => {
    expect(rolePermissions).not.toContain("ORG_MEMBER_FEATURES");
    expect(rolePermissions).not.toContain("PLATFORM_FEATURES");
    expect(rolePermissions).not.toContain("getRoleCapabilities");
    // The dead staff-permissions grant UI route is gone.
    expect(existsSync(join(process.cwd(), "src/app/admin/staff-permissions"))).toBe(false);
  });

  it("no code writes to the abandoned feature_permission_grants table", () => {
    const grantWriters = [
      "src/app/account/team/actions.ts",
    ];
    for (const p of grantWriters) {
      expect(read(p), `${p} should no longer touch feature_permission_grants`).not.toContain(
        "feature_permission_grants"
      );
    }
  });
});
