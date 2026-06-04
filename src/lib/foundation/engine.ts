import type { BioAiInput, BioAiSignal, BioSourceRecord, ReviewOwnerRole } from "@/lib/bio-ai/types";

export type FoundationIntakeAnswers = {
  hazardousChemicals?: boolean;
  biologicalMaterials?: boolean;
  humanDerivedSamples?: boolean;
  sharpsUsed?: boolean;
  bsl2Work?: boolean;
  bscUsed?: boolean;
  autoclaveUsed?: boolean;
  repeatIncidents?: boolean;
  expiredTraining?: boolean;
  missingSops?: boolean;
  outOfToleranceEquipment?: boolean;
  chainOfCustodyGaps?: boolean;
};

export type ApplicabilityRule = {
  ruleCode: string;
  name: string;
  conditionKeys: Array<keyof FoundationIntakeAnswers>;
  requiredPrograms: string[];
  requiredDocuments: string[];
  requiredRecords: string[];
  requiredTraining: string[];
  riskLevelIfMissing: "low" | "moderate" | "high" | "critical";
  humanReviewerRole: ReviewOwnerRole;
  referenceRuleIds?: string[];
};

export type ApplicabilityResult = {
  triggeredRules: ApplicabilityRule[];
  requiredPrograms: string[];
  requiredDocuments: string[];
  requiredRecords: string[];
  requiredTraining: string[];
  riskDrivers: string[];
  sourceRecords: BioSourceRecord[];
  referenceRuleIds: string[];
};

export type EvidenceStatus = "current" | "ready" | "review_needed" | "missing" | "expired" | "open" | "out_of_tolerance";

export type EvidenceMapItem = {
  requirementName: string;
  controlName: string;
  evidenceType: string;
  sourceTable: string;
  sourceRecordId?: string | null;
  evidenceStatus: EvidenceStatus;
  auditReady: boolean;
};

export type ChangeImpactInput = {
  changeType: "new_material" | "incident" | "audit_finding" | "equipment_event" | "sop_change";
  sourceTable: string;
  sourceRecordId?: string | null;
  label: string;
  severity?: "low" | "moderate" | "high" | "critical";
};

export type ChangeImpactEventDraft = {
  changeType: ChangeImpactInput["changeType"];
  impactSummary: string;
  documentImpacts: string[];
  trainingImpacts: string[];
  riskImpacts: string[];
  equipmentImpacts: string[];
  recommendedActions: string[];
  humanReviewRequired: true;
};

export type AuditReadinessScores = {
  overallScore: number;
  documentsScore: number;
  trainingScore: number;
  capaScore: number;
  incidentsScore: number;
  equipmentScore: number;
  evidenceScore: number;
  topGaps: string[];
};

export type FoundationAiContext = {
  applicablePrograms: string[];
  requiredDocuments: string[];
  requiredTraining: string[];
  requiredEvidence: string[];
  evidenceGaps: string[];
  changeImpactSummaries: string[];
  auditReadinessScore: number;
  bioriskRuleDrivers: string[];
  sourceRecords: BioSourceRecord[];
  referenceRuleIds: string[];
};

export const foundationProgramNames = [
  "Biosafety",
  "Chemical Hygiene",
  "Bloodborne Pathogens",
  "Waste Management",
  "Incident/Exposure Response",
  "CAPA",
  "Document Control",
  "Training & Competency",
  "Equipment/Calibration",
  "Audit & Inspection"
];

export const foundationMethodNames = [
  "Risk Assessment",
  "Document Gap",
  "Training Gap",
  "Incident Screening",
  "CAPA Screening",
  "Control Verification",
  "Audit Evidence",
  "Change Impact",
  "AI Guardrail"
];

