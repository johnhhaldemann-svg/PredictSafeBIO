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
- Organization-scoped reads/writes are enforced through profiles.
- Security advisors are clean before each demo.

## Product Boundary

- No LLM calls are enabled.
- Deterministic engine tests pass before demo.
- All assessment and document recommendations remain draft-only.
- Human review is required before operational use.
