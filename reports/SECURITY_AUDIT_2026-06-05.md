# PredictSafeBIO — Security Audit

**Date:** June 5, 2026
**Branch:** `visual-polish`
**Method:** Supabase security + performance advisors, dependency audit, secret-exposure scan, and a 9-domain multi-agent code audit (tenant isolation, authorization, API-route auth, IDOR, injection, XSS/redirects, secrets/config, input-validation/DoS, auth/session) — every critical/high finding adversarially verified.
**Scope:** Multi-tenant SaaS; tenancy boundary = `organization_id`. Key risk: the service-role admin client bypasses RLS, so every such query must manually scope org + role.

---

## Verdict

Database security posture is strong (Supabase security advisor: **0 lints**, RLS enabled everywhere). The exploitable issues were in **application code** — a handful of paths that trusted client-supplied IDs or skipped auth gates. All confirmed issues are fixed. Three agent findings were **over-flagged** (intended platform-operator behavior) and intentionally left as designed.

---

## Fixed (commit `478ff69`)

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| Critical | Subscription hijacking — checkout trusted client `organizationId` | `api/stripe/checkout/route.ts`, `checkout-redirect` | Reject `organizationId` ≠ caller's own org (403) |
| High | `/api/assessments` unauthenticated — leaked bio-risk analysis | `api/assessments/route.ts` | Added `auth.getUser()` gate |
| High | `/api/document-recommendations` unauthenticated | `api/document-recommendations/route.ts` | Added auth gate |
| High | Unbounded file upload (memory/cost DoS) | `document-service.ts` | Reject > 25 MB before buffering |
| High | Cron routes failed OPEN when `CRON_SECRET` unset | `api/cron/{trial-expiry,revalidate-pages,inspection-scheduler}` | Fail closed: require secret set AND matched |
| Medium | AI draft endpoint cost abuse | `api/ai/draft/route.ts` | Cap context to 10 KB |
| Medium | Onboarding could re-bind an existing account to another org | `auth/actions.ts` | Redirect if already onboarded |
| Low | User-admin audit events mis-attributed to actor's org | `user-admin-service.ts` | Attribute to target user's org |

## Reviewed — not vulnerabilities (left as designed)

- **`admin/users` role change / suspend across orgs** and **manual billing overrides for any org** — `/admin/*` is gated to `platform_staff`/`superadmin`, a deliberately platform-wide operator role (owners excluded; platform-role escalation already blocked). Cross-org action is intended. The agent's "add org filter" fix would break legitimate admin.
- **Two analytics "unbounded query DoS"** — gated to platform staff only; not attacker-reachable (verifier refuted).

## Clean

Injection (queries parameterized) · XSS / open-redirect (output escaped, redirects validated) · secret exposure (gitignored, no `NEXT_PUBLIC` leakage) · session handling.

## Outstanding (not yet applied)

- **DB RLS perf:** `feature_permission_grants` policies call `auth.uid()` per row. Migration `20260605000300_fpg_rls_initplan_optimization.sql` rewrites them with `(select auth.uid())` (identical semantics). Ready to ship — not applied live. Negligible impact (tiny table); hygiene only.
- **Redundant permissive policies** on 7 config tables — micro perf; left (consolidation risk > benefit).
- **CSP `unsafe-eval`** (`next.config.ts`) — present for Stripe.js. Left intact (removal risks breaking checkout); worth testing in isolation.
- **Deps:** 2 moderate (transitive `postcss` via Next build toolchain). Fix is a breaking Next downgrade; low real-world risk.
