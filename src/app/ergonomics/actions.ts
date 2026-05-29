"use server";

import { revalidatePath } from "next/cache";
import {
  requestAdvancedErgonomicEvaluation,
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

export type ErgonomicAssessmentActionState = {
  ok: boolean;
  message?: string;
  assessmentId?: string;
  riskScore?: number;
  riskLevel?: string;
  repeatedModerateFlag?: boolean;
  correctiveActionRecommended?: boolean;
};

export type AdvancedEvaluationActionState = {
  ok: boolean;
  message?: string;
  requestId?: string;
};

function firstValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function allowedValue<T extends readonly { value: string }[]>(options: T, value: string): T[number]["value"] | "" {
  return options.some((option) => option.value === value) ? value : "";
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
    correctiveActionRecommended: result.correctiveActionRecommended
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
