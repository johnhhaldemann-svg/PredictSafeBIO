import { doNotClaim } from "./source-artifacts";
import { bioRiskFamilies } from "./risk-families";
import type {
  BioAiAssessment,
  BioAiConfidence,
  BioAiInput,
  BioAiSignal,
  BioSourceRecord,
  BioRiskLevel,
  DriverCategory,
  ReviewOwnerRole
} from "./types";

const riskFloor: Record<BioRiskLevel, number> = {
  low: 0,
  moderate: 41,
  high: 61,
  critical: 81
};

const actionTimeframe: Record<BioRiskLevel, BioAiAssessment["actionTimeframe"]> = {
  low: "routine",
  moderate: "same_day",
  high: "before_continuing",
  critical: "immediate"
};

const riskPriority: Record<BioRiskLevel, "low" | "medium" | "high" | "urgent"> = {
  low: "low",
  moderate: "medium",
  high: "high",
  critical: "urgent"
};

export function assessBioRisk(input: BioAiInput): BioAiAssessment {
  const signals = input.signals ?? [];
  const baseScore = calculateWeightedScore(input, signals);
  const missingInformation = detectMissingInformation(input, signals);
  const familyMatches = matchRiskFamilies(input, signals);
  const sourceTrace = buildSourceTrace(input, signals);
  const overrideResult = applyEscalationOverrides(input, signals, baseScore);
  const level = overrideResult.level;
  const score = clampScore(Math.max(baseScore, riskFloor[level]));
  const confidence = classifyConfidence(input, signals, missingInformation);
  const criticalControlGaps = detectCriticalControlGaps(input, familyMatches);
  const topDrivers = buildTopDrivers(input, signals, familyMatches, overrideResult.reasons, criticalControlGaps);
  const recommendedActions = buildRecommendedActions(level, familyMatches, input, overrideResult.reasons, sourceTrace);
  const escalationRequired = level === "high" || level === "critical";
  const holdOrQuarantineReviewRecommended =
    level === "critical" ||
    input.contaminationSuspected === true ||
    input.chainOfCustodyGap === true ||
    familyMatches.some((family) => family.id === "contamination_sterility");
  const humanReviewRequired = escalationRequired || criticalControlGaps.length > 0;
  const humanReviewReason = humanReviewRequired
    ? buildHumanReviewReason(level, overrideResult.reasons, criticalControlGaps)
    : null;

  return {
    score,
    level,
    confidence,
    topDrivers,
    missingInformation,
    criticalControlGaps,
    recommendedActions,
    sourceTrace,
    explanation: buildGuardedExplanation(level, confidence, missingInformation, topDrivers, humanReviewRequired),
    escalationRequired,
    holdOrQuarantineReviewRecommended,
    humanReviewRequired,
    humanReviewReason,
    actionTimeframe: actionTimeframe[level],
    doNotClaim
  };
}

export function classifyRiskLevel(score: number): BioRiskLevel {
  if (score >= 81) return "critical";
  if (score >= 61) return "high";
  if (score >= 41) return "moderate";
  return "low";
}

export function calculateWeightedScore(input: BioAiInput, signals: BioAiSignal[] = input.signals ?? []): number {
  const severity = highestSignalValue(signals, "severity", fallbackSeverity(input));
  const likelihood = highestSignalValue(signals, "likelihood", fallbackLikelihood(input, signals));
  const scope = highestSignalValue(signals, "scope", fallbackScope(input, signals));
  const controlGap = highestSignalValue(signals, "controlGap", fallbackControlGap(input));
  const dataIntegrity = highestSignalValue(signals, "dataIntegrityConcern", fallbackDataIntegrity(input, signals));

  return clampScore(
    ((severity * 0.35 + likelihood * 0.2 + scope * 0.15 + controlGap * 0.15 + dataIntegrity * 0.15) / 5) * 100
  );
}

