# PredictSafeBIO — Code Hand-off Instructions (Manual Alignment)

**Audience:** the developer or coding agent (Claude Code / Codex) who will implement the upgrade.
**Read first:** `01_GAP_ANALYSIS.md` and `02_UPGRADE_PLAN.md` in this folder.
**Golden rule:** all work happens on a **new branch** so the current production branch (`visual-polish`) is never touched and can be restored instantly.

---

## 0. Environment facts (do not skip)

- **Stack:** Next.js 16 (App Router, React 19), Supabase (Postgres + Auth + Edge Functions), TypeScript, custom CSS variables (**no Tailwind**), Stripe, Anthropic SDK.
- **Terminal is PowerShell.** `&&` does NOT chain commands — put each command on its own line.
- **Production branch:** `visual-polish` → Vercel project `predictsafe-bio`. Non-production branches get automatic **Vercel preview deploys** — use those to test safely.
- **OneDrive sync gotcha:** the repo lives in a OneDrive-synced folder. Large writes through editor "save" can truncate. When generating big files programmatically, write via a shell heredoc (or small incremental edits) and **verify** with `npx tsc --noEmit` afterward.
- **VS Code HEAD.lock gotcha:** VS Code's Git integration can hold `.git/HEAD.lock` and block commits. If a commit fails with a lock error, **close VS Code** (or commit from the GitHub web UI) and retry.
- **Verify every change** with: `npm run typecheck` → `npm run test` → `npm run build`. Don't mark a ticket done if any fail.

---

## 1. Branch strategy (the safety net)

### 1.1 Create the working branch
Run these one line at a time in PowerShell from the repo root:

```powershell
git checkout visual-polish
git pull
git status
git checkout -b feature/manual-alignment
git push -u origin feature/manual-alignment
```

You are now on `feature/manual-alignment`. `visual-polish` is untouched.

### 1.2 Work in small, themed commits
One ticket = one (or a few) commits. Suggested message style: `feat(setup): 26-question intake UI (Phase 1.1)`.

```powershell
git add -A
git commit -m "feat(foundations): canonical status enum + StatusChip (Phase 0.1)"
git push
```

Each push updates the Vercel **preview** deployment for this branch — test there, not in production.

### 1.3 Optional sub-branches per phase
For larger phases, branch again off `feature/manual-alignment` (e.g. `feature/manual-core-loop`) and PR back into it. Keeps each phase independently reviewable/revertable.

### 1.4 How to revert (the whole point)
- **Throw away everything, nothing merged yet:**
  ```powershell
  git checkout visual-polish
  git branch -D feature/manual-alignment
  git push origin --delete feature/manual-alignment
  ```
  Production is exactly as before. Done.
- **Undo one bad commit but keep the rest:**
  ```powershell
  git revert <commit-hash>
  git push
  ```
- **Reset the branch to a known-good point (local only, before sharing):**
  ```powershell
  git reset --hard <good-commit-hash>
  ```

### 1.5 When a phase is proven good
Open a Pull Request `feature/manual-alignment → visual-polish` on GitHub, review the diff + the green preview deploy, then merge. **Do not merge until the preview works and `typecheck`/`test`/`build` pass.**

---

## 2. Conventions every ticket must follow

1. **Status:** use the single canonical enum from Phase 0.1 — never invent per-page status strings.
2. **Design:** use the Phase 0.2 tokens + component kit (`02_UPGRADE_PLAN.md` §4). New UI must use `<StatusChip>`, the KPI tile, the table component, etc. — no one-off styling.
3. **AI surfaces:** always render the shared "Draft — Human Review Required" banner with cited inputs; never let AI certify/sign/approve/auto-close.
4. **Applicability:** any module on/off must store a reason (`organizations.module_flags` + a disabled-program record).
5. **Tenancy/RLS:** every new table gets `organization_id` + RLS policies scoped via `profiles.organization_id`, matching existing migrations.
6. **Types:** after any schema change, regenerate Supabase types into `src/types/` and fix resulting type errors.
7. **Tests:** add/extend unit tests for any engine logic (follow the existing `*.test.ts` pattern next to the source).

