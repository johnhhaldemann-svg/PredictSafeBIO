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
    label: "Contamination and sterility assurance",
    signalTypes: ["contamination_event", "environmental_monitoring", "assay_qc"],
    keywords: ["contamination", "microbial", "sterility", "aseptic", "excursion", "growth"],
    criticalControls: [
      "segregation or quarantine review",
      "QA review",
      "environmental monitoring assessment",
      "batch/sample impact assessment",
      "deviation and CAPA workflow"
    ],
    ownerRoles: ["qa", "quality_unit", "manufacturing_lead"],
    actionType: "hold_or_quarantine_review"
  },
  {
    id: "product_quality_batch",
    label: "Product quality and batch risk",
    signalTypes: ["batch_record", "deviation", "supplier_material"],
    keywords: ["batch", "lot", "process deviation", "label", "material", "release"],
    criticalControls: [
      "batch hold or QA disposition review",
      "deviation record",
      "impact assessment",
      "material traceability",
      "CAPA when systemic"
    ],
    ownerRoles: ["qa", "quality_unit", "manufacturing_lead"],
    actionType: "qa_review"
  },
  {
    id: "data_integrity",
    label: "Data integrity",
    signalTypes: ["data_integrity", "audit_finding"],
    keywords: ["audit trail", "raw data", "signature", "backdated", "unattributable", "spreadsheet"],
    criticalControls: [
      "preserve records",
      "QA/data owner review",
      "audit trail review",
      "controlled document correction",
      "do not overwrite source data"
    ],
    ownerRoles: ["qa", "quality_unit", "responsible_scientist"],
    actionType: "documentation_review"
  },
  {
    id: "sample_chain_of_custody",
    label: "Sample integrity and chain of custody",
    signalTypes: ["sample_chain_of_custody"],
    keywords: ["sample", "custody", "temperature", "label mismatch", "mix-up", "storage"],
    criticalControls: [
      "quarantine or hold affected sample/material",
      "chain-of-custody reconstruction",
      "temperature/log review",
      "identity confirmation",
      "impact assessment before use"
    ],
    ownerRoles: ["responsible_scientist", "qa", "quality_unit"],
    actionType: "sample_review"
  },
  {
    id: "equipment_calibration_validation",
    label: "Equipment, calibration, and validation",
    signalTypes: ["equipment_event"],
    keywords: ["calibration", "qualification", "maintenance", "alarm", "freezer", "incubator", "out of tolerance"],
    criticalControls: [
      "stop-use or restricted-use review",
      "QA/validation assessment",
      "impact assessment for affected work",
      "calibration or qualification evidence",
      "deviation/CAPA if required"
    ],
    ownerRoles: ["validation_lead", "qa", "quality_unit"],
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
      "supervisor or QA review",
      "work impact assessment",
      "documentation of remediation"
    ],
    ownerRoles: ["qa", "responsible_scientist", "manufacturing_lead"],
    actionType: "training_review"
  },
  {
    id: "change_control_validation",
    label: "Change control and validation",
    signalTypes: ["change_control"],
    keywords: ["change", "validated", "method", "system", "facility", "supplier", "criteria"],
    criticalControls: [
      "change control review",
      "validation or qualification impact assessment",
      "QA approval where required",
      "regulatory impact assessment when applicable",
      "implementation controls"
    ],
    ownerRoles: ["qa", "validation_lead", "regulatory_affairs"],
    actionType: "change_control"
  },
  {
    id: "clinical_patient_impact",
    label: "Clinical study or patient-impacting risk",
    signalTypes: ["clinical_study", "regulatory_commitment"],
    keywords: ["protocol", "consent", "endpoint", "patient", "clinical", "safety event"],
    criticalControls: [
      "clinical operations review",
      "PI or medical monitor escalation when applicable",
      "QA/regulatory review",
      "preserve source records",
      "assess patient safety and data integrity impact"
    ],
    ownerRoles: ["clinical_operations", "principal_investigator", "regulatory_affairs", "qa"],
    actionType: "qa_review"
  }
];
