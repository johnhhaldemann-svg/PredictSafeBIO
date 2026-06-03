// ---------------------------------------------------------------------------
// Role-based access control for PredictSafeBIO
//
// Three tiers:
//   superadmin  – Platform operator (PredictSafeBIO staff). Cross-org access,
//                 platform management. DB role value: "superadmin"
//   owner       – Organization owner. Full access within their org, team mgmt,
//                 approvals, reports, AI knowledge review. DB value: "owner"
//   member      – Standard team member. Screenings, view programs, submit
//                 inspections, view their own work. DB value: "member"
// ---------------------------------------------------------------------------

export type WorkspaceRole = "superadmin" | "owner" | "member";

export type WorkspaceAccessInput = {
  signedIn?: boolean;
  userId?: string | null;
  organizationId?: string | null;
  role?: string | null;
  needsOnboarding?: boolean;
};

// ── Role normalization ────────────────────────────────────────────────────────

export function normalizeWorkspaceRole(role: string | null | undefined): WorkspaceRole {
  if (role === "superadmin") return "superadmin";
  if (role === "owner") return "owner";
  return "member";
}

export function getRoleTier(role: string | null | undefined): 0 | 1 | 2 {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return 2;
  if (r === "owner") return 1;
  return 0;
}

export function getRoleLabel(role: string | null | undefined): string {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return "Platform Admin";
  if (r === "owner") return "Owner";
  return "Team Member";
}

export function getRoleBadgeClass(role: string | null | undefined): string {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return "status-critical";
  if (r === "owner") return "status-current";
  return "status-needs-review";
}

// ── Base access checks ────────────────────────────────────────────────────────

export function hasWorkspaceAccess(access: WorkspaceAccessInput | null | undefined): boolean {
  if (!access) return false;
  const signedIn = access.signedIn ?? Boolean(access.userId);
  return signedIn && Boolean(access.organizationId) && !access.needsOnboarding;
}

export function isSuperAdmin(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access) && normalizeWorkspaceRole(access?.role) === "superadmin";
}

export function isOwnerOrAbove(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access) && getRoleTier(access?.role) >= 1;
}

/** @deprecated use isOwnerOrAbove */
export function canManageWorkspace(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

// ── Feature-level permission functions ───────────────────────────────────────

/** Members and above can submit screenings, view programs, see their work. */
export function canSubmitScreenings(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access);
}

/** Members can VIEW inspections. Owners can CREATE and MANAGE them. */
export function canViewInspections(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access);
}

export function canScheduleInspections(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

/** Risk assessments, compliance map, foundation — owner and above. */
export function canViewRiskIntelligence(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

/** CAPA, operations, and incident management — owner and above. */
export function canManageOperations(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

/** Reports, audit log — owner and above. */
export function canViewReports(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

/** Team management, invitations — owner and above. */
export function canManageTeam(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

/** Level 2 ergonomic evaluation form — owner and above. */
export function canConductLevel2(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

/** AI knowledge review queue — owner and above. */
export function canReviewAiKnowledge(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

/** Cross-org platform management — superadmin only. */
export function canViewPlatform(access: WorkspaceAccessInput | null | undefined): boolean {
  return isSuperAdmin(access);
}

/** Training matrix — members view their own; owners view all. */
export function canViewTrainingMatrix(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access);
}

export function canManageTrainingMatrix(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

// ── Task assignment helpers ───────────────────────────────────────────────────

export function canCreateWorkspaceRecord(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access);
}

export function canUpdateAssignedWorkspaceTask(
  access: WorkspaceAccessInput | null | undefined,
  assignedTo: string | null | undefined
): boolean {
  if (!hasWorkspaceAccess(access)) return false;
  if (isOwnerOrAbove(access)) return true;
  return Boolean(access?.userId && assignedTo && access.userId === assignedTo);
}

export function canEditWorkspaceTaskGovernance(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

export function getWorkspaceTaskActorRole(access: WorkspaceAccessInput | null | undefined): "owner" | "assigned_member" {
  return isOwnerOrAbove(access) ? "owner" : "assigned_member";
}

// ── Platform-level checks (for admin pages) ───────────────────────────────────

export function isAdminRole(role: string | null | undefined): boolean {
  return getRoleTier(role) >= 1;
}

// ── Nav tier ─────────────────────────────────────────────────────────────────

export type NavTier = "member" | "owner" | "superadmin";

export function getNavTier(role: string | null | undefined): NavTier {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return "superadmin";
  if (r === "owner") return "owner";
  return "member";
}

// ── Access summary for UI display ─────────────────────────────────────────────

export type RoleCapabilities = {
  role: WorkspaceRole;
  label: string;
  badgeClass: string;
  canSubmitScreenings: boolean;
  canViewInspections: boolean;
  canScheduleInspections: boolean;
  canViewRiskIntelligence: boolean;
  canManageOperations: boolean;
  canViewReports: boolean;
  canManageTeam: boolean;
  canConductLevel2: boolean;
  canReviewAiKnowledge: boolean;
  canViewPlatform: boolean;
};

export function getRoleCapabilities(access: WorkspaceAccessInput | null | undefined): RoleCapabilities {
  return {
    role: normalizeWorkspaceRole(access?.role),
    label: getRoleLabel(access?.role),
    badgeClass: getRoleBadgeClass(access?.role),
    canSubmitScreenings: canSubmitScreenings(access),
    canViewInspections: canViewInspections(access),
    canScheduleInspections: canScheduleInspections(access),
    canViewRiskIntelligence: canViewRiskIntelligence(access),
    canManageOperations: canManageOperations(access),
    canViewReports: canViewReports(access),
    canManageTeam: canManageTeam(access),
    canConductLevel2: canConductLevel2(access),
    canReviewAiKnowledge: canReviewAiKnowledge(access),
    canViewPlatform: canViewPlatform(access),
  };
}
