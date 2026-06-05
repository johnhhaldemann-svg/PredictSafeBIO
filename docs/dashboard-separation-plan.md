# Dashboard Separation Plan — Super Admin vs. End User

**Goal:** Give the platform Super Admin its own dedicated dashboard (system-wide oversight) that is cleanly separated from the dashboard end users see (situational awareness + quick action).

---

## 1. What already exists (don't rebuild this)

You already have a solid 4-role RBAC layer in `src/lib/role-permissions.ts`. No new role system is needed:

| Role | Scope | Today's landing | Shell |
|------|-------|-----------------|-------|
| `superadmin` | Platform (PredictSafeBIO internal) | redirected to `/admin/organizations` (bare org list) | sidebar-free "superadmin-shell" |
| `platform_staff` | Platform internal | standard shell, sees `/admin/*` nav | standard + platform nav |
| `owner` | Customer org admin / safety officer / compliance mgr | `/` Safety Loop or `/workbench` | standard shell |
| `member` | Field worker / site staff | `/` Safety Loop or `/workbench` | standard shell |

Separation is **already partly enforced**:
- `AppShell.tsx` renders a different shell for `superadmin` (top-nav only: Orgs / Users / Audit) vs. everyone else (sidebar with `PlatformCategoryNav`).
- `app/page.tsx` redirects `superadmin` → `/admin/organizations`; non-platform users without an org → `/onboarding`.
- `PlatformCategoryNav` hides `platformOnly` categories from `owner`/`member` via `canViewPlatform`.
- Platform data services already exist: `platform-service.ts` (cross-org metrics, security checklist, audit events) and `superadmin-service.ts` (AI engine diagnostics, DB stats).

**The real gaps:**
1. Super Admin has no actual *dashboard* — it lands on a flat org list. The rich cross-org view in `/admin/platform` exists but is gated only by an env key (`PLATFORM_ADMIN_KEY`) and isn't wired to the role or the nav.
2. The end-user experience (`/` + `/my-work`) is a "safety loop," not organized into the My Activity / Alerts / Training / Quick Actions structure you specified.

---

## 2. Recommended role → dashboard mapping

Your reference describes three dashboard archetypes. Mapped onto the four roles:

- **Platform Super Admin Dashboard** → `superadmin` (full) + `platform_staff` (ops, no role assignment). Cross-org, system-wide.
- **Operational Oversight Dashboard** ("Platform Staff" in your reference: admins, safety officers, compliance managers) → `owner`. Scoped to **their own org**, not the whole platform.
- **End User Dashboard** → `member`. Personal, site-scoped.

> **Confirm this mapping before build.** The key call: org `owner`s get an operational-oversight dashboard for *their* organization (not platform-wide). Everything platform-wide stays locked to `superadmin`/`platform_staff`.

---

## 3. Super Admin Dashboard (`/admin/dashboard` — new)

A new landing page for platform staff, replacing the bare org-list redirect. Build it from data already in `platform-service.ts`.

**System-Wide Health**
- Overall compliance rate across all orgs/teams
- Open items by category (CAPAs, inspections, permits) with aging buckets
- Risk trend over time (improving / worsening)
- Active alerts & escalations needing attention

**User & Team Management**
- Active vs. inactive accounts; recent activity summary
- Pending approvals / role-change requests
- Training & certification gaps across the org base

**Site / Location Overview**
- Per-org (and per-site) compliance scores
- Orgs with the most open findings / overdue items
- Inspection-cadence adherence by location

**Audit & Reporting**
- Recent audit log (who did what, when) — already in `platform-service.ts`
- Upcoming regulatory deadlines
- Export / report-generation shortcuts (reuse `api/admin/export`)

**Wiring changes:**
- Change `app/page.tsx` redirect from `/admin/organizations` → `/admin/dashboard`.
- Add the superadmin shell top-nav link: **Dashboard · Orgs · Users · Audit** in `AppShell.tsx`.
- Gate `/admin/dashboard` server-side with `isPlatformStaff(auth)` (covers both platform roles), not the env key.
- Repoint or fold `/admin/platform` into this page so the cross-org health view is role-gated, not key-gated.

---

## 4. End User Dashboard (`member` — restructure `/my-work` or new `/dashboard`)

Reorganize into the five sections you specified. Most data already exists via `foundation` services and `risk-dashboard-service.ts`.

**My Activity** — tasks assigned to me (open / overdue / upcoming); my recent submissions; items awaiting my sign-off. (Reuse `getFoundationReviewActionsSummary` + `work-kpis.ts`, filtered to `assignedTo === userId`.)

**Status & Alerts** — active safety alerts for my site/role; items due today; in-app notifications. (Reuse `FoundationNotificationCenter`.)

**My Site / Location Context** — current site risk level; active permits / controlled work in my area; recent incidents at my location.

**Training & Compliance** — my certifications + expiry dates; required training not yet done; compliance status for my role. (Reuse `training-matrix`.)

**Quick Actions** — one-click: log observation, start inspection, report hazard; recently accessed records.

---

## 5. Separation guarantees (the part you care about)

1. **Distinct routes:** Super Admin = `/admin/*`; end users never resolve there. Add a layout guard at `app/admin/layout.tsx` calling `isPlatformStaff()` and redirecting `owner`/`member` to `/workbench`.
2. **Distinct shells:** keep the existing `superadmin-shell` branch in `AppShell.tsx`; end users keep the sidebar shell. No shared chrome that leaks platform links.
3. **RBAC at the data layer:** platform pages use the service-role client (`supabase/admin.ts`, bypasses RLS) — keep that ONLY behind `/admin/*` guards. End-user pages use the RLS-scoped server client so a member only ever sees their org/their tasks.
4. **Nav isolation:** `PlatformCategoryNav` already hides `platformOnly`; verify `owner` cannot see any `/admin/*` entry.
5. **Tests:** extend `admin/platform-access.test.ts` and `role-assignment.test.ts` to assert each role lands on the right dashboard and is blocked from the others.

---

## 6. Phased build

**Phase 1 — Lock separation (no new UI)**
- Add `app/admin/layout.tsx` role guard (`isPlatformStaff`).
- Repoint superadmin redirect to `/admin/dashboard`; stub the page.
- Tests: each role → correct landing, cross-access blocked.

**Phase 2 — Super Admin Dashboard**
- Build `/admin/dashboard` from `platform-service.ts` data (4 sections above).
- Fold/role-gate `/admin/platform`; add Dashboard nav link.

**Phase 3 — End User Dashboard**
- Restructure `/my-work` (or new `/dashboard`) into the 5 sections.
- Wire Quick Actions + site context.

**Phase 4 — Owner operational dashboard (optional, if mapping confirmed)**
- Org-scoped oversight view for `owner`.

**Phase 5 — Verify**
- Manual walkthrough per role + automated access tests green.

---

## 7. Open questions before I start coding

1. Confirm the role→dashboard mapping in §2 (esp. what `owner` gets).
2. End user dashboard: restructure existing `/my-work`, or add a new `/dashboard` route and leave `/my-work` as-is?
3. Is "site / location" a real modeled entity yet, or is org the smallest unit today? (Affects the Site Overview sections.)
