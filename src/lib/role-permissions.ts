// ---------------------------------------------------------------------------
// Role-based access control for PredictSafeBIO
//
// 4 roles, two scopes:
//
//   PLATFORM scope (PredictSafeBIO staff — internal):
//     superadmin      Full access to everything, including all /admin/* platform
//                     utilities and the ability to assign any role.
//     platform_staff  PredictSafeBIO employee. Full access to /admin/* platform
//                     utilities. Cannot assign platform/superadmin roles.
//
//   ORG scope (customer workspace):
//     owner           Company workspace owner. Full access to their org's
//                     workspace and team. CANNOT see /admin/* platform utilities.
//     member          Company employee. Base workspace access only
//                     (Dashboard, Hazard Screening, Programs, Documents view) plus
//                     any task assigned to them.
//
// Access is purely role-based — there is no per-feature grant layer. Tighten or
// broaden a role here and every guard that derives from it updates with it.
//
// Legacy DB role strings are normalized for backward compatibility:
//   admin, company_admin, developer, provider, project_admin, safety_manager,
//   auditor, foreman                                  → owner
//   patient, worker, client_reviewer, read_only_viewer → member
// ---------------------------------------------------------------------------

export type WorkspaceRole =
  | "superadmin"
  | "platform_staff"
  | "owner"
  | "member";

/** All role strings accepted in the DB profiles.role column. */
export type DbRole =
  | "superadmin"
  | "platform_staff"
  | "owner" | "admin" | "company_admin" | "developer"
  | "provider" | "project_admin" | "safety_manager" | "auditor" | "foreman"
  | "member" | "patient" | "worker" | "client_reviewer" | "read_only_viewer";

export type WorkspaceAccessInput = {
  signedIn?: boolean;
  userId?: string | null;
  organizationId?: string | null;
  role?: string | null;
  needsOnboarding?: boolean;
};

// ── Role normalization ────────────────────────────────────────────────────────

/** Map any DB role string to the canonical WorkspaceRole. */
export function normalizeWorkspaceRole(role: string | null | undefined): WorkspaceRole {
  if (role === "superadmin") return "superadmin";
  if (role === "platform_staff") return "platform_staff";
  // owner tier — org admin, company_admin, legacy provider roles
  if (
    role === "owner" ||
    role === "admin" ||
    role === "company_admin" ||
    role === "developer" ||
    role === "provider" ||
    role === "project_admin" ||
    role === "safety_manager" ||
    role === "auditor" ||
    role === "foreman"
  ) return "owner";
  // member / base tier
  return "member";
}

/** 1 = member, 2 = owner, 3 = platform_staff / superadmin */
export function getRoleTier(role: string | null | undefined): 1 | 2 | 3 {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin" || r === "platform_staff") return 3;
  if (r === "owner") return 2;
  return 1;
}

export function getRoleLabel(role: string | null | undefined): string {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return "Super Admin";
  if (r === "platform_staff") return "Platform Staff";
  if (r === "owner") return "Owner";
  return "Member";
}

export function getRoleBadgeClass(role: string | null | undefined): string {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return "status-critical";
  if (r === "platform_staff") return "status-needs-review";
  if (r === "owner") return "status-current";
  return "status-unknown";
}

/** Human-readable label for a raw DB role string (preserves specificity). */
export function getDbRoleLabel(role: string | null | undefined): string {
  const map: Record<string, string> = {
    superadmin:       "Super Admin",
    platform_staff:   "Platform Staff",
    owner:            "Owner",
    admin:            "Admin",
    company_admin:    "Company Admin",
    developer:        "Developer",
    provider:         "Provider",
    project_admin:    "Project Admin",
    safety_manager:   "Safety Manager",
    auditor:          "Auditor",
    foreman:          "Foreman",
    member:           "Member",
    patient:          "Member",
    worker:           "Worker",
    client_reviewer:  "Client Reviewer",
    read_only_viewer: "Read-only Viewer",
  };
  return map[role ?? ""] ?? "Member";
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

export function isPlatformStaff(access: WorkspaceAccessInput | null | undefined): boolean {
  const r = normalizeWorkspaceRole(access?.role);
  return hasWorkspaceAccess(access) && (r === "superadmin" || r === "platform_staff");
}

/** Owner (org) tier or above. */
export function isAdminOrAbove(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access) && getRoleTier(access?.role) >= 2;
}

/** Role-only variant (no signed-in/org check) — for label/UI helpers. */
export function isAdminRole(role: string | null | undefined): boolean {
  return getRoleTier(role) >= 2;
}

/** Manage the org workspace (settings, team, governance) — owner tier or above. */
export function canManageWorkspace(access: WorkspaceAccessInput | null | undefined): boolean {
  return isAdminOrAbove(access);
}

/** Platform utilities (/admin/*) — superadmin or platform_staff only. Owners CANNOT access. */
export function canViewPlatform(access: WorkspaceAccessInput | null | undefined): boolean {
  return isPlatformStaff(access);
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
  if (isAdminOrAbove(access)) return true;
  return Boolean(access?.userId && assignedTo && access.userId === assignedTo);
}

export function canEditWorkspaceTaskGovernance(access: WorkspaceAccessInput | null | undefined): boolean {
  return isAdminOrAbove(access);
}

export function getWorkspaceTaskActorRole(access: WorkspaceAccessInput | null | undefined): "owner" | "assigned_member" {
  return isAdminOrAbove(access) ? "owner" : "assigned_member";
}

// ── Nav tier ──────────────────────────────────────────────────────────────────

export type NavTier = "member" | "owner" | "platform_staff" | "superadmin";

export function getNavTier(role: string | null | undefined): NavTier {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return "superadmin";
  if (r === "platform_staff") return "platform_staff";
  if (r === "owner") return "owner";
  return "member";
}

// ── Assignable role lists ──────────────────────────────────────────────────────

/** Roles a Company Owner can assign to their team members (org scope). */
export const ASSIGNABLE_ORG_ROLES: Array<{ value: string; label: string }> = [
  { value: "member", label: "Member — screening, programs, view inspections" },
  { value: "owner",  label: "Owner — full workspace access" },
];

/** Platform roles — only a Super Admin may assign these. */
export const ASSIGNABLE_PLATFORM_ROLES: Array<{ value: string; label: string }> = [
  { value: "platform_staff", label: "Platform Staff — PredictSafeBIO internal" },
  { value: "superadmin",     label: "Super Admin — PredictSafeBIO internal" },
];

/** True if assigning `role` requires Super Admin (i.e. it is a platform role). */
export function isPlatformRole(role: string | null | undefined): boolean {
  const r = normalizeWorkspaceRole(role);
  return r === "superadmin" || r === "platform_staff";
}