export const defaultApplicabilityRules: ApplicabilityRule[] = [
  {
    ruleCode: "CHEM-001",
    name: "Hazardous chemical operations",
    conditionKeys: ["hazardousChemicals"],
    requiredPrograms: ["Chemical Hygiene", "Waste Management"],
    requiredDocuments: ["Chemical Hygiene Plan", "SDS Index", "Spill Response SOP"],
    requiredRecords: ["Chemical Inventory", "Waste Determination Record"],
    requiredTraining: ["Chemical Hygiene Training", "Spill Response Training"],
    riskLevelIfMissing: "high",
    humanReviewerRole: "ehs",
    referenceRuleIds: ["packet-chem-hygiene"]
  },
  {
    ruleCode: "BIO-001",
    name: "Biological materials and BSL work",
    conditionKeys: ["biologicalMaterials", "bsl2Work"],
    requiredPrograms: ["Biosafety", "Waste Management", "Document Control"],
    requiredDocuments: ["Biosafety Manual", "Biosafety Risk Assessment", "Decontamination SOP", "Biohazardous Waste SOP"],
    requiredRecords: ["Biological Material Inventory", "Biosafety Risk Assessment"],
    requiredTraining: ["Biosafety Training", "Decontamination Training"],
    riskLevelIfMissing: "high",
    humanReviewerRole: "biosafety_officer",
    referenceRuleIds: ["packet-biosafety"]
  },
  {
    ruleCode: "BBP-001",
    name: "Sharps or human-derived sample exposure controls",
    conditionKeys: ["humanDerivedSamples", "sharpsUsed"],
    requiredPrograms: ["Bloodborne Pathogens", "Incident/Exposure Response", "Training & Competency"],
    requiredDocuments: ["Exposure Control Plan", "Sharps Safety SOP", "Exposure Response SOP"],
    requiredRecords: ["Exposure Incident Record", "Sharps Injury Log"],
    requiredTraining: ["BBP Training", "Sharps Safety Training"],
    riskLevelIfMissing: "critical",
    humanReviewerRole: "biosafety_officer",
    referenceRuleIds: ["packet-bbp-sharps"]
  },
  {
    ruleCode: "EQUIP-001",
    name: "BSC and autoclave control records",
    conditionKeys: ["bscUsed", "autoclaveUsed"],
    requiredPrograms: ["Equipment/Calibration", "Biosafety"],
    requiredDocuments: ["BSC Use SOP", "Autoclave Use SOP"],
    requiredRecords: ["BSC Certification Record", "Autoclave Verification Log"],
    requiredTraining: ["BSC Use Training", "Autoclave Use Training"],
    riskLevelIfMissing: "high",
    humanReviewerRole: "validation_lead",
    referenceRuleIds: ["packet-equipment-controls"]
  }
];

export function evaluateApplicability(answers: FoundationIntakeAnswers, rules: ApplicabilityRule[] = defaultApplicabilityRules): ApplicabilityResult {
  const triggeredRules = rules.filter((rule) => rule.conditionKeys.some((key) => answers[key]));
  const sourceRecords = triggeredRules.map((rule) => ({
    module: "applicability_rule" as const,
    recordId: rule.ruleCode,
    label: rule.name
  }));

  return {
    triggeredRules,
    requiredPrograms: unique(triggeredRules.flatMap((rule) => rule.requiredPrograms)),
    requiredDocuments: unique(triggeredRules.flatMap((rule) => rule.requiredDocuments)),
    requiredRecords: unique(triggeredRules.flatMap((rule) => rule.requiredRecords)),
    requiredTraining: unique(triggeredRules.flatMap((rule) => rule.requiredTraining)),
    riskDrivers: unique(triggeredRules.map((rule) => `${rule.ruleCode}: missing controls are ${rule.riskLevelIfMissing} risk`)),
    sourceRecords,
    referenceRuleIds: unique(triggeredRules.flatMap((rule) => rule.referenceRuleIds ?? []))
  };
}

export function buildEvidenceMap(applicability: ApplicabilityResult, existingStatuses: Partial<Record<string, EvidenceStatus>> = {}): EvidenceMapItem[] {
  const documentItems = applicability.requiredDocuments.map((document) =>
    evidenceItem(document, "Controlled document", "document", "document_metadata", existingStatuses[document] ?? "missing")
  );
  const trainingItems = applicability.requiredTraining.map((training) =>
    evidenceItem(training, "Training assignment", "training", "training_assignments", existingStatuses[training] ?? "expired")
  );
  const recordItems = applicability.requiredRecords.map((record) =>
    evidenceItem(record, "Controlled record", "record", sourceTableForRecord(record), existingStatuses[record] ?? "missing")
  );

  return [...documentItems, ...trainingItems, ...recordItems];
}

export function detectChangeImpacts(changes: ChangeImpactInput[]): ChangeImpactEventDraft[] {
  return changes.map((change) => {
    const highSeverity = change.severity === "high" || change.severity === "critical";
    return {
      changeType: change.changeType,
      impactSummary: `${change.label} may affect controlled documents, training, evidence, and risk context.`,
      documentImpacts: impactsForChange(change.changeType, "document"),
      trainingImpacts: impactsForChange(change.changeType, "training"),
      riskImpacts: highSeverity ? ["Escalate deterministic risk context for human review"] : ["Recheck deterministic risk context"],
      equipmentImpacts: change.changeType === "equipment_event" ? ["Confirm stop-use, qualification, and impact evidence"] : [],
      recommendedActions: recommendedActionsForChange(change.changeType),
      humanReviewRequired: true
    };
  });
}

