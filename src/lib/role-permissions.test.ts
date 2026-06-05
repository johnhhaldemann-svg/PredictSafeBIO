import { describe, expect, it } from "vitest";
import {
  ASSIGNABLE_ORG_ROLES,
  ASSIGNABLE_PLATFORM_ROLES,
  canCreateWorkspaceRecord,
  canEditWorkspaceTaskGovernance,
  canManageWorkspace,
  canUpdateAssignedWorkspaceTask,
  canViewPlatform,
  getRoleTier,
  getWorkspaceTaskActorRole,
  hasWorkspaceAccess,
  isAdminOrAbove,
  isPlatformRole,
  isReadOnly,
  isSupervisorOrAbove,
  normalizeWorkspaceRole
} from "./role-permissions";

const base = { signedIn: true as const, organizationId: "org", userId: "u" };

describe("role permissions", () => {
  it("normalizes canonical and legacy roles to workspace access tiers", () => {
    // owner bucket
    expect(normalizeWorkspaceRole("owner")).toBe("owner");
    expect(normalizeWorkspaceRole("admin")).toBe("owner");
    expect(normalizeWorkspaceRole("company_admin")).toBe("owner");
    expect(normalizeWorkspaceRole("provider")).toBe("owner");
    expect(normalizeWorkspaceRole("safety_manager")).toBe("owner");
    // supervisor bucket
    expect(normalizeWorkspaceRole("supervisor")).toBe("supervisor");
    expect(normalizeWorkspaceRole("project_admin")).toBe("supervisor");
    expect(normalizeWorkspaceRole("foreman")).toBe("supervisor");
    expect(normalizeWorkspaceRole("lab_manager")).toBe("supervisor");
    expect(normalizeWorkspaceRole("pi")).toBe("supervisor");
    // viewer bucket
    expect(normalizeWorkspaceRole("viewer")).toBe("viewer");
    expect(normalizeWorkspaceRole("auditor")).toBe("viewer");
    expect(normalizeWorkspaceRole("read_only_viewer")).toBe("viewer");
    expect(normalizeWorkspaceRole("client_reviewer")).toBe("viewer");
    // member bucket
    expect(normalizeWorkspaceRole("member")).toBe("member");
    expect(normalizeWorkspaceRole("patient")).toBe("member");
    expect(normalizeWorkspaceRole("worker")).toBe("member");
    expect(normalizeWorkspaceRole(null)).toBe("member");
    expect(normalizeWorkspaceRole("unknown_string")).toBe("member");
  });

  it("orders tiers viewer < member < supervisor < owner < platform_staff < superadmin", () => {
    expect(getRoleTier("viewer")).toBe(0);
    expect(getRoleTier("member")).toBe(1);
    expect(getRoleTier("supervisor")).toBe(2);
    expect(getRoleTier("owner")).toBe(3);
    expect(getRoleTier("platform_staff")).toBe(4);
    expect(getRoleTier("superadmin")).toBe(5);
    // legacy strings resolve correctly
    expect(getRoleTier("auditor")).toBe(0);
    expect(getRoleTier("pi")).toBe(2);
    expect(getRoleTier("safety_manager")).toBe(3);
  });

  it("requires a signed-in onboarded workspace before granting access", () => {
    expect(hasWorkspaceAccess({ signedIn: false, role: "owner", organizationId: "org" })).toBe(false);
    expect(hasWorkspaceAccess({ signedIn: true, role: "owner", needsOnboarding: true, organizationId: "org" })).toBe(false);
    expect(hasWorkspaceAccess({ signedIn: true, role: "owner" })).toBe(false);
    expect(hasWorkspaceAccess({ userId: "user", organizationId: "org", role: "member" })).toBe(true);
  });

  it("marks viewer as read-only and blocks creation", () => {
    const viewer = { ...base, role: "viewer" };
    const auditor = { ...base, role: "auditor" };
    expect(isReadOnly(viewer)).toBe(true);
    expect(isReadOnly(auditor)).toBe(true);
    expect(isReadOnly({ ...base, role: "member" })).toBe(false);
    expect(isReadOnly({ ...base, role: "supervisor" })).toBe(false);
    expect(canCreateWorkspaceRecord(viewer)).toBe(false);
    expect(canCreateWorkspaceRecord(auditor)).toBe(false);
    expect(canCreateWorkspaceRecord({ ...base, role: "member" })).toBe(true);
    expect(canCreateWorkspaceRecord({ ...base, role: "supervisor" })).toBe(true);
  });

  it("keeps workspace management owner-only", () => {
    expect(canManageWorkspace({ ...base, role: "owner" })).toBe(true);
    expect(canManageWorkspace({ ...base, role: "supervisor" })).toBe(false);
    expect(canManageWorkspace({ ...base, role: "member" })).toBe(false);
    expect(canManageWorkspace({ ...base, role: "viewer" })).toBe(false);
    expect(canEditWorkspaceTaskGovernance({ ...base, role: "member" })).toBe(false);
    expect(canEditWorkspaceTaskGovernance({ ...base, role: "owner" })).toBe(true);
  });

  it("isAdminOrAbove is true for owner+ and false for supervisor/member/viewer", () => {
    expect(isAdminOrAbove({ ...base, role: "owner" })).toBe(true);
    expect(isAdminOrAbove({ ...base, role: "platform_staff" })).toBe(true);
    expect(isAdminOrAbove({ ...base, role: "superadmin" })).toBe(true);
    expect(isAdminOrAbove({ ...base, role: "supervisor" })).toBe(false);
    expect(isAdminOrAbove({ ...base, role: "member" })).toBe(false);
    expect(isAdminOrAbove({ ...base, role: "viewer" })).toBe(false);
  });

  it("isSupervisorOrAbove is true for supervisor+ and false for member/viewer", () => {
    expect(isSupervisorOrAbove({ ...base, role: "supervisor" })).toBe(true);
    expect(isSupervisorOrAbove({ ...base, role: "owner" })).toBe(true);
    expect(isSupervisorOrAbove({ ...base, role: "platform_staff" })).toBe(true);
    expect(isSupervisorOrAbove({ ...base, role: "superadmin" })).toBe(true);
    expect(isSupervisorOrAbove({ ...base, role: "member" })).toBe(false);
    expect(isSupervisorOrAbove({ ...base, role: "viewer" })).toBe(false);
  });

  it("allows owner and assigned members to update tasks; blocks viewers always", () => {
    expect(canUpdateAssignedWorkspaceTask({ ...base, userId: "owner-id", role: "owner" }, "someone-else")).toBe(true);
    expect(canUpdateAssignedWorkspaceTask({ ...base, userId: "sup-id", role: "supervisor" }, "someone-else")).toBe(true);
    expect(canUpdateAssignedWorkspaceTask({ ...base, userId: "member-id", role: "member" }, "member-id")).toBe(true);
    expect(canUpdateAssignedWorkspaceTask({ ...base, userId: "member-id", role: "member" }, "someone-else")).toBe(false);
    expect(canUpdateAssignedWorkspaceTask({ ...base, userId: "v-id", role: "viewer" }, "v-id")).toBe(false);
    expect(canUpdateAssignedWorkspaceTask({ ...base, userId: "v-id", role: "auditor" }, "v-id")).toBe(false);
  });

  it("labels task audit actors from the enforced permission boundary", () => {
    expect(getWorkspaceTaskActorRole({ ...base, role: "owner" })).toBe("owner");
    expect(getWorkspaceTaskActorRole({ ...base, role: "member" })).toBe("assigned_member");
    expect(getWorkspaceTaskActorRole({ ...base, role: "supervisor" })).toBe("assigned_member");
  });

  it("restricts /admin/* platform utilities to platform staff and superadmin", () => {
    expect(canViewPlatform({ ...base, role: "superadmin" })).toBe(true);
    expect(canViewPlatform({ ...base, role: "platform_staff" })).toBe(true);
    expect(canViewPlatform({ ...base, role: "owner" })).toBe(false);
    expect(canViewPlatform({ ...base, role: "supervisor" })).toBe(false);
    expect(canViewPlatform({ ...base, role: "member" })).toBe(false);
    expect(canViewPlatform({ ...base, role: "viewer" })).toBe(false);
  });

  it("flags platform roles so only superadmins can assign them", () => {
    expect(isPlatformRole("superadmin")).toBe(true);
    expect(isPlatformRole("platform_staff")).toBe(true);
    expect(isPlatformRole("owner")).toBe(false);
    expect(isPlatformRole("supervisor")).toBe(false);
    expect(isPlatformRole("member")).toBe(false);
    expect(isPlatformRole("viewer")).toBe(false);
    // Org roles are owner-assignable; platform roles are superadmin-only.
    expect(ASSIGNABLE_ORG_ROLES.some((r) => isPlatformRole(r.value))).toBe(false);
    expect(ASSIGNABLE_PLATFORM_ROLES.every((r) => isPlatformRole(r.value))).toBe(true);
  });

  it("ASSIGNABLE_ORG_ROLES includes viewer, member, supervisor, owner in that order", () => {
    const values = ASSIGNABLE_ORG_ROLES.map((r) => r.value);
    expect(values).toContain("viewer");
    expect(values).toContain("member");
    expect(values).toContain("supervisor");
    expect(values).toContain("owner");
    expect(values.indexOf("viewer")).toBeLessThan(values.indexOf("owner"));
  });
});
