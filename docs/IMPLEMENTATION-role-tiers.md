# Implementation Brief — add Supervisor + Viewer role tiers

**For:** Claude Code (branch `visual-polish`)
**File:** `src/lib/role-permissions.ts` (plus consumer/test updates)
**Spec:** `docs/role-hierarchy-biotech.md`
**No DB migration** — `profiles.role` is free-text; new roles are just new strings.

Adds two canonical roles: `supervisor` (Tier 5) and `viewer` (Tier 7, read-only). Keep all existing public helper names stable so consumers keep working; only internals + a few additions change.

---

## 1. Types

```ts
export type WorkspaceRole =
  | "superadmin" | "platform_staff" | "owner"
  | "supervisor"            // NEW — PI / lab manager / team lead
  | "member" | "viewer";    // viewer NEW — read-only

export type DbRole =
  | "superadmin" | "platform_staff"
  | "owner" | "admin" | "company_admin" | "developer" | "provider" | "safety_manager"
  | "supervisor" | "project_admin" | "foreman" | "lab_manager" | "pi"   // → supervisor
  | "member" | "patient" | "worker"
  | "auditor"                                   // see behavior-change note
  | "read_only_viewer" | "client_reviewer";     // → viewer
```

## 2. Normalization
Move `project_admin`, `foreman` out of the owner bucket into supervisor; add `lab_manager`, `pi`, `supervisor`. Add the viewer bucket. **Decision flag:** `auditor` currently → `owner`. Per the spec, external auditors belong in `viewer`. Recommend mapping `auditor → viewer`; confirm with John before applying (internal compliance auditors may need `owner`/`supervisor`).

```ts
export function normalizeWorkspaceRole(role) {
  if (role === "superadmin") return "superadmin";
  if (role === "platform_staff") return "platform_staff";
  if (["owner","admin","company_admin","developer","provider","safety_manager"].includes(role)) return "owner";
  if (["supervisor","project_admin","foreman","lab_manager","pi"].includes(role)) return "supervisor";
  if (["viewer","read_only_viewer","client_reviewer","auditor"].includes(role)) return "viewer";
  return "member";
}
```

## 3. Tiers — renumber (0–5)
```ts
// 0 viewer · 1 member · 2 supervisor · 3 owner · 4 platform_staff · 5 superadmin
export function getRoleTier(role): 0|1|2|3|4|5 {
  const r = normalizeWorkspaceRole(role);
  if (r === "superadmin") return 5;
  if (r === "platform_staff") return 4;
  if (r === "owner") return 3;
  if (r === "supervisor") return 2;
  if (r === "member") return 1;
  return 0; // viewer
}
```
⚠️ **Update every threshold that assumed the old 1/2/3 scale.** Grep `getRoleTier` and fix comparisons:
- `isAdminOrAbove` (manage workspace / owner tier): `getRoleTier(role) >= 3`
- `isPlatformStaff`: tier `>= 4` (or keep the normalize-based check).
- Add `isSupervisorOrAbove`: `getRoleTier(role) >= 2`.

## 4. New + updated helpers
```ts
export function isSupervisorOrAbove(access) { return hasWorkspaceAccess(access) && getRoleTier(access?.role) >= 2; }
export function isReadOnly(access) { return normalizeWorkspaceRole(access?.role) === "viewer"; }

// Viewers can never create; everyone else with workspace access can.
export function canCreateWorkspaceRecord(access) { return hasWorkspaceAccess(access) && !isReadOnly(access); }

// Owner/Safety-Mgr OR supervisor (own team) OR the assignee. Viewers never.
export function canUpdateAssignedWorkspaceTask(access, assignedTo) {
  if (!hasWorkspaceAccess(access) || isReadOnly(access)) return false;
  if (isAdminOrAbove(access) || isSupervisorOrAbove(access)) return true;   // team-scope check is a follow-up (needs team_id on access input)
  return Boolean(access?.userId && assignedTo && access.userId === assignedTo);
}

export function canEditWorkspaceTaskGovernance(access) { return isAdminOrAbove(access); } // owner+ only
```
**Follow-up (not this pass):** real team scoping for supervisors needs `teamId`/`siteId` on `WorkspaceAccessInput` and on records. For now supervisor approves within their org like an owner; note the gap.

## 5. Labels, badges, nav tier
- `getRoleLabel`: add `supervisor → "Supervisor"`, `viewer → "Viewer"`.
- `getRoleBadgeClass`: `supervisor → "status-needs-review"`, `viewer → "status-unknown"`.
- `getDbRoleLabel`: add `supervisor`, `project_admin → "Project Admin"`, `foreman → "Foreman"`, `lab_manager → "Lab Manager"`, `pi → "Principal Investigator"`, `viewer/read_only_viewer/client_reviewer → "Viewer" / "Client Reviewer"`.
- `NavTier` + `getNavTier`: add `"supervisor"` and `"viewer"` so nav can branch (viewer = read-only nav, supervisor = team subset).

## 6. Assignable role lists
```ts
export const ASSIGNABLE_ORG_ROLES = [
  { value: "viewer",     label: "Viewer — read-only access" },
  { value: "member",     label: "Member — frontline work, own tasks" },
  { value: "supervisor", label: "Supervisor / PI — leads a team or lab" },
  { value: "owner",      label: "Owner — full workspace access" },
];
```
`isPlatformRole` unchanged.

## 7. Consumers to update
- `src/components/AppShell.tsx` & `PlatformCategoryNav.tsx` — handle supervisor (team subset) and viewer (hide create/assign actions).
- `src/app/account/team/*` and `src/app/admin/users/*` — surface the new assignable roles.
- Any UI calling `canCreateWorkspaceRecord` / `canUpdateAssignedWorkspaceTask` automatically respects viewer read-only — verify create/edit buttons hide for viewers.

## 8. Tests
Extend `src/app/admin/role-assignment.test.ts` and `lib/role-permissions`-adjacent tests:
- normalization: each DB string → correct canonical role (esp. `auditor`, `pi`, `read_only_viewer`).
- `getRoleTier` ordering: viewer < member < supervisor < owner < platform_staff < superadmin.
- `isReadOnly(viewer) === true`; `canCreateWorkspaceRecord(viewer) === false`.
- `isAdminOrAbove`: true for owner+; false for supervisor/member/viewer.
- `isSupervisorOrAbove`: true for supervisor+; false for member/viewer.

## Acceptance
`npm run build` + existing test suite green; viewer accounts cannot create/edit anywhere; supervisor appears as an assignable role and gets a team-scoped nav; owner/member behavior unchanged from today.
