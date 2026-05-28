# PredictSafeBIO Next Actions

Last updated: 2026-05-28

## Immediate

- Re-enable Supabase email confirmation in Auth provider settings.
- Enable leaked-password protection if available on the current Supabase plan.
- Test a signed-in upload now that the `biotech-documents` storage migration is applied.
- Configure custom SMTP before heavier signup testing.
- Run a v1.1 smoke test that includes document upload and report downloads.
- Create release tag `v1.1-demo-hardening` only after upload smoke and auth hardening status are verified.

## Blockers And Watch Items

- ESLint 10 should remain closed until it is handled as an intentional toolchain upgrade.
- Dependabot PRs for TypeScript, lucide-react, and Node types were merged after refreshed CI/Vercel checks.
- Branch protection currently requires one approving review; solo-owner merges need a temporary settings adjustment or a second authorized reviewer.
- Supabase built-in auth email sending is rate-limited; custom SMTP is required before heavier public signup testing.
- Local `.env.local` has no service-role key or database URL, so automated signed-in storage smoke requires either a real browser session or temporary test credentials.

## v1.1 Demo Hardening

- Visible auth/signup status messages now cover email confirmation, rate-limit, existing-account, and already-signed-in states.
- The smoke-test runbook now includes exact production steps, expected evidence counts, upload checks, and report checks.
- Configure custom SMTP or document the no-SMTP demo limitation clearly.
- Enable the `biotech-documents` storage bucket and add document upload metadata.
- Assessment and document detail pages now include draft-only demo report downloads.

## Next Product Increment Candidates

- Assessment review workflow is implemented with review status transitions, reviewer notes, and audit events.
- Document recommendation history is implemented for persisted draft recommendation runs.
- Demo report polish is implemented with Markdown downloads, timestamps, IDs, audit references, and MVP boundary text.
- Admin-only demo seed controls are implemented without public destructive reset controls.
- LLM draft-assist remains gated off by default; see `docs/llm-draft-assist-gate.md`.

## Later Product Increments

- Add reviewer assignment and due-date filtering after the basic review workflow is stable.
- Add richer report templates after Markdown exports are verified in demo.
- Add a first LLM draft-assist spike only after deterministic engine, review workflow, and recommendation history tests stay green.
- Run signed-in product smoke for review status updates, recommendation history, reports, and demo seeding after deployment.
