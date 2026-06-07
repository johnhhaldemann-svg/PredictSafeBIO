# PredictSafeBIO — Gap Analysis: Manual vs. Current Platform

**Source manual:** PredictSafeBIO Biotech/Pharma Enhanced Professional Manual (v1.1, June 2026, 40 pages)
**Codebase reviewed:** `visual-polish` branch — Next.js 16 (App Router) + Supabase + TypeScript, ~79 pages, 38 migrations, 82 RLS tables
**Date:** 2026-06-06

---

## 1. Bottom line

Your platform is **much further along than the manual assumes a v1 would be.** It is a real, multi-tenant, RLS-secured application with deep deterministic risk and forecast engines, working AI drafting, real CRUD across ~20 EHS domains, a full admin/superadmin console, PDF/DOCX reports, and Stripe plumbing.

The gap is **not "build the product from scratch."** The gap is:

1. **Wiring the pieces into the single closed loop the manual describes** — Setup Questionnaire → Applicability Engine → Risk Register → Compliance Calendar → Evidence → Predictive Dashboard, where each stage feeds the next.
2. **A handful of genuinely missing or broken pieces** — the 26-question setup intake isn't exposed, two modules (Permits, Pesticide) have no database tables, the predictive "learning loop" isn't fed, and several specialized modules don't exist yet.
3. **Visual and structural consistency** — the app already uses a clean blue/navy palette and the right navigation structure, but it needs one unified design system so every page looks like the same professional product.

**Rough readiness against the manual's operating model: ~65–70% structurally present, ~35% wired end-to-end.**

---

## 2. The target operating model (what the manual asks for)

The manual's core is a **closed loop**:

```
Client Setup (26 questions)
      ↓
Program Applicability Engine  (turns answers → enabled modules + "why")
      ↓
Risk Register  (the foundation every module reads/writes)
      ↓
Compliance Calendar  (dated tasks generated from register frequencies)
      ↓
Operate  (inspections, approvals, permits, waste, CAPA → produce evidence)
      ↓
Monitor  (predictive dashboard, overdue, pressure, review queue)
      ↓
Improve  (re-score, retrain, update register)  ──┐
      └──────────── feeds back to Risk Register ─┘
```

Eight cross-cutting rules the manual treats as non-negotiable:

1. **Trigger-gated activation** — no module is "applicable" without a recorded trigger (client answer, manual override, regulatory/permit trigger, equipment/material record, or qualified-reviewer decision). Disabled modules stay visible with a written "why not applicable" rationale.
2. **Everything writes back to the Risk Register**, which drives the Calendar. One shared audit trail.
3. **Evidence-linked everything** — every task/approval/inspection/CAPA/training links to evidence with version + retention class + owner + access restriction.
4. **Qualified-person enforcement** — restricted decisions cannot be approved by AI or unqualified users.
5. **AI is strictly DRAFT / decision-support** — it scores, drafts, trends, prioritizes, alerts; it must NOT certify, sign manifests, approve BSL/radiation/laser/chemical, auto-close CAPA, or override reviewers. Every AI output cites its inputs, shows capped confidence, and records accept/reject/modify + reviewer + timestamp.
6. **Change → revalidation** — any change in material/process/equipment/scale/location/product/threshold triggers control revalidation (Management of Change).
7. **One canonical status enum** (9 states) and a **9-class predictive pressure model** as shared primitives.
8. **Hard data-model distinctions** — BSC ≠ fume hood (non-interchangeable); BSL-2+ is a site profile not a legal category; BBP applies only with blood/OPIM or site policy; Part 11 is never implied without validation.

---

## 3. Gap table — manual capability vs. current state

Severity key: 🟢 mostly there · 🟡 partial / needs wiring · 🔴 missing or broken

