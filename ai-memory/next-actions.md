# PredictSafeBIO Next Actions

Last updated: 2026-05-28

## Immediate

- Re-enable Supabase email confirmation in Auth provider settings.
- Enable leaked-password protection if available on the current Supabase plan.
- Apply the `biotech-documents` storage migration before testing file uploads.
- Configure custom SMTP before heavier signup testing.
- Run a v1.1 smoke test that includes document upload and report downloads.

## Blockers And Watch Items

- ESLint 10 should remain closed until it is handled as an intentional toolchain upgrade.
- Dependabot PRs for TypeScript, lucide-react, and Node types were merged after refreshed CI/Vercel checks.
- Branch protection currently requires one approving review; solo-owner merges need a temporary settings adjustment or a second authorized reviewer.
- Supabase built-in auth email sending is rate-limited; custom SMTP is required before heavier public signup testing.

## v1.1 Demo Hardening

- Visible auth/signup status messages now cover email confirmation, rate-limit, existing-account, and already-signed-in states.
- The smoke-test runbook now includes exact production steps, expected evidence counts, upload checks, and report checks.
- Configure custom SMTP or document the no-SMTP demo limitation clearly.
- Enable the `biotech-documents` storage bucket and add document upload metadata.
- Assessment and document detail pages now include draft-only demo report downloads.
