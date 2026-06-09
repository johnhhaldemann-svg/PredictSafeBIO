import type { BioSignalType, RecommendedActionType, ReviewOwnerRole } from "./types";

export type BioRiskFamily = {
  id: string;
  label: string;
  signalTypes: BioSignalType[];
  keywords: string[];
  criticalControls: string[];
  ownerRoles: ReviewOwnerRole[];
  actionType: RecommendedActionType;
};

export const bioRiskFamilies: BioRiskFamily[] = [
  {
    id: "biosafety_containment",
    label: "Biosafety and containment",
    signalTypes: ["biosafety_event"],
    keywords: ["exposure", "spill", "sharps", "aerosol", "containment", "bsl", "waste"],
    criticalControls: [
      "biosafety review",
      "appropriate containment level",
      "PPE matched to hazard",
      "spill/exposure response",
      "incident documentation"
    ],
    ownerRoles: ["biosafety_officer", "ehs", "responsible_scientist"],
    actionType: "containment_review"
  },
  {
    id: "contamination_sterility",
    label: "Contamination and exposure control",
    signalTypes: ["contamination_event", "environmental_monitoring"],
    keywords: ["contamination", "microbial", "sterility", "aseptic", "excursion", "growth", "release"],
    criticalControls: [
      "segregation or isolation review",
      "EHS review",
      "environmental monitoring assessment",
      "exposure and area impact assessment",
      "incident and corrective-action workflow"
    ],
    ownerRoles: ["ehs", "biosafety_officer", "responsible_scientist"],
    actionType: "hold_or_quarantine_review"
  },
  {
    id: "data_integrity",
    label: "Records and data integrity",
    signalTypes: ["data_integrity", "audit_finding"],
    keywords: ["audit trail", "raw data", "signature", "backdated", "unattributable", "spreadsheet"],
    criticalControls: [
      "preserve records",
      "EHS/record owner review",
      "audit trail review",
      "controlled document correction",
      "do not overwrite source data"
    ],
    ownerRoles: ["ehs", "qa", "responsible_scientist"],
    actionType: "documentation_review"
  },
  {
    id: "sample_chain_of_custody",
    label: "Sample integrity and chain of custody",
    signalTypes: ["sample_chain_of_custody"],
    keywords: ["sample", "custody", "temperature", "label mismatch", "mix-up", "storage"],
    criticalControls: [
      "isolate or hold affected sample/material",
      "chain-of-custody reconstruction",
      "temperature/log review",
      "identity confirmation",
      "impact assessment before use"
    ],
    ownerRoles: ["responsible_scientist", "ehs", "biosafety_officer"],
    actionType: "sample_review"
  },
  {
    id: "equipment_calibration_validation",
    label: "Equipment, calibration, and engineering controls",
    signalTypes: ["equipment_event"],
    keywords: ["calibration", "qualification", "maintenance", "alarm", "freezer", "incubator", "out of tolerance"],
    criticalControls: [
      "stop-use or restricted-use review",
      "EHS/engineering assessment",
      "impact assessment for affected work",
      "calibration or maintenance evidence",
      "incident/corrective action if required"
    ],
    ownerRoles: ["validation_lead", "ehs", "responsible_scientist"],
    actionType: "equipment_review"
  },
  {
    id: "sop_training_readiness",
    label: "SOP, training, and readiness",
    signalTypes: ["training_gap", "sop_gap"],
    keywords: ["training", "sop", "revision", "unapproved procedure", "readiness"],
    criticalControls: [
      "training verification",
      "current approved SOP",
      "supervisor or EHS review",
      "work impact assessment",
      "documentation of remediation"
    ],
    ownerRoles: ["ehs", "responsible_scientist", "manufacturing_lead"],
    actionType: "training_review"
  },
  {
    id: "change_control_validation",
    label: "Change management and control verification",
    signalTypes: ["change_control"],
    keywords: ["change", "validated", "method", "system", "facility", "criteria"],
    criticalControls: [
      "change/management-of-change review",
      "control and engineering impact assessment",
      "EHS approval where required",
      "regulatory impact assessment when applicable",
      "implementation controls"
    ],
    ownerRoles: ["ehs", "validation_lead", "regulatory_affairs"],
    actionType: "change_control"
  }
];
