# PredictSafeBIO Next Actions

Last updated: 2026-05-28

## Immediate

- Open one recovery PR from `codex/recover-demo-foundation`.
- Confirm the recovery PR replaces closed-but-unmerged PRs #4, #5, #6, and #7.
- Run local verification: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- Confirm GitHub CI and Vercel preview pass.
- Get approval from a different authorized GitHub account so protected `main` can merge.

## After Merge

- Pull `main` locally.
- Confirm production deploy from `main`.
- Verify production routes: `/workbench`, `/assessments`, `/company-profile`, `/documents`, `/admin/audit`, and `/login`.
- Run a real auth and onboarding smoke test.
- Save one assessment, create one document metadata record, persist draft recommendations, and confirm audit events.

## Blockers And Watch Items

- Supabase connector may need reauthentication before advisor checks can be rerun.
- PR #3 should remain closed until ESLint 10 and related major app dependency upgrades are handled intentionally.
- PR #1 and PR #2 can be reviewed later as separate GitHub Actions maintenance updates.
