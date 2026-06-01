# PredictSafeBIO Next Actions

Last updated: 2026-06-01

## Immediate

- Treat Supabase Auth hardening as deferred for now and keep the current demo/testing path on already-confirmed or existing signed-in users.
- PR #31 completed the owner/member dashboard polish slice: visible saved-view state, task sorting, and a clearer signed-in smoke runbook.
- PR #33 completed owner-only task priority editing for Foundation/My Work task lanes.
- PR #35 completed selected-task bulk status updates for Foundation/My Work task lanes.
- Priority-change notifications remain a later decision; the current task priority slice records activity history only.
- Next product decision can move to richer owner/member dashboard polish, bulk note/closeout ergonomics, or another focused workflow increment.

## Blockers And Watch Items

- ESLint 10 should remain closed until it is handled as an intentional toolchain upgrade.
- Dependabot PRs for TypeScript, lucide-react, and Node types were merged after refreshed CI/Vercel checks.
- PR #26 merged into `main` after refreshed GitHub Actions and Vercel checks passed.
- Branch protection API response on June 1, 2026 showed required status checks and admin enforcement, but did not show an approving-review rule.
- Supabase built-in auth email sending is rate-limited; custom SMTP is still required before heavier public signup testing.
- Supabase project is on the Pro plan, so leaked-password protection is supported, but Auth settings mutation is deferred until dashboard access or a Supabase Management API token is available.
- Custom SMTP and a real signup/confirmation smoke are intentionally parked for now.
- Reusable Codex owner/member smoke accounts now exist for saved-view smoke. Their generated passwords are stored outside the repo at `C:\Users\johnh\AppData\Local\PredictSafeBIO\smoke-accounts.json`.
- Command-center and upload smoke used disposable Codex owner/member accounts and task data on June 1, 2026; those older disposable records were cleaned up after smoke.

## Command Center Increment

- `/my-work` is implemented as the focused assigned-work lane for Foundation-generated review tasks.
- `/foundation`, `/my-work`, and `/workbench` now share command navigation, task-card patterns, source trace detail, source-resolution refresh, activity timelines, closeout note display, and My Work handoffs.
- Owner smoke passed locally for `/foundation`, `/my-work`, and `/workbench`: owner can see all smoke tasks and edit assignment/due-date fields.
- Assigned-member smoke passed locally: member can update status, add notes, refresh source resolution, and close assigned tasks, while assignment and due-date fields are hidden.
- Notification smoke passed locally for overdue, blocked, due-soon, ready-for-closure, mark read, mark unread, and mark all read.
- PR #26 merged into `main` at `f7c62cd525c96825e923778669ebd11a396bda3a`.
- Signed-in document upload smoke passed against the private `biotech-documents` bucket using authenticated Supabase storage: uploaded object found, `storage_path` persisted, document detail rendered the uploaded file, draft report decoded, and `/admin/audit` linked back to the smoke document.
- Disposable Codex smoke users, org, tasks, notifications, audit events, upload document rows, and storage objects were cleaned back to zero.
- PR #29 merged the `codex/my-work-priority-filters` slice into `main` at `6853b6e`: My Work KPI cards now deep-link to saved task views, Overdue and High priority saved views are available, urgent priority is filterable, and due-soon/overdue views exclude completed tasks.
- PR #31 merged the `codex/my-work-dashboard-polish` slice into `main`: saved views now show an active-view summary and support sorting by priority, due date, status, and source module.
- PR #33 merged owner-only priority editing to Foundation task update forms while keeping assigned members limited to status, notes, source refresh, and closeout.
- PR #35 merged selected-task bulk status updates. Owners can bulk update visible tasks; assigned members can bulk update only tasks assigned to them, with no bulk assignment, due-date, or priority editing.
- Production route smoke on June 1, 2026 returned `200 OK` for `/foundation`, `/my-work`, `/workbench`, `/documents`, `/admin/audit`, and `/login`.
- Production saved-view route smoke on June 1, 2026 returned `200 OK` for `/my-work?view=high_priority`, `/my-work?view=overdue`, `/my-work?view=blocked`, and `/my-work?view=ready`.
- Reusable smoke org `Codex Reusable Smoke Org` was seeded with five assigned-member Foundation tasks covering high priority, overdue, blocked, ready-for-closure, and normal open work.
- Signed-in production owner/member smoke for `/my-work?view=high_priority`, `/my-work?view=overdue`, `/my-work?view=blocked`, and `/my-work?view=ready` passed on June 1, 2026 after PR #31 promoted. Active saved-view summaries and sort controls rendered; owner assignment/due-date controls were visible; member assignment/due-date controls stayed hidden while status/note controls stayed available.
- Signed-in production owner/member priority-control smoke passed on June 1, 2026 after PR #33 promoted. Owner priority controls were visible; member priority, assignment, and due-date controls stayed hidden while status/note controls stayed available.
- Signed-in production owner/member bulk-control smoke passed on June 1, 2026 after PR #35 promoted. Bulk status controls rendered for selected tasks; no bulk priority, assignment, or due-date controls were exposed.

## v1.1 Demo Hardening

- Signed-in production smoke passed for assessment review updates, audit links, document recommendation history, Markdown report downloads, and admin demo seeding.
- Release `v1.1-demo-hardening` was created from the smoke-tested main commit.
- Visible auth/signup status messages now cover email confirmation, rate-limit, existing-account, and already-signed-in states.
- The smoke-test runbook now includes exact production steps, expected evidence counts, upload checks, and report checks.
- Configure custom SMTP or document the no-SMTP demo limitation clearly.
- Enable the `biotech-documents` storage bucket and add document upload metadata.
- Assessment and document detail pages now include draft-only demo report downloads.

## Next Product Increment Candidates

- v1.2 in progress: assessment register filters, cleaner report sections, explicit LLM draft-assist gate details, and upload/auth hardening follow-up tracking.
- v1.2 route smoke passed for the assessment filter URL, `/documents`, and `/admin/audit`.
- Assessment review workflow is implemented with review status transitions, reviewer notes, and audit events.
- Document recommendation history is implemented for persisted draft recommendation runs.
- Demo report polish is implemented with Markdown downloads, timestamps, IDs, audit references, and MVP boundary text.
- Admin-only demo seed controls are implemented without public destructive reset controls.
- Audit logs now include target links when audit payloads reference an assessment or document.
- Demo seed runs now receive short labels so seeded assessments, documents, and audit events are easier to trace.
- LLM draft-assist remains gated off by default; see `docs/llm-draft-assist-gate.md`.

## Later Product Increments

- Add reviewer assignment and due-date filtering after the basic review workflow is stable.
- Add richer report templates after Markdown exports are verified in demo.
- Add a first LLM draft-assist spike only after deterministic engine, review workflow, and recommendation history tests stay green.
- Add reviewer assignment and due-date filtering after the basic review workflow is smoke-tested.
