import { doNotClaim } from "./source-artifacts";
import { bioRiskFamilies } from "./risk-families";
import type {
  BioAiAssessment,
  BioAiConfidence,
  BioAiInput,
  BioAiSignal,
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
  const overrideResult = applyEscalationOverrides(input, signals, baseScore);
  const level = overrideResult.level;
  const score = clampScore(Math.max(baseScore, riskFloor[level]));
  const confidence = classifyConfidence(input, signals, missingInformation);
  const criticalControlGaps = detectCriticalControlGaps(input, familyMatches);
  const topDrivers = buildTopDrivers(input, signals, familyMatches, overrideResult.reasons, criticalControlGaps);
  const recommendedActions = buildRecommendedActions(level, familyMatches, input, overrideResult.reasons);
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
  if (!input.area) missing.add("lab, cleanroom, suite, or operating area");
  if (!input.workflow) missing.add("workflow or process being assessed");
  if (!input.controlEffectiveness || input.controlEffectiveness === "unknown") missing.add("control effectiveness");
  if (signals.length === 0) missing.add("risk signals or evidence");
  if (input.dataCompleteness != null && input.dataCompleteness < 0.75) missing.add("complete source data");

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

  return Array.from(missing);
}

export function classifyConfidence(
  input: BioAiInput,
  signals: BioAiSignal[] = input.signals ?? [],
  missingInformation = detectMissingInformation(input, signals)
): BioAiConfidence {
  if ((input.dataCompleteness ?? 1) < 0.5 || missingInformation.length >= 5 || signals.length === 0) return "low";
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

  if (signals.some((signal) => signal.repeatFinding)) {
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

  if (signals.some((signal) => signal.repeatFinding)) {
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

  return dedupeByLabel(drivers).slice(0, 6);
}

function buildRecommendedActions(
  level: BioRiskLevel,
  families: ReturnType<typeof matchRiskFamilies>,
  input: BioAiInput,
  overrideReasons: string[]
): BioAiAssessment["recommendedActions"] {
  const actions: BioAiAssessment["recommendedActions"] = [];
  const priority = riskPriority[level];

  for (const family of families.slice(0, 4)) {
    actions.push({
      title: `${family.label} review`,
      priority,
      ownerRole: family.ownerRoles[0],
      actionType: family.actionType,
      reason: `Review ${family.label.toLowerCase()} controls before relying on this assessment.`
    });
  }

  if (input.contaminationSuspected) {
    actions.unshift({
      title: "Consider hold or quarantine review",
      priority: "urgent",
      ownerRole: "quality_unit",
      actionType: "hold_or_quarantine_review",
      reason: "Suspected contamination remains critical until assessed by QA or the quality unit."
    });
  }

  if (overrideReasons.length > 0 && actions.length === 0) {
    actions.push({
      title: "Escalate to responsible owner",
      priority,
      ownerRole: defaultOwner(input),
      actionType: "qa_review",
      reason: overrideReasons[0]
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "Continue documented monitoring",
      priority: "low",
      ownerRole: "responsible_scientist",
      actionType: "monitoring",
      reason: "Available data does not show a high-risk escalation trigger."
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
