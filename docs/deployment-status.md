# Deployment Status

Last checked: 2026-05-28

## Vercel

- Project: `predictsafe-bio`
- Production URL: `https://predictsafe-bio.vercel.app`
- Production deployment: `https://vercel.com/johnhhaldemann-5577s-projects/predictsafe-bio/E1fGYfQcUJ6AKBefFTXXudkRe53L`
- Production commit: `d1757cbc0ddc05253f304d6fc1938cb8062ae076`

Production routes verified with `200 OK`:

- `/workbench`
- `/assessments`
- `/company-profile`
- `/documents`
- `/admin/audit`
- `/login`

The production deployment for PR #9 is complete and public route checks return `200 OK`.

## Supabase

- Project ref: `mygxjnvzdljmdriokvvx`
- URL: `https://mygxjnvzdljmdriokvvx.supabase.co`
- Applied migrations include `enable_auth_onboarding`.
- Supabase connector check passed.
- RLS is enabled and policies are present on the eight MVP public tables.

## GitHub

Repository: `https://github.com/johnhhaldemann-svg/PredictSafeBIO`
Visibility: public

Completed:

- Created private `PredictSafeBIO` repository.
- Changed repository visibility to public so branch protection can be enforced without GitHub Pro.
- Pushed local `main`.
- Verified GitHub Actions CI on `main`.
- Connected the GitHub repository to Vercel.
- Protected `main` with required PR review, stale review dismissal, required CI, no force pushes, and no deletions.
- Merged PR #9 to recover the demo-ready MVP foundation and AI memory folder.
- Restored required approving reviews to `1` after the solo-owner merge workaround.

Remaining:

- Run the real authenticated production smoke test.
- Tag the MVP demo release after smoke test passes.