| # | Manual capability | Current state in your code | Gap | Severity |
|---|---|---|---|---|
| 1 | **26-question Client Setup Questionnaire** driving everything | `onboarding/page.tsx` collects ~10 fields. The intake schema (`company_intake_templates`, `company_intake_responses` with `triggers_programs`/`triggers_documents`) **exists in the DB** but no UI drives the 26 questions. | Build the questionnaire UI on top of the existing intake tables; map all 26 questions to trigger keys. | 🔴 |
| 2 | **Program Applicability Engine** — answers → enabled modules + disabled rationale + change detection | `src/lib/foundation/engine.ts` + `biotypes.ts` (9 BioTypes) compute applicability; `organizations.module_flags` JSONB toggles modules. Real and sophisticated. | Feed it from the 26-Q intake; persist a **disabled-program record with reason** for every non-applicable module; add change-detection revalidation. | 🟡 |
| 3 | **Risk Register** as the central entity (full field set: hierarchy, source basis, control, frequency, qualified person, evidence, risk/status, CAPA link) | Risk lives in `risk_cells` + `assessments` + `hazards`/`controls`. The Workbench shows a "Risk Register" tab. There is **no single Risk Register entity** with the manual's full field schema and Company>site>area>room>process>task hierarchy. | Introduce a first-class Risk Register entry model (or formalize `risk_cells`) with the manual's required fields; make every module write to it. | 🟡 |
| 4 | **Compliance Calendar** generated from register frequencies (daily→3-year + event-triggered) | `regulatory_deadlines` table, cron schedulers (`api/cron/*`), inspection auto-scheduling exist. | No engine that **generates dated tasks from Risk Register frequencies**. Build the frequency→task generator and the calendar view. | 🟡 |
| 5 | **Evidence Library + Document Control** (version, retention class, access, linked to every object) | `document_metadata`, `document_versions`, `document_approvals`, `documents/*` pages — real and deep. | Add **retention class** + universal **evidence-link** from any task/CAPA/inspection/training, and an audit-ready export. | 🟢 |
| 6 | **60+ Program Module Library** | `src/lib/programs/program-data.ts` = 29 static programs + foundation `compliance_programs`. Nav exposes the main ones. | ~Half the manual's modules exist. **Missing/stub:** Laser, Radiation, PSM/RMP, HPAPI, Select Agents, Controlled Substances, Animal/IACUC, Shipping/Transport, Compressed Gas, Cryogens, Machine Guarding, Electrical, LOTO, Confined Space, Hot Work, Cleanroom, Cold Chain. | 🟡 |
| 7 | **15 guided Operating Workflows** | CAPA, Incident, Inspection workflows are real. | **Missing as guided flows:** New Chemical Request/Approval, New Biological Material Review, BSC/Fume Hood onboarding, Laser/Radiation onboarding, Waste lifecycle, Regulated Shipping, Management of Change, PSM screen, Cold Chain excursion, GxP record classification. | 🟡 |
| 8 | **Qualified People, Committees & Approval Routing** (16 functional reviewer roles + 8 committees + routing) | `role-permissions.ts` has 6 canonical roles (superadmin, platform_staff, owner, supervisor, member, viewer) with legacy-string normalization. | Manual wants **16 functional reviewer roles** (BSO, CHO, RSO, LSO, Authorized Shipper, Responsible Official, IACUC, Controlled-Sub Custodian, Process-Safety, Quality/Data-Integrity, etc.) + **committee objects** + **routing enforcement** so restricted decisions go to the qualified person. | 🟡 |
| 9 | **Predictive Dashboard** (9-class pressure model, confidence, review queue) + **AI Guardrails** (cite inputs, capped confidence, accept/reject audit, learning loop) | `forecast.ts` + `predictive-engine/page.tsx` compute pressure + trend + capped confidence; guardrails (`source-artifacts.ts`, "Draft – Human Review Required") are real and pervasive. | Calibration **learning loop is not fed** — nothing logs predictions/outcomes into `prediction_outcomes`, so confidence stays capped forever. Formalize the **9 pressure categories**; add the AI accept/reject/modify audit record. | 🟡 |
| 10 | **Data model + one audit trail + permissions** | Strong: org-scoped RLS on 82 tables, `audit_events` log, `audit-trace.ts`. | Add Risk Register entity (#3), retention class (#5), reviewer roles (#8). Generate Supabase types (`src/types/` is empty → drift risk). | 🟢 |
| 11 | **Specialized interfaces** — PSM/RMP, GxP/Part 11, CLIA/HIPAA, HPAPI, Cold Chain, Security/Access | Largely absent as distinct interfaces. The AI assistant prompt references the regs, but there are no record-classification or interface flows. | Build the 6 interface flows (mostly classification + routing + flags), gated by intake triggers. | 🔴 |
| 12 | **Canonical Status Logic** (9 states: Draft, Pending Qualified Review, Active, Restricted, Overdue, Out of Service, Closed with Evidence, Closed – Effectiveness Pending, Retired/Obsolete) | Status is **fragmented**: `HumanReviewStatus`, `MapDerivedStatus`, `FoundationTaskStatus` (open/in_progress/complete/blocked), `EvidenceStatus`. No shared 9-state enum. | Define one canonical status enum + a shared StatusChip component; map existing statuses onto it. | 🟡 |
| 13 | **Recommended Navigation Map** (Workspace / Assess / Plan / Operate / Monitor / Improve) | `PlatformCategoryNav.tsx` **already** uses Assess / Plan / Operate / Monitor / Workspace, and already names "BioRisk Workbench", "Risk Register", "Provider Directory", "Predictive Engine", "Risk Monitor". Very close to the manual. | Add the **"Improve"** section; reconcile a few labels. Small. | 🟢 |
| 14 | **Visually appealing, graphically professional ("customer ready")** | Clean navy/blue CSS-variable palette in `globals.css`; `AppShell.tsx` exists; **no Tailwind** (custom CSS). But many one-off HTML mockups in repo root and inconsistent component styling page-to-page. | Systematize tokens into one design system + a reusable component kit (status chips, KPI tiles, risk gauges, tables, AI-draft banner, evidence cards) applied consistently. See Upgrade Plan §Design. | 🟡 |

---

## 4. What is actually broken right now (fix-first list)

These look finished but will fail or mislead a customer:

1. **Work Permits module** (`permits/page.tsx` + `permits-service.ts`) — full UI + service, but the **`controlled_work_permits` table has no migration.** Reads/writes no-op. It's in the nav under Operate.
2. **Pest & Disinfection module** (`pesticide/page.tsx` + `pesticide-service.ts`) — same: **`pesticide_disinfectant_records` table missing.** Also in the nav.
3. **Predictive calibration loop not fed** — `prediction_outcomes` table + the 20-outcome threshold exist, but nothing writes predictions or outcomes, so forecasts are permanently "uncalibrated / moderate confidence." The "self-learning engine" claim is aspirational until this is wired. *(Your memory notes the predictive engine is the core differentiator — this is the gap to close for that claim.)*
4. **Billing last mile** — Stripe `checkout`/`portal`/`webhook` routes are real, but `account/billing` still says "coming soon"; billing is manual.
5. **Healthcare-template residue** — `bios` (`patient_bios`) and `providers` (`provider_profiles`, NPI/NPPES, `accepting_patients`) are functional but off-domain leftovers, currently surfaced in the Assess nav as "Personnel" and "Provider Directory." Decide: re-skin as personnel/expert registry (manual's "Qualified Person Registry" + "Provider Directory") or remove.
6. **Empty `src/types/`** — no generated Supabase types, so DB/code can drift silently.
7. **Edge-function auth is thin** — `ai-compliance-assistant` checks only for an Authorization header, not org membership.

---

## 5. Strengths to build on (don't rebuild these)

- **Deterministic risk engine** (`bio-ai/engine.ts`, ~600 lines, unit-tested) — weighted scoring + escalation overrides + forced human review. Solid foundation for the Risk Register.
- **Foundation applicability engine** (`foundation/engine.ts` + 9 BioTypes) — the hardest part of the manual is already built.
- **Forecast + guardrails** — pressure/trend/capped-confidence + a pervasive "Draft – Human Review Required" guardrail already match the manual's AI rules.
- **Navigation structure** — already Assess/Plan/Operate/Monitor/Workspace.
- **Clean visual base** — coherent navy/blue token palette already in `globals.css`.
- **Real multi-tenancy + RLS + audit trail + reports.**

---

## 6. Where this leads

The upgrade is best framed as **"connect and complete the loop, then make it look like one product"** — not a rebuild. The phased plan and the developer hand-off (documents 02 and 03) sequence this so the core loop comes first, the visual system is applied in parallel, and everything happens on a new branch you can throw away if it doesn't work out.
