# PredictSafeBIO Project State

Last updated: 2026-05-28

## Repository

- GitHub repository: `johnhhaldemann-svg/PredictSafeBIO`
- Visibility: public
- Protected branch: `main`
- Latest main commit verified locally: `db1c3500e04c474013e252e837cf1a405cad2ee5`
- PR #9 recovered the closed-but-unmerged MVP foundation work from PRs #4, #5, #6, and #7.
- PR #15 fixed Supabase auth confirmation callbacks for both PKCE `code` links and `token_hash` links.
- Branch protection is restored to require one approving review.
- ESLint 10 remains closed because it still fails in the lint toolchain.

## Vercel

- Project: `predictsafe-bio`
- Production URL: `https://predictsafe-bio.vercel.app`
- Production routes verified with `200 OK`: `/workbench`, `/assessments`, `/company-profile`, `/documents`, `/admin/audit`, and `/login`.
- Latest verified CI run on `main`: `26583182299`.

## Supabase

- Project ref: `mygxjnvzdljmdriokvvx`
- Project URL: `https://mygxjnvzdljmdriokvvx.supabase.co`
- Supabase backs auth, organization-scoped persistence, assessment storage, document metadata, recommendations, and audit logs.
- Smoke-test evidence: 1 user, 1 profile, 1 company profile, 1 assessment, 2 assessment signals, 1 document, 6 draft recommendations, and 4 audit events.
- RLS is enabled and policies are present on the eight MVP public tables.
- Security advisor warning: leaked password protection is disabled.
- Performance advisor notes: unused early-demo indexes and Auth DB connection strategy informational items.

## Current Product State

- Public users can run the deterministic AI Engine in demo mode.
- Signed-in users can onboard, save assessments, create document metadata, persist draft recommendations, and view audit events.
- Real user smoke test passed.
- Email confirmation was temporarily disabled during smoke testing because built-in Supabase auth email sending hit the project throttle.
- Re-enable email confirmation after testing; configure custom SMTP before heavier signup testing.
- Recommendations remain `Draft - Human Review Required`.
