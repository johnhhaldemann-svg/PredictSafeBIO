# PredictSafeBIO Project State

Last updated: 2026-05-28

## Repository

- GitHub repository: `johnhhaldemann-svg/PredictSafeBIO`
- Visibility: public
- Protected branch: `main`
- Latest main commit verified locally: `d1757cbc0ddc05253f304d6fc1938cb8062ae076`
- PR #9 merged the recovered work from closed-but-unmerged PRs #4, #5, #6, and #7.
- Branch protection was restored to require one approving review after the solo-owner merge workaround.
- The ESLint 10 Dependabot PR was closed because it still fails in the lint toolchain.

## Vercel

- Project: `predictsafe-bio`
- Production URL: `https://predictsafe-bio.vercel.app`
- Production deployment for merge commit `d1757cbc0ddc05253f304d6fc1938cb8062ae076`: `https://vercel.com/johnhhaldemann-5577s-projects/predictsafe-bio/E1fGYfQcUJ6AKBefFTXXudkRe53L`
- Production routes verified with `200 OK`: `/workbench`, `/assessments`, `/company-profile`, `/documents`, `/admin/audit`, and `/login`.

## Supabase

- Project ref: `mygxjnvzdljmdriokvvx`
- Project URL: `https://mygxjnvzdljmdriokvvx.supabase.co`
- Supabase backs auth, organization-scoped persistence, assessment storage, document metadata, recommendations, and audit logs.
- Connector check passed.
- RLS is enabled and policies are present on the eight MVP public tables.

## Current Product State

- Public users can run the deterministic AI Engine in demo mode.
- Signed-in users should be able to onboard, save assessments, create document metadata, persist draft recommendations, and view audit events.
- Real user smoke test is still pending.
- Recommendations remain `Draft - Human Review Required`.
