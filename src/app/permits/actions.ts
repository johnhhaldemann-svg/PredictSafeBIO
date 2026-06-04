"use server";

import { redirect } from "next/navigation";
import {
  createPermit,
  updatePermitStatus,
  type CloseoutStatus,
  type PermitType
} from "@/lib/supabase/permits-service";
import { authMessage } from "@/lib/auth-routing";

export async function createPermitAction(formData: FormData) {
  const permitType = String(formData.get("permitType") ?? "contractor") as PermitType;
  const taskDescription = String(formData.get("taskDescription") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const startTime = String(formData.get("startTime") ?? "").trim() || null;
  const stopTime = String(formData.get("stopTime") ?? "").trim() || null;
  const hazardsRaw = String(formData.get("hazards") ?? "").trim();
  const hazards = hazardsRaw ? hazardsRaw.split(",").map((h) => h.trim()).filter(Boolean) : [];

  const result = await createPermit({ permitType, taskDescription, location, startTime, stopTime, hazards });
  redirect(authMessage("/permits", result.message));
}

export async function updatePermitStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const closeoutStatus = String(formData.get("closeoutStatus") ?? "") as CloseoutStatus;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  if (!id || !closeoutStatus) redirect("/permits");

  const result = await updatePermitStatus(id, closeoutStatus, notes);
  redirect(authMessage("/permits", result.message));
}
