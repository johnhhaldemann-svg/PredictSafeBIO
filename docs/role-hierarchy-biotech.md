# PredictSafeBIO — Biotech Role Hierarchy (canonical spec)

Seven tiers across two scopes. Platform scope = PredictSafeBIO internal. Tenant scope = a subscribing biotech company. Each tier lists who it is, the canonical role it maps to in `src/lib/role-permissions.ts`, the DB role strings that normalize into it, the dashboard it lands on, and its core functions.

---

## Platform scope (PredictSafeBIO internal)

### Tier 1 — Super Admin · Platform Owner (you)
- Canonical: `superadmin` · DB: `superadmin`
- Dashboard: dark **Command Center** (`/admin/dashboard`)
- Functions: cross-tenant oversight of all organizations; billing & subscriptions; platform configuration (flags, branding, emails); **security audits**; **AI Engine governance** (smoke test, risk families, guardrails, ad-hoc assessment); **platform test tools**; data collection & exports; assign/revoke any role including platform roles; suspend or delete tenants.

### Tier 2 — Platform Staff · Admin / Implementation / Support
- Canonical: `platform_staff` · DB: `platform_staff`
- Dashboard: same dark console, reduced scope
- Functions: onboard and configure new customer organizations; run security audits, diagnostics, and platform test tools; support customers across tenants; view audit logs. **Cannot** manage billing, assign platform/superadmin roles, or delete tenants.

---

## Tenant scope (a subscribing biotech company)

### Tier 3 — Company Owner / Org Admin
- Canonical: `owner` · DB: `owner`, `company_admin`, `admin`, `developer`, `provider`
- Dashboard: org-scoped operational oversight (light app)
- Functions: own the company account; manage their users, roles, sites, and programs; control subscription/billing; full visibility into their org's compliance, risk, CAPAs, inspections, audit readiness. Scoped strictly to their own organization — no cross-tenant or platform access.

### Tier 4 — Safety / Compliance Manager (Biosafety Officer · EHS Manager · RSO)
- Canonical: `owner` tier today · DB: `safety_manager`, `auditor` *(see note)*
- Dashboard: org operational oversight
- Functions: the program runners. Create/assign/close CAPAs; schedule, conduct, and sign off inspections; approve work permits and risk assessments; own incident investigations; manage the training matrix, certifications, and expiries; manage chemical/SDS, biohazard waste, and pest/disinfection logs. Heaviest functional user in a tenant.

### Tier 5 — Supervisor / PI / Lab Manager  *(NEW tier — see implementation doc)*
- Canonical: `supervisor` (new) · DB: `supervisor`, `project_admin`, `foreman`, `lab_manager`, `pi`
- Dashboard: team/area view (subset of owner dashboard)
- Functions: scoped to their lab, site, or program. Assign tasks to their team; review and approve their staff's submissions (observations, inspections); see their area's risk level, open items, and incidents; request training for their people. Acts for the Safety Manager within one location. Cannot manage org-wide settings, billing, or other teams.

### Tier 6 — Member · Field Worker / Lab Staff (lowest active user)
- Canonical: `member` · DB: `member`, `worker`, `patient`
- Dashboard: personal **End User Dashboard**
- Functions: frontline work only. Log observations, start assigned inspections, report hazards; complete assigned training; acknowledge alerts and sign-offs; view their own tasks, certifications, and site context. Sees only their own records — no aggregate or other-user data.

### Tier 7 — Viewer · Auditor / Client Reviewer / Read-only (lowest overall)
- Canonical: `viewer` (new) · DB: `read_only_viewer`, `client_reviewer`
- Dashboard: read-only record/report views
- Functions: external auditors, inspectors, clients. View assigned records, reports, and audit trails. Cannot create, edit, be assigned work, or change anything.

> **Note on auditor:** today `auditor` normalizes to `owner`. The full model puts external auditors at Tier 7 (`viewer`). The implementation doc flags this as a behavior change to confirm before applying — an *internal* compliance auditor may belong at Tier 4, an *external* one at Tier 7.

---

## Permission matrix (X = allowed)

| Capability | SuperAdmin | Platform Staff | Owner | Safety Mgr | Supervisor | Member | Viewer |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Cross-tenant / platform console | X | X | | | | | |
| Billing & subscription (platform) | X | | | | | | |
| AI Engine / security / test tools | X | X | | | | | |
| Assign platform roles | X | | | | | | |
| Manage own org (settings, sites) | | | X | | | | |
| Manage org users & roles | | | X | partial | | | |
| Org billing (tenant) | | | X | | | | |
| Create/close CAPA, sign off inspections | | | X | X | partial | | |
| Approve permits / risk assessments | | | X | X | | | |
| Manage training matrix & certs | | | X | X | request | | |
| Assign tasks to team | | | X | X | X (own team) | | |
| Approve staff submissions | | | X | X | X (own team) | | |
| Log observation / report hazard | | | X | X | X | X | |
| Complete assigned task / training | | | X | X | X | X | |
| View own records & site context | | | X | X | X | X | X |
| View assigned reports / audit trail | | | X | X | X | X | X |
| Create or edit any record | | | X | X | X | X | |

"partial" = scoped to their own team/area or limited to non-governance fields.

---

## Current state vs. target

Today the code collapses these into **4 canonical roles**: `superadmin → platform_staff → owner → member`. Tiers 3–4 both resolve to `owner`; tiers 6–7 both resolve to `member`. To reach the full seven-tier model, add **two** canonical roles — `supervisor` (Tier 5) and `viewer` (Tier 7). No other tier needs a new role. See `docs/IMPLEMENTATION-role-tiers.md` for the exact `role-permissions.ts` changes (no DB migration required — the `profiles.role` column is already free-text).
