// ---------------------------------------------------------------------------
// Canonical EHS&S Hazard-Category Risk Register.
//
// Mirrors the structure of the reference "EHS&S Risk Register": a fixed library
// of hazard categories, each tied to a management-system standard, scored across
// a fixed set of impact criteria to produce a site-level risk profile.
//
// De-branded to generic EHS standards and linked to the platform's own safety
// program library (program-data.ts) so the register rolls up into existing
// programs. Pure data + builders; scoring uses ./scoring.
// ---------------------------------------------------------------------------

import { programData } from "@/lib/programs/program-data";
import {
  assessRisk,
  type ControlEffectivenessTier,
  type ImpactScore,
  type RiskAssessmentResult,
  type RiskScaleValue
} from "./scoring";

/** The impact criteria each hazard category is scored against. */
export const IMPACT_CRITERIA = [
  { id: "community", label: "Community" },
  { id: "compliance", label: "Compliance" },
  { id: "env_liquid_solid", label: "Environment — Liquid or Solid Spills" },
  { id: "env_vapor_air", label: "Environment — Vapor or Air Emission" },
  { id: "health_safety", label: "Health and Safety" },
  { id: "process_safety", label: "Process Safety" },
  { id: "property", label: "Property" },
  { id: "reputation", label: "Reputation" },
  { id: "security", label: "Security" },
  { id: "transportation", label: "Transportation" }
] as const;

export type ImpactCriterionId = (typeof IMPACT_CRITERIA)[number]["id"];

export type HazardCategory = {
  id: string;
  label: string;
  /** Generic management-system standard this category maps to. */
  standardReference: string;
  /** Linked program ids from program-data.ts (may be empty for categories the
   * platform does not yet model as a dedicated program). */
  programIds: string[];
};

const validProgramIds = new Set(programData.map((p) => p.id));

// The canonical hazard categories from the reference register, de-branded.
export const HAZARD_CATEGORIES: HazardCategory[] = [
  { id: "chemical_management_haz_comm", label: "Chemical Management and Hazard Communication", standardReference: "Chemical Management and Hazard Communication", programIds: ["chemical-management", "chemical-hygiene", "communication"] },
  { id: "chemical_reaction_hazards", label: "Chemical Reaction Hazards", standardReference: "Inherently Safer Process Design / Process Safety Management", programIds: [] },
  { id: "emissions_planned", label: "Emissions — Planned", standardReference: "Emissions Management", programIds: ["air-quality"] },
  { id: "emissions_unplanned", label: "Emissions — Unplanned", standardReference: "Soil, Groundwater and Surface Water Protection", programIds: ["stormwater", "spill-response"] },
  { id: "exposure_chem_bio_stressors", label: "Employee Exposure — Chemical or Biological Stressors", standardReference: "Management of Employee Exposures / Biorisk Management / PPE / Occupational Health", programIds: ["biosafety", "bloodborne-pathogens", "chemical-hygiene", "ppe"] },
  { id: "exposure_ergonomic_stressors", label: "Employee Exposure — Ergonomic Stressors", standardReference: "Ergonomics", programIds: ["ergonomics"] },
  { id: "exposure_physical_stressors", label: "Employee Exposure — Physical Stressors", standardReference: "Management of Employee Exposures / Radioactive Materials / PPE", programIds: ["ppe"] },
  { id: "equipment_machine_hazards", label: "Equipment and Machine Hazards", standardReference: "Equipment and Machine Safety", programIds: ["machine-guarding"] },
  { id: "fall_prevention_protection", label: "Fall Prevention and Protection", standardReference: "Fall Prevention and Protection", programIds: ["fall-protection"] },
  { id: "fire_explosion_prevention", label: "Fire and Explosion Prevention", standardReference: "Fire and Explosion Prevention", programIds: ["emergency-response", "er-equipment"] },
  { id: "high_risk_work_activities", label: "High Risk Work Activities", standardReference: "Safe Work Permits / Confined Spaces / Electrical Safety / Fall Protection", programIds: ["work-permits"] },
  { id: "laboratory_hazards", label: "Laboratory Hazards", standardReference: "Laboratory Safety", programIds: ["chemical-hygiene", "biosafety"] },
  { id: "material_transport_external", label: "Material Storage, Handling and Transportation — External to Site", standardReference: "Dangerous Goods Classification and Transportation", programIds: [] },
  { id: "material_transport_internal", label: "Material Storage, Handling and Transportation — Internal to Site", standardReference: "Material Storage, Handling and Housekeeping", programIds: ["warehouse-safety", "rack-inspections"] },
  { id: "natural_resource_consumption", label: "Natural Resource Consumption", standardReference: "Energy / Water Conservation and Management", programIds: [] },
  { id: "office_safety", label: "Office Safety Management", standardReference: "Office Safety", programIds: [] },
  { id: "pressure_compressed_gases", label: "Pressure Systems and Compressed Gases", standardReference: "Pressure Systems and Compressed Gas Safety", programIds: [] },
  { id: "contractor_management", label: "Use of Contractors and Contingent Workers", standardReference: "Contractor Management", programIds: [] },
  { id: "manual_powered_tools", label: "Use of Manual and Powered Tools", standardReference: "Hand and Powered Tool Safety", programIds: ["machine-guarding"] },
  { id: "motor_vehicles", label: "Use of Motor Vehicles", standardReference: "Motor Vehicle Safety", programIds: [] },
  { id: "powered_industrial_vehicles", label: "Use of Powered Industrial Vehicles", standardReference: "Powered Industrial Trucks", programIds: ["forklift"] },
  { id: "weather_natural_disaster", label: "Weather and Natural Disaster", standardReference: "Emergency Preparedness and Response", programIds: ["emergency-response"] }
];

