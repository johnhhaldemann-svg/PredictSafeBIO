# Manual v1.1 Implementation — what was built (branch: feature/manual-alignment)

Status: code complete, **typecheck + lint pass**. Additive only. Superadmin console untouched.

## Database (supabase/migrations/, 12 new files, timestamps 20260607010000–011100)
New tables: client_setup_questionnaire_responses, program_applicability_log, risk_register_entries,
compliance_calendar_items, qualified_person_registry, management_of_change_records, ai_recommendation_log.
Plus program_catalog (global, seeded with 59 Section-8 modules + activation triggers).
Expanded: compliance_programs (activation_trigger, disabled_rationale, requires_qualified_review),
risk_cells (risk_register_entry_id, program_name, confidence), capa_records (interim_control, root_cause,
effectiveness_status, effectiveness_checked_at, recurrence_count), inspection_records (risk_classification,
trend_category, linked_risk_register_id), tasks (risk_register_entry_id, evidence_required,
escalation_triggered, qualified_reviewer_id). All RLS-enabled, org-scoped, matching existing policy shape.

NOTE: column is `organization_id` (codebase convention), not `org_id` from the brief — functionally identical,
required so RLS + the service layer + getProfileContext work consistently. Person FKs → public.profiles(id).
The 60+ module list lives in the global program_catalog (compliance_programs is per-org, so it can't hold a
global seed); the engine instantiates per-org programs from the catalog.

## App code
- src/lib/manual/setup-questions.ts — 26 questions + trigger map + ALWAYS_ON list.
- Services: questionnaire-service, applicability-engine, risk-register-service (with qualified-reviewer gate),
  qualified-person-service (+ isUserQualifiedFor enforcement, listOrgMembers), compliance-calendar-service,
  moc-service (auto-routing), ai-recommendation-service (logAiRecommendation + AI_PROHIBITED_ACTIONS),
  manual-signals-service (dashboard counts).
- Pages: /assess/setup-questionnaire, /plan/risk-register, /plan/compliance-calendar,
  /plan/qualified-persons, /operate/management-of-change (each + actions.ts).
- Component: src/components/AiDraftBanner.tsx ("DRAFT — Human Review Required", amber).
- Nav: PlatformCategoryNav.tsx — new links under Assess/Plan/Operate.
- Dashboard: risk-command-center/page.tsx — 5 new signal cards.

## Guardrails enforced
- AiDraftBanner shown on every new AI surface; logAiRecommendation() writes a draft row first.
- Restricted risk-register status changes (active/restricted/closed_with_evidence) require the acting user
  in qualified_person_registry with qualified_for "risk_register_status" (or "all"), else blocked with
  "This action requires a Qualified Reviewer." AI cannot set an entry to active.

## To make it live — apply migrations (NOT auto-applied; do when ready)
Migrations are additive but NOT reverted by deleting the branch. Apply via Supabase CLI:
  supabase db push        (against project mygxjnvzdljmdriokvvx)
Until applied, the new pages render empty/graceful (services catch missing-table errors).

## Commit on the branch (run in PowerShell after closing VS Code to release .git/index.lock)
  git checkout feature/manual-alignment
  git add supabase/migrations/20260607*.sql
  git add src/lib/manual/
  git add src/lib/supabase/questionnaire-service.ts src/lib/supabase/applicability-engine.ts src/lib/supabase/risk-register-service.ts src/lib/supabase/qualified-person-service.ts src/lib/supabase/compliance-calendar-service.ts src/lib/supabase/moc-service.ts src/lib/supabase/ai-recommendation-service.ts src/lib/supabase/manual-signals-service.ts
  git add src/components/AiDraftBanner.tsx src/components/PlatformCategoryNav.tsx
  git add src/app/assess/ src/app/plan/ src/app/operate/management-of-change/ src/app/risk-command-center/page.tsx
  git add docs/manual-alignment/
  # NOTE: this intentionally does NOT stage src/app/admin/* or the superadmin services —
  # those show as modified from earlier work and are left exactly as they are.
  git commit -m "feat: manual v1.1 alignment — register, calendar, applicability engine, MOC, AI guardrails"
  git push -u origin feature/manual-alignment

## Revert (throw it all away)
  git checkout visual-polish
  git branch -D feature/manual-alignment
  (if pushed) git push origin --delete feature/manual-alignment
