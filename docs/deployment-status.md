# Deployment Status

Last checked: 2026-05-27

## Vercel

- Project: `predictsafe-bio`
- Production URL: `https://predictsafe-bio.vercel.app`
- Production deployment: `dpl_D7tYrecww4ReZ6BpoqX5oBjWwf9U`
- Preview URL: `https://predictsafe-cwzxgl2xp-johnhhaldemann-5577s-projects.vercel.app`
- Preview deployment: `dpl_FT2Eou5Ttca75YBSPCrfpwXcc2Um`

Production routes verified with `200 OK`:

- `/workbench`
- `/assessments`
- `/company-profile`
- `/documents`
- `/admin/audit`
- `/login`

The preview deployment is `Ready` by `vercel inspect`, but Vercel Authentication protects the preview URL, so unauthenticated route checks return `401 Unauthorized`.

## Supabase

- Project ref: `mygxjnvzdljmdriokvvx`
- URL: `https://mygxjnvzdljmdriokvvx.supabase.co`
- Applied migrations include `enable_auth_onboarding`.
- Security advisors were clean after the onboarding RLS migration.

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
