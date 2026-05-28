# PredictSafeBIO Project State

Last updated: 2026-05-28

## Repository

- GitHub repository: `johnhhaldemann-svg/PredictSafeBIO`
- Visibility: public
- Protected branch: `main`
- Latest main commit verified locally after review workflow UX polish: `90e97956cb3dbd943c8229620ebc6c2feca91bf8`
- PR #9 recovered the closed-but-unmerged MVP foundation work from PRs #4, #5, #6, and #7.
- PR #15 fixed Supabase auth confirmation callbacks for both PKCE `code` links and `token_hash` links.
- PR #21 added audit target links, short demo seed labels, and workflow helper tests.
- Branch protection is restored to require one approving review.
- Dependency PRs #10, #12, and #13 were merged one at a time after refreshed CI and Vercel checks.
- ESLint 10 remains closed because it still fails in the lint toolchain.

## Vercel

- Project: `predictsafe-bio`
- Production URL: `https://predictsafe-bio.vercel.app`
- Production routes verified with `200 OK`: `/workbench`, `/assessments`, `/company-profile`, `/documents`, `/admin/audit`, `/admin/demo`, and `/login`.
- Latest verified CI run on `main`: `26583182299`.

## Supabase

- Project ref: `mygxjnvzdljmdriokvvx`
- Project URL: `https://mygxjnvzdljmdriokvvx.supabase.co`
- Supabase backs auth, organization-scoped persistence, assessment storage, document metadata, recommendations, and audit logs.
- Smoke-test evidence: 1 user, 1 profile, 1 company profile, 1 assessment, 2 assessment signals, 1 document, 6 draft recommendations, and 4 audit events.
- RLS is enabled and policies are present on the eight MVP public tables.
- Security advisor warning: leaked password protection is disabled.
- Performance advisor notes: unused early-demo indexes and Auth DB connection strategy informational items.
- Storage migration `enable_document_storage` has been applied.
- Private bucket `biotech-documents` exists with four authenticated-only storage policies for select, insert, update, and delete.
- Storage object count is currently 0; signed-in upload smoke remains pending because local `.env.local` does not contain a service-role key or database URL.

## Current Product State

- Public users can run the deterministic AI Engine in demo mode.
- Signed-in users can onboard, save assessments, create document metadata, persist draft recommendations, and view audit events.
- Real user smoke test passed.
- Email confirmation was temporarily disabled during smoke testing because built-in Supabase auth email sending hit the project throttle.
- Re-enable email confirmation after testing; configure custom SMTP before heavier signup testing.
- v1.1 hardening adds clearer auth messages, optional document file upload metadata, and draft-only demo report downloads.
- Auth hardening still needs dashboard confirmation: re-enable email confirmation, enable leaked-password protection if available, and configure custom SMTP before heavier signup testing.
- Current product increment adds assessment review workflow, document recommendation history, Markdown demo reports, signed-in demo seed operations, and an explicit LLM draft-assist gate.
- Supabase migration `assessment_review_workflow` has been applied; `assessments` now includes reviewer notes, reviewer identity, reviewed timestamp, and constrained review statuses.
- Signed-in v1.1 smoke passed in production: review status changes saved reviewer notes, `human_review_status_changed` audit links opened the assessment, document recommendation history and report download worked, and `/admin/demo` seeded labeled demo assessment/document/audit records.
- Demo seed evidence: `Demo seed 6e0c12c4`, assessment `362e02bb-8a11-48f1-933c-1fddbacbf7cd`, document `e425c0c4-42fd-48df-87ab-648f9a4191c2`.
- Recommendations remain `Draft - Human Review Required`.
