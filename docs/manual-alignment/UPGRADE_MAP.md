# PredictSafeBIO — Upgrade Map (Manual as Reference for the System We Already Have)

**How to read this:** the left column is a page/feature **that already exists in your platform today.** The middle column is what the **manual** says it should do. The right column is the **upgrade** — applied to the existing page, reusing the current design and code. Nothing here is a new/parallel product. We are merging the manual's guidance into the current system.

**Working method — Plan → Show → Do (one area at a time):**
1. **Plan** — agree the upgrade for an area (this document).
2. **Show** — a mockup of the *upgraded existing page* in your current navy/blue look, for your approval.
3. **Do** — only after you approve the mockup, the change is built (on a safety branch so the live system is never at risk until you say so).

Nothing in the current system changes until you approve it at the "Show" step.

---

## ASSESS (existing nav section)

| Existing page | Manual reference | Upgrade to the existing page |
|---|---|---|
| **Setup / Onboarding** (`/onboarding`) | §4 — 26-question Client Setup Questionnaire | Extend the current onboarding form into the full 26-question intake (it already saves to the intake tables). Same flow, more questions, grouped into the manual's 7 sections. |
| **BioRisk Workbench** (`/workbench`) | §1–2 — Assess stage, BioRisk Workbench | Keep as-is; add the manual's "draft → review → active" status labels and cite-your-inputs note on AI output. |
| **Risk Register** (`/workbench?tab=risk-register`) | §6 — Risk Register foundation | Enrich the existing register tab with the manual's missing fields (source basis, qualified reviewer, evidence required, frequency/trigger) so each row can generate calendar tasks. |
| **Hazard Register** (`/hazards`) | §6 / module library | Keep; link each hazard to its control + the register entry it feeds. |
| **Personnel** (`/bios`) & **Provider Directory** (`/providers`) | §10 / nav map — Qualified Person Registry & Provider Directory | Re-label and lightly re-skin the existing pages as the manual's Qualified Person Registry + expert directory (decide whether to keep the healthcare-style fields). No rebuild. |

## PLAN (existing nav section)

| Existing page | Manual reference | Upgrade to the existing page |
|---|---|---|
| **Compliance Map** (`/foundation`) | §5 — Program Applicability Engine | Your applicability engine already lives here. Add the manual's transparency rule: every module shows **why it's on**, and off-modules show **why not** and stay re-activatable. |
| **Control Register** (`/controls`) | §6 — Required Control | Keep; tie controls to register entries and residual-risk display. |
| **Exposure Map** (`/exposure-map`) | nav map — Exposure Map | Keep as-is. |
| **My Work** (`/my-work`) | §15 — status logic | Keep; adopt the shared status labels. |
| **Programs** (`/programs`) | §8 — 60+ Program Module Library | Keep the existing program tools; over time add the missing modules (laser, radiation, etc.) into the same page pattern, each appearing only when triggered. |
| **Change Plan** (`/change-plan`) | §9 — Management of Change | Keep; connect it to the "change → revalidation" rule. |
| **Documents / Version Control** (`/documents`, `/documents/version-control`) | §12 — Evidence Library + Document Control | Keep (already strong); add a retention class + a universal "attach evidence" link other pages can use. |

## OPERATE (existing nav section)

| Existing page | Manual reference | Upgrade to the existing page |
|---|---|---|
| **Inspections** (`/inspections`) | §9 / Appendix G | Keep; results write back to the register + raise dashboard pressure. |
| **CAPA** (`/operations/capa`) | §9 — CAPA workflow | Keep; add "Closed – Effectiveness Pending" status + effectiveness check. |
| **Work Permits** (`/permits`) | §8 — Work Permits | **Fix:** the page exists but its database table is missing — add the table so it actually saves. Same UI. |
| **Pest & Disinfect** (`/pesticide`) | §8 — Pest & Disinfection | **Fix:** same — add the missing table so the existing page works. |
| **Chemical & SDS** (`/chemical-inventory`) | §5/§8 — Chemical Mgmt/Hygiene/Approval | Keep; add the chemical-approval review step (manual's New Chemical workflow) onto the existing page. |
| **Waste Mgmt** (`/waste-management`) | §9 — Waste lifecycle | Keep; add container fill/accumulation + manifest evidence. |
| **Training Matrix** (`/training-matrix`) | §8 / Appendix H | Keep; expired critical training raises a risk signal. |
| **Ergonomics** (`/ergonomics/...`) | §8 — Ergonomics | Keep as-is. |

## MONITOR (existing nav section)

| Existing page | Manual reference | Upgrade to the existing page |
|---|---|---|
| **Safety Loop / home** (`/`) | §2 — operating cycle | Keep; make it the at-a-glance entry to the loop. |
| **Predictive Engine** (`/predictive-engine`) | §11 — Predictive Dashboard + AI Guardrails | Keep the existing forecast; **feed the calibration loop** so confidence can actually improve (your core differentiator), and formalize the 9 pressure categories. |
| **Risk Monitor** (`/risk-command-center`) | §11 — Risk Monitor figure | Keep; add the KPI tiles + category pressure gauges from the manual, **in your current navy/blue style.** |

## WORKSPACE (existing nav section)

| Existing page | Manual reference | Upgrade to the existing page |
|---|---|---|
| **Company Settings** (`/account/company`) | §0 / §4 — workspace setup | Keep; this is where intake answers live for editing. |
| **Team** (`/account/team`) | §10 — roles & qualified people | Keep; expand roles toward the manual's reviewer roles as needed. |

## IMPROVE (the one new nav section the manual adds)

| New section | Manual reference | Approach |
|---|---|---|
| **Improve** | §2 / §14 — Improve stage | The only genuinely new nav item. Surfaces lessons learned, SOP revisions, retraining, and CAPA effectiveness — most of which already exist as data; this just gives them a home. |

---

## What this changes vs. my first draft

My first draft read like building toward a new target. This version is the corrected approach: **every item is an upgrade to a page you already have,** the manual is only the reference, the current design stays, and we go area-by-area with Plan → Show → Do. The earlier `01_GAP_ANALYSIS.md` is still useful as the honest review; `02_UPGRADE_PLAN.md` and `03_CODE_HANDOFF.md` apply only at the "Do" stage, once you've approved the "Show" for an area.
