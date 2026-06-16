// ---------------------------------------------------------------------------
// Standard EHS risk scoring — Severity × Likelihood, initial vs. residual risk.
//
// Encodes the industry-standard risk-assessment methodology used across the
// reference EHS workbooks (Task Risk Assessment Tool, EHS&S Risk Register):
//   • 5×5 Severity × Likelihood matrix → Low / Medium / High / Extreme band
//   • Control-Effectiveness multiplier tied to the hierarchy of controls
//   • Initial (inherent) risk → Residual (post-control) risk
//   • Risk Control Plan required once residual risk reaches Medium or above
//
// Pure functions only. Bands map onto the platform's existing RiskLevel
// vocabulary (low / medium / high / critical) used by risk-register-service.
// ---------------------------------------------------------------------------

export type RiskScaleValue = 1 | 2 | 3 | 4 | 5;

/** Matrix band produced by the 5×5 assessment. */
export type RiskBand = "low" | "medium" | "high" | "extreme";

/** Platform-canonical level (matches risk-register-service `RiskLevel`). */
export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ScaleDefinition = {
  value: RiskScaleValue;
  label: string;
  description: string;
};

// ── Severity & Likelihood scales (verbatim intent from the reference tool) ──

export const SEVERITY_SCALE: ScaleDefinition[] = [
  { value: 1, label: "Slight", description: "Very minor injury not requiring first aid; little to no environmental impact; no/minor property damage." },
  { value: 2, label: "Minor", description: "First aid required but not recordable; minor environmental impact needing rapid onsite clean-up; minor property damage." },
  { value: 3, label: "Serious", description: "Recordable injury (not SIF); moderate contamination; short-term damage within facility requiring work suspension to respond." },
  { value: 4, label: "Major", description: "Serious injury (non-fatal or disability level); major contamination; property damage and work suspension." },
  { value: 5, label: "Catastrophic", description: "Permanent disability or fatality; devastating contamination; severe property damage and work suspension." }
];

export const LIKELIHOOD_SCALE: ScaleDefinition[] = [
  { value: 1, label: "Rare", description: "Little or no chance to happen. Exposure to the hazard occurs monthly or less frequently." },
  { value: 2, label: "Unlikely", description: "Unlikely to happen. Exposure to the hazard occurs roughly weekly." },
  { value: 3, label: "Possible", description: "Likely to occur occasionally. Exposure to the hazard occurs roughly daily." },
  { value: 4, label: "Likely", description: "Likely to occur during the employee's working life." },
  { value: 5, label: "Almost Certain", description: "Extremely likely to occur." }
];

// ── Band thresholds ─────────────────────────────────────────────────────────
// These numeric thresholds reproduce the reference 5×5 matrix exactly for every
// integer Severity × Likelihood product (verified in scoring.test.ts), and also
// band a fractional residual score after the control multiplier is applied.

export function bandFromScore(score: number): RiskBand {
  if (score <= 4) return "low";
  if (score <= 10) return "medium";
  if (score <= 16) return "high";
  return "extreme";
}

/** Raw (inherent) risk score: Severity × Likelihood, range 1–25. */
export function rawScore(severity: RiskScaleValue, likelihood: RiskScaleValue): number {
  return severity * likelihood;
}

/** Band for a single Severity × Likelihood pair. */
export function bandFor(severity: RiskScaleValue, likelihood: RiskScaleValue): RiskBand {
  return bandFromScore(rawScore(severity, likelihood));
}

/** The explicit 5×5 matrix (severity → likelihood → band), for display/UI.
 * Kept in sync with `bandFromScore` by a test. */
export const BAND_MATRIX: Record<RiskScaleValue, Record<RiskScaleValue, RiskBand>> = {
  5: { 1: "medium", 2: "medium", 3: "high", 4: "extreme", 5: "extreme" },
  4: { 1: "low", 2: "medium", 3: "high", 4: "high", 5: "extreme" },
  3: { 1: "low", 2: "medium", 3: "medium", 4: "high", 5: "high" },
  2: { 1: "low", 2: "low", 3: "medium", 4: "medium", 5: "medium" },
  1: { 1: "low", 2: "low", 3: "low", 4: "low", 5: "medium" }
};

