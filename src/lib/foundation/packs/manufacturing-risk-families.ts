import type { BioRiskFamily } from "@/lib/bio-ai/risk-families";

// Risk families for general_manufacturing (PredictSafe MFG), mapped to OSHA
// 29 CFR 1910 general industry. These are only ever loaded for orgs whose
// vertical is general_manufacturing (via the VerticalPack registry), so they
// can never affect PredictSafe BIO behavior.
//
// DRAFT — hazard families, critical controls, and owner-role naming still need
// John's domain sign-off. The shared program catalog (src/lib/programs/
// program-data.ts) already covers these areas (LOTO, Machine Guarding, Fall
// Protection, Forklift/PIT, HazCom, PPE, Confined Space); these families are
// the engine-facing signal/keyword matchers that drive risk scoring + actions.
export const generalManufacturingRiskFamilies: BioRiskFamily[] = [
  {
    id: "machine_safety_energy_control",
    label: "Machine safeguarding and energy control",
    signalTypes: ["machine_guarding_event", "loto_event", "equipment_event"],
    keywords: ["guard", "guarding", "lockout", "tagout", "loto", "pinch point", "nip point", "unguarded", "energy isolation", "point of operation"],
    criticalControls: [
      "machine guarding verification",
      "lockout/tagout procedure applied",
      "energy isolation confirmed",
      "stop-use until safeguarded",
      "incident documentation"
    ],
    ownerRoles: ["maintenance_lead", "ehs", "production_supervisor"],
    actionType: "equipment_review"
  },
  {
    id: "powered_industrial_trucks_material_handling",
    label: "Powered industrial trucks and material handling",
    signalTypes: ["powered_industrial_truck_event", "equipment_event"],
    keywords: ["forklift", "powered industrial truck", "pit", "pallet jack", "rack", "racking", "struck-by", "caught-between", "loading dock", "conveyor", "tip-over"],
    criticalControls: [
      "operator certification verified",
      "pre-shift equipment inspection",
      "pedestrian/vehicle separation",
      "rack load limits and damage check",
      "remove defective equipment from service"
    ],
    ownerRoles: ["production_supervisor", "ehs", "maintenance_lead"],
    actionType: "equipment_review"
  },
  {
    id: "falls_walking_working_surfaces",
    label: "Falls and walking-working surfaces",
    signalTypes: ["fall_hazard_event"],
    keywords: ["fall", "fall protection", "ladder", "mezzanine", "guardrail", "elevated", "harness", "slip", "trip", "floor opening", "platform"],
    criticalControls: [
      "fall hazard survey",
      "guardrails or fall arrest in place",
      "ladder inspection and safe use",
      "floor openings covered",
      "training verification"
    ],
    ownerRoles: ["ehs", "maintenance_lead", "production_supervisor"],
    actionType: "documentation_review"
  },
  {
    id: "hazard_communication_chemical_exposure",
    label: "Hazard communication and chemical exposure",
    signalTypes: ["chemical_exposure_event"],
    keywords: ["chemical", "hazcom", "sds", "exposure", "ventilation", "solvent", "corrosive", "fume", "vapor", "spill", "secondary containment"],
    criticalControls: [
      "SDS access and GHS labeling",
      "exposure assessment",
      "ventilation or engineering control review",
      "chemical storage segregation",
      "spill response readiness"
    ],
    ownerRoles: ["ehs", "production_supervisor"],
    actionType: "documentation_review"
  },
  {
    id: "ppe_and_respiratory_protection",
    label: "PPE and respiratory protection",
    signalTypes: ["sop_gap", "training_gap"],
    keywords: ["ppe", "personal protective", "respirator", "hearing protection", "eye protection", "fit test", "hazard assessment"],
    criticalControls: [
      "written PPE hazard assessment",
      "correct PPE selected and available",
      "respirator fit-test current",
      "employee training on use and limitations",
      "PPE inspection program"
    ],
    ownerRoles: ["ehs", "production_supervisor"],
    actionType: "training_review"
  },
  {
    id: "ergonomics_manual_handling",
    label: "Ergonomics and manual handling",
    signalTypes: ["ergonomic_risk_signal"],
    keywords: ["ergonomic", "lifting", "manual handling", "repetitive", "strain", "musculoskeletal", "msd", "awkward posture"],
    criticalControls: [
      "ergonomic assessment completed",
      "job rotation or load reduction",
      "early symptom reporting reviewed",
      "workstation adjustment",
      "training verification"
    ],
    ownerRoles: ["ehs", "production_supervisor"],
    actionType: "training_review"
  },
  {
    id: "confined_space_hot_work_permits",
    label: "Confined space and hot work permits",
    signalTypes: ["confined_space_event", "sop_gap"],
    keywords: ["confined space", "permit", "hot work", "welding", "atmospheric monitoring", "fire watch", "entry", "rescue", "isolation"],
    criticalControls: [
      "permit issued and authorized",
      "atmospheric monitoring before entry",
      "attendant and rescue plan in place",
      "fire watch for hot work",
      "isolation and lockout coordination"
    ],
    ownerRoles: ["ehs", "maintenance_lead"],
    actionType: "documentation_review"
  },
  {
    id: "training_competency_readiness",
    label: "Training, SOP, and competency readiness",
    signalTypes: ["training_gap", "sop_gap"],
    keywords: ["training", "competency", "sop", "procedure", "unqualified", "readiness", "recertification"],
    criticalControls: [
      "training verification",
      "current approved procedure",
      "supervisor or EHS review",
      "work impact assessment",
      "documentation of remediation"
    ],
    ownerRoles: ["ehs", "production_supervisor", "plant_manager"],
    actionType: "training_review"
  }
];
