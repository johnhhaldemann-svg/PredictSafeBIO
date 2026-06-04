"use server";

import { redirect } from "next/navigation";
import {
  addCapaAction,
  createCapaRecord,
  updateCapaActionStatus,
  updateCapaStatus,
  type CapaActionStatus,
  type CapaActionType,
  type CapaStatus
} from "@/lib/supabase/capa-service";
import { authMessage } from "@/lib/auth-routing";

export async function createCapaAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const ownerRole = String(formData.get("ownerRole") ?? "").trim() || undefined;
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
  const effectivenessCheckDue = String(formData.get("effectivenessCheckDue") ?? "").trim() || null;
  const sourceAssessmentId = String(formData.get("sourceAssessmentId") ?? "").trim() || null;
  const sourceIncidentId = String(formData.get("sourceIncidentId") ?? "").trim() || null;
  const linkedRecordType = String(formData.get("linkedRecordType") ?? "").trim() || null;
  const linkedRecordId = String(formData.get("linkedRecordId") ?? "").trim() || null;
  const rootCause = String(formData.get("rootCause") ?? "").trim() || null;
  const initialAction = String(formData.get("initialAction") ?? "").trim() || null;

  if (!title) redirect(authMessage("/operations/capa", "Title is required."));

  const result = await createCapaRecord({
    title,
    ownerRole,
    dueDate,
    effectivenessCheckDue,
    sourceAssessmentId,
    sourceIncidentId,
    linkedRecordType,
    linkedRecordId,
    rootCause,
    initialAction
  });

  if (result.ok && result.id) {
    redirect(`/operations/capa/${result.id}?message=${encodeURIComponent(result.message)}`);
  }
  redirect(authMessage("/operations/capa", result.message));
}

export async function updateCapaStatusAction(formData: FormData) {
  const capaId = String(formData.get("capaId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as CapaStatus;
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const returnTo = String(formData.get("returnTo") ?? `/operations/capa/${capaId}`);

  if (!capaId) redirect("/operations/capa");

  const result = await updateCapaStatus({ capaId, status, note });
  redirect(authMessage(returnTo, result.message));
}

export async function addCapaActionAction(formData: FormData) {
  const capaId = String(formData.get("capaId") ?? "").trim();
  const actionType = (String(formData.get("actionType") ?? "corrective")) as CapaActionType;
  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;

  if (!capaId || !title) {
    redirect(authMessage(`/operations/capa/${capaId}`, "Action title is required."));
  }

  const result = await addCapaAction({ capaId, actionType, title, dueDate });
  redirect(authMessage(`/operations/capa/${capaId}`, result.message));
}

export async function updateCapaActionStatusAction(formData: FormData) {
  const actionId = String(formData.get("actionId") ?? "").trim();
  const capaId = String(formData.get("capaId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as CapaActionStatus;

  if (!actionId || !capaId) redirect("/operations/capa");

  const result = await updateCapaActionStatus({ actionId, status });
  redirect(authMessage(`/operations/capa/${capaId}`, result.message));
}
