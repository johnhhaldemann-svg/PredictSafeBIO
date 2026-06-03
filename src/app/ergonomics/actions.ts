"use server";

import { revalidatePath } from "next/cache";
import {
  requestAdvancedErgonomicEvaluation,
  saveErgonomicLevel2Inspection,
  saveErgonomicSelfAssessment,
  type ErgonomicSelfAssessmentSubmission
} from "@/lib/supabase/data";
import {
  ergonomicBodyParts,
  ergonomicDiscomfortLevels,
  ergonomicFrequencies,
  ergonomicTaskTypes,
  normalizeBodyParts,
  type ErgonomicBodyPart,
  type ErgonomicDiscomfortLevel,
  type ErgonomicFrequency,
  type ErgonomicTaskType
} from "@/lib/ergonomics/level1";
import { gripQualityOptions, parsePositiveNumber, type GripQuality, type Level2SourceContext } from "@/lib/ergonomics/level2";

export type ErgonomicAssessmentActionState = {
  ok: boolean;
  message?: string;
  assessmentId?: string;
  riskScore?: number;
  riskLevel?: string;
  repeatedModerateFlag?: boolean;
  correctiveActionRecommended?: boolean;
  level2AutoAssigned?: boolean;
  level2RequestId?: string | null;
};

export type AdvancedEvaluationActionState = {
  ok: boolean;
  message?: string;
  requestId?: string;
};

export type Level2InspectionActionState = {
  ok: boolean;
  message?: string;
  inspectionId?: string;
};

function firstValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function allowedValue<T extends readonly { value: string }[]>(options: T, value: string): T[number]["value"] | "" {
  return options.some((option) => option.value === value) ? value : "";
}

function optionalText(formData: FormData, name: string) {
  return firstValue(formData, name) || null;
}

function bodyPartsFromForm(formData: FormData): ErgonomicBodyPart[] {
  const allowed = new Set(ergonomicBodyParts.map((part) => part.value));
  const selected = formData.getAll("bodyParts").filter((value): value is ErgonomicBodyPart => {
    return typeof value === "string" && allowed.has(value as ErgonomicBodyPart);
  });
  return normalizeBodyParts(selected);
}

export async function submitErgonomicSelfAssessmentAction(
  _previousState: ErgonomicAssessmentActionState,
  formData: FormData
): Promise<ErgonomicAssessmentActionState> {
  const input: ErgonomicSelfAssessmentSubmission = {
    taskType: allowedValue(ergonomicTaskTypes, firstValue(formData, "taskType")) as ErgonomicTaskType,
    discomfortLevel: allowedValue(ergonomicDiscomfortLevels, firstValue(formData, "discomfortLevel")) as ErgonomicDiscomfortLevel,
    bodyParts: bodyPartsFromForm(formData),
    frequency: allowedValue(ergonomicFrequencies, firstValue(formData, "frequency")) as ErgonomicFrequency,
    comments: firstValue(formData, "comments") || null,
    location: firstValue(formData, "location") || null,
    departmentTrade: firstValue(formData, "departmentTrade") || null
  };

  const result = await saveErgonomicSelfAssessment(input);
  revalidatePath("/ergonomics/self-assessment");
  revalidatePath("/inspections");
  revalidatePath("/admin/audit");

  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    message: result.message,
    assessmentId: result.assessmentId,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    repeatedModerateFlag: result.repeatedModerateFlag,
    correctiveActionRecommended: result.correctiveActionRecommended,
    level2AutoAssigned: result.level2AutoAssigned,
    level2RequestId: result.level2RequestId
  };
}

export async function requestAdvancedEvaluationAction(
  _previousState: AdvancedEvaluationActionState,
  formData: FormData
): Promise<AdvancedEvaluationActionState> {
  const assessmentId = firstValue(formData, "assessmentId");
  const reason = firstValue(formData, "reason");
  const result = await requestAdvancedErgonomicEvaluation(assessmentId, reason || undefined);
  revalidatePath("/ergonomics/self-assessment");
  revalidatePath("/inspections");
  revalidatePath("/admin/audit");

  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, requestId: result.requestId, message: result.message };
}

export async function submitLevel2InspectionAction(
  _previousState: Level2InspectionActionState,
  formData: FormData
): Promise<Level2InspectionActionState> {
  const sourceContext = firstValue(formData, "sourceContext") as Level2SourceContext;
  const recommendations = firstValue(formData, "formalRecommendations")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const result = await saveErgonomicLevel2Inspection({
    requestId: optionalText(formData, "requestId"),
    sourceContext,
    taskType: allowedValue(ergonomicTaskTypes, firstValue(formData, "taskType")) as ErgonomicTaskType,
    taskDescription: firstValue(formData, "taskDescription"),
    location: optionalText(formData, "location"),
    departmentTrade: optionalText(formData, "departmentTrade"),
    measuredLoadLbs: parsePositiveNumber(formData.get("measuredLoadLbs")),
    horizontalReachIn: parsePositiveNumber(formData.get("horizontalReachIn")),
    verticalHandHeightIn: parsePositiveNumber(formData.get("verticalHandHeightIn")),
    travelDistanceIn: parsePositiveNumber(formData.get("travelDistanceIn")),
    frequencyPerMinute: parsePositiveNumber(formData.get("frequencyPerMinute")),
    taskDurationMinutes: parsePositiveNumber(formData.get("taskDurationMinutes")),
    asymmetryDegrees: parsePositiveNumber(formData.get("asymmetryDegrees")),
    gripQuality: allowedValue(gripQualityOptions, firstValue(formData, "gripQuality")) as GripQuality,
    postureNotes: optionalText(formData, "postureNotes"),
    photoEvidenceLabel: optionalText(formData, "photoEvidenceLabel"),
    specialistNotes: firstValue(formData, "specialistNotes"),
    formalRecommendations: recommendations,
    correctiveActionRecommended: formData.get("correctiveActionRecommended") === "on"
  });

  revalidatePath("/ergonomics/advanced-evaluation");
  revalidatePath("/inspections");
  revalidatePath("/admin/audit");

  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, inspectionId: result.inspectionId, message: result.message };
}
