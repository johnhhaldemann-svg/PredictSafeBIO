import type { BioAiInput, BioSourceRecord } from "@/lib/bio-ai/types";

export type BioTypeKey =
  | "rd_biotech"
  | "cell_gene_therapy"
  | "cleanroom_controlled_environment"
  | "cro_lab_services"
  | "academic_university_research"
  | "lab_construction_commissioning";

export type BioTypeFoundation = {
  key: BioTypeKey;
  name: string;
  focus: string;
  programs: string[];
  documents: string[];
  records: string[];
  training: string[];
  riskDrivers: string[];
  commonTools: string[];
};

export type BioTypeAiContext = {
  primaryBioType: BioTypeKey;
  secondaryBioTypes: BioTypeKey[];
  biotypePrograms: string[];
  biotypeDocuments: string[];
  biotypeRecords: string[];
  biotypeTraining: string[];
  biotypeRiskDrivers: string[];
  biotypeSourceRecords: BioSourceRecord[];
};

const sharedTools = [
  "Company Profile Intelligence",
  "Compliance Applicability Engine",
  "BioRisk Scoring Model",
  "Document Intelligence Library",
  "Controlled Record Library",
  "Compliance Evidence Map",
  "Programs & Methods Library",
  "Change Impact Engine",
  "Human Validation Workflow",
  "Audit Readiness Score Model"
];

export const canonicalBioTypeFoundations: BioTypeFoundation[] = [
  {
    key: "rd_biotech",
    name: "R&D Biotech",
    focus: "Lab safety, biosafety, chemical hygiene, BSL-1/BSL-2, biological materials, incidents, and training.",
    programs: ["Biosafety", "Chemical Hygiene", "Incident/Exposure Response", "Training & Competency"],
    documents: ["Biosafety Manual", "Chemical Hygiene Plan", "Lab-Specific SOP", "Incident Response SOP"],
    records: ["Biological Material Inventory", "Chemical Inventory", "Incident Record", "Training Assignment"],
    training: ["Biosafety Training", "Chemical Hygiene Training", "Incident Response Training"],
    riskDrivers: ["biological material handling", "chemical exposure", "BSL work practices", "incident readiness"],
    commonTools: sharedTools
  },
  {
    key: "cell_gene_therapy",
    name: "Cell & Gene Therapy",
    focus: "Cleanroom worker safety, aseptic technique, biosafety, exposure control, and incident/corrective-action readiness.",
    programs: ["Cleanroom / Controlled Environment", "Biosafety", "Incident / Corrective Action", "Training & Competency"],
    documents: ["Aseptic Technique SOP", "Biosafety Manual", "Exposure Response SOP", "Incident Response SOP"],
    records: ["Biological Material Inventory", "Exposure Record", "Incident Record", "Corrective Action Record"],
    training: ["Aseptic Technique Training", "Cleanroom Gowning Training", "Biosafety Training"],
    riskDrivers: ["aseptic worker safety", "biosafety control", "exposure readiness", "incident response readiness"],
    commonTools: sharedTools
  },
  {
    key: "cleanroom_controlled_environment",
    name: "Cleanroom / Controlled Environment",
    focus: "Gowning, access control, cleaning/disinfection, environmental monitoring, excursions, and personnel qualification.",
    programs: ["Cleanroom / Controlled Environment", "Equipment/Calibration", "Training & Competency", "Audit & Inspection"],
    documents: ["Gowning SOP", "Cleaning and Disinfection SOP", "Environmental Monitoring SOP", "Excursion Response SOP"],
    records: ["Access Log", "Cleaning Record", "Environmental Monitoring Record", "Personnel Qualification Record"],
    training: ["Gowning Training", "Cleaning Training", "Environmental Monitoring Training"],
    riskDrivers: ["gowning control", "cleaning verification", "environmental excursion", "personnel qualification"],
    commonTools: sharedTools
  },
  {
    key: "cro_lab_services",
    name: "CRO / Lab Services",
    focus: "Client project intake, protocol review, sample tracking, project training, audit evidence, and deviations.",
    programs: ["Project Intake", "Sample Management", "Training & Competency", "Audit & Inspection"],
    documents: ["Client Project Intake SOP", "Protocol Review SOP", "Sample Tracking SOP", "Deviation SOP"],
    records: ["Project Intake Record", "Protocol Review Record", "Sample Tracking Record", "Audit Evidence"],
    training: ["Project-Specific Training", "Protocol Training", "Sample Tracking Training"],
    riskDrivers: ["client protocol fit", "project training readiness", "sample tracking", "audit evidence completeness"],
    commonTools: sharedTools
  },
  {
    key: "academic_university_research",
    name: "Academic / University Research",
    focus: "PI certification, biological agent inventory, risk acknowledgement, lab-specific manual, and IBC flags.",
    programs: ["Biosafety", "Training & Competency", "Document Control", "Audit & Inspection"],
    documents: ["Lab-Specific Biosafety Manual", "PI Certification Procedure", "Risk Acknowledgement Form", "IBC Flag Review"],
    records: ["PI Certification Record", "Biological Agent Inventory", "Risk Acknowledgement", "IBC Review Flag"],
    training: ["PI Certification Training", "Lab-Specific Biosafety Training", "Risk Acknowledgement Training"],
    riskDrivers: ["PI oversight", "agent inventory", "risk acknowledgement", "IBC review"],
    commonTools: sharedTools
  },
  {
    key: "lab_construction_commissioning",
    name: "Lab Construction / Commissioning",
    focus: "Lab startup, contractor access, equipment install, decontamination clearance, commissioning, and turnover index.",
    programs: ["Lab Startup", "Equipment/Calibration", "Document Control", "Audit & Inspection"],
    documents: ["Commissioning Plan", "Contractor Access SOP", "Equipment Install SOP", "Decontamination Clearance SOP"],
    records: ["Commissioning Record", "Contractor Access Log", "Equipment Install Record", "Turnover Index"],
    training: ["Contractor Safety Orientation", "Commissioning Readiness Training", "Decontamination Clearance Training"],
    riskDrivers: ["startup readiness", "contractor access", "equipment installation", "decontamination clearance"],
    commonTools: sharedTools
  }
];

