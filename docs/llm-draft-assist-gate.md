# LLM Draft-Assist Gate

PredictSafeBIO does not call an LLM in the current MVP or v1.1 increment. Deterministic AI Engine behavior remains the controlling path for risk scoring, confidence, escalation, missing-data detection, and draft recommendations.

## Allowed Future Behavior

- Draft text suggestions for assessment reviewer notes.
- Draft document update wording based on already persisted document metadata and deterministic recommendations.
- Human-readable summaries of existing audit and recommendation history.
- Clear `Draft - Human Review Required` labels on every generated output.
- Optional report wording polish for already computed deterministic results, with no scoring or risk-band changes.

## Blocked Behavior

- No final quality, biosafety, clinical, regulatory, release, or approval decisions.
- No FDA, GxP, GLP, GMP, GCP, CLIA, CAP, ISO, OSHA, CDC, NIH, EMA, Part 11, or validation claims.
- No diagnosis, patient-specific advice, or clinical recommendations.
- No replacement of deterministic scoring, escalation, missing-data detection, or human review.
- No autonomous persistence of LLM output without a signed-in user action and audit event.
- No use of uploaded document contents until storage access, redaction expectations, and audit boundaries are separately reviewed.

## Feature Flag Placeholder

- Environment variable: `NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST`
- Default: unset or `false`
- Current implementation state: no LLM calls, no provider keys, no model routing, and no UI entrypoint.
- Future implementation must keep deterministic assessment output as the source of truth and treat LLM text as optional draft wording only.

## Audit Requirements

- Record who requested draft assistance, when it was requested, and which assessment/document ID was used.
- Store the deterministic input/output snapshot reference used to produce the draft.
- Store whether the draft was accepted into reviewer notes or document update text.
- Keep every persisted draft labeled `Draft - Human Review Required`.
- Never record provider secrets, raw API keys, or unrelated user/session data in audit payloads.

## Gate Criteria Before Implementation

- Deterministic engine tests are green.
- Assessment review workflow tests are green.
- Document recommendation history tests are green.
- Demo report boundary tests are green.
- Supabase RLS and same-org access checks pass.
- Signed-in upload smoke is complete or explicitly out of scope for the spike.
- A feature flag keeps LLM draft assist off by default.
- Release notes and `ai-memory/next-actions.md` identify the spike as draft-assist only.

## Default

`NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST` is unset or `false`. LLM draft assist remains disabled.
