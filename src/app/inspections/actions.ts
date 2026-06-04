"use server";

import { redirect } from "next/navigation";
import {
  addInspectionFinding,
  closeInspectionFinding,
  createInspection,
  updateInspectionStatus,
  type FindingLevel,
  type InspectionStatus,
  type InspectionType
} from "@/lib/supabase/inspection-service";
import { authMessage } from "@/lib/auth-routing";

export async function createInspectionAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const auditType = String(formData.get("auditType") ?? "internal") as InspectionType;
  const scheduledFor = String(formData.get("scheduledFor") ?? "").trim() || null;

  if (!title) redirect(authMessage("/inspections", "Title is required."));

  const result = await createInspection({ title, auditType, scheduledFor });

  if (result.ok && result.id) {
    redirect(`/inspections/${result.id}?message=${encodeURIComponent(result.message)}`);
  }
  redirect(authMessage("/inspections", result.message));
}

export async function updateInspectionStatusAction(formData: FormData) {
  const inspectionId = String(formData.get("inspectionId") ?? "").trim();
  const status = String(formData.get("status") ?? "") as InspectionStatus;
  const returnTo = String(formData.get("returnTo") ?? `/inspections/${inspectionId}`);

  if (!inspectionId) redirect("/inspections");

  const result = await updateInspectionStatus({ inspectionId, status });
  redirect(authMessage(returnTo, result.message));
}

export async function addFindingAction(formData: FormData) {
  const inspectionId = String(formData.get("inspectionId") ?? "").trim();
  const findingLevel = String(formData.get("findingLevel") ?? "observation") as FindingLevel;
  const title = String(formData.get("title") ?? "").trim();

  if (!inspectionId || !title) {
    redirect(authMessage(`/inspections/${inspectionId}`, "Finding title is required."));
  }

  const result = await addInspectionFinding({ inspectionId, findingLevel, title });
  redirect(authMessage(`/inspections/${inspectionId}`, result.message));
}

export async function closeFindingAction(formData: FormData) {
  const findingId = String(formData.get("findingId") ?? "").trim();
  const inspectionId = String(formData.get("inspectionId") ?? "").trim();

  if (!findingId || !inspectionId) redirect("/inspections");

  const result = await closeInspectionFinding({ findingId, inspectionId });
  redirect(authMessage(`/inspections/${inspectionId}`, result.message));
}
