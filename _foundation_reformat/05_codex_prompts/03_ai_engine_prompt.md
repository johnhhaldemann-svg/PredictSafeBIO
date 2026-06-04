# AI Engine Prompt

Extend the deterministic PredictSafeBIO AI Engine without replacing the scoring authority.

## Required Inputs

- Company profile
- Primary BioType
- Secondary BioTypes
- Applicability rules
- Evidence map gaps
- Change impact summaries
- Audit readiness score
- Source records and reference rule IDs

## Required Behavior

- Merge primary and secondary BioType requirements without duplicates.
- Add BioType documents, records, training, and risk drivers to deterministic context.
- Raise missing-information findings when BioType evidence is absent.
- Add source traceability to every recommendation.
- Keep LLM draft-assist disabled unless explicitly gated later.

## Guardrails

Draft AI recommendation - human review required. This does not certify compliance, approve documents, close CAPAs, validate systems, or replace qualified review.
