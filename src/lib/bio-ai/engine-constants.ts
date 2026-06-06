/**
 * engine-constants.ts
 *
 * Typed constants derived from the biotech AI engine clean-start spec.
 * Used by AiEngineMemoryExplorer and any other UI that needs to display
 * or inspect the engine's core rules without importing raw JSON.
 */

// ── Risk model ────────────────────────────────────────────────────────────────

export const RISK_BANDS = [
  {
    level: "low" as const,
    scoreRange: "0–40",
    timeframe: "Routine",
    defaultAction: "Continue monitoring and document routine controls.",
  },
  {
    level: "moderate" as const,
    scoreRange: "41–60",
    timeframe: "Same day",
    defaultAction: "Review controls, missing data, and owner follow-up.",
  },
  {
    level: "high" as const,
    scoreRange: "61–80",
    timeframe: "Before continuing",
    defaultAction:
      "Escalate to responsible owner and verify controls before work, batch, study, or change continues.",
  },
  {
    level: "critical" as const,
    scoreRange: "81–100",
    timeframe: "Immediate",
    defaultAction:
      "Recommend immediate human review and possible hold, quarantine, stop-use, stop-work, or escalation evaluation.",
  },
] as const;

export const SCORE_WEIGHTS: { label: string; weight: number }[] = [
  { label: "Severity", weight: 0.35 },
  { label: "Likelihood", weight: 0.2 },
  { label: "Exposure or scope", weight: 0.15 },
  { label: "Control gap", weight: 0.15 },
  { label: "Data integrity / confidence concern", weight: 0.15 },
];

// ── Domain objects ────────────────────────────────────────────────────────────

export const DOMAIN_OBJECTS = [
  "organization",
  "site",
  "lab",
  "cleanroom or suite",
  "manufacturing area",
  "program",
  "product candidate",
  "study",
  "batch or lot",
  "sample",
  "assay",
  "instrument or equipment",
  "SOP",
  "training record",
  "deviation",
  "CAPA",
  "change control",
  "audit finding",
  "environmental monitoring event",
  "biosafety incident",
  "supplier or material",
  "document",
  "risk assessment",
] as const;

export type DomainObject = (typeof DOMAIN_OBJECTS)[number];

// ── Non-negotiable rules ──────────────────────────────────────────────────────

export const NON_NEGOTIABLE_RULES: string[] = [
  "Patient safety, worker safety, biosafety, and product quality come before speed or cost.",
  "Compliance is the floor, not the ceiling.",
  "Missing data must be shown clearly.",
  "High and critical risk must be escalated.",
  "Critical risk should recommend immediate human review and possible hold, quarantine, stop-use, stop-work, or escalation evaluation.",
  "AI assists scientists, QA, EHS, biosafety, manufacturing, and regulatory professionals. It does not replace them.",
  "Do not invent regulatory citations.",
  "Do not claim GMP, GLP, GCP, FDA, EMA, OSHA, CDC, NIH, ISO, CAP, CLIA, or other compliance unless verified source material is provided.",
  "Do not diagnose, provide medical advice, approve clinical decisions, or certify product release.",
];

// ── Guardrails ────────────────────────────────────────────────────────────────

export const GUARDRAIL_NEVER_SAY: string[] = [
  "This batch is released.",
  "This product is safe.",
  "This study is compliant.",
  "This deviation is closed.",
  "This CAPA is adequate.",
  "This SOP is approved.",
  "This change is approved.",
  "This data is valid for submission.",
  "This clinical decision is appropriate.",
  "Compliance is guaranteed.",
];

export const GUARDRAIL_ALLOWED_LANGUAGE: string[] = [
  "Based on available data.",
  "Potential risk.",
  "Needs QA review.",
  "Needs biosafety review.",
  "Needs responsible-scientist review.",
  "Missing information includes…",
  "Suggested draft next steps.",
  "Consider hold or quarantine review.",
  "Consider stop-use review.",
  "This does not replace quality, regulatory, biosafety, clinical, or scientific judgment.",
];

// ── Escalation overrides ──────────────────────────────────────────────────────

export const ESCALATION_OVERRIDES: string[] = [
  "Potential patient-impacting quality issue becomes at least high.",
  "Confirmed or suspected product contamination becomes critical until assessed by QA or quality unit.",
  "Biosafety exposure, release, spill, sharps injury, aerosol event, or containment breach becomes at least high and may become critical.",
  "Missing chain of custody for critical samples becomes high or critical depending on impact.",
  "Data integrity concern affecting release, study endpoint, regulatory submission, or batch record becomes high or critical.",
  "Critical equipment out of tolerance affecting active work becomes high or critical.",
  "Unapproved change affecting validated process, method, system, assay, cleanroom, or batch becomes high.",
  "Expired training for critical GxP, biosafety, cleanroom, or assay work increases risk by one band.",
  "Missing SOP, missing approval, missing deviation, missing CAPA, or overdue CAPA on high-risk work increases risk by one band.",
  "Repeat deviation pattern across batches, studies, instruments, teams, or sites increases likelihood and confidence.",
];

// ── Engine metadata ───────────────────────────────────────────────────────────

export const ENGINE_META = {
  name: "My Biotech AI Engine",
  version: "bio-clean-start-v1",
  generatedDate: "2026-05-27",
  domain: "biotech",
} as const;
