"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { HumanReviewStatus } from "@/lib/bio-ai/types";
import { updateAssessmentReview } from "@/lib/supabase/data";

const allowedStatuses: HumanReviewStatus[] = [
  "draft_human_review_required",
  "in_review",
  "reviewed_needs_action",
  "reviewed_monitoring"
];

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(path: string, message: string): never {
  const params = new URLSearchParams({ message });
  redirect(`${path}?${params.toString()}`);
}

export async function updateAssessmentReviewAction(formData: FormData) {
  const assessmentId = field(formData, "assessmentId");
  const status = field(formData, "humanReviewStatus") as HumanReviewStatus;
  const reviewerNotes = field(formData, "reviewerNotes");
  const assignedReviewerId = field(formData, "assignedReviewerId") || null;
  const reviewDueDate = field(formData, "reviewDueDate") || null;

  if (!assessmentId || !allowedStatuses.includes(status)) {
    redirectWithMessage("/assessments", "A valid assessment and review status are required.");
  }

  const result = await updateAssessmentReview(assessmentId, status, reviewerNotes, assignedReviewerId, reviewDueDate);
  if (!result.ok) {
    redirectWithMessage(`/assessments/${assessmentId}`, result.message);
  }

  revalidatePath(`/assessments/${assessmentId}`);
  revalidatePath("/assessments");
  revalidatePath("/admin/audit");
  redirectWithMessage(`/assessments/${assessmentId}`, "Human review status updated and audit event created.");
}
