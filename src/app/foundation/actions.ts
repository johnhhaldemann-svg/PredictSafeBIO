"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addAuditReadinessNote,
  createFoundationReviewActionFromSource,
  generateFoundationReviewActions,
  seedNorthStarWithConfirmation,
  updateFoundationBioTypeSelection,
  updateFoundationEvidenceReadiness,
  updateFoundationIntakeResponse,
  updateFoundationReviewTaskStatus,
  type FoundationActionResult
} from "@/lib/supabase/data";

function redirectWithMessage(path: string, message: string): never {
  const params = new URLSearchParams({ message });
  redirect(`${path}?${params.toString()}`);
}

function revalidateFoundationPaths() {
  revalidatePath("/foundation");
  revalidatePath("/operations");
  revalidatePath("/workbench");
  revalidatePath("/admin/audit");
  revalidatePath("/company-profile");
}

function redirectFoundationResult(result: FoundationActionResult): never {
  revalidateFoundationPaths();
  redirectWithMessage("/foundation", result.message);
}

export async function seedNorthStarWithConfirmationAction(formData: FormData) {
  const result = await seedNorthStarWithConfirmation(String(formData.get("confirmation") ?? ""));
  redirectFoundationResult(result);
}

export async function updateFoundationBioTypeSelectionAction(formData: FormData) {
  const secondaryBioTypes = formData.getAll("secondaryBioTypes").map(String);
  const result = await updateFoundationBioTypeSelection({
    primaryBioType: String(formData.get("primaryBioType") ?? ""),
    secondaryBioTypes
  });
  redirectFoundationResult(result);
}

export async function updateFoundationIntakeResponseAction(formData: FormData) {
  const result = await updateFoundationIntakeResponse({
    responseId: String(formData.get("responseId") ?? ""),
    answer: String(formData.get("answer") ?? "") === "true"
  });
  redirectFoundationResult(result);
}

export async function updateFoundationEvidenceReadinessAction(formData: FormData) {
  const result = await updateFoundationEvidenceReadiness({
    evidenceId: String(formData.get("evidenceId") ?? ""),
    status: String(formData.get("status") ?? "review_needed"),
    auditReady: formData.get("auditReady") === "on"
  });
  redirectFoundationResult(result);
}

export async function addAuditReadinessNoteAction(formData: FormData) {
  const result = await addAuditReadinessNote({
    auditReadinessScoreId: String(formData.get("auditReadinessScoreId") ?? "") || null,
    note: String(formData.get("note") ?? "")
  });
  redirectFoundationResult(result);
}

export async function addFoundationFinalPreviewSignoffAction(formData: FormData) {
  const result = await addAuditReadinessNote({
    auditReadinessScoreId: String(formData.get("auditReadinessScoreId") ?? "") || null,
    note: String(formData.get("note") ?? ""),
    noteType: "final_preview_signoff"
  });
  redirectFoundationResult(result);
}

export async function generateFoundationReviewActionsAction() {
  const result = await generateFoundationReviewActions();
  redirectFoundationResult(result);
}

export async function updateFoundationReviewTaskStatusAction(formData: FormData) {
  const result = await updateFoundationReviewTaskStatus({
    taskId: String(formData.get("taskId") ?? ""),
    status: String(formData.get("status") ?? ""),
    dueDate: String(formData.get("dueDate") ?? "") || null,
    assignedTo: String(formData.get("assignedTo") ?? "") || null
  });
  redirectFoundationResult(result);
}

export async function createFoundationReviewActionFromSourceAction(formData: FormData) {
  const result = await createFoundationReviewActionFromSource({
    sourceModule: String(formData.get("sourceModule") ?? ""),
    sourceRecordId: String(formData.get("sourceRecordId") ?? ""),
    title: String(formData.get("title") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    priority: String(formData.get("priority") ?? "medium")
  });
  redirectFoundationResult(result);
}
