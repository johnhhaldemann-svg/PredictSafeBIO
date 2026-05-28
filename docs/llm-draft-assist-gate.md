# LLM Draft-Assist Gate

PredictSafeBIO does not call an LLM in the current MVP or v1.1 increment. Deterministic AI Engine behavior remains the controlling path for risk scoring, confidence, escalation, missing-data detection, and draft recommendations.

## Allowed Future Behavior

- Draft text suggestions for assessment reviewer notes.
- Draft document update wording based on already persisted document metadata and deterministic recommendations.
- Human-readable summaries of existing audit and recommendation history.
- Clear `Draft - Human Review Required` labels on every generated output.

## Blocked Behavior

- No final quality, biosafety, clinical, regulatory, release, or approval decisions.
- No FDA, GxP, GLP, GMP, GCP, CLIA, CAP, ISO, OSHA, CDC, NIH, EMA, Part 11, or validation claims.
- No diagnosis, patient-specific advice, or clinical recommendations.
- No replacement of deterministic scoring, escalation, missing-data detection, or human review.

## Gate Criteria Before Implementation

- Deterministic engine tests are green.
- Assessment review workflow tests are green.
- Document recommendation history tests are green.
- Supabase RLS and same-org access checks pass.
- A feature flag keeps LLM draft assist off by default.

## Default

`NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST` is unset or `false`. LLM draft assist remains disabled.