export type SiteApplicability = "applicable" | "not_applicable" | "unknown";

/** A single register line: a hazard category plus the site's scored assessment. */
export type RegisterEntry = {
  category: HazardCategory;
  applicability: SiteApplicability;
  impacts: ImpactScore[];
  controlTier: ControlEffectivenessTier;
  assessment: RiskAssessmentResult | null;
};

/** Build an empty register scaffold covering every canonical hazard category. */
export function buildEmptyRegister(): RegisterEntry[] {
  return HAZARD_CATEGORIES.map((category) => ({
    category,
    applicability: "unknown",
    impacts: [],
    controlTier: "none",
    assessment: null
  }));
}

export type ScoreInput = {
  categoryId: string;
  applicability?: SiteApplicability;
  impacts: ImpactScore[];
  controlTier?: ControlEffectivenessTier;
};

/**
 * Score one or more hazard categories. Categories not supplied are returned in
 * the scaffold with a null assessment. Applicable categories with impacts get a
 * full inherent/residual assessment from ./scoring.
 */
export function scoreRegister(inputs: ScoreInput[]): RegisterEntry[] {
  const byId = new Map(inputs.map((input) => [input.categoryId, input]));
  return HAZARD_CATEGORIES.map((category) => {
    const input = byId.get(category.id);
    if (!input) {
      return { category, applicability: "unknown" as SiteApplicability, impacts: [], controlTier: "none" as ControlEffectivenessTier, assessment: null };
    }
    const applicability = input.applicability ?? "applicable";
    const controlTier = input.controlTier ?? "none";
    const assessment =
      applicability === "applicable" && input.impacts.length > 0
        ? assessRisk(input.impacts, controlTier)
        : null;
    return { category, applicability, impacts: input.impacts, controlTier, assessment };
  });
}

/** Categories whose residual risk requires a Risk Control Plan, highest first. */
export function categoriesNeedingControlPlan(entries: RegisterEntry[]): RegisterEntry[] {
  return entries
    .filter((entry) => entry.assessment?.riskControlPlanRequired)
    .sort((a, b) => (b.assessment?.residualScore ?? 0) - (a.assessment?.residualScore ?? 0));
}

/** Validate that every category links only to real program ids. */
export function unknownProgramLinks(): string[] {
  const bad: string[] = [];
  for (const category of HAZARD_CATEGORIES) {
    for (const programId of category.programIds) {
      if (!validProgramIds.has(programId)) bad.push(`${category.id} -> ${programId}`);
    }
  }
  return bad;
}

export type { RiskScaleValue };
