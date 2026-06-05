// ---------------------------------------------------------------------------
// Role-based access control for PredictSafeBIO
//
// 6 roles, two scopes:
//
//   PLATFORM scope (PredictSafeBIO staff — internal):
//     superadmin      Full access to everything, including all /admin/* platform
//                     utilities and the ability to assign any role.
//     platform_staff  PredictSafeBIO employee. Full access to /admin/* platform
//                     utilities. Cannot assign platform/superadmin roles.
//
//   ORG scope (customer workspace):
//     owner           Company workspace owner / Safety Manager. Full access to
//                     their org's workspace and team. Cannot see /admin/* platform
//                     utilities.
//     supervisor      PI / Lab Manager / Team Lead. Approves within their org
//                     (team-scoping is a follow-up requiring teamId on access).
//     member          Company employee. Base workspace access only.
//     viewer          External auditor / read-only reviewer. View-only; cannot
//                     create, edit, or be assigned work.
//
// Legacy DB role strings are normalized for backward compatibility:
//   admin, company_admin, developer, provider, safety_manager  → owner
//   project_admin, foreman, lab_manager, pi                    → supervisor
//   auditor, read_only_viewer, client_reviewer                 → viewer
//   patient, worker                                            → member
// ---------------------------------------------------------------------------

export type WorkspaceRole =
  | "superadmin"
  | "platform_staff"
  | "owner"
  | "supervisor"    // PI / lab manager / team lead
  | "member"
  | "viewer";       // read-only — external auditor / client reviewer

/** All role strings accepted in the DB profiles.role column. */
export type DbRole =
  | "superadmin"
  | "platform_staff"
  | "owner" | "admin" | "company_admin" | "developer" | "provider" | "safety_manager"
  | "supervisor" | "project_admin" | "foreman" | "lab_manager" | "pi"
  | "member" | "patient" | "worker"
  | "auditor"
  | "viewer" | "read_only_viewer" | "client_reviewer";

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
  // owner tier — org admin, company_admin, legacy provider roles, safety manager
  if (
    role === "owner" ||
    role === "admin" ||
    role === "company_admin" ||
    role === "developer" ||
    role === "provider" ||
    role === "safety_manager"
  ) return "owner";
  // supervisor tier — PI, lab manager, team lead
  if (
    role === "supervisor" ||
    role === "project_admin" ||
    role === "foreman" ||
    role === "lab_manager" ||
    role === "pi"
  ) return "supervisor";
  // viewer tier — external auditors, read-only reviewers
  if (
    role === "viewer" ||
    role === "auditor" ||
    role === "read_only_viewer" ||
    role === "client_reviewer"
  ) return "viewer";
  // member / base tier (includes patient, worker, unknown strings)
  return "member";
}

// 0 = viewer · 1 = member · 2 = supervisor · 3 = owner · 4 = platform_staff · 5 = superadmin
export function getRoleTier(role: string | null | undefined): 0 | 1 | 2 | 3 | 4 | 5 {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return 5;
  if (r === "platform_staff") return 4;
  if (r === "owner") return 3;
  if (r === "supervisor") return 2;
  if (r === "member") return 1;
  return 0; // viewer
}

export function getRoleLabel(role: string | null | undefined): string {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return "Super Admin";
  if (r === "platform_staff") return "Platform Staff";
  if (r === "owner") return "Owner";
  if (r === "supervisor") return "Supervisor";
  if (r === "viewer") return "Viewer";
  return "Member";
}

export function getRoleBadgeClass(role: string | null | undefined): string {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return "status-critical";
  if (r === "platform_staff") return "status-needs-review";
  if (r === "owner") return "status-current";
  if (r === "supervisor") return "status-needs-review";
  return "status-unknown"; // member + viewer
}

/** Human-readable label for a raw DB role string (preserves specificity). */
export function getDbRoleLabel(role: string | null | undefined): string {
  const map: Record<string, string> = {
    superadmin:         "Super Admin",
    platform_staff:     "Platform Staff",
    owner:              "Owner",
    admin:              "Admin",
    company_admin:      "Company Admin",
    developer:          "Developer",
    provider:           "Provider",
    safety_manager:     "Safety Manager",
    supervisor:         "Supervisor",
    project_admin:      "Project Admin",
    foreman:            "Foreman",
    lab_manager:        "Lab Manager",
    pi:                 "Principal Investigator",
    member:             "Member",
    patient:            "Member",
    worker:             "Worker",
    auditor:            "Auditor",
    viewer:             "Viewer",
    read_only_viewer:   "Viewer",
    client_reviewer:    "Client Reviewer",
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

/** Supervisor tier or above (team lead, owner, platform staff, superadmin). */
export function isSupervisorOrAbove(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access) && getRoleTier(access?.role) >= 2;
}

/** Owner (org) tier or above. */
export function isAdminOrAbove(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access) && getRoleTier(access?.role) >= 3;
}

/** Role-only variant (no signed-in/org check) — for label/UI helpers. */
export function isAdminRole(role: string | null | undefined): boolean {
  return getRoleTier(role) >= 3;
}

/** True if the role is view-only (cannot create or edit any record). */
export function isReadOnly(access: WorkspaceAccessInput | null | undefined): boolean {
  return normalizeWorkspaceRole(access?.role) === "viewer";
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

/** Any workspace member except viewers may create records. */
export function canCreateWorkspaceRecord(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access) && !isReadOnly(access);
}

export function canUpdateAssignedWorkspaceTask(
  access: WorkspaceAccessInput | null | undefined,
  assignedTo: string | null | undefined
): boolean {
  if (!hasWorkspaceAccess(access) || isReadOnly(access)) return false;
  // Owner/Safety Mgr or supervisor (team-scope is a follow-up; approves org-wide for now).
  if (isAdminOrAbove(access) || isSupervisorOrAbove(access)) return true;
  return Boolean(access?.userId && assignedTo && access.userId === assignedTo);
}

export function canEditWorkspaceTaskGovernance(access: WorkspaceAccessInput | null | undefined): boolean {
  return isAdminOrAbove(access);
}

export function getWorkspaceTaskActorRole(access: WorkspaceAccessInput | null | undefined): "owner" | "assigned_member" {
  return isAdminOrAbove(access) ? "owner" : "assigned_member";
}

// ── Nav tier ──────────────────────────────────────────────────────────────────

export type NavTier = "viewer" | "member" | "supervisor" | "owner" | "platform_staff" | "superadmin";

export function getNavTier(role: string | null | undefined): NavTier {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return "superadmin";
  if (r === "platform_staff") return "platform_staff";
  if (r === "owner") return "owner";
  if (r === "supervisor") return "supervisor";
  if (r === "viewer") return "viewer";
  return "member";
}

// ── Assignable role lists ──────────────────────────────────────────────────────

/** Roles a Company Owner can assign to their team members (org scope). */
export const ASSIGNABLE_ORG_ROLES: Array<{ value: string; label: string }> = [
  { value: "viewer",     label: "Viewer — read-only access" },
  { value: "member",     label: "Member — frontline work, own tasks" },
  { value: "supervisor", label: "Supervisor / PI — leads a team or lab" },
  { value: "owner",      label: "Owner — full workspace access" },
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
