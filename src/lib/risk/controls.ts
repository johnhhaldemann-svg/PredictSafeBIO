// ---------------------------------------------------------------------------
// Hierarchy of Controls + risk reassessment cadence.
//
// The reference risk worksheets require evidence that the hierarchy of controls
// was applied (Elimination → Substitution → Engineering → Administrative → PPE),
// and tie the residual risk band to how often the assessment must be reviewed.
//
// Connects to ./scoring: a control set suggests a control-effectiveness tier,
// and a residual band suggests a reassessment cadence.
// ---------------------------------------------------------------------------

import type { ControlEffectivenessTier, RiskBand } from "./scoring";

/** Hierarchy of controls, strongest first. */
export type HierarchyLevel = "elimination" | "substitution" | "engineering" | "administrative" | "ppe";

export type HierarchyDefinition = {
  level: HierarchyLevel;
  /** 1 = most effective (eliminate the hazard); 5 = least (rely on PPE). */
  rank: number;
  label: string;
  description: string;
};

export const HIERARCHY_OF_CONTROLS: HierarchyDefinition[] = [
  { level: "elimination", rank: 1, label: "Elimination", description: "Physically remove the hazard." },
  { level: "substitution", rank: 2, label: "Substitution", description: "Replace the hazard with something less hazardous." },
  { level: "engineering", rank: 3, label: "Engineering Controls", description: "Isolate people from the hazard (guards, ventilation, interlocks)." },
  { level: "administrative", rank: 4, label: "Administrative Controls", description: "Change the way people work (procedures, training, signage, permits)." },
  { level: "ppe", rank: 5, label: "PPE", description: "Protect the worker with personal protective equipment." }
];

const RANK_BY_LEVEL = new Map(HIERARCHY_OF_CONTROLS.map((h) => [h.level, h.rank]));

export function hierarchyRank(level: HierarchyLevel): number {
  return RANK_BY_LEVEL.get(level) ?? Number.MAX_SAFE_INTEGER;
}

/** The strongest (lowest-rank) control level present, or null if none. */
export function strongestControl(levels: HierarchyLevel[]): HierarchyLevel | null {
  if (levels.length === 0) return null;
  return [...levels].sort((a, b) => hierarchyRank(a) - hierarchyRank(b))[0];
}

// Map the risk-register's control types onto hierarchy levels.
export type RegisterControlType =
  | "engineering"
  | "administrative"
  | "ppe"
  | "training"
  | "inspection"
  | "permit"
  | "committee";

const CONTROL_TYPE_TO_HIERARCHY: Record<RegisterControlType, HierarchyLevel> = {
  engineering: "engineering",
  ppe: "ppe",
  administrative: "administrative",
  training: "administrative",
  inspection: "administrative",
  permit: "administrative",
  committee: "administrative"
};

export function hierarchyForControlType(type: RegisterControlType): HierarchyLevel {
  return CONTROL_TYPE_TO_HIERARCHY[type];
}

/**
 * Suggest a control-effectiveness tier (for ./scoring) from the hierarchy levels
 * present. Higher-order controls with redundancy reduce residual risk most.
 * PPE-alone maps to "none" — OSHA/hierarchy doctrine treats PPE as last resort,
 * not an independent effective control tier.
 */
export function suggestControlEffectiveness(levels: HierarchyLevel[]): ControlEffectivenessTier {
  const hasEngineeringOrAbove = levels.some((l) => hierarchyRank(l) <= 3);
  const hasAdministrative = levels.includes("administrative");
  const engineeringOrAboveCount = levels.filter((l) => hierarchyRank(l) <= 3).length;

  if (hasEngineeringOrAbove && (engineeringOrAboveCount > 1 || (hasAdministrative && levels.includes("ppe")))) {
    return "engineering_plus_backups";
  }
  if (hasEngineeringOrAbove) return "engineering_plus_admin";
  if (hasAdministrative) return "admin_only";
  return "none";
}

// ── Reassessment cadence ────────────────────────────────────────────────────
// Higher residual risk = reassess sooner (from the reference "Review Frequency
// Guidance"). Days until the next required reassessment.

const CADENCE_DAYS: Record<RiskBand, number> = {
  extreme: 30,
  high: 90,
  medium: 180,
  low: 365
};

export function reassessmentCadenceDays(band: RiskBand): number {
  return CADENCE_DAYS[band];
}

/** Next reassessment date (ISO yyyy-mm-dd) given the band and a reference date. */
export function nextReassessmentDate(band: RiskBand, from: string): string {
  const date = new Date(from);
  date.setDate(date.getDate() + reassessmentCadenceDays(band));
  return date.toISOString().slice(0, 10);
}