export function detectMissingInformation(input: BioAiInput, signals: BioAiSignal[] = input.signals ?? []): string[] {
  const missing = new Set(input.missingData ?? []);

  if (!input.siteName && !input.siteId) missing.add("site or facility");
  if (!input.area && !input.labId) missing.add("lab, cleanroom, suite, or operating area");
  if (!input.workflow) missing.add("workflow or process being assessed");
  if (!input.controlEffectiveness || input.controlEffectiveness === "unknown") missing.add("control effectiveness");
  if (signals.length === 0) missing.add("risk signals or evidence");
  if (input.dataCompleteness != null && input.dataCompleteness < 0.75) missing.add("complete source data");
  if (input.detectability == null && signals.some((signal) => signal.detectability != null)) {
    missing.add("assessment-level detectability context");
  }
  if (input.sourceRecords != null && input.sourceRecords.length === 0) missing.add("source record traceability");
  if (input.foundationContext) {
    for (const gap of input.foundationContext.evidenceGaps.slice(0, 5)) {
      missing.add(`foundation evidence gap: ${gap}`);
    }
    if (input.foundationContext.auditReadinessScore < 70) missing.add("foundation audit readiness score below pilot threshold");
  }

  if (isGapStatus(input.trainingStatus)) missing.add("current training assignment evidence");
  if (isGapStatus(input.equipmentStatus)) missing.add("equipment status or calibration evidence");
  if (isGapStatus(input.documentReadiness)) missing.add("current document readiness evidence");
  if (isGapStatus(input.auditReadinessStatus)) missing.add("audit evidence package readiness");

  if (input.contaminationSuspected) {
    missing.add("QA assessment");
    missing.add("batch/sample impact assessment");
    missing.add("investigation status");
    missing.add("final disposition");
  }

  if (input.biosafetyImpactPotential || signals.some((signal) => signal.type === "biosafety_event")) {
    missing.add("biosafety officer review");
    missing.add("containment level verification");
  }

  if (input.chainOfCustodyGap) {
    missing.add("chain-of-custody reconstruction");
    missing.add("sample identity confirmation");
  }

  if (input.outOfToleranceEquipment) {
    missing.add("equipment impact assessment");
    missing.add("calibration or qualification evidence");
  }

  if (input.incidentContext?.capaRequired && input.incidentContext.status !== "closed") {
    missing.add("CAPA screening outcome");
  }

  if (isGapStatus(input.sampleMaterialContext?.chainOfCustodyStatus)) {
    missing.add("sample or material chain-of-custody evidence");
  }

  return Array.from(missing);
}

export function classifyConfidence(
  input: BioAiInput,
  signals: BioAiSignal[] = input.signals ?? [],
  missingInformation = detectMissingInformation(input, signals)
): BioAiConfidence {
  if ((input.dataCompleteness ?? 1) < 0.5 || missingInformation.length >= 5 || signals.length === 0) return "low";
  if (isWeakDetectability(input.detectability) || signals.some((signal) => isWeakDetectability(signal.detectability))) return "medium";
  if ((input.dataCompleteness ?? 1) >= 0.85 && missingInformation.length <= 1 && signals.length >= 2) return "high";
  return "medium";
}

