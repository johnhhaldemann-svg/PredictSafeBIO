# Production Readiness Checklist

This checklist is for MVP/demo readiness only. It is not a validation plan for FDA, GxP, or Part 11 production use.

## GitHub

- Repository is public so branch protection is available.
- `main` requires pull requests, one review, passing CI, and up-to-date branches.
- Force pushes and branch deletions are disabled.
- CI runs install, lint, typecheck, tests, and build.

## Vercel

- Project `predictsafe-bio` is connected to GitHub.
- Preview deployments run on PRs.
- Production deploys from `main`.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured.

## Supabase

- RLS remains enabled on all public MVP tables.
- Auth uses Supabase email/password for MVP.
- Email confirmation should be re-enabled when the deferred Auth hardening pass resumes.
- Custom SMTP is required before heavier signup testing because built-in Supabase auth email is rate-limited.
- Leaked-password protection should be enabled when dashboard/API Auth settings access is available.
- Password recovery is exposed through `/forgot-password` and `/account/password`; verify the reset email redirect after any Auth URL or SMTP change.
- Auth hardening checklist and real-inbox smoke steps live in `docs/auth-hardening-runbook.md`.
- Organization-scoped reads/writes are enforced through profiles.
- The private `biotech-documents` bucket and storage policies are applied before testing file uploads.
- Signed-in upload smoke has confirmed `storage_bucket` and `storage_path` persist on document metadata; repeat before any storage-policy or upload-flow change.
- Security advisors are reviewed before each demo; any warning is recorded with an owner and reason.

## Product Boundary

- No LLM calls are enabled.
- Deterministic engine tests pass before demo.
- All assessment and document recommendations remain draft-only.
- Human review is required before operational use.
- Demo report downloads are convenience exports only, not controlled records.