---

## 3. Database / migration workflow

- Migrations live in `supabase/migrations/`, named `YYYYMMDDHHMMSS_description.sql` (e.g. `20260607090000_canonical_status.sql`). Keep that convention; new files must sort **after** `20260606000100_document_metadata_project_id.sql`.
- Apply to the dev/preview Supabase project first; never hand-edit production data.
- After a migration, regenerate types and run `npm run typecheck`.
- Use the Supabase MCP tools available in this workspace (`apply_migration`, `list_tables`, `get_advisors`, `generate_typescript_types`) to apply, inspect, and lint changes; run `get_advisors` after schema changes to catch missing RLS/security issues.

---

## 4. Phase 0 tickets (do these first — they unblock the loop)

### Ticket 0.1 — Canonical Status enum + StatusChip
- **Add** `src/lib/status.ts` exporting the 9 manual statuses as a const union:
  `Draft · Pending Qualified Review · Active · Restricted · Overdue · Out of Service · Closed with Evidence · Closed – Effectiveness Pending · Retired/Obsolete`, plus a `statusMeta` map (label, semantic color token, description).
- **Add** `src/components/StatusChip.tsx` rendering a pill from `statusMeta`.
- **Map** existing statuses (`HumanReviewStatus`, `MapDerivedStatus`, `FoundationTaskStatus` open/in_progress/complete/blocked, `EvidenceStatus`) onto the canonical set via a small adapter — don't rip out the old ones yet.
- **DoD:** StatusChip renders all 9; one screen (e.g. My Work) uses it; `typecheck`/`test` pass.

### Ticket 0.2 — Design tokens consolidation
- **Edit** `src/app/globals.css`: organize tokens into documented groups (surfaces, accent, text, semantic risk) per `02_UPGRADE_PLAN.md` §4.1; nudge page bg to `#F7F9FC`, borders to `#E2E9F2`. Keep all legacy aliases so nothing breaks.
- **Add** `docs/manual-alignment/DESIGN_TOKENS.md` documenting the tokens + usage rules.
- **DoD:** app still renders identically except the slightly cleaner surfaces; no console errors.

### Ticket 0.3 — Fix broken modules (Permits, Pesticide)
- **Add migration** creating `controlled_work_permits` matching the fields `permits-service.ts` expects (read the service for the exact columns: permit type, status/closeout states, scores, `organization_id`, timestamps). RLS org-scoped.
- **Add migration** creating `pesticide_disinfectant_records` matching `pesticide-service.ts`.
- Regenerate types.
- **DoD:** create/read/update works on both pages against the preview DB; `get_advisors` shows RLS enabled.

### Ticket 0.4 — Generate Supabase types
- Use `generate_typescript_types` → save to `src/types/database.ts`; replace ad-hoc row types where easy.
- **DoD:** `typecheck` passes; `src/types/` is no longer empty.

### Ticket 0.5 — Repo hygiene (optional, cosmetic)
- Move root-level `*.html` mockups, `*.bundle`, blueprint JSON/MD into `/archive/`. Don't move `src/`, config, or `public/`.
- **DoD:** `npm run build` still succeeds.

---

## 5. Phase 1 tickets (the core loop — your top priority)

> Build in order; each ticket leaves the loop a little more connected and independently testable.

### Ticket 1.1 — Client Setup Questionnaire (26 questions)
- **Reuse** existing tables `company_intake_templates` (JSONB `sections`) and `company_intake_responses` (`question_key`, `answer_value`, `triggers_documents`, `triggers_programs`). Seed a template with all 26 manual questions grouped into the 7 sections (Company, Operations, Materials, Equipment, Specialized Triggers, Governance, Records). The 26 questions are listed verbatim in `01`/the manual.
- **Build** a multi-step form (new route, e.g. `src/app/assess/setup/page.tsx`, linked from Assess nav and onboarding) with save/resume, progress, and per-answer `question_key` → trigger writes via a new `foundation` server action.
- **DoD (Acceptance Criterion "Setup Complete"):** a new org can complete the questionnaire and the answers persist with trigger keys.

