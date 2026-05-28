# PredictSafeBIO Next Actions

Last updated: 2026-05-28

## Immediate

- Re-enable Supabase email confirmation in Auth provider settings.
- Create the `mvp-demo-foundation` GitHub release tag from `main`.
- Keep the smoke-test account flow documented without secrets.
- Start a v1.1 demo hardening branch.

## Blockers And Watch Items

- ESLint 10 should remain closed until it is handled as an intentional toolchain upgrade.
- Individual Dependabot PRs for TypeScript, lucide-react, and Node types are green but should be reviewed separately.
- Branch protection currently requires one approving review; solo-owner merges need a temporary settings adjustment or a second authorized reviewer.
- Supabase built-in auth email sending is rate-limited; custom SMTP is required before heavier public signup testing.

## v1.1 Demo Hardening

- Improve visible auth/signup status messages for email confirmation and rate-limit cases.
- Add a smoke-test runbook with exact production steps and expected Supabase evidence counts.
- Configure custom SMTP or document the no-SMTP demo limitation clearly.
- Enable the `biotech-documents` storage bucket and add document upload metadata.
- Add assessment/document export or a shareable demo report.