function applyEscalationOverrides(input: BioAiInput, signals: BioAiSignal[], baseScore: number) {
  const reasons: string[] = [];
  let level = classifyRiskLevel(baseScore);

  const raiseTo = (target: BioRiskLevel, reason: string) => {
    if (riskFloor[target] > riskFloor[level]) level = target;
    reasons.push(reason);
  };

  if (input.contaminationSuspected || signals.some((signal) => signal.type === "contamination_event")) {
    raiseTo("critical", "Suspected or confirmed contamination requires QA/quality unit review before disposition.");
  }

  if (input.patientImpactPotential || signals.some((signal) => signal.patientImpactPotential)) {
    raiseTo("high", "Potential patient-impacting quality issue must be escalated for human review.");
  }

  if (input.biosafetyImpactPotential || signals.some((signal) => signal.type === "biosafety_event" || signal.biosafetyImpactPotential)) {
    const hasContainmentLanguage = signals.some((signal) => includesAny(signal.evidence, ["release", "aerosol", "containment breach"]));
    raiseTo(hasContainmentLanguage ? "critical" : "high", "Biosafety exposure, release, spill, sharps, aerosol, or containment concern requires escalation.");
  }

  if (input.chainOfCustodyGap || signals.some((signal) => signal.type === "sample_chain_of_custody")) {
    raiseTo(input.productQualityImpactPotential || input.gxpImpact ? "critical" : "high", "Missing chain of custody for critical samples requires sample owner and QA review.");
  }

  if (signals.some((signal) => signal.type === "data_integrity") || input.regulatoryImpactPotential) {
    raiseTo(input.productQualityImpactPotential || input.regulatoryImpactPotential ? "critical" : "high", "Data integrity concern could affect release, endpoint, submission, or batch records.");
  }

  if (input.outOfToleranceEquipment || signals.some((signal) => signal.type === "equipment_event")) {
    raiseTo(input.gxpImpact || input.productQualityImpactPotential ? "critical" : "high", "Critical equipment out of tolerance affecting active work requires stop-use or impact review.");
  }

  if (input.unapprovedChange || signals.some((signal) => signal.type === "change_control")) {
    raiseTo("high", "Unapproved change affecting a validated process, method, system, assay, cleanroom, or batch requires change-control review.");
  }

  if (input.missingRequiredTraining || input.missingRequiredSop || input.missingQaReview || input.missingBiosafetyReview || input.missingDeviationOrCapa) {
    level = increaseOneBand(level);
    reasons.push("Readiness gap on high-risk work increases risk by one band.");
  }

  if (isGapStatus(input.trainingStatus) || isGapStatus(input.documentReadiness) || isGapStatus(input.auditReadinessStatus)) {
    level = increaseOneBand(level);
    reasons.push("Map-derived readiness evidence shows a training, document, or audit-readiness gap.");
  }

  if (input.foundationContext) {
    if (input.foundationContext.auditReadinessScore < 50) {
      raiseTo("high", "Intelligence Foundation audit readiness is below pilot threshold and requires human review.");
    } else if (input.foundationContext.evidenceGaps.length > 0) {
      level = increaseOneBand(level);
      reasons.push("Intelligence Foundation evidence map contains unresolved document, training, or record gaps.");
    }
  }

  if (isGapStatus(input.equipmentStatus) || isGapStatus(input.sampleMaterialContext?.storageConditionStatus)) {
    raiseTo("high", "Map-derived equipment or storage condition evidence requires impact review.");
  }

  if (input.incidentContext?.capaRequired) {
    raiseTo("high", "Incident context indicates CAPA screening is required.");
  }

  if (signals.some((signal) => signal.repeatFinding) || input.incidentContext?.repeatPattern) {
    level = increaseOneBand(level);
    reasons.push("Repeat deviation pattern increases likelihood and escalation pressure.");
  }

  return { level, reasons };
}

