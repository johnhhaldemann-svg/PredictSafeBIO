import { describe, expect, it } from "vitest";
import {
  canCreateWorkspaceRecord,
  canEditWorkspaceTaskGovernance,
  canManageWorkspace,
  canUpdateAssignedWorkspaceTask,
  getWorkspaceTaskActorRole,
  hasWorkspaceAccess,
  normalizeWorkspaceRole
} from "./role-permissions";

describe("role permissions", () => {
  it("normalizes canonical and legacy roles to workspace access tiers", () => {
    expect(normalizeWorkspaceRole("owner")).toBe("owner");
    expect(normalizeWorkspaceRole("member")).toBe("member");
    expect(normalizeWorkspaceRole("admin")).toBe("owner");
    expect(normalizeWorkspaceRole("provider")).toBe("owner");
    expect(normalizeWorkspaceRole("patient")).toBe("member");
    expect(normalizeWorkspaceRole(null)).toBe("member");
  });

  it("requires a signed-in onboarded workspace before granting access", () => {
    expect(hasWorkspaceAccess({ signedIn: false, role: "owner", organizationId: "org" })).toBe(false);
    expect(hasWorkspaceAccess({ signedIn: true, role: "owner", needsOnboarding: true, organizationId: "org" })).toBe(false);
    expect(hasWorkspaceAccess({ signedIn: true, role: "owner" })).toBe(false);
    expect(hasWorkspaceAccess({ userId: "user", organizationId: "org", role: "member" })).toBe(true);
  });

  it("keeps workspace management owner-only", () => {
    expect(canManageWorkspace({ signedIn: true, role: "owner", organizationId: "org" })).toBe(true);
    expect(canManageWorkspace({ signedIn: true, role: "member", organizationId: "org" })).toBe(false);
    expect(canEditWorkspaceTaskGovernance({ signedIn: true, role: "member", organizationId: "org" })).toBe(false);
    expect(canEditWorkspaceTaskGovernance({ signedIn: true, role: "owner", organizationId: "org" })).toBe(true);
  });

  it("allows owner and assigned members to update task execution while keeping create access workspace-scoped", () => {
    expect(canCreateWorkspaceRecord({ signedIn: true, role: "member", organizationId: "org" })).toBe(true);
    expect(canUpdateAssignedWorkspaceTask({ userId: "owner-id", role: "owner", organizationId: "org" }, "someone-else")).toBe(true);
    expect(canUpdateAssignedWorkspaceTask({ userId: "member-id", role: "member", organizationId: "org" }, "member-id")).toBe(true);
    expect(canUpdateAssignedWorkspaceTask({ userId: "member-id", role: "member", organizationId: "org" }, "someone-else")).toBe(false);
  });

  it("labels task audit actors from the enforced permission boundary", () => {
    expect(getWorkspaceTaskActorRole({ userId: "owner-id", role: "owner", organizationId: "org" })).toBe("owner");
    expect(getWorkspaceTaskActorRole({ userId: "member-id", role: "member", organizationId: "org" })).toBe("assigned_member");
  });
});
