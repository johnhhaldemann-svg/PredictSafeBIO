# Implementation Brief — Super Admin Command Center

**For:** Claude Code (execute in repo, branch `visual-polish`)
**Visual source of truth:** `docs/mockup-superadmin-command-center.html`, `mockup-superadmin-ai-engine.html`, `mockup-superadmin-platform-tools.html`
**Goal:** Make the superadmin experience look and operate like the mockups (dark "Platform Console v2.4"), while preserving every existing admin page.

---

## Guiding principle: reuse the existing shell branch — do NOT rewrite pages

`src/components/AppShell.tsx` already special-cases superadmin (lines ~35–75: the sidebar-free `superadmin-shell`). Every `/admin/*` page already wraps itself in `<AppShell>`. So upgrading that one branch upgrades all admin pages at once. **No per-page edits required.** Scope all new dark styling under a single wrapper class (`.psb-console`) so it cannot leak into the owner/member light app.

Roles stay as-is (`src/lib/role-permissions.ts`). Console is gated to `superadmin` (keep the existing `isSuperAdmin` branch). Leave `platform_staff`, `owner`, `member` untouched this pass.

---

## File-by-file changes

### 1. `src/app/globals.css` — append scoped dark theme (NEW block at end)
Add a `.psb-console` block. Port the CSS variables and component styles from the mockup `<style>` blocks (they're already written — copy them). Scope EVERYTHING under `.psb-console` so it never affects the light app:

```css
.psb-console { --bg:#0a0e1a; --panel:#0e1424; --panel2:#111a2e; --line:#1c2740; --line2:#26344f;
  --c-text:#e6edf7; --c-muted:#8493ad; --c-dim:#5d6b85; --cyan:#22d3ee; --red:#f4544f;
  --orange:#f59e42; --purple:#a78bfa; --green:#4ade80; --amber:#fbbf24;
  background:var(--bg); color:var(--c-text); min-height:100vh; }
.psb-console .psb-kpi { /* …from mockup .kpi */ }
.psb-console .psb-panel { /* …from mockup .panel */ }
/* Bridge existing classes so legacy admin pages adopt the dark look automatically: */
.psb-console .panel { background:var(--panel); border:1px solid var(--line); color:var(--c-text); }
.psb-console .command-card { background:var(--panel); border:1px solid var(--line); }
.psb-console .page-header h1, .psb-console h1, .psb-console h2 { color:var(--c-text); }
.psb-console table td { border-color:var(--line); }
.psb-console .muted { color:var(--c-dim); }
```
The "bridge" rules are what keep Organizations/Users/Audit/Billing/Config pages looking consistent without touching them.

### 2. `src/components/AdminConsoleSidebar.tsx` — NEW (client component)
Model on the existing `PlatformCategoryNav.tsx` pattern (`"use client"`, `usePathname()`, active highlight). Render the grouped nav from the mockup with REAL routes:

- **Overview** → Command Center `/admin/dashboard` · Platform Analytics `/admin/analytics`
- **Tenants & Users** → Organizations `/admin/organizations` · Company Management `/admin/organizations` (or new) · User Management `/admin/users` · Site Management `/admin/organizations`
- **Compliance** → Escalations `/admin/moderation` · Audit Logs `/admin/audit` · Reg. Deadlines `/admin/audit`
- **Security & Tools** → AI Engine `/admin/superadmin` (AI tab) · Security Audits `/admin/platform` · Platform Test Tools `/admin/superadmin` · Data Collection `/admin/superadmin` (DB tab)
- **Platform** → Integrations `/admin/config` · Configuration `/admin/config` · Billing & Usage `/admin/billing`

Active item = `pathname.startsWith(href)`. Use the `.psb-console .navitem/.navsec/.pill` classes.

### 3. `src/components/AppShell.tsx` — rewrite the `isSuperAdmin` branch only
Replace the current sidebar-free superadmin return (lines ~35–75) with the console layout:
- Outer wrapper `<div className="app-shell psb-console">`.
- Left `<aside>` renders `<AdminConsoleSidebar />` + the brand block (`PREDICTSAFE` / `Platform Console v2.4` / `◆ Super Admin` chip from mockup).
- Topbar: keep existing `signOutAction` form + avatar/initials + role chip; add the tenant switcher element (static label "All Tenants" for now) and a bell icon.
- `<main id="main-content" className="psb-console-main">{children}</main>`.
- Logo/home link → `/admin/dashboard` (currently `/admin/organizations`).
Leave the standard (non-superadmin) branch completely unchanged.

### 4. `src/app/admin/dashboard/page.tsx` — NEW (the Command Center)
`export const dynamic = "force-dynamic"`. Server component. Guard: `getAuthSummary()` → `if (!isSuperAdmin(auth)) redirect("/workbench")`. Wrap in `<AppShell>` like other admin pages. Pull data:

```ts
import { getPlatformData } from "@/lib/supabase/platform-service";
const { metrics, security, orgs, recentAuditEvents, checklist } = await getPlatformData();
```

Map to the mockup sections using the REAL fields:
- **KPI cards (5):** Platform Compliance (derive: `checklist pass / total` or a compliance metric), Open Escalations (count `checklist.filter(status==='fail'|'warn')` or moderation count), Active Users → `metrics.onboardedUsers` / `metrics.totalUsers`, Total Organizations → `metrics.totalOrgs`, Inspections (MTD) → `metrics.totalInspections`.
- **Critical alert banner:** show the worst `checklist` item where `status==='fail'`, else hide.
- **Site/Org Compliance table:** iterate `orgs` (`organizationId`, `memberCount`, `assessmentCount`, `documentCount`, `taskCount`). Join org name from `admin.from("organizations")` (see `admin/organizations/page.tsx` for the pattern). Compliance bar = derive from counts; status pill by threshold.
- **Regulatory Deadlines:** no model yet → render from a typed const array for now, with a `TODO: model regulatory_deadlines table`.
- **Platform Activity:** map `recentAuditEvents` (`eventType`, `summary`, `createdAt`).
- **Open Findings by Type:** derive from CAPA/inspection counts (`metrics.totalCapaRecords`, `metrics.totalInspections`); donut can be a CSS conic-gradient as in the mockup.
- **System Health:** map from `security` (`supabaseConfigured`, `serviceRolePresent`, `smtpConfigured`, `leakedPasswordProtection`) → green/amber/red dots. AI Engine row from `getAiEngineStatus()` (`smokeTestResult`).

Build markup with the `.psb-*` classes copied from the mockup. Round all displayed numbers.

### 5. `src/app/page.tsx` — redirect target
Change `if (auth.role === "superadmin") redirect("/admin/organizations");` → `redirect("/admin/dashboard");`.

### 6. (Optional, later) AI Engine / Security / Tools pages
The data already exists: `getAiEngineStatus()`, `getDbStats()`, `getPlatformData().checklist`, `runAdHocAssessment` (`AdHocAssessmentInput`). The mockups `mockup-superadmin-ai-engine.html` and `-platform-tools.html` are the layouts. These can reuse/restyle the existing `/admin/superadmin` `SuperadminConsole` component rather than building net-new. Lower priority than 1–5.

---

## Acceptance criteria
1. Signing in as `superadmin` lands on `/admin/dashboard` showing the dark Command Center with live counts from `getPlatformData()`.
2. Sidebar groups + active states match the mockup; every link resolves to an existing admin route.
3. All existing admin pages (organizations, users, audit, billing, config, superadmin, platform, ai-knowledge, analytics, moderation) still load and now render in the dark console chrome — no broken layouts.
4. `owner` and `member` experiences are visually unchanged (no `.psb-console` leakage).
5. `npm run build` (or `tsc --noEmit` + `next lint`) passes. Existing tests in `admin/platform-access.test.ts`, `role-assignment.test.ts` still green; add an assertion that superadmin → `/admin/dashboard`.

## Guardrails
- Don't change `role-permissions.ts` role definitions.
- Keep service-role data (`platform-service`, `superadmin-service`) only inside `/admin/*` server components.
- Don't commit over the pending `HEAD.lock` situation — confirm working tree state first (see CLAUDE.md note).
- PowerShell terminal: no `&&`, use separate lines.
