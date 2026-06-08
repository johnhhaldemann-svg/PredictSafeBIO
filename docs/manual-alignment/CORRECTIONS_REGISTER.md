# PredictSafeBIO — Corrections Register

**What this is:** the exact list of things to **insert or change** in the system you already have, so each one matches the document. We keep everything else as-is. This is the "Plan." For each correction we then **Show** a mockup on your current page in your current navy/blue look, and only **Do** it after you approve.

**Legend:** 🛠 Fix (broken today) · ➕ Insert (missing) · ✏️ Change (exists but wrong)

---

## P0 — Fixes (these look done but are broken today)

| # | Existing page | Currently | Document says | Correction |
|---|---|---|---|---|
| 1 | **Work Permits** (`/permits`) | Full page + logic, but **no database table** — nothing saves. | Work Permits is a real module (hot work, confined space, etc.). | 🛠 Insert the `controlled_work_permits` table the page already expects. No UI change. |
| 2 | **Pest & Disinfect** (`/pesticide`) | Full page + logic, but **no database table** — nothing saves. | Pest & Disinfection module with approved disinfectants/contact times/logs. | 🛠 Insert the `pesticide_disinfectant_records` table. No UI change. |

## P1 — Core loop corrections (the backbone of the document)

| # | Existing page | Currently | Document says | Correction |
|---|---|---|---|---|
| 3 | **Onboarding / Setup** (`/onboarding`) | ~5 fields: name, organization, company, primary site (+ a few optional notes). | §4 — a **26-question Client Setup Questionnaire** that decides what programs apply. | ➕ Insert the remaining ~21 questions into the existing form, grouped into the document's 7 sections. Same flow, saves to the intake tables you already have. |
| 4 | **Compliance Map** (`/foundation`) | Applicability engine runs; modules toggle on/off. | §5 — every enabled module shows **why it's on**; every disabled module shows **why not** and stays re-activatable. | ✏️ Change the module cards to display the activation reason (and a disabled-reason record). |
| 5 | **Risk Register** (`/workbench?tab=risk-register`) | Risk rows exist (from `risk_cells`/assessments). | §6 — each entry needs: source basis, required control, frequency/trigger, qualified reviewer, evidence required, status. | ➕ Insert the missing fields onto the existing register rows so each row can drive a calendar task. |
| 6 | **Status labels** (everywhere) | Mixed labels: `open / in_progress / complete / blocked`, plus separate review/evidence statuses. | §15.2 — one set of 9 statuses: Draft · Pending Qualified Review · Active · Restricted · Overdue · Out of Service · Closed with Evidence · Closed – Effectiveness Pending · Retired/Obsolete. | ✏️ Change to the document's status wording via one shared status chip. |
| 7 | **Compliance Calendar** (`/inspections/calendar` + deadlines) | Deadlines + cron schedulers exist. | §7 — the calendar is **generated from Risk Register frequencies** (daily…3-year + event-triggered). | ➕ Insert the generator that turns register frequencies into dated tasks. |
| 8 | **Risk Monitor** (`/risk-command-center`) | Shows prioritized risk signals. | §11 — KPI tiles (Overdue / High risk / Evidence % / Open CAPA / To review) + category **pressure gauges** (Chem/Bio/Waste/Train/Equip/CAPA). | ➕ Insert the tiles + gauges, in your current navy/blue style. |

## P2 — AI integrity corrections (your core differentiator)

| # | Existing page | Currently | Document says | Correction |
|---|---|---|---|---|
| 9 | **Predictive Engine** (`/predictive-engine`) | Forecast runs; confidence is capped because the calibration loop isn't fed. | §11 — a **learning loop** compares predictions to actual outcomes so confidence improves. | ➕ Insert outcome logging into the `prediction_outcomes` table so calibration actually works. |
| 10 | **AI outputs** (assistant, drafts, scoring) | "Draft – Human Review Required" label is shown. | §11.1 — every AI output must **cite the data it used** and record **accept / reject / modify + reviewer + timestamp**. | ➕ Insert the cited-inputs list + the accept/reject/modify audit record on AI surfaces. |

## P3 — Correctness & completeness corrections

| # | Existing page | Currently | Document says | Correction |
|---|---|---|---|---|
| 11 | **CAPA** (`/operations/capa`) | Has an `effectiveness_check_due` field but no effectiveness-pending state. | §9 — CAPA closes to "Closed – Effectiveness Pending," then an effectiveness check. | ✏️ Change CAPA closeout to add the effectiveness-pending status + check step. |
| 12 | **Chemical & SDS** (`/chemical-inventory`) | Inventory + SDS. | §9 — a **New Chemical Approval** review before use (hazard/storage/PPE/ventilation/waste). | ➕ Insert the approval review step onto the existing page. |
| 13 | **Navigation** | Sections: Assess / Plan / Operate / Monitor / Workspace. | §15.1 — also an **Improve** section (lessons learned, retraining, re-scoring, CAPA effectiveness). | ➕ Insert the Improve nav section (most data already exists; it just needs a home). |
| 14 | **Team / Roles** (`/account/team`) | 6 roles (owner, supervisor, member, viewer, + platform). | §10/§12 — 16 reviewer roles (BSO, CHO, RSO, LSO, etc.) + committees + approval routing. | ➕ Insert the additional reviewer roles + committee routing as the modules that need them are switched on. |
| 15 | **Personnel / Provider Directory** (`/bios`, `/providers`) | Healthcare-style fields (patient bios, NPI numbers, "accepting patients"). | §10 — Qualified Person Registry + expert/provider directory for biotech EHS. | ✏️ Change the labels/fields to the EHS domain (or remove the healthcare leftovers). |
| 16 | **Documents / Evidence** (`/documents`) | Versioning + approvals; `retention_until` only on archived records. | §12 — every evidence item has a **retention class** and any task/CAPA/inspection can attach evidence. | ➕ Insert a retention class + a universal "attach evidence" link. |
| 17 | **Equipment** (BSC / Fume Hood) | Equipment records exist. | §3.3/§9 — BSC and fume hood are **non-interchangeable asset types**. | ✏️ Change the equipment model to enforce the BSC ≠ fume hood distinction (if not already). |

---

## Suggested order

Do **P0** first (they're broken). Then **P1** in order 3 → 4 → 5 → 7 → 6 → 8 (that builds the document's loop). Then **P2**, then **P3** as needed.

Each item follows **Plan → Show → Do**: you're reading the Plan now; next I mock up one item on its real page in your current look; nothing in the live system changes until you approve that item.