/** Map a matrix band onto the platform's RiskLevel vocabulary. */
export function bandToLevel(band: RiskBand): RiskLevel {
  return band === "extreme" ? "critical" : band;
}

// ── Control effectiveness (hierarchy of controls) ───────────────────────────

export type ControlEffectivenessTier =
  | "engineering_plus_backups"
  | "engineering_plus_admin"
  | "admin_only"
  | "none";

export type ControlEffectivenessDefinition = {
  tier: ControlEffectivenessTier;
  factor: number;
  label: string;
  description: string;
};

export const CONTROL_EFFECTIVENESS: Record<ControlEffectivenessTier, ControlEffectivenessDefinition> = {
  engineering_plus_backups: {
    tier: "engineering_plus_backups",
    factor: 0.25,
    label: "Engineering controls with multiple backups + effective administrative controls",
    description: "Engineering controls with redundancy in addition to effective administrative controls and appropriate PPE."
  },
  engineering_plus_admin: {
    tier: "engineering_plus_admin",
    factor: 0.5,
    label: "Engineering + effective administrative controls",
    description: "Engineering controls in place together with effective administrative controls."
  },
  admin_only: {
    tier: "admin_only",
    factor: 0.75,
    label: "Effective administrative controls only",
    description: "Effective administrative controls with adequate redundancy plus appropriate PPE; no engineering controls."
  },
  none: {
    tier: "none",
    factor: 1,
    label: "No controls / controls unreliable",
    description: "No controls in place, or existing controls are unreliable or unverified."
  }
};

export function controlFactor(tier: ControlEffectivenessTier): number {
  return CONTROL_EFFECTIVENESS[tier].factor;
}

/** Residual (post-control) score = inherent score × control-effectiveness factor. */
export function residualScore(inheritScore: number, tier: ControlEffectivenessTier): number {
  return inheritScore * controlFactor(tier);
}

/** A Risk Control Plan is required once residual risk reaches Medium or above. */
export function riskControlPlanRequired(band: RiskBand): boolean {
  return band !== "low";
}

// ── Regulatory scoring ──────────────────────────────────────────────────────
// Inherent risk for a regulatory-requirement-based register entry is calculated
// from:
//   • Regulatory consequence severity  (1–5, pre-set per framework)
//   • Compliance gap score             (1–5, driven by current compliance status)
// The product feeds directly into bandFromScore / residualScore, so the rest
// of the scoring pipeline (control effectiveness, residual band) is unchanged.

export type RegulationFramework =
  | "NIH Guidelines"
  | "OSHA 1910.1030"
  | "CDC/USDA Select Agents"
  | "EPA"
  | "FDA 21 CFR"
  | "Internal";

export type ComplianceGap = "compliant" | "minor_gap" | "major_gap" | "non_compliant";

/** Pre-set consequence severity per regulatory framework (1–5). */
export const REGULATION_SEVERITY: Record<RegulationFramework, RiskScaleValue> = {
  "CDC/USDA Select Agents": 5, // Criminal penalties, facility shutdown
  "OSHA 1910.1030":         4, // OSHA enforcement, fines, recordkeeping
  "NIH Guidelines":         3, // IBC suspension, funding loss
  "FDA 21 CFR":             3, // Warning letters, consent decrees
  "EPA":                    3, // Civil penalties, reporting
  "Internal":               1, // Internal policy only
};

/** Gap-to-likelihood mapping. Non-compliant = Almost Certain audit finding. */
export const COMPLIANCE_GAP_SCORE: Record<ComplianceGap, RiskScaleValue> = {
  compliant:       1,
  minor_gap:       2,
  major_gap:       4,
  non_compliant:   5,
};

