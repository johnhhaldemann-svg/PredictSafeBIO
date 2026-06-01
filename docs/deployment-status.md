# Deployment Status

Last checked: 2026-06-01

## Vercel

- Project: `predictsafe-bio`
- Production URL: `https://predictsafe-bio.vercel.app`
- Latest main commit verified locally after command-center/My Work memory update: `180612e`
- Latest passing CI run on `main`: `26583182299`

Production routes verified with `200 OK`:

- `/workbench`
- `/foundation`
- `/my-work`
- `/assessments`
- `/assessments?review=reviewed_monitoring&level=critical&reviewer=reviewed`
- `/company-profile`
- `/documents`
- `/admin/audit`
- `/admin/demo`
- `/login`

## Supabase

- Project ref: `mygxjnvzdljmdriokvvx`
- URL: `https://mygxjnvzdljmdriokvvx.supabase.co`
- Applied migrations include `enable_auth_onboarding` and `enable_document_storage`.
- Private bucket `biotech-documents` exists and is not public.
- Storage policies present: select, insert, update, and delete for `authenticated` users scoped by organization path.
- Storage verification on 2026-06-01: signed-in private-bucket upload smoke passed, `storage_path` persisted, the uploaded object was found, document detail rendered the linked file, draft report download decoded, and `/admin/audit` linked back to the smoke document. Disposable smoke rows and storage objects were cleaned back to zero after verification.
- Supabase connector check passed.
- RLS is enabled and policies are present on the eight MVP public tables.
- Real smoke-test evidence: 1 user, 1 profile, 1 company profile, 1 assessment, 2 assessment signals, 1 document, 6 draft recommendations, and 4 audit events.
- All 6 document recommendations are labeled `Draft - Human Review Required`.
- Security advisor currently reports leaked password protection disabled.
- Performance advisor reports informational unused-index/Auth-connection notes.
- Email confirmation was temporarily disabled during smoke testing due to the built-in email throttle; owner chose to defer the SMTP/Auth hardening pass for now.
- Custom SMTP and leaked-password protection remain recommended before heavier public signup testing.

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
- Created release `v1.1-demo-hardening` from commit `c49c54c76bb15cb395574c3f72dae90f4898f801`.
- Restored required approving reviews to `1` after solo-owner merge workarounds.

Remaining / Deferred:

- Re-enable email confirmation when SMTP/Auth hardening resumes.
- Enable leaked-password protection when dashboard/API Auth settings access is available.
- Configure custom SMTP before heavier public signup testing.
- Run one real signup/confirmation smoke after custom SMTP is configured.
- Assessment review workflow migration has been applied and verified.
- PR #21 merged audit target links, short demo seed labels, and additional workflow helper tests.
- PR #23 merged assessment register filters, report polish, and expanded LLM draft-assist gate detail.
- PR #26 merged the connected Foundation / My Work / Workbench command-center increment.
- PR #27 recorded the command-center smoke results in memory.
- Signed-in product smoke passed: review status updates saved reviewer notes and audit events, audit links opened target records, document recommendation history and Markdown report download worked, and `/admin/demo` seeded labeled demo records.
- Signed-in command-center smoke passed locally: owner `/foundation`, `/my-work`, and `/workbench`; assigned-member status/note/closeout behavior; notification read/unread and mark-all-read actions.
- Signed-in document upload smoke passed locally against `biotech-documents`; disposable smoke records and objects were cleaned afterward.
- Demo seed evidence: `Demo seed 6e0c12c4`, assessment `362e02bb-8a11-48f1-933c-1fddbacbf7cd`, document `e425c0c4-42fd-48df-87ab-648f9a4191c2`.
- v1.2 route smoke passed for `/assessments` filter URL, `/documents`, and `/admin/audit`; Supabase dashboard auth hardening remains deferred.
- Keep LLM draft assist disabled unless the gate in `docs/llm-draft-assist-gate.md` is intentionally opened later.
- Keep ESLint 10 closed until the lint toolchain is intentionally upgraded.
