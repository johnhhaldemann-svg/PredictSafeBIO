# PredictSafeBIO MVP Demo Script

## 1. Public Engine Run

- Open `https://predictsafe-bio.vercel.app/workbench`.
- Show that the first screen is the AI Engine Workbench, not a marketing page.
- Change one intake field and explain that scoring is deterministic and testable before LLM calls.
- Point out guarded language and `Draft - Human Review Required`.

## 2. Authenticated Workspace

- Sign up or sign in with a test account.
- Complete onboarding with the seeded biotech company profile.
- Open `/company-profile` and show the live organization profile.
- Open `/my-work` and show the assigned-work command lane.
- Click KPI deep links such as `/my-work?view=high_priority`, `/my-work?view=overdue`, `/my-work?view=blocked`, and `/my-work?view=ready` to show saved task views for owner/member follow-through.
- Explain that owners can manage assignment and due dates, while assigned members can update status, notes, source refresh, and closeout for their own tasks.

## 3. Assessment Save And Review

- Return to `/workbench` and save the default contamination assessment.
- Open `/assessments` and click the saved assessment.
- Show score, risk band, confidence, top drivers, missing information, critical gaps, signals, snapshots, and audit trail.

## 4. Document Intelligence

- Open `/documents`.
- Create document metadata for a SOP or protocol.
- Open the document detail page.
- Show gap recommendations and draft update recommendations.
- Persist recommendations and show the audit event.

## 5. Audit And Guardrails

- Open `/admin/audit`.
- Show onboarding, assessment save, and document recommendation events.
- Show Foundation task activity events when present: status updates, notes, source refreshes, and notification actions.
- Close by stating the MVP boundary: this is a demo foundation, not a validated FDA/GxP/Part 11 production system.
