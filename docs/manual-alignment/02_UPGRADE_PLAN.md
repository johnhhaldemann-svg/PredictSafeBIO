# PredictSafeBIO — Upgrade Plan (Manual Alignment + Customer-Ready Polish)

**Goal:** Make the live platform operate as the manual describes — the closed Setup→Assess→Plan→Operate→Monitor→Improve loop — and look like one polished, professional product. All work on a throwaway branch (see document 03).

**Chosen direction (confirmed with you):**
- Build the **core loop end-to-end first.**
- Visual style: **Clean Clinical SaaS** (calm whites/greys, one confident accent, generous whitespace, crisp tables and status chips — trustworthy compliance software).
- This session delivers the plan + hand-off only; no feature code is changed yet.

---

## 1. Guiding principles (carry these into every ticket)

Every change must respect the manual's eight rules:

1. **Trigger-gated** — a module turns on only from a recorded trigger; off-modules keep a written "why not" reason and stay re-activatable.
2. **Write back to the Risk Register** — the register is the hub; the calendar and dashboard read from it.
3. **Evidence-linked** — everything completable links to evidence (version + retention + owner + access).
4. **Qualified-person enforced** — restricted decisions route to the qualified person; AI and unqualified users cannot approve them.
5. **AI is DRAFT-only** — cite inputs, cap confidence on weak data, record accept/reject/modify + reviewer + timestamp. Never certify/sign/approve/auto-close.
6. **Change → revalidation** — material/process/equipment/scale/location/threshold changes re-open affected controls.
7. **One status enum, one pressure model** — shared primitives, not per-page strings.
8. **Hard distinctions enforced in data** — BSC≠fume hood; BSL-2+ is a site profile; BBP needs blood/OPIM or policy; Part 11 never implied.

---

## 2. Phased roadmap

The manual lists an 18-item build order. Grouped into phases, prioritizing the core loop you chose:

### Phase 0 — Foundations & cleanup (enables everything else)
*Why first: these are shared primitives and quick wins that unblock the loop and stop the "looks done but broken" problems.*

- **0.1 Canonical Status enum + StatusChip component** — define the 9 manual statuses once; build one `<StatusChip>`; map existing statuses onto it.
- **0.2 Design tokens pass** — consolidate `globals.css` into a documented token set (see §4). No visual rewrite yet, just the system.
- **0.3 Fix broken modules** — add migrations for `controlled_work_permits` and `pesticide_disinfectant_records` so Permits and Pest & Disinfection actually persist.
- **0.4 Generate Supabase types** into `src/types/` and wire `npm run typecheck` to catch drift.
- **0.5 Repo hygiene** — move the loose root-level `*.html` mockups, `*.bundle`, blueprint files into an `/archive` folder so the app is legible. (Cosmetic but helps every future change.)

### Phase 1 — The core loop, end-to-end (your #1 priority)
*Definition of success: a brand-new customer answers the setup questions and the system automatically shows applicable programs, builds register entries, generates dated calendar tasks, links evidence, and surfaces predicted pressure — as one connected flow.*

- **1.1 Client Setup Questionnaire (26 questions)** — build the UI on top of existing `company_intake_templates` / `company_intake_responses`; each answer writes a trigger key. Show progress, allow save/resume, restate as the manual's 7 sections (Company, Operations, Materials, Equipment, Specialized Triggers, Governance, Records).
- **1.2 Applicability Engine wiring** — feed `foundation/engine.ts` from the intake answers; for every module output **enabled + reason** OR **disabled + reason**; persist a disabled-program record; warn on inconsistent/incomplete answers.
- **1.3 Risk Register entity** — formalize register entries (extend `risk_cells` or add `risk_register_entries`) with the manual's full field set + Company>site>area>room>process>task hierarchy; have applicable programs seed entries with controls/frequency/owner/qualified reviewer/evidence requirement.
- **1.4 Compliance Calendar generator** — engine that turns register frequencies (daily…3-year + event-triggered) into dated `tasks`/`regulatory_deadlines`; build the calendar view + overdue logic.
- **1.5 Evidence linking** — universal evidence attach from any task/CAPA/inspection/training; add retention class; "audit-ready export by site/program/requirement/date range."
- **1.6 Predictive Dashboard tie-in** — make the dashboard read live register + calendar + evidence state into the existing pressure model; formalize the 9 pressure categories; show overdue / high-risk / evidence gaps / review queue with capped confidence.

