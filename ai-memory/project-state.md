# PredictSafeBIO Project State

Last updated: 2026-06-01

## Repository

- GitHub repository: `johnhhaldemann-svg/PredictSafeBIO`
- Visibility: public
- Protected branch: `main`
- Latest main commit verified locally after My Work priority filter merge: `6853b6e`.
- PR #9 recovered the closed-but-unmerged MVP foundation work from PRs #4, #5, #6, and #7.
- PR #15 fixed Supabase auth confirmation callbacks for both PKCE `code` links and `token_hash` links.
- PR #21 added audit target links, short demo seed labels, and workflow helper tests.
- PR #23 added assessment register filters, cleaner report sections, feature-flag metadata, and expanded LLM draft-assist gate documentation.
- Branch `codex/map-aligned-platform` adds the connected Foundation / My Work / Workbench command-center increment.
- PR #26 merged the connected Foundation / My Work / Workbench command-center increment into `main` at `f7c62cd525c96825e923778669ebd11a396bda3a`.
- Release `v1.1-demo-hardening` exists at commit `c49c54c76bb15cb395574c3f72dae90f4898f801`.
- Branch protection API response on June 1, 2026 showed required status checks and admin enforcement on `main`; no approving-review rule was returned by the API.
- Dependency PRs #10, #12, and #13 were merged one at a time after refreshed CI and Vercel checks.
- ESLint 10 remains closed because it still fails in the lint toolchain.

## Vercel

- Project: `predictsafe-bio`
- Production URL: `https://predictsafe-bio.vercel.app`
- Production routes verified with `200 OK`: `/workbench`, `/assessments`, `/assessments?review=reviewed_monitoring&level=critical&reviewer=reviewed`, `/company-profile`, `/documents`, `/admin/audit`, `/admin/demo`, and `/login`.
- Latest verified CI run on `main`: `26583182299`.

## Supabase

- Project ref: `mygxjnvzdljmdriokvvx`
- Project URL: `https://mygxjnvzdljmdriokvvx.supabase.co`
- Supabase backs auth, organization-scoped persistence, assessment storage, document metadata, recommendations, and audit logs.
- Smoke-test evidence: 1 user, 1 profile, 1 company profile, 1 assessment, 2 assessment signals, 1 document, 6 draft recommendations, and 4 audit events.
- RLS is enabled and policies are present on the eight MVP public tables.
- Security advisor warning: leaked password protection is disabled.
- Performance advisor notes: unused early-demo indexes and Auth DB connection strategy informational items.
- Storage migration `enable_document_storage` has been applied.
- Private bucket `biotech-documents` exists with four authenticated-only storage policies for select, insert, update, and delete.
- Signed-in private-bucket upload smoke passed locally on June 1, 2026: authenticated upload to `biotech-documents` persisted `storage_path`, the document detail page rendered the uploaded file, the draft report decoded, and `/admin/audit` linked to the smoke document.

## Current Product State

- Public users can run the deterministic AI Engine in demo mode.
- Signed-in users can onboard, save assessments, create document metadata, persist draft recommendations, and view audit events.
- Real user smoke test passed.
- Email confirmation was temporarily disabled during smoke testing because built-in Supabase auth email sending hit the project throttle.
- Re-enable email confirmation after testing; configure custom SMTP before heavier signup testing.
- v1.1 hardening adds clearer auth messages, optional document file upload metadata, and draft-only demo report downloads.
- Auth hardening is deferred by owner decision for now: re-enable email confirmation, enable leaked-password protection, configure custom SMTP, and run real signup/confirmation smoke later.
- Supabase organization plan is Pro, so leaked-password protection is available when the Auth settings pass is resumed.
- Current product increment adds assessment review workflow, document recommendation history, Markdown demo reports, signed-in demo seed operations, and an explicit LLM draft-assist gate.
- Supabase migration `assessment_review_workflow` has been applied; `assessments` now includes reviewer notes, reviewer identity, reviewed timestamp, and constrained review statuses.
- Signed-in v1.1 smoke passed in production: review status changes saved reviewer notes, `human_review_status_changed` audit links opened the assessment, document recommendation history and report download worked, and `/admin/demo` seeded labeled demo assessment/document/audit records.
- Demo seed evidence: `Demo seed 6e0c12c4`, assessment `362e02bb-8a11-48f1-933c-1fddbacbf7cd`, document `e425c0c4-42fd-48df-87ab-648f9a4191c2`.
- v1.2 work is focused on assessment register filtering, clearer draft-only report structure, auth/upload hardening follow-up, and an explicit no-LLM implementation gate.
- v1.2 connector checks confirm `biotech-documents` is private and has authenticated org-scoped select, insert, update, and delete policies.
- The current command-center increment adds `/my-work`, connected command navigation across `/foundation`, `/my-work`, and `/workbench`, reusable Foundation task cards, work KPIs, source-resolution/closeout callouts, and notification read/unread controls.
- Branch `codex/my-work-priority-filters` adds My Work KPI deep links into saved task views plus Overdue, High priority, and Urgent task filtering.
- Branch `codex/my-work-dashboard-polish` adds visible active saved-view state, task sorting controls, and the reusable signed-in smoke runbook.
- Production route smoke on June 1, 2026 returned `200 OK` for `/foundation`, `/my-work`, `/workbench`, `/documents`, `/admin/audit`, and `/login`.
- PR #29 merged My Work KPI deep links and saved-view filtering into `main` at `6853b6e`; production saved-view routes `/my-work?view=high_priority`, `/my-work?view=overdue`, `/my-work?view=blocked`, and `/my-work?view=ready` returned `200 OK`.
- Reusable signed-in smoke accounts were created on June 1, 2026 and their generated passwords are stored outside the repo at `C:\Users\johnh\AppData\Local\PredictSafeBIO\smoke-accounts.json`.
- Reusable smoke org `Codex Reusable Smoke Org` was seeded with five Foundation tasks covering high priority, overdue, blocked, ready-for-closure, and normal open work.
- Signed-in production owner/member smoke for `/my-work?view=high_priority`, `/my-work?view=overdue`, `/my-work?view=blocked`, and `/my-work?view=ready` passed on June 1, 2026. Owner assignment/due-date controls were visible; member assignment/due-date controls stayed hidden while status/note controls stayed available.
- Signed-in owner smoke passed locally on June 1, 2026: `/foundation`, `/my-work`, and `/workbench` all returned `200`, showed the Codex smoke tasks, and exposed owner assignment plus due-date controls.
- Signed-in assigned-member smoke passed locally on June 1, 2026: member views showed assigned task status/note/closeout controls, hid assignment and due-date fields, and rendered overdue, blocked, due-soon, and ready-for-closure notifications.
- Notification action smoke passed locally on June 1, 2026: mark read, mark unread, and mark all read returned success redirects; assigned-member status update and note actions also returned success redirects.
- Disposable Codex command-center/upload smoke records were cleaned after verification: Codex smoke users, org, upload docs, private storage objects, tasks, notifications, and audit events all returned to zero.
- Recommendations remain `Draft - Human Review Required`.
