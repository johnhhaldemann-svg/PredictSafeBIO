# PredictSafeBIO

PredictSafeBIO is a 30-day MVP foundation for a biotech AI Engine platform. It is built from the local AI Engine artifacts in this folder and keeps deterministic risk scoring ahead of any LLM behavior.

## Source Artifacts

- `my-biotech-ai-engine-platform-blueprint.md`
- `my-biotech-ai-engine-clean-start.json`
- `my-ai-engine-platform-blueprint.md`
- `my-ai-engine-clean-start.json`

The biotech files define the v1 domain. The original AI Engine files preserve proven behavior: deterministic scoring, risk bands, missing-data handling, guarded explanations, escalation, and draft-only AI boundaries.

## AI Memory

Project memory for Codex and human handoff lives in `ai-memory/`. It captures current state, source-of-truth artifacts, key decisions, and next actions. It is documentation only for this MVP phase and must not contain secrets.

## Local Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill Supabase values when connecting a live project.

Install dependencies in the same OS/runtime where commands will run. Do not reuse `node_modules` across Windows, macOS, Linux, or WSL installs. If Linux or WSL tests fail with a missing native package such as `@rolldown/binding-linux-x64-gnu`, reinstall dependencies from inside that Linux/WSL environment before running `npm test`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## MVP Boundary

This is a demo/MVP foundation. It is not a validated FDA, GxP, GLP, GMP, GCP, CLIA, CAP, ISO, OSHA, CDC, NIH, EMA, Part 11, or product-release system. All recommendations remain `Draft - Human Review Required`.