### Phase 2 — Governance, routing & AI integrity
- **2.1 Qualified-person model** — add the 16 functional reviewer roles + a qualified-person registry (who may approve/sign/close what).
- **2.2 Committees + approval routing** — committee objects (General Safety, IBC/Biosafety, Radiation, Laser, Chemical Hygiene, Process Safety, Quality/Data Integrity, Management Review) + routing so restricted statuses go to the right reviewer.
- **2.3 AI guardrail audit record** — every AI output stores inputs cited + confidence + accept/reject/modify + reviewer + timestamp + final action.
- **2.4 Calibration learning loop** — log predictions and confirmed outcomes into `prediction_outcomes` so confidence can actually calibrate (closes the "self-learning engine" gap — your core differentiator).

### Phase 3 — Program module completeness (controlled order, trigger-gated)
Add the missing modules so the library reaches the manual's 60+, each activating only on its trigger:
Laser → Radiation → Compressed Gas → Cryogens → Machine Guarding → Electrical → LOTO → Work Permits (Hot Work / Confined Space) → Cleanroom → Cold Chain → Animal/IACUC → Shipping/Transport → Select Agents → Controlled Substances → HPAPI.

### Phase 4 — Specialized interfaces + audit readiness
PSM/RMP screen · GxP/Part 11 record classification · CLIA/HIPAA diagnostic interface · HPAPI containment · Cold Chain excursion · Security/Access control. Plus the full audit-ready evidence export and Management Review dashboard.

### Phase 5 — Continuous improvement, billing, final polish
"Improve" nav section (lessons learned, SOP revisions, retraining, re-scoring, CAPA effectiveness) · Stripe self-service checkout last mile · resolve healthcare-template residue · full visual polish pass across every page using the Phase-0 design system.

---

## 3. Acceptance criteria (from the manual — this is "done")

The platform is manual-aligned when all ten pass:

1. **Setup Complete** — a new client answers setup questions and gets a clear list of applicable AND non-applicable programs (with reasons).
2. **Register Generated** — each applicable program creates Risk Register entries with controls, frequencies, owners, qualified reviewers, evidence requirements.
3. **Calendar Generated** — calendar tasks are created automatically from register entries + asset/program requirements.
4. **Human Review Enforced** — restricted decisions cannot be approved by AI or unqualified users.
5. **Evidence Linked** — every completed task traces to evidence, reviewer, date/time, source requirement.
6. **CAPA Works** — failed inspections/incidents generate corrective actions with owner, due date, root cause, closure, effectiveness.
7. **Dashboard Useful** — shows overdue items, high-risk changes, trend signals, predicted pressure with confidence.
8. **Change Detected** — material/process/equipment/scale/location changes trigger control revalidation.
9. **Audit-Ready** — users can export evidence packages by site, program, requirement, audit, incident, CAPA, or date range.
10. **Configurable** — programs activate/deactivate by facility and jurisdiction without rebuilding the product.

---

## 4. Design system — "Clean Clinical SaaS" (runs in parallel with every phase)

Your `globals.css` already has a coherent navy/blue token set. This formalizes it into a system every page uses, so the product reads as one professional tool. **No Tailwind** — keep the existing CSS-variable approach.