export const COMPLIANCE_GAP_LABELS: Record<ComplianceGap, string> = {
  compliant:      "Compliant",
  minor_gap:      "Minor Gap",
  major_gap:      "Major Gap",
  non_compliant:  "Non-Compliant",
};

export const REGULATION_FRAMEWORKS: RegulationFramework[] = [
  "CDC/USDA Select Agents",
  "OSHA 1910.1030",
  "NIH Guidelines",
  "FDA 21 CFR",
  "EPA",
  "Internal",
];

export type RegulatoryRiskResult = {
  regulationSeverity: RiskScaleValue;
  gapScore: RiskScaleValue;
  inherentScore: number;
  inherentBand: RiskBand;
  inherentLevel: RiskLevel;
  controlTier: ControlEffectivenessTier;
  controlFactor: number;
  residualScore: number;
  residualBand: RiskBand;
  residualLevel: RiskLevel;
  riskControlPlanRequired: boolean;
};

/**
 * Calculate inherent and residual risk for a regulatory-requirement entry.
 * Inherent = regulation severity × compliance gap score.
 * Residual = inherent × control effectiveness factor.
 */
export function assessRegulatoryRisk(
  regulation: RegulationFramework,
  complianceGap: ComplianceGap,
  controlTier: ControlEffectivenessTier = "none"
): RegulatoryRiskResult {
  const regulationSeverity = REGULATION_SEVERITY[regulation];
  const gapScore = COMPLIANCE_GAP_SCORE[complianceGap];
  const iScore = rawScore(regulationSeverity, gapScore);
  const iBand = bandFromScore(iScore);
  const rScore = residualScore(iScore, controlTier);
  const rBand = bandFromScore(rScore);
  return {
    regulationSeverity,
    gapScore,
    inherentScore: iScore,
    inherentBand: iBand,
    inherentLevel: bandToLevel(iBand),
    controlTier,
    controlFactor: controlFactor(controlTier),
    residualScore: rScore,
    residualBand: rBand,
    residualLevel: bandToLevel(rBand),
    riskControlPlanRequired: riskControlPlanRequired(rBand),
  };
}

// ── Multi-impact assessment ─────────────────────────────────────────────────
// The reference Risk Register scores each hazard across multiple impact criteria
// (Health & Safety, Environment, Compliance, …) and takes the highest as the
// driving risk.

export type ImpactScore = {
  criterion: string;
  severity: RiskScaleValue;
  likelihood: RiskScaleValue;
};

export type RiskAssessmentResult = {
  inherentScore: number;
  inherentBand: RiskBand;
  inherentLevel: RiskLevel;
  drivingCriterion: string | null;
  controlTier: ControlEffectivenessTier;
  controlFactor: number;
  residualScore: number;
  residualBand: RiskBand;
  residualLevel: RiskLevel;
  riskControlPlanRequired: boolean;
};

/**
 * Score a hazard across one or more impact criteria, then apply control
 * effectiveness to derive residual risk. Inherent risk is the highest
 * Severity × Likelihood across all supplied impacts.
 */
export function assessRisk(
  impacts: ImpactScore[],
  controlTier: ControlEffectivenessTier = "none"
): RiskAssessmentResult {
  let inherentScore = 0;
  let drivingCriterion: string | null = null;
  for (const impact of impacts) {
    const score = rawScore(impact.severity, impact.likelihood);
    if (score > inherentScore) {
      inherentScore = score;
      drivingCriterion = impact.criterion;
    }
  }

  const inherentBand = bandFromScore(inherentScore);
  const residual = residualScore(inherentScore, controlTier);
  const residualBand = bandFromScore(residual);

  return {
    inherentScore,
    inherentBand,
    inherentLevel: bandToLevel(inherentBand),
    drivingCriterion,
    controlTier,
    controlFactor: controlFactor(controlTier),
    residualScore: residual,
    residualBand,
    residualLevel: bandToLevel(residualBand),
    riskControlPlanRequired: riskControlPlanRequired(residualBand)
  };
}
