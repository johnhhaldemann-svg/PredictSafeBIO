"use server";

import { redirect } from "next/navigation";
import {
  createExposure,
  setExposureStatus,
  type ExposureRoute,
  type ExposureFrequency,
  type ExposureStatus,
} from "@/lib/supabase/exposure-service";
import { authMessage } from "@/lib/auth-routing";

export async function logExposureAction(formData: FormData) {
  const material = String(formData.get("material") ?? "").trim() || null;
  const personRole = String(formData.get("personRole") ?? "").trim() || null;
  const exposureRoute = (String(formData.get("exposureRoute") ?? "other").trim() || "other") as ExposureRoute;
  const frequency = (String(formData.get("frequency") ?? "occasional").trim() || "occasional") as ExposureFrequency;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const result = await createExposure({ material, personRole, exposureRoute, frequency, notes });
  redirect(authMessage("/monitoring/exposure", result.message));
}

export async function updateExposureStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as ExposureStatus;

  if (!id || !status) redirect("/monitoring/exposure");

  const result = await setExposureStatus(id, status);
  redirect(authMessage("/monitoring/exposure", result.message));
}
