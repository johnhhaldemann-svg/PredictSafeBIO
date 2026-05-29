import { ergonomicTaskTypes, type ErgonomicTaskType } from "./level1";

export const gripQualityOptions = [
  { value: "good", label: "Good grip" },
  { value: "fair", label: "Fair grip" },
  { value: "poor", label: "Poor grip" }
] as const;

export const level2SourceContexts = ["request", "audit"] as const;

export type GripQuality = (typeof gripQualityOptions)[number]["value"];
export type Level2SourceContext = (typeof level2SourceContexts)[number];

export type ErgonomicLevel2Input = {
  requestId?: string | null;
  sourceContext: Level2SourceContext;
  taskType: ErgonomicTaskType;
  taskDescription: string;
  location?: string | null;
  departmentTrade?: string | null;
  measuredLoadLbs: number | null;
  horizontalReachIn: number | null;
  verticalHandHeightIn: number | null;
  travelDistanceIn: number | null;
  frequencyPerMinute: number | null;
  taskDurationMinutes: number | null;
  asymmetryDegrees?: number | null;
  gripQuality: GripQuality;
  postureNotes?: string | null;
  photoEvidenceLabel?: string | null;
  specialistNotes: string;
  formalRecommendations: string[];
  correctiveActionRecommended: boolean;
};

export type ErgonomicLevel2Result = {
  measurementSummary: string;
  riskSummary: string;
  requiredMeasurementsComplete: boolean;
};

const taskTypeValues = new Set(ergonomicTaskTypes.map((task) => task.value));
const gripQualityValues = new Set(gripQualityOptions.map((option) => option.value));

export function validateErgonomicLevel2(input: Partial<ErgonomicLevel2Input>): string[] {
  const errors: string[] = [];

  if (input.sourceContext !== "request" && input.sourceContext !== "audit") {
    errors.push("Level 2 must be launched from a request or audit context.");
  }
  if (!input.taskType || !taskTypeValues.has(input.taskType)) errors.push("Select a valid task type.");
  if (!input.taskDescription?.trim()) errors.push("Describe the task being evaluated.");
  if (!isPositiveNumber(input.measuredLoadLbs)) errors.push("Measured load or force is required.");
  if (!isPositiveNumber(input.horizontalReachIn)) errors.push("Horizontal reach measurement is required.");
  if (!isPositiveNumber(input.verticalHandHeightIn)) errors.push("Vertical hand height measurement is required.");
  if (!isPositiveNumber(input.frequencyPerMinute)) errors.push("Frequency measurement is required.");
  if (!isPositiveNumber(input.taskDurationMinutes)) errors.push("Task duration measurement is required.");
  if (!input.gripQuality || !gripQualityValues.has(input.gripQuality)) errors.push("Grip quality is required.");
  if (!input.specialistNotes?.trim()) errors.push("Specialist review notes are required.");

  return errors;
}

export function evaluateErgonomicLevel2(input: ErgonomicLevel2Input): ErgonomicLevel2Result {
  const measurements = [
    `${input.measuredLoadLbs ?? 0} lb load/force`,
    `${input.horizontalReachIn ?? 0} in horizontal reach`,
    `${input.verticalHandHeightIn ?? 0} in vertical hand height`,
    `${input.frequencyPerMinute ?? 0} reps/min`,
    `${input.taskDurationMinutes ?? 0} min duration`
  ];

  const riskFactors = [
    (input.measuredLoadLbs ?? 0) >= 35 ? "higher measured load/force" : null,
    (input.horizontalReachIn ?? 0) >= 18 ? "extended horizontal reach" : null,
    (input.frequencyPerMinute ?? 0) >= 4 ? "repetitive frequency" : null,
    (input.taskDurationMinutes ?? 0) >= 120 ? "long task duration" : null,
    input.gripQuality === "poor" ? "poor grip quality" : null
  ].filter(Boolean);

  return {
    measurementSummary: measurements.join(", "),
    riskSummary:
      riskFactors.length > 0
        ? `Guided Level 2 review found ${riskFactors.join(", ")}. This is not a final equation score.`
        : "Guided Level 2 measurements were captured without a high measurement trigger in this draft review.",
    requiredMeasurementsComplete: validateErgonomicLevel2(input).length === 0
  };
}

export function parsePositiveNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
