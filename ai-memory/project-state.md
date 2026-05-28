# PredictSafeBIO Project State

Last updated: 2026-05-28

## Repository

- GitHub repository: `johnhhaldemann-svg/PredictSafeBIO`
- Visibility: public
- Protected branch: `main`
- Current recovery branch: `codex/recover-demo-foundation`
- This branch recovers closed-but-unmerged work from PR #4, #5, #6, and #7.
- PR #3 is intentionally excluded because the grouped major dependency update failed CI on ESLint 10.
- PR #1 and PR #2 are intentionally excluded and can be handled later as separate GitHub Actions maintenance.

## Vercel

- Project: `predictsafe-bio`
- Production URL: `https://predictsafe-bio.vercel.app`
- Git integration is connected to GitHub.
- Production deploys should be triggered by merges to `main`.

## Supabase

- Project ref: `mygxjnvzdljmdriokvvx`
- Project URL: `https://mygxjnvzdljmdriokvvx.supabase.co`
- Supabase backs auth, organization-scoped persistence, assessment storage, document metadata, recommendations, and audit logs.
- Connector access may need reauthentication before advisor checks can be rerun.

## Current Product State

- Public users can run the deterministic AI Engine in demo mode.
- Signed-in users should be able to onboard, save assessments, create document metadata, persist draft recommendations, and view audit events once the recovered PR lands on `main`.
- Recommendations remain `Draft - Human Review Required`.
