# Deployment Status

Last checked: 2026-05-28

## Vercel

- Project: `predictsafe-bio`
- Production URL: `https://predictsafe-bio.vercel.app`
- Latest production commit verified locally after dependency merges: `590e99b`
- Latest passing CI run on `main`: `26583182299`

Production routes verified with `200 OK`:

- `/workbench`
- `/assessments`
- `/company-profile`
- `/documents`
- `/admin/audit`
- `/login`

## Supabase

- Project ref: `mygxjnvzdljmdriokvvx`
- URL: `https://mygxjnvzdljmdriokvvx.supabase.co`
- Applied migrations include `enable_auth_onboarding`.
- Next migration adds private `biotech-documents` storage bucket policies for document upload testing.
- Supabase connector check passed.
- RLS is enabled and policies are present on the eight MVP public tables.
- Real smoke-test evidence: 1 user, 1 profile, 1 company profile, 1 assessment, 2 assessment signals, 1 document, 6 draft recommendations, and 4 audit events.
- All 6 document recommendations are labeled `Draft - Human Review Required`.
- Security advisor currently reports leaked password protection disabled.
- Performance advisor reports informational unused-index/Auth-connection notes.
- Email confirmation was temporarily disabled during smoke testing due to the built-in email throttle; custom SMTP is required before heavier signup testing.

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
- Merged PR #15 to fix Supabase auth confirmation flow.
- Merged dependency PRs #12, #13, and #10 one at a time after refreshed CI and Vercel checks.
- Created release `mvp-demo-foundation`.
- Restored required approving reviews to `1` after solo-owner merge workarounds.

Remaining:

- Re-enable email confirmation after smoke testing.
- Enable leaked-password protection if available on the current Supabase plan.
- Configure custom SMTP before heavier public signup testing.
- Apply and verify the document storage migration before upload demos.
- Keep ESLint 10 closed until the lint toolchain is intentionally upgraded.