export function calculateAuditReadiness(evidence: EvidenceMapItem[], signals: BioAiSignal[] = []): AuditReadinessScores {
  const documentsScore = scoreByEvidence(evidence, "document");
  const trainingScore = scoreByEvidence(evidence, "training");
  const evidenceScore = scoreByEvidence(evidence, "record");
  const incidentsScore = signals.some((signal) => signal.type === "biosafety_event" || signal.type === "deviation") ? 45 : 80;
  const capaScore = signals.some((signal) => signal.repeatFinding || signal.type === "audit_finding") ? 40 : 78;
  const equipmentScore = signals.some((signal) => signal.type === "equipment_event") ? 35 : 82;
  const overallScore = average([documentsScore, trainingScore, capaScore, incidentsScore, equipmentScore, evidenceScore]);
  const topGaps = evidence
    .filter((item) => !item.auditReady)
    .map((item) => `${item.requirementName}: ${item.evidenceStatus}`)
    .slice(0, 6);

  return {
    overallScore,
    documentsScore,
    trainingScore,
    capaScore,
    incidentsScore,
    equipmentScore,
    evidenceScore,
    topGaps
  };
}

export function buildFoundationAiContext(
  applicability: ApplicabilityResult,
  evidence: EvidenceMapItem[],
  changeImpacts: ChangeImpactEventDraft[],
  readiness: AuditReadinessScores
): FoundationAiContext {
  const evidenceGaps = evidence.filter((item) => !item.auditReady).map((item) => `${item.requirementName}: ${item.evidenceStatus}`);
  return {
    applicablePrograms: applicability.requiredPrograms,
    requiredDocuments: applicability.requiredDocuments,
    requiredTraining: applicability.requiredTraining,
    requiredEvidence: evidence.map((item) => item.requirementName),
    evidenceGaps,
    changeImpactSummaries: changeImpacts.map((impact) => impact.impactSummary),
    auditReadinessScore: readiness.overallScore,
    bioriskRuleDrivers: applicability.riskDrivers,
    sourceRecords: applicability.sourceRecords,
    referenceRuleIds: applicability.referenceRuleIds
  };
}

export function applyFoundationContext(input: BioAiInput, context: FoundationAiContext): BioAiInput {
  const gaps = context.evidenceGaps;
  return {
    ...input,
    foundationContext: context,
    missingRequiredSop: input.missingRequiredSop ?? context.requiredDocuments.length > 0,
    missingRequiredTraining: input.missingRequiredTraining ?? context.requiredTraining.length > 0,
    missingBiosafetyReview: input.missingBiosafetyReview ?? context.applicablePrograms.includes("Biosafety"),
    missingQaReview: input.missingQaReview ?? gaps.length > 0,
    dataCompleteness: Math.min(input.dataCompleteness ?? 1, gaps.length > 0 ? 0.68 : 0.9),
    documentReadiness: input.documentReadiness ?? (context.requiredDocuments.length > 0 ? "gaps" : "ready"),
    trainingStatus: input.trainingStatus ?? (context.requiredTraining.length > 0 ? "expired" : "current"),
    auditReadinessStatus: input.auditReadinessStatus ?? (context.auditReadinessScore < 70 ? "gaps" : "ready"),
    referenceRuleIds: unique([...(input.referenceRuleIds ?? []), ...context.referenceRuleIds]),
    sourceRecords: dedupeSourceRecords([...(input.sourceRecords ?? []), ...context.sourceRecords]),
    missingData: unique([...(input.missingData ?? []), ...gaps.slice(0, 4)]),
    signals: [
      ...(input.signals ?? []),
      ...context.bioriskRuleDrivers.slice(0, 3).map((driver) => ({
        type: "audit_finding" as const,
        label: driver,
        severity: "medium",
        evidence: "PredictSafeBIO Intelligence Foundation applicability rule triggered this draft driver.",
        sourceRecords: context.sourceRecords,
        referenceRuleIds: context.referenceRuleIds
      }))
    ]
  };
}