### Ticket 1.2 — Applicability Engine wiring + disabled rationale
- **Wire** `src/lib/foundation/engine.ts` to read the 1.1 answers and output, for **every** module: `{ status: 'enabled'|'disabled', reason, triggerSource }`.
- **Persist** enabled set to `organizations.module_flags`; persist disabled-program records (new table `disabled_program_records` or a JSONB column) with the reason.
- **Build** the Applicability results screen (Applicability card per `02` §4.4): applicable vs not-applicable, each with its "why." Warn on inconsistent/incomplete answers.
- **DoD:** changing an answer flips the right module on/off with a visible reason; off-modules remain re-activatable.

### Ticket 1.3 — Risk Register entity
- **Decide & implement** (recommend extending rather than replacing): either enrich `risk_cells` or add `risk_register_entries` with the manual's required fields (hierarchy Company>site>area>room>process>task; source basis; control; frequency/trigger; qualified person; evidence required; inherent/residual risk; status [canonical enum]; CAPA link; audit question; dashboard signal).
- **Seed** entries automatically from applicable programs (each program contributes its controls + frequency + evidence requirement).
- **Surface** in the Workbench "Risk Register" tab (already in nav) using the table component + StatusChip.
- **DoD (Acceptance Criterion "Register Generated"):** enabling a program creates register entries with controls, frequencies, owners, qualified reviewers, evidence requirements.

### Ticket 1.4 — Compliance Calendar generator
- **Build** an engine (`src/lib/foundation/calendar.ts`) that turns each register entry's frequency (daily/weekly/monthly/quarterly/annual/3-year/event-triggered) into dated tasks in `tasks`/`regulatory_deadlines`.
- **Build** the calendar view + overdue detection (overdue → status `Overdue`, raises dashboard pressure).
- **DoD (Acceptance Criterion "Calendar Generated"):** register entries produce dated tasks automatically; overdue items show correctly.

### Ticket 1.5 — Evidence linking + retention
- **Add** a universal "attach evidence" action usable from any task/CAPA/inspection/training, linking to `document_metadata`/`document_versions`; add a `retention_class` field.
- **Build** the audit-ready export (by site / program / requirement / date range) reusing the existing report layer (`src/lib/reports/`).
- **DoD (Acceptance Criteria "Evidence Linked" + "Audit-Ready"):** every completed task traces to evidence+reviewer+date+requirement; export produces a package.

### Ticket 1.6 — Predictive Dashboard tie-in
- **Feed** live register + calendar + evidence state into the existing `forecast.ts` pressure model; formalize the 9 pressure categories (Overdue Verifications, Control Degradation, Training Gaps, Chemical, Biosafety, Waste, Change, Incident/CAPA, Quality-EHS Interface — see manual §11).
- **Rebuild** the dashboard with KPI tiles + category gauges (component kit) showing overdue / high-risk / evidence gaps / review queue with capped confidence + the existing "early indicators, not validated forecasts" banner.
- **DoD (Acceptance Criterion "Dashboard Useful"):** dashboard reflects real loop state with confidence shown.

---

## 6. Definition of Done (every ticket)

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes (new logic has tests)
- [ ] `npm run build` passes
- [ ] Vercel preview deploy for the branch renders the change without console errors
- [ ] New UI uses the design tokens + component kit (no one-off styling)
- [ ] Any new table has `organization_id` + RLS; `get_advisors` is clean
- [ ] AI surfaces show the Draft/Human-Review banner with cited inputs
- [ ] Committed with a clear themed message and pushed

---

## 7. Suggested first session for the implementer

1. Create the branch (§1.1).
2. Do Phase 0 tickets 0.1 → 0.4 (foundations + fix broken modules). Commit each.
3. Open a preview deploy, confirm Permits + Pesticide now persist.
4. Start Phase 1.1 (the questionnaire) — the keystone of the whole loop.
5. PR Phase 0 into `visual-polish` once verified; keep Phase 1 cooking on the branch.

If anything goes wrong at any point: `git checkout visual-polish` and you're back to today's production code. That is the safety net you asked for.
