"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addAuditReadinessNote,
  addFoundationReviewTaskNote,
  addFoundationReviewTasksNote,
  createFoundationStarterRecords,
  createFoundationReviewActionFromSource,
  generateFoundationReviewActions,
  markAllFoundationNotificationsRead,
  refreshFoundationSourceResolution,
  seedNorthStarWithConfirmation,
  updateFoundationBioTypeSelection,
  updateFoundationEvidenceReadiness,
  updateFoundationIntakeResponse,
  updateFoundationNotificationReadState,
  updateFoundationReviewTaskStatus,
  updateFoundationReviewTasksStatus,
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
  revalidatePath("/my-work");
  revalidatePath("/admin/audit");
  revalidatePath("/company-profile");
}

function normalizeFoundationReturnTo(value: string) {
  return ["/foundation", "/operations", "/workbench", "/my-work", "/admin/audit"].includes(value) ? value : "/foundation";
}

function normalizeNotificationReturnTo(value: string) {
  return ["/workbench", "/my-work"].includes(value) ? value : "/my-work";
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

export async function createFoundationStarterRecordsAction() {
  const result = await createFoundationStarterRecords();
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
  const returnTo = normalizeFoundationReturnTo(String(formData.get("returnTo") ?? "/foundation"));
  const input = {
    taskId: String(formData.get("taskId") ?? ""),
    status: String(formData.get("status") ?? ""),
    closeoutNote: String(formData.get("closeoutNote") ?? "") || null
  } as {
    taskId: string;
    status: string;
    priority?: string | null;
    dueDate?: string | null;
    assignedTo?: string | null;
    closeoutNote?: string | null;
  };
  if (formData.has("priority")) input.priority = String(formData.get("priority") ?? "") || null;
  if (formData.has("dueDate")) input.dueDate = String(formData.get("dueDate") ?? "") || null;
  if (formData.has("assignedTo")) input.assignedTo = String(formData.get("assignedTo") ?? "") || null;
  const result = await updateFoundationReviewTaskStatus({
    ...input
  });
  revalidateFoundationPaths();
  redirectWithMessage(returnTo, result.message);
}

export async function updateFoundationReviewTasksStatusAction(formData: FormData) {
  const returnTo = normalizeFoundationReturnTo(String(formData.get("returnTo") ?? "/foundation"));
  const result = await updateFoundationReviewTasksStatus({
    taskIds: formData.getAll("taskIds").map(String),
    status: String(formData.get("status") ?? ""),
    closeoutNote: String(formData.get("closeoutNote") ?? "") || null
  });
  revalidateFoundationPaths();
  redirectWithMessage(returnTo, result.message);
}

export async function addFoundationReviewTaskNoteAction(formData: FormData) {
  const returnTo = normalizeFoundationReturnTo(String(formData.get("returnTo") ?? "/foundation"));
  const result = await addFoundationReviewTaskNote({
    taskId: String(formData.get("taskId") ?? ""),
    note: String(formData.get("note") ?? "")
  });
  revalidateFoundationPaths();
  redirectWithMessage(returnTo, result.message);
}

export async function addFoundationReviewTasksNoteAction(formData: FormData) {
  const returnTo = normalizeFoundationReturnTo(String(formData.get("returnTo") ?? "/foundation"));
  const result = await addFoundationReviewTasksNote({
    taskIds: formData.getAll("taskIds").map(String),
    note: String(formData.get("note") ?? "")
  });
  revalidateFoundationPaths();
  redirectWithMessage(returnTo, result.message);
}

export async function refreshFoundationSourceResolutionAction(formData: FormData) {
  const returnTo = normalizeFoundationReturnTo(String(formData.get("returnTo") ?? "/foundation"));
  const result = await refreshFoundationSourceResolution({
    taskId: String(formData.get("taskId") ?? "")
  });
  revalidateFoundationPaths();
  redirectWithMessage(returnTo, result.message);
}

export async function updateFoundationNotificationReadStateAction(formData: FormData) {
  const returnTo = normalizeNotificationReturnTo(String(formData.get("returnTo") ?? "/my-work"));
  const result = await updateFoundationNotificationReadState({
    notificationId: String(formData.get("notificationId") ?? ""),
    read: String(formData.get("read") ?? "true") === "true"
  });
  revalidateFoundationPaths();
  redirectWithMessage(returnTo, result.message);
}

export async function markAllFoundationNotificationsReadAction(formData: FormData) {
  const returnTo = normalizeNotificationReturnTo(String(formData.get("returnTo") ?? "/my-work"));
  const result = await markAllFoundationNotificationsRead();
  revalidateFoundationPaths();
  redirectWithMessage(returnTo, result.message);
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