export function northStarFoundationDemo() {
  const answers: FoundationIntakeAnswers = {
    hazardousChemicals: true,
    biologicalMaterials: true,
    humanDerivedSamples: true,
    sharpsUsed: true,
    bsl2Work: true,
    bscUsed: true,
    autoclaveUsed: true,
    repeatIncidents: true,
    expiredTraining: true,
    missingSops: true,
    outOfToleranceEquipment: true,
    chainOfCustodyGaps: true
  };
  const applicability = evaluateApplicability(answers);
  const evidence = buildEvidenceMap(applicability, {
    "Biosafety Manual": "review_needed",
    "Exposure Control Plan": "missing",
    "BBP Training": "expired",
    "BSC Certification Record": "out_of_tolerance",
    "Chemical Inventory": "review_needed"
  });
  const changes = detectChangeImpacts([
    { changeType: "incident", sourceTable: "incidents", sourceRecordId: "northstar-incident", label: "Needlestick exposure", severity: "high" },
    {
      changeType: "equipment_event",
      sourceTable: "equipment_events",
      sourceRecordId: "northstar-bsc-event",
      label: "BSC certification overdue",
      severity: "high"
    },
    { changeType: "new_material", sourceTable: "biological_materials", sourceRecordId: "northstar-human-samples", label: "Human-derived samples", severity: "high" }
  ]);
  const readiness = calculateAuditReadiness(evidence, [
    { type: "biosafety_event", label: "Needlestick exposure", severity: "high", repeatFinding: true },
    { type: "equipment_event", label: "BSC certification overdue", severity: "high" }
  ]);
  const foundationContext = buildFoundationAiContext(applicability, evidence, changes, readiness);
  const aiInput = applyFoundationContext(
    {
      siteName: "NorthStar BioLabs",
      area: "BSL-2 Cell Culture Lab",
      workflow: "Human-derived sample processing",
      controlEffectiveness: "partial",
      biosafetyImpactPotential: true,
      outOfToleranceEquipment: true,
      chainOfCustodyGap: true,
      equipment: ["BSC-001", "Autoclave-001", "Freezer-001", "Incubator-001"],
      materials: ["Human-derived samples", "Sharps", "Hazardous chemicals"],
      incidentContext: {
        incidentId: "northstar-incident",
        status: "investigating",
        severity: "high",
        capaRequired: true,
        repeatPattern: true
      },
      sampleMaterialContext: {
        sampleId: "northstar-human-sample",
        chainOfCustodyStatus: "gap",
        storageConditionStatus: "unknown"
      }
    },
    foundationContext
  );

  return { answers, applicability, evidence, changes, readiness, foundationContext, aiInput };
}

function evidenceItem(
  requirementName: string,
  controlName: string,
  evidenceType: string,
  sourceTable: string,
  evidenceStatus: EvidenceStatus
): EvidenceMapItem {
  return {
    requirementName,
    controlName,
    evidenceType,
    sourceTable,
    evidenceStatus,
    auditReady: evidenceStatus === "current" || evidenceStatus === "ready"
  };
}

function sourceTableForRecord(record: string) {
  const normalized = record.toLowerCase();
  if (normalized.includes("chemical")) return "chemical_inventory";
  if (normalized.includes("bsc") || normalized.includes("autoclave")) return "equipment_events";
  if (normalized.includes("exposure") || normalized.includes("injury")) return "incidents";
  if (normalized.includes("material")) return "biological_materials";
  return "compliance_evidence_map";
}

function impactsForChange(changeType: ChangeImpactInput["changeType"], target: "document" | "training") {
  const map: Record<ChangeImpactInput["changeType"], Record<"document" | "training", string[]>> = {
    new_material: {
      document: ["Review biosafety risk assessment and material handling SOP"],
      training: ["Assign material-specific handling training"]
    },
    incident: {
      document: ["Review exposure response, reporting, and sharps SOPs"],
      training: ["Assign incident lessons-learned or refresher training"]
    },
    audit_finding: {
      document: ["Review linked controlled procedure and evidence package"],
      training: ["Review role-based competency evidence"]
    },
    equipment_event: {
      document: ["Review equipment use, stop-use, and impact assessment SOPs"],
      training: ["Review equipment-specific operator training"]
    },
    sop_change: {
      document: ["Route controlled document update for human review"],
      training: ["Generate training impact draft for changed SOP"]
    }
  };

  return map[changeType][target];
}

function recommendedActionsForChange(changeType: ChangeImpactInput["changeType"]) {
  const actions: Record<ChangeImpactInput["changeType"], string[]> = {
    new_material: ["Open biosafety review", "Map required documents and training", "Update evidence map"],
    incident: ["Screen for CAPA", "Review training impact", "Attach evidence to audit readiness"],
    audit_finding: ["Screen repeat pattern", "Map finding to CAPA and evidence", "Refresh readiness score"],
    equipment_event: ["Confirm equipment impact", "Review stop-use or qualification evidence", "Screen for CAPA"],
    sop_change: ["Draft training impact", "Update document readiness", "Refresh applicability context"]
  };

  return actions[changeType];
}

function scoreByEvidence(evidence: EvidenceMapItem[], evidenceType: string) {
  const scoped = evidence.filter((item) => item.evidenceType === evidenceType);
  if (scoped.length === 0) return 85;
  const ready = scoped.filter((item) => item.auditReady).length;
  return Math.round((ready / scoped.length) * 100);
}

function average(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function dedupeSourceRecords(records: BioSourceRecord[]) {
  return Array.from(new Map(records.map((record) => [`${record.module}:${record.recordId ?? record.label ?? "unlinked"}`, record])).values());
}
