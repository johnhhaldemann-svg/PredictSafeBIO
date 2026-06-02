export type WorkspaceRole = "owner" | "member";

export type WorkspaceAccessInput = {
  signedIn?: boolean;
  userId?: string | null;
  organizationId?: string | null;
  role?: string | null;
  needsOnboarding?: boolean;
};

export function normalizeWorkspaceRole(role: string | null | undefined): WorkspaceRole {
  return role === "owner" ? "owner" : "member";
}

export function hasWorkspaceAccess(access: WorkspaceAccessInput | null | undefined): boolean {
  if (!access) return false;
  const signedIn = access.signedIn ?? Boolean(access.userId);
  return signedIn && Boolean(access.organizationId) && !access.needsOnboarding;
}

export function canManageWorkspace(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access) && normalizeWorkspaceRole(access?.role) === "owner";
}

export function canCreateWorkspaceRecord(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access);
}

export function canUpdateAssignedWorkspaceTask(
  access: WorkspaceAccessInput | null | undefined,
  assignedTo: string | null | undefined
): boolean {
  if (!hasWorkspaceAccess(access)) return false;
  if (canManageWorkspace(access)) return true;
  return Boolean(access?.userId && assignedTo && access.userId === assignedTo);
}

export function canEditWorkspaceTaskGovernance(access: WorkspaceAccessInput | null | undefined): boolean {
  return canManageWorkspace(access);
}

export function getWorkspaceTaskActorRole(access: WorkspaceAccessInput | null | undefined): "owner" | "assigned_member" {
  return canManageWorkspace(access) ? "owner" : "assigned_member";
}