export function buildBioTypeAiContext(primaryBioType: BioTypeKey, secondaryBioTypes: BioTypeKey[] = []): BioTypeAiContext {
  const selected = selectedBioTypes(primaryBioType, secondaryBioTypes);
  return {
    primaryBioType,
    secondaryBioTypes: uniqueBioTypeKeys(secondaryBioTypes.filter((key) => key !== primaryBioType)),
    biotypePrograms: unique(selected.flatMap((foundation) => foundation.programs)),
    biotypeDocuments: unique(selected.flatMap((foundation) => foundation.documents)),
    biotypeRecords: unique(selected.flatMap((foundation) => foundation.records)),
    biotypeTraining: unique(selected.flatMap((foundation) => foundation.training)),
    biotypeRiskDrivers: unique(selected.flatMap((foundation) => foundation.riskDrivers)),
    biotypeSourceRecords: selected.map((foundation) => ({
      module: "biotype_foundation" as const,
      recordId: foundation.key,
      label: foundation.name
    }))
  };
}

export function applyBioTypeContext(input: BioAiInput, context: BioTypeAiContext): BioAiInput {
  return {
    ...input,
    primaryBioType: context.primaryBioType,
    secondaryBioTypes: context.secondaryBioTypes,
    biotypePrograms: unique([...(input.biotypePrograms ?? []), ...context.biotypePrograms]),
    biotypeDocuments: unique([...(input.biotypeDocuments ?? []), ...context.biotypeDocuments]),
    biotypeRecords: unique([...(input.biotypeRecords ?? []), ...context.biotypeRecords]),
    biotypeTraining: unique([...(input.biotypeTraining ?? []), ...context.biotypeTraining]),
    biotypeRiskDrivers: unique([...(input.biotypeRiskDrivers ?? []), ...context.biotypeRiskDrivers]),
    sourceRecords: dedupeSourceRecords([...(input.sourceRecords ?? []), ...context.biotypeSourceRecords]),
    missingData: unique([
      ...(input.missingData ?? []),
      ...context.biotypeDocuments.slice(0, 2).map((document) => `BioType document evidence: ${document}`),
      ...context.biotypeTraining.slice(0, 2).map((training) => `BioType training evidence: ${training}`)
    ])
  };
}

export function findBioTypeFoundation(key: string | null | undefined) {
  return canonicalBioTypeFoundations.find((foundation) => foundation.key === key);
}

export function normalizeBioTypeKey(value: string | null | undefined): BioTypeKey | null {
  return canonicalBioTypeFoundations.some((foundation) => foundation.key === value) ? (value as BioTypeKey) : null;
}

function selectedBioTypes(primaryBioType: BioTypeKey, secondaryBioTypes: BioTypeKey[]) {
  const keys = uniqueBioTypeKeys([primaryBioType, ...secondaryBioTypes]);
  return keys.map(findBioTypeFoundation).filter((foundation): foundation is BioTypeFoundation => Boolean(foundation));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueBioTypeKeys(values: BioTypeKey[]) {
  return Array.from(new Set(values));
}

function dedupeSourceRecords(records: BioSourceRecord[]) {
  return Array.from(new Map(records.map((record) => [`${record.module}:${record.recordId ?? record.label ?? "unlinked"}`, record])).values());
}
