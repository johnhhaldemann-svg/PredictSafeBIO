// ---------------------------------------------------------------------------
// Role-based access control for PredictSafeBIO
//
// 4-Tier role hierarchy:
//   4 — superadmin      PredictSafeBIO platform operator. Full access to everything
//                       including AI engine, billing, all platform utilities.
//                       Controls what platform_staff can access via checkboxes.
//   3 — platform_staff  PredictSafeBIO employee. Platform-level access gated by
//                       superadmin checkbox grants. Cannot manage grants themselves.
//   2 — owner           Company workspace owner. Full org access, team management,
//                       controls member permissions via checkboxes.
//                       CANNOT see Platform Utilities (/admin/*).
//   1 — member          Company employee. Access gated by owner's checkbox grants.
//                       Base access: Dashboard, Hazard Screening, Programs, Documents (view).
//
// Legacy roles mapped for backward compatibility:
//   admin, company_admin → owner tier
//   provider, safety_manager, auditor, project_admin, foreman → owner tier
//   patient, worker, client_reviewer, read_only_viewer → member tier
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

// ── Feature definitions ───────────────────────────────────────────────────────

/** Features superadmin can grant/revoke for platform_staff users. */
export const PLATFORM_FEATURES = [
  { key: "ai_engine",       label: "AI Engine Utilities",          description: "Access AI knowledge review queue and engine configuration" },
  { key: "billing_admin",   label: "Billing & Revenue Dashboard",  description: "View MRR, ARR, subscriptions, and billing events" },
  { key: "user_management", label: "User & Org Management",        description: "View and manage organizations and user profiles" },
  { key: "analytics",       label: "Analytics Platform",           description: "Signup growth, retention, and usage analytics" },
  { key: "moderation",      label: "Content Moderation",           description: "Review and moderate platform content" },
  { key: "overrides",       label: "Manual Overrides",             description: "Apply billing overrides, trials, and plan changes" },
  { key: "demo_tools",      label: "Demo & Seed Tools",            description: "Seed demo data and reset workspace state" },
] as const;

export type PlatformFeatureKey = typeof PLATFORM_FEATURES[number]["key"];

/** Features a Company Owner can grant/revoke for their org's members. */
export const ORG_MEMBER_FEATURES = [
  { key: "risk_assessment",    label: "Risk Assessment & BioRisk",   description: "Run BioRisk assessments and view risk register" },
  { key: "capa",               label: "CAPA Management",             description: "Create and manage corrective actions" },
  { key: "compliance_map",     label: "Compliance Map & Foundation",  description: "View and manage compliance programs" },
  { key: "inspections_manage", label: "Schedule & Manage Inspections", description: "Create inspection schedules and record findings" },
  { key: "level2_eval",        label: "Level 2 Evaluations",         description: "Conduct advanced hazard evaluations" },
  { key: "reports",            label: "Reports & Audit Log",          description: "Generate reports and view full audit trail" },
  { key: "ai_draft",           label: "AI Draft Assist",             description: "Use AI to draft notes and CAPA action text" },
  { key: "documents_edit",     label: "Document Editing",            description: "Create and edit controlled documents" },
  { key: "training_manage",    label: "Training Matrix Management",  description: "Assign and track training requirements" },
] as const;

export type OrgMemberFeatureKey = typeof ORG_MEMBER_FEATURES[number]["key"];

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

export function isAdminOrAbove(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access) && getRoleTier(access?.role) >= 2;
}

export function isOwnerOrAbove(access: WorkspaceAccessInput | null | undefined): boolean {
  return isAdminOrAbove(access);
}

export function canManageWorkspace(access: WorkspaceAccessInput | null | undefined): boolean {
  return isAdminOrAbove(access);
}

export function canManageUsers(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access) && getRoleTier(access?.role) >= 2;
}

// ── Feature-level permission functions (role-based baseline) ─────────────────
// Note: members may have additional features granted via feature_permission_grants.
// These functions return the BASELINE access for the role only.

export function canSubmitScreenings(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access);
}

export function canViewInspections(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access);
}

export function canScheduleInspections(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

export function canViewRiskIntelligence(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

export function canManageOperations(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

export function canViewReports(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

export function canManageTeam(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

export function canConductLevel2(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

export function canReviewAiKnowledge(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

/** Platform utilities (/admin/*) — superadmin or platform_staff only. Company owners CANNOT access. */
export function canViewPlatform(access: WorkspaceAccessInput | null | undefined): boolean {
  return isPlatformStaff(access);
}

export function canViewTrainingMatrix(access: WorkspaceAccessInput | null | undefined): boolean {
  return hasWorkspaceAccess(access);
}

export function canManageTrainingMatrix(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

/** @deprecated — use canAccessPatientRecords */
export function isProviderOrAbove(access: WorkspaceAccessInput | null | undefined): boolean {
  return isOwnerOrAbove(access);
}

export function canAccessPatientRecords(access: WorkspaceAccessInput | null | undefined): boolean {
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
  if (isAdminOrAbove(access)) return true;
  return Boolean(access?.userId && assignedTo && access.userId === assignedTo);
}

export function canEditWorkspaceTaskGovernance(access: WorkspaceAccessInput | null | undefined): boolean {
  return isAdminOrAbove(access);
}

export function getWorkspaceTaskActorRole(access: WorkspaceAccessInput | null | undefined): "owner" | "assigned_member" {
  return isAdminOrAbove(access) ? "owner" : "assigned_member";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return getRoleTier(role) >= 2;
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

/** Roles assignable by a Company Owner to their team members. */
export const ASSIGNABLE_ORG_ROLES: Array<{ value: string; label: string }> = [
  { value: "member", label: "Member — screening, programs, view inspections" },
  { value: "owner",  label: "Owner — full workspace access" },
];

/** Roles assignable by a Super Admin to platform staff. */
export const ASSIGNABLE_PLATFORM_ROLES: Array<{ value: string; label: string }> = [
  { value: "platform_staff", label: "Platform Staff" },
  { value: "superadmin",     label: "Super Admin" },
];

/** @deprecated use ASSIGNABLE_ORG_ROLES or ASSIGNABLE_PLATFORM_ROLES */
export const ASSIGNABLE_ROLES = ASSIGNABLE_ORG_ROLES;

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
  canManageUsers: boolean;
  canAccessPatientRecords: boolean;
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
    canManageUsers: canManageUsers(access),
    canAccessPatientRecords: canAccessPatientRecords(access),
  };
}