### 4.1 Color tokens (refine existing)
- **Surfaces:** page `#F7F9FC` (slightly cooler/lighter than current `#F0F4F8` for more whitespace), panels `#FFFFFF`, soft panels `#F4F8FD`, hairline borders `#E2E9F2`.
- **Accent (one):** primary blue `#185FA5` (keep) for primary actions, active nav, links. Use sparingly — accent should mean "this is the action."
- **Text:** primary `#0D1B2A`, secondary `#4A6080`, muted `#8FA8C0`.
- **Semantic risk (used only for risk/status, never decoration):** critical `#E24B4A`, high `#EF9F27`, moderate `#EAB308`, low/ok `#1D9E75`, neutral/info `#378ADD`. Each with a soft background pair (already defined: `--red-bg`, `--amber-bg`, `--green-bg`).
- **Rule:** color carries meaning. Greys for structure, the one blue for actions, semantic colors only for risk and status.

### 4.2 Typography
- Inter (already loaded). Scale: page title 24/600, section 18/600, card title 15/600, body 14/400, caption 12/500 uppercase tracked for labels. Tighten line-height on headings, comfortable (1.5) on body.

### 4.3 Layout & app shell
- Left nav grouped exactly as the manual: **Workspace · Assess · Plan · Operate · Monitor · Improve** (add "Improve"). Collapsible. Active item uses the accent + soft background.
- Content max-width ~1200px, generous 24–32px gutters, 16–24px card padding. Consistent 8px spacing grid.
- Every page = same header pattern: page title + one-line purpose + primary action top-right + the "Draft / Human Review Required" context where AI is involved.

### 4.4 Component kit (build once, use everywhere)
- **StatusChip** — the 9 canonical statuses, each a pill with semantic color + soft bg.
- **KPI tile** — big number + label + small trend arrow (for the dashboard's 14 Overdue / 3 High / 87% Evidence / 6 CAPA / 2 Review tiles).
- **Risk pressure gauge** — horizontal meter 0–100 with semantic color bands (for the category gauges: Chem/Bio/Waste/Train/Equip/CAPA).
- **Data table** — sticky header, zebra-free with hairline rows, right-aligned numbers, row-level status chip, empty + loading states.
- **Evidence card** — file/photo + linked requirement + version + retention badge + reviewer.
- **AI Draft banner** — a single reusable component reading "Draft — Human Review Required," with the cited-inputs list and accept/reject/modify controls. Use on every AI surface.
- **Applicability card** — module name + enabled/disabled state + the "why" reason (core to the manual's transparency rule).

### 4.5 Quality bar
- WCAG 2.1 AA contrast on all text and status colors.
- Every page has loading, empty, and error states (no blank screens).
- Consistent iconography (lucide-react, already in use).
- Mobile/responsive at least for read/monitor views.

---

## 5. Sequencing & effort (orientation, not commitments)

| Phase | Theme | Relative size | Customer-ready impact |
|---|---|---|---|
| 0 | Foundations & cleanup | Small | Unblocks everything; fixes broken modules |
| 1 | Core loop end-to-end | Large | **Highest** — this is the product the manual sells |
| 2 | Governance, routing, AI integrity | Medium | High — credibility + the "self-learning" claim |
| 3 | Module completeness | Large (incremental) | Medium — breadth; do per customer demand |
| 4 | Specialized interfaces | Medium | Medium — needed for pharma/GxP/diagnostic buyers |
| 5 | Improve + billing + polish | Medium | High — final "feels finished" layer |

Design-system work (§4) is **not a phase** — Phase 0 defines it, and every subsequent ticket applies it to the pages it touches, so polish accrues continuously instead of as a risky big-bang restyle at the end.

---

## 6. What stays untouched (protect these)

The deterministic engines (`bio-ai/engine.ts`, `forecast.ts`), the foundation applicability engine, multi-tenancy/RLS, the audit trail, and reports are strengths. Extend them; don't rewrite them. All work happens on a new branch so `visual-polish` (your current production branch) is never at risk — see document 03.
