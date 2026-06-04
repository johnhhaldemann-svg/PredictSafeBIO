export const ergonomicTaskTypes = [
  { value: "lifting", label: "Lifting" },
  { value: "pushing_pulling", label: "Pushing / Pulling" },
  { value: "reaching_overhead", label: "Reaching / Overhead" },
  { value: "repetitive_work", label: "Repetitive Work" },
  { value: "other", label: "Other" }
] as const;

export const ergonomicDiscomfortLevels = [
  { value: "easy", label: "Easy / No discomfort", score: 0 },
  { value: "somewhat_tiring", label: "Somewhat tiring / Minor discomfort", score: 1 },
  { value: "very_tiring", label: "Very tiring / Moderate discomfort", score: 2 },
  { value: "extremely_tiring", label: "Extremely tiring / Severe discomfort", score: 3 }
] as const;

export const ergonomicBodyParts = [
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "neck", label: "Neck" },
  { value: "arms", label: "Arms" },
  { value: "hands_wrists", label: "Hands / Wrists" },
  { value: "legs", label: "Legs" },
  { value: "none", label: "None" }
] as const;

export const ergonomicFrequencies = [
  { value: "rarely", label: "Rarely / 1-2 times a day", score: 0 },
  { value: "sometimes", label: "Sometimes / A few times a day", score: 1 },
  { value: "often", label: "Often / Many times a day", score: 2 },
  { value: "all_day", label: "All Day / Most of the day", score: 3 }
] as const;

export const safePredictErgoAiInsight =
  "Even without measurements, this screening provides important ergonomic risk signals. SafePredict uses this information to identify patterns, connect similar discomfort reports, recommend controls, and determine when a higher-level ergonomic review is needed.";

export type ErgonomicTaskType = (typeof ergonomicTaskTypes)[number]["value"];
export type ErgonomicDiscomfortLevel = (typeof ergonomicDiscomfortLevels)[number]["value"];
export type ErgonomicBodyPart = (typeof ergonomicBodyParts)[number]["value"];
export type ErgonomicFrequency = (typeof ergonomicFrequencies)[number]["value"];
export type ErgonomicRiskLevel = "low" | "moderate" | "high" | "severe";
export type ErgonomicEscalationStatus =
  | "none"
  | "monitor"
  | "supervisor_review_recommended"
  | "advanced_evaluation_requested"
  | "corrective_action_recommended";

export type ErgonomicLevel1Input = {
  taskType: ErgonomicTaskType;
  discomfortLevel: ErgonomicDiscomfortLevel;
  bodyParts: ErgonomicBodyPart[];
  frequency: ErgonomicFrequency;
  comments?: string | null;
  location?: string | null;
  departmentTrade?: string | null;
};

export type ErgonomicLevel1Result = {
  riskScore: number;
  riskLevel: ErgonomicRiskLevel;
  meaning: string;
  mainRiskDrivers: string[];
  recommendedNextSteps: string[];
  escalationStatus: ErgonomicEscalationStatus;
  aiInsight: string;
};

const taskTypeLabels = toLabelMap(ergonomicTaskTypes);
const discomfortLabels = toLabelMap(ergonomicDiscomfortLevels);
const frequencyLabels = toLabelMap(ergonomicFrequencies);
const bodyPartLabels = toLabelMap(ergonomicBodyParts);

export function scoreErgonomicLevel1(input: ErgonomicLevel1Input): ErgonomicLevel1Result {
  const discomfortScore = scoreFor(ergonomicDiscomfortLevels, input.discomfortLevel);
  const frequencyScore = scoreFor(ergonomicFrequencies, input.frequency);
  const bodyPartScore = scoreBodyParts(input.bodyParts);
  const riskScore = discomfortScore + frequencyScore + bodyPartScore;
  const riskLevel = classifyErgonomicRisk(riskScore);
  const mainRiskDrivers = buildRiskDrivers(input, { discomfortScore, frequencyScore, bodyPartScore });

  return {
    riskScore,
    riskLevel,
    meaning: riskMeaning[riskLevel],
    mainRiskDrivers,
    recommendedNextSteps: recommendedNextSteps[riskLevel],
    escalationStatus: escalationStatus[riskLevel],
    aiInsight: safePredictErgoAiInsight
  };
}

export function classifyErgonomicRisk(score: number): ErgonomicRiskLevel {
  if (score >= 8) return "severe";
  if (score >= 6) return "high";
  if (score >= 3) return "moderate";
  return "low";
}