function matchRiskFamilies(input: BioAiInput, signals: BioAiSignal[] = input.signals ?? []) {
  const text = [
    input.area,
    input.workflow,
    input.program,
    input.productCandidate,
    input.batchOrLot,
    input.assay,
    input.processStage,
    input.labId,
    input.trainingStatus,
    input.equipmentStatus,
    input.documentReadiness,
    input.auditReadinessStatus,
    input.foundationContext?.applicablePrograms.join(" "),
    input.foundationContext?.requiredDocuments.join(" "),
    input.foundationContext?.requiredTraining.join(" "),
    input.foundationContext?.bioriskRuleDrivers.join(" "),
    input.incidentContext?.status,
    input.sampleMaterialContext?.chainOfCustodyStatus,
    input.sampleMaterialContext?.storageConditionStatus,
    ...(input.materials ?? []),
    ...(input.equipment ?? []),
    ...signals.flatMap((signal) => [signal.label, signal.evidence, signal.area, signal.assay, signal.equipmentId])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return bioRiskFamilies.filter((family) => {
    const typeMatch = signals.some((signal) => family.signalTypes.includes(signal.type));
    const keywordMatch = family.keywords.some((keyword) => text.includes(keyword));
    return typeMatch || keywordMatch;
  });
}

function detectCriticalControlGaps(input: BioAiInput, families = matchRiskFamilies(input)) {
  const documentedControls = new Set(
    (input.signals ?? []).flatMap((signal) => signal.controls ?? []).map((control) => control.toLowerCase())
  );
  const gaps = new Set<string>();

  for (const family of families) {
    const verifiedCount = family.criticalControls.filter((control) =>
      Array.from(documentedControls).some((documented) => documented.includes(control.split(" ")[0]))
    ).length;

    if (verifiedCount === 0 || input.controlEffectiveness === "missing" || input.controlEffectiveness === "ineffective") {
      gaps.add(`${family.label}: ${family.criticalControls.slice(0, 3).join(", ")}`);
    }
  }

  if (input.missingQaReview) gaps.add("QA review is missing or unverified.");
  if (input.missingBiosafetyReview) gaps.add("Biosafety review is missing or unverified.");
  if (input.missingRequiredSop) gaps.add("Current SOP is missing or unverified.");
  if (input.missingRequiredTraining) gaps.add("Required training is missing or expired.");
  if (isGapStatus(input.documentReadiness)) gaps.add("Document readiness is incomplete or missing.");
  if (isGapStatus(input.trainingStatus)) gaps.add("Training status is incomplete, expired, or missing.");
  if (isGapStatus(input.auditReadinessStatus)) gaps.add("Audit evidence readiness is incomplete or missing.");

  return Array.from(gaps);
}

function buildTopDrivers(
  input: BioAiInput,
  signals: BioAiSignal[],
  families: ReturnType<typeof matchRiskFamilies>,
  overrideReasons: string[],
  criticalControlGaps: string[]
): BioAiAssessment["topDrivers"] {
  const drivers: BioAiAssessment["topDrivers"] = [];

  for (const reason of overrideReasons.slice(0, 4)) {
    drivers.push({
      label: reason.split(" requires ")[0] ?? "Escalation override",
      category: categorizeReason(reason),
      impact: reason.toLowerCase().includes("critical") || reason.toLowerCase().includes("contamination") ? "critical" : "high",
      explanation: reason
    });
  }

  for (const family of families.slice(0, 3)) {
    drivers.push({
      label: family.label,
      category: familyCategory(family.id),
      impact: input.contaminationSuspected || family.id.includes("clinical") ? "critical" : "high",
      explanation: `Matched biotech risk family from local engine blueprint: ${family.label}.`
    });
  }

  if (criticalControlGaps.length > 0) {
    drivers.push({
      label: "Critical control verification gap",
      category: "controls",
      impact: "high",
      explanation: "One or more required controls are missing or unverified in the assessment input."
    });
  }

  if ((input.referenceRuleIds?.length ?? 0) > 0 || signals.some((signal) => (signal.referenceRuleIds?.length ?? 0) > 0)) {
    drivers.push({
      label: "Reference rule mapping",
      category: "regulatory",
      impact: "medium",
      explanation: "One or more trusted reference-rule mappings are linked to this draft assessment."
    });
  }

  const mapDrivers = mapDerivedDrivers(input);
  drivers.push(...mapDrivers);

  const foundationDrivers = foundationContextDrivers(input);
  drivers.push(...foundationDrivers);

  if (signals.some((signal) => signal.repeatFinding) || input.incidentContext?.repeatPattern) {
    drivers.push({
      label: "Repeat pattern across signals",
      category: "pattern",
      impact: "high",
      explanation: "Repeat findings increase likelihood and reduce confidence that controls are stable."
    });
  }

  if (drivers.length === 0) {
    drivers.push({
      label: "Routine monitoring",
      category: "severity",
      impact: "low",
      explanation: "No escalation override matched; continue monitoring with documented controls."
    });
  }

  return dedupeByLabel(drivers).slice(0, 12);
}

function buildRecommendedActions(
  level: BioRiskLevel,
  families: ReturnType<typeof matchRiskFamilies>,
  input: BioAiInput,
  overrideReasons: string[],
  sourceTrace: BioAiAssessment["sourceTrace"]
): BioAiAssessment["recommendedActions"] {
  const actions: BioAiAssessment["recommendedActions"] = [];
  const priority = riskPriority[level];

  for (const family of families.slice(0, 4)) {
    actions.push({
      title: `${family.label} review`,
      priority,
      ownerRole: family.ownerRoles[0],
      actionType: family.actionType,
      reason: `Review ${family.label.toLowerCase()} controls before relying on this assessment.`,
      sourceRecords: sourceTrace.sourceRecords,
      referenceRuleIds: sourceTrace.referenceRuleIds
    });
  }

  if (input.contaminationSuspected) {
    actions.unshift({
      title: "Consider hold or quarantine review",
      priority: "urgent",
      ownerRole: "quality_unit",
      actionType: "hold_or_quarantine_review",
      reason: "Suspected contamination remains critical until assessed by QA or the quality unit.",
      sourceRecords: sourceTrace.sourceRecords,
      referenceRuleIds: sourceTrace.referenceRuleIds
    });
  }

  if (isGapStatus(input.documentReadiness) || sourceTrace.referenceRuleIds.length > 0) {
    actions.push({
      title: "Review mapped document gaps",
      priority,
      ownerRole: "qa",
      actionType: "documentation_review",
      reason: "Reference rules or document-readiness context indicate a draft document review is needed.",
      sourceRecords: sourceTrace.sourceRecords,
      referenceRuleIds: sourceTrace.referenceRuleIds
    });
  }

  if (isGapStatus(input.trainingStatus)) {
    actions.push({
      title: "Review training impact",
      priority,
      ownerRole: "qa",
      actionType: "training_review",
      reason: "Training assignment or competency context is missing, expired, or incomplete.",
      sourceRecords: sourceTrace.sourceRecords,
      referenceRuleIds: sourceTrace.referenceRuleIds
    });
  }

  if (input.incidentContext?.capaRequired || signalsRequireCapa(input)) {
    actions.push({
      title: "Screen for CAPA",
      priority,
      ownerRole: "quality_unit",
      actionType: "deviation_or_capa",
      reason: "Incident, repeat finding, audit finding, equipment, or sample context indicates CAPA screening may be required.",
      sourceRecords: sourceTrace.sourceRecords,
      referenceRuleIds: sourceTrace.referenceRuleIds
    });
  }

  if (isGapStatus(input.equipmentStatus)) {
    actions.push({
      title: "Review equipment impact",
      priority,
      ownerRole: "validation_lead",
      actionType: "equipment_review",
      reason: "Equipment status context indicates out-of-tolerance, missing, or incomplete evidence.",
      sourceRecords: sourceTrace.sourceRecords,
      referenceRuleIds: sourceTrace.referenceRuleIds
    });
  }

  if (isGapStatus(input.sampleMaterialContext?.chainOfCustodyStatus)) {
    actions.push({
      title: "Review sample/material traceability",
      priority,
      ownerRole: "qa",
      actionType: "sample_review",
      reason: "Sample or material context indicates a chain-of-custody or traceability gap.",
      sourceRecords: sourceTrace.sourceRecords,
      referenceRuleIds: sourceTrace.referenceRuleIds
    });
  }

  if (input.foundationContext && input.foundationContext.evidenceGaps.length > 0) {
    actions.unshift({
      title: "Review Intelligence Foundation evidence gaps",
      priority,
      ownerRole: "qa",
      actionType: "documentation_review",
      reason: "Applicability, evidence-map, change-impact, or readiness context generated draft-only gaps for human review.",
      sourceRecords: sourceTrace.sourceRecords,
      referenceRuleIds: sourceTrace.referenceRuleIds
    });
  }

  if (overrideReasons.length > 0 && actions.length === 0) {
    actions.push({
      title: "Escalate to responsible owner",
      priority,
      ownerRole: defaultOwner(input),
      actionType: "qa_review",
      reason: overrideReasons[0],
      sourceRecords: sourceTrace.sourceRecords,
      referenceRuleIds: sourceTrace.referenceRuleIds
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "Continue documented monitoring",
      priority: "low",
      ownerRole: "responsible_scientist",
      actionType: "monitoring",
      reason: "Available data does not show a high-risk escalation trigger.",
      sourceRecords: sourceTrace.sourceRecords,
      referenceRuleIds: sourceTrace.referenceRuleIds
    });
  }

  return dedupeByTitle(actions).slice(0, 5);
}

function buildGuardedExplanation(
  level: BioRiskLevel,
  confidence: BioAiConfidence,
  missingInformation: string[],
  topDrivers: BioAiAssessment["topDrivers"],
  humanReviewRequired: boolean
) {
  const reviewText = humanReviewRequired
    ? "Human review is required before relying on next steps."
    : "Continue routine human oversight and documentation.";
  const missingText =
    missingInformation.length > 0
      ? ` Missing information includes ${missingInformation.slice(0, 4).join(", ")}.`
      : " No major missing-information item was detected.";

  return `Based on available data, this is a potential ${level} biotech risk with ${confidence} confidence. Primary drivers include ${topDrivers
    .slice(0, 3)
    .map((driver) => driver.label)
    .join(", ")}.${missingText} ${reviewText} This draft assessment does not replace quality, regulatory, biosafety, clinical, validation, or scientific judgment.`;
}

function buildHumanReviewReason(level: BioRiskLevel, overrideReasons: string[], criticalControlGaps: string[]) {
  if (level === "critical") return "Critical risk requires immediate human review and possible hold, quarantine, stop-use, or escalation evaluation.";
  if (level === "high") return "High risk requires responsible owner review before work, batch, study, sample, or change continues.";
  if (overrideReasons.length > 0) return overrideReasons[0];
  if (criticalControlGaps.length > 0) return "Critical controls are missing or unverified.";
  return "Human review is required by platform rule.";
}

function highestSignalValue(signals: BioAiSignal[], key: keyof BioAiSignal, fallback: number) {
  return Math.max(fallback, ...signals.map((signal) => normalizeFivePoint(signal[key])));
}

function normalizeFivePoint(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.min(5, Math.max(1, value));
  if (typeof value !== "string") return 1;
  const normalized = value.toLowerCase();
  if (["critical", "catastrophic", "urgent", "very high"].some((token) => normalized.includes(token))) return 5;
  if (["high", "major", "serious"].some((token) => normalized.includes(token))) return 4;
  if (["medium", "moderate"].some((token) => normalized.includes(token))) return 3;
  if (["minor", "low"].some((token) => normalized.includes(token))) return 2;
  return 1;
}

function buildSourceTrace(input: BioAiInput, signals: BioAiSignal[] = input.signals ?? []) {
  const sourceRecords = dedupeSourceRecords([
    ...(input.sourceRecords ?? []),
    ...signals.flatMap((signal) => signal.sourceRecords ?? []),
    ...(input.labId ? [{ module: "lab" as const, recordId: input.labId, label: input.area ?? "Assessment lab" }] : []),
    ...(input.siteId ? [{ module: "site" as const, recordId: input.siteId, label: input.siteName ?? "Assessment site" }] : []),
    ...(input.incidentContext?.incidentId
      ? [{ module: "incident" as const, recordId: input.incidentContext.incidentId, label: "Linked incident" }]
      : []),
    ...(input.sampleMaterialContext?.sampleId
      ? [{ module: "sample" as const, recordId: input.sampleMaterialContext.sampleId, label: "Linked sample" }]
      : []),
    ...(input.sampleMaterialContext?.materialId
      ? [{ module: "material" as const, recordId: input.sampleMaterialContext.materialId, label: "Linked material" }]
      : []),
    ...(input.foundationContext?.sourceRecords ?? [])
  ]);
  const referenceRuleIds = Array.from(
    new Set([
      ...(input.referenceRuleIds ?? []),
      ...signals.flatMap((signal) => signal.referenceRuleIds ?? []),
      ...(input.foundationContext?.referenceRuleIds ?? [])
    ])
  );

  return { sourceRecords, referenceRuleIds };
}

function dedupeSourceRecords(records: BioSourceRecord[]) {
  return Array.from(
    new Map(records.map((record) => [`${record.module}:${record.recordId ?? record.label ?? "unlinked"}`, record])).values()
  );
}

function isGapStatus(status: unknown) {
  return ["gap", "gaps", "missing", "expired", "out_of_tolerance", "excursion", "unknown"].includes(String(status ?? ""));
}

function isWeakDetectability(value: unknown) {
  if (value == null) return false;
  const normalized = normalizeFivePoint(value);
  return normalized >= 4 || String(value).toLowerCase().includes("low detectability");
}

function mapDerivedDrivers(input: BioAiInput): BioAiAssessment["topDrivers"] {
  const drivers: BioAiAssessment["topDrivers"] = [];
  const add = (label: string, category: DriverCategory, explanation: string) => {
    drivers.push({ label, category, impact: "high", explanation });
  };

  if (isGapStatus(input.trainingStatus)) add("Training impact context", "training", "Mapped training status is missing, expired, or incomplete.");
  if (isGapStatus(input.documentReadiness)) add("Document readiness context", "controls", "Mapped document readiness indicates missing or incomplete controlled documentation.");
  if (isGapStatus(input.equipmentStatus)) add("Equipment status context", "equipment", "Mapped equipment status indicates out-of-tolerance, missing, or incomplete evidence.");
  if (isGapStatus(input.auditReadinessStatus)) add("Audit evidence readiness", "regulatory", "Mapped audit evidence readiness indicates incomplete evidence packaging.");
  if (input.incidentContext?.capaRequired) add("Incident CAPA screening", "quality", "Linked incident context indicates CAPA screening is required.");
  if (isGapStatus(input.sampleMaterialContext?.chainOfCustodyStatus)) {
    add("Sample/material traceability context", "sample", "Mapped sample or material context indicates a chain-of-custody gap.");
  }

  return drivers;
}

function foundationContextDrivers(input: BioAiInput): BioAiAssessment["topDrivers"] {
  const context = input.foundationContext;
  if (!context) return [];

  const drivers: BioAiAssessment["topDrivers"] = [];
  if (context.applicablePrograms.length > 0) {
    drivers.push({
      label: "Applicability engine outputs",
      category: "regulatory",
      impact: "high",
      explanation: `Applicable pilot programs include ${context.applicablePrograms.slice(0, 4).join(", ")}.`
    });
  }
  if (context.evidenceGaps.length > 0) {
    drivers.push({
      label: "Evidence map gaps",
      category: "controls",
      impact: "high",
      explanation: `Foundation evidence map has ${context.evidenceGaps.length} unresolved draft gap(s).`
    });
  }
  if (context.changeImpactSummaries.length > 0) {
    drivers.push({
      label: "Change impact context",
      category: "pattern",
      impact: "high",
      explanation: context.changeImpactSummaries[0]
    });
  }
  if (context.auditReadinessScore < 70) {
    drivers.push({
      label: "Audit readiness score",
      category: "regulatory",
      impact: context.auditReadinessScore < 50 ? "critical" : "high",
      explanation: `Foundation readiness score is ${context.auditReadinessScore}; draft gaps require human review.`
    });
  }

  return drivers;
}

function signalsRequireCapa(input: BioAiInput) {
  return (input.signals ?? []).some((signal) =>
    ["deviation", "audit_finding", "equipment_event", "sample_chain_of_custody"].includes(signal.type)
  );
}

function fallbackSeverity(input: BioAiInput) {
  if (input.contaminationSuspected || input.patientImpactPotential) return 5;
  if (input.productQualityImpactPotential || input.biosafetyImpactPotential || input.gxpImpact) return 4;
  return 2;
}

function fallbackLikelihood(input: BioAiInput, signals: BioAiSignal[]) {
  let likelihood = signals.length >= 2 ? 3 : 2;
  if (signals.some((signal) => signal.repeatFinding) || input.missingDeviationOrCapa) likelihood += 1;
  return Math.min(5, likelihood);
}

function fallbackScope(input: BioAiInput, signals: BioAiSignal[]) {
  if (input.batchOrLot || input.program || signals.some((signal) => signal.batchOrLot || signal.program)) return 4;
  if (input.sampleId || input.assay) return 3;
  return 2;
}

function fallbackControlGap(input: BioAiInput) {
  if (input.controlEffectiveness === "missing" || input.controlEffectiveness === "ineffective") return 5;
  if (input.controlEffectiveness === "partial" || input.controlEffectiveness === "unknown") return 3;
  return 1;
}

function fallbackDataIntegrity(input: BioAiInput, signals: BioAiSignal[]) {
  if (signals.some((signal) => signal.type === "data_integrity")) return 5;
  if ((input.dataCompleteness ?? 1) < 0.5) return 5;
  if ((input.dataCompleteness ?? 1) < 0.75) return 3;
  return 1;
}

function increaseOneBand(level: BioRiskLevel): BioRiskLevel {
  if (level === "low") return "moderate";
  if (level === "moderate") return "high";
  if (level === "high") return "critical";
  return "critical";
}

function clampScore(score: number) {
  return Math.round(Math.max(0, Math.min(100, score)));
}

function includesAny(text: string | null | undefined, tokens: string[]) {
  const normalized = text?.toLowerCase() ?? "";
  return tokens.some((token) => normalized.includes(token));
}

function categorizeReason(reason: string): DriverCategory {
  const normalized = reason.toLowerCase();
  if (normalized.includes("biosafety") || normalized.includes("containment")) return "biosafety";
  if (normalized.includes("data integrity")) return "data_integrity";
  if (normalized.includes("equipment")) return "equipment";
  if (normalized.includes("training")) return "training";
  if (normalized.includes("chain") || normalized.includes("sample")) return "sample";
  if (normalized.includes("patient") || normalized.includes("quality") || normalized.includes("contamination")) return "quality";
  return "controls";
}

function familyCategory(familyId: string): DriverCategory {
  if (familyId.includes("biosafety")) return "biosafety";
  if (familyId.includes("data")) return "data_integrity";
  if (familyId.includes("equipment")) return "equipment";
  if (familyId.includes("sample")) return "sample";
  if (familyId.includes("training")) return "training";
  if (familyId.includes("clinical")) return "regulatory";
  return "quality";
}

function defaultOwner(input: BioAiInput): ReviewOwnerRole {
  if (input.biosafetyImpactPotential) return "biosafety_officer";
  if (input.regulatoryImpactPotential) return "regulatory_affairs";
  if (input.outOfToleranceEquipment) return "validation_lead";
  return "qa";
}

function dedupeByLabel<T extends { label: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.label, item])).values());
}

function dedupeByTitle<T extends { title: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.title, item])).values());
}
