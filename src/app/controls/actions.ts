"use server";

import { redirect } from "next/navigation";
import {
  archiveControl,
  createControl,
  setControlStatus,
  type ControlTier,
  type ControlStatus,
} from "@/lib/supabase/control-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";

export async function createControlAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const hazardId = String(formData.get("hazardId") ?? "").trim() || null;
  const controlType = (String(formData.get("controlType") ?? "administrative").trim() || "administrative") as ControlTier;
  const status = (String(formData.get("status") ?? "planned").trim() || "planned") as ControlStatus;
  const description = String(formData.get("description") ?? "").trim() || null;
  const ownerRole = String(formData.get("ownerRole") ?? "").trim() || null;
  const verificationDue = String(formData.get("verificationDue") ?? "").trim() || null;

  if (!name) {
    redirect(authMessage("/controls", "Control name is required."));
  }

  const result = await createControl({
    name,
    hazardId,
    controlType,
    status,
    description,
    ownerRole,
    verificationDue,
  });

  redirect(result.ok ? authSuccess("/controls", result.message) : authMessage("/controls", result.message));
}

export async function updateControlStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = (String(formData.get("status") ?? "").trim() || "in_place") as ControlStatus;
  if (!id) redirect("/controls");

  const result = await setControlStatus(id, status);
  redirect(result.ok ? authSuccess("/controls", result.message) : authMessage("/controls", result.message));
}

export async function archiveControlAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/controls");

  const result = await archiveControl(id);
  redirect(result.ok ? authSuccess("/controls", result.message) : authMessage("/controls", result.message));
}
