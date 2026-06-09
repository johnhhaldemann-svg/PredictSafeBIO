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
      "Escalate to responsible owner and verify controls before work, task, or change continues.",
  },
  {
    level: "critical" as const,
    scoreRange: "81–100",
    timeframe: "Immediate",
    defaultAction:
      "Recommend immediate human review and possible stop-work, isolation, lockout, or escalation evaluation.",
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
  "operating area",
  "program",
  "task or activity",
  "sample",
  "instrument or equipment",
  "SOP or safe-work procedure",
  "training record",
  "hazard",
  "incident or near miss",
  "corrective / preventive action",
  "change control",
  "inspection or audit finding",
  "exposure or environmental monitoring event",
  "biosafety incident",
  "chemical or material",
  "document",
  "risk assessment",
] as const;

export type DomainObject = (typeof DOMAIN_OBJECTS)[number];

// ── Non-negotiable rules ──────────────────────────────────────────────────────

export const NON_NEGOTIABLE_RULES: string[] = [
  "Worker safety, biosafety, and environmental protection come before speed or cost.",
  "Compliance is the floor, not the ceiling.",
  "Missing data must be shown clearly.",
  "High and critical risk must be escalated.",
  "Critical risk should recommend immediate human review and possible stop-work, evacuation, isolation, or escalation evaluation.",
  "AI assists EHS, biosafety, industrial hygiene, and safety professionals. It does not replace them.",
  "Do not invent regulatory citations.",
  "Do not claim OSHA, EPA, NIH, CDC, ISO 45001, ISO 14001, or other compliance unless verified source material is provided.",
  "Do not diagnose, provide medical advice, or certify that a hazard, area, or task is safe.",
];

// ── Guardrails ────────────────────────────────────────────────────────────────

export const GUARDRAIL_NEVER_SAY: string[] = [
  "This area is safe.",
  "This task is safe to proceed.",
  "This exposure is within limits.",
  "This hazard is controlled.",
  "This corrective action is closed.",
  "This corrective/preventive action is adequate.",
  "This SOP is approved.",
  "This change is approved.",
  "This incident is fully investigated.",
  "Compliance is guaranteed.",
];

export const GUARDRAIL_ALLOWED_LANGUAGE: string[] = [
  "Based on available data.",
  "Potential risk.",
  "Needs EHS review.",
  "Needs biosafety review.",
  "Needs industrial hygiene review.",
  "Missing information includes…",
  "Suggested draft next steps.",
  "Consider stop-work review.",
  "Consider isolation or lockout review.",
  "This does not replace EHS, biosafety, industrial hygiene, or qualified safety judgment.",
];

// ── Escalation overrides ──────────────────────────────────────────────────────

export const ESCALATION_OVERRIDES: string[] = [
  "Potential serious worker injury or environmental release becomes at least high.",
  "Confirmed or suspected contamination or uncontained release becomes critical until assessed by EHS or biosafety.",
  "Biosafety exposure, release, spill, sharps injury, aerosol event, or containment breach becomes at least high and may become critical.",
  "Missing chain of custody for critical samples becomes high or critical depending on impact.",
  "Data integrity concern affecting an incident record, exposure record, or regulatory submission becomes high or critical.",
  "Critical equipment out of tolerance affecting active work becomes high or critical.",
  "Unapproved change affecting a validated process, control, system, or cleanroom becomes high.",
  "Expired training for critical biosafety, cleanroom, or high-hazard work increases risk by one band.",
  "Missing SOP, missing approval, or overdue corrective action on high-risk work increases risk by one band.",
  "Repeat incident or finding pattern across tasks, instruments, teams, or sites increases likelihood and confidence.",
];

// ── Engine metadata ───────────────────────────────────────────────────────────

export const ENGINE_META = {
  name: "My Biotech AI Engine",
  version: "bio-clean-start-v1",
  generatedDate: "2026-05-27",
  domain: "biotech",
} as const;