export function validateErgonomicLevel1(input: Partial<ErgonomicLevel1Input>): string[] {
  const errors: string[] = [];
  if (!isAllowed(ergonomicTaskTypes, input.taskType)) errors.push("Select a task type.");
  if (!isAllowed(ergonomicDiscomfortLevels, input.discomfortLevel)) errors.push("Select how the task feels on your body.");
  if (!isAllowed(ergonomicFrequencies, input.frequency)) errors.push("Select how often you do this task.");
  const bodyParts = normalizeBodyParts(input.bodyParts ?? []);
  if (bodyParts.length === 0) errors.push("Select at least one body part, or None.");
  return errors;
}

export function normalizeBodyParts(bodyParts: ErgonomicBodyPart[]): ErgonomicBodyPart[] {
  const allowed = new Set(ergonomicBodyParts.map((part) => part.value));
  const normalized = Array.from(new Set(bodyParts.filter((part) => allowed.has(part))));
  return normalized.includes("none") ? ["none"] : normalized;
}

export function ergonomicLabel(kind: "task" | "discomfort" | "frequency" | "bodyPart", value: string) {
  if (kind === "task") return taskTypeLabels.get(value) ?? value;
  if (kind === "discomfort") return discomfortLabels.get(value) ?? value;
  if (kind === "frequency") return frequencyLabels.get(value) ?? value;
  return bodyPartLabels.get(value) ?? value;
}

export function buildErgonomicRiskSignal(input: ErgonomicLevel1Input, result: ErgonomicLevel1Result, context?: {
  id?: string;
  organizationId?: string;
  submitterId?: string;
  dateTime?: string;
  repeatedModerateFlag?: boolean;
}) {
  return {
    signal_type: "ergonomic_level_1_screening",
    task_type: input.taskType,
    discomfort_level: input.discomfortLevel,
    body_parts_selected: normalizeBodyParts(input.bodyParts),
    frequency: input.frequency,
    comments: input.comments ?? null,
    location: input.location ?? null,
    submitter: context?.submitterId ?? null,
    department_trade: input.departmentTrade ?? null,
    risk_score: result.riskScore,
    risk_level: result.riskLevel,
    date_time: context?.dateTime ?? new Date().toISOString(),
    escalation_status: result.escalationStatus,
    repeated_moderate_flag: Boolean(context?.repeatedModerateFlag),
    source_record_id: context?.id ?? null,
    organization_id: context?.organizationId ?? null,
    ai_insight: result.aiInsight
  };
}

function scoreFor<T extends { value: string; score: number }>(options: readonly T[], value: string) {
  return options.find((option) => option.value === value)?.score ?? 0;
}

function scoreBodyParts(bodyParts: ErgonomicBodyPart[]) {
  const selected = normalizeBodyParts(bodyParts).filter((part) => part !== "none");
  if (selected.length === 0) return 0;
  if (selected.length >= 3) return 3;
  return selected.length;
}

function buildRiskDrivers(
  input: ErgonomicLevel1Input,
  scores: { discomfortScore: number; frequencyScore: number; bodyPartScore: number }
) {
  const drivers: string[] = [];
  if (scores.discomfortScore > 0) drivers.push(`Discomfort: ${ergonomicLabel("discomfort", input.discomfortLevel)}`);
  if (scores.frequencyScore > 0) drivers.push(`Frequency: ${ergonomicLabel("frequency", input.frequency)}`);
  if (scores.bodyPartScore > 0) {
    drivers.push(`Body strain: ${normalizeBodyParts(input.bodyParts).map((part) => ergonomicLabel("bodyPart", part)).join(", ")}`);
  }
  if (drivers.length === 0) drivers.push("No discomfort, low frequency, and no body strain selected.");
  return drivers;
}

function isAllowed<T extends { value: string }>(options: readonly T[], value: unknown): value is T["value"] {
  return typeof value === "string" && options.some((option) => option.value === value);
}

function toLabelMap<T extends { value: string; label: string }>(options: readonly T[]) {
  return new Map(options.map((option) => [option.value, option.label]));
}

const riskMeaning: Record<ErgonomicRiskLevel, string> = {
  low: "This task is not showing a strong ergonomic concern from the Level 1 screening inputs.",
  moderate: "This task may be creating early ergonomic strain. Monitor it and use safer work practices.",
  high: "This task is showing clear ergonomic risk signals. Supervisor review is recommended.",
  severe: "This task is showing severe ergonomic risk signals. Stop and request a Level 2 advanced ergonomic evaluation."
};

const recommendedNextSteps: Record<ErgonomicRiskLevel, string[]> = {
  low: ["Continue work and monitor comfort."],
  moderate: ["Use safer techniques, take breaks, and monitor symptoms."],
  high: ["Supervisor review recommended."],
  severe: ["Stop and request advanced ergonomic evaluation."]
};

const escalationStatus: Record<ErgonomicRiskLevel, ErgonomicEscalationStatus> = {
  low: "none",
  moderate: "monitor",
  high: "supervisor_review_recommended",
  severe: "advanced_evaluation_requested"
};
