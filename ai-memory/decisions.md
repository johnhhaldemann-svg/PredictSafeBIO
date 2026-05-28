# PredictSafeBIO Decisions

Last updated: 2026-05-28

## Product And Engine

- The first product screen is the AI Engine Workbench, not a marketing page.
- The engine remains deterministic before any LLM behavior is introduced.
- Missing data must lower confidence and appear clearly in assessment output.
- Escalation overrides can raise risk when critical biotech signals are present.
- All recommendations are guarded and labeled `Draft - Human Review Required`.

## Platform

- Supabase is the system of record for auth, organizations, profiles, assessments, documents, recommendations, and audit events.
- Data access is organization-scoped by default.
- Public users keep demo fallback behavior, but signed-in users use live Supabase persistence.
- Vercel is the deployment target.
- GitHub Actions CI gates protected `main`.

## Governance

- `main` remains protected.
- Admin bypass merges should not be used for normal MVP work.
- Closed-but-unmerged PRs should be recovered through a clean replacement PR rather than merged directly.
- Major app dependency updates should not be grouped with routine minor and patch updates.

## AI Memory

- `ai-memory/` is repo memory for Codex and human handoff.
- It is not a runtime memory system and is not backed by Supabase in this MVP phase.
- It must not contain secrets, service-role keys, private tokens, or personal test credentials.
