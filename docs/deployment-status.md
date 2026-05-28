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

GitHub CLI is installed, but the local CLI is not authenticated yet. The connected GitHub app identity is `johnhhaldemann-svg`, but it has no repository installations available in this workspace.

After GitHub auth is completed, finish:

1. Create the `PredictSafeBIO` repository.
2. Push local `main`.
3. Verify GitHub Actions CI.
4. Apply protected `main` settings from `docs/github-branch-protection.md`.
5. Connect the GitHub repository to Vercel for automatic preview deployments.
