# PredictSafeBIO Next Actions

Last updated: 2026-06-01

## Immediate

- Open a draft PR for `codex/map-aligned-platform` and let CI/Vercel verify the command-center increment.
- Re-enable Supabase email confirmation in Auth provider settings.
- Enable leaked-password protection if available on the current Supabase plan.
- Test a signed-in upload now that the `biotech-documents` storage migration is applied.
- Configure custom SMTP before heavier signup testing.
- Run the remaining v1.2 signed-in browser smoke for document upload and polished report downloads.

## Blockers And Watch Items

- ESLint 10 should remain closed until it is handled as an intentional toolchain upgrade.
- Dependabot PRs for TypeScript, lucide-react, and Node types were merged after refreshed CI/Vercel checks.
- Branch protection currently requires one approving review; solo-owner merges need a temporary settings adjustment or a second authorized reviewer.
- Supabase built-in auth email sending is rate-limited; custom SMTP is required before heavier public signup testing.
- Connector checks confirm the `biotech-documents` bucket is private and policies exist, but object count and persisted `storage_path` count are still `0`.
- Automated signed-in storage smoke requires either a real browser session or temporary test credentials.
- Command-center smoke used disposable Codex owner/member accounts and task data on June 1, 2026; those records can be cleaned later if demo data hygiene becomes important.

## Command Center Increment

- `/my-work` is implemented as the focused assigned-work lane for Foundation-generated review tasks.
- `/foundation`, `/my-work`, and `/workbench` now share command navigation, task-card patterns, source trace detail, source-resolution refresh, activity timelines, closeout note display, and My Work handoffs.
- Owner smoke passed locally for `/foundation`, `/my-work`, and `/workbench`: owner can see all smoke tasks and edit assignment/due-date fields.
- Assigned-member smoke passed locally: member can update status, add notes, refresh source resolution, and close assigned tasks, while assignment and due-date fields are hidden.
- Notification smoke passed locally for overdue, blocked, due-soon, ready-for-closure, mark read, mark unread, and mark all read.

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
