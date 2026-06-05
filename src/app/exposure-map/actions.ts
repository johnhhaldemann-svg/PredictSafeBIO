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

export async function createExposureAction(formData: FormData) {
  const labId = String(formData.get("labId") ?? "").trim() || null;
  const hazardId = String(formData.get("hazardId") ?? "").trim() || null;
  const material = String(formData.get("material") ?? "").trim() || null;
  const personRole = String(formData.get("personRole") ?? "").trim() || null;
  const exposureRoute = (String(formData.get("exposureRoute") ?? "other").trim() || "other") as ExposureRoute;
  const frequency = (String(formData.get("frequency") ?? "occasional").trim() || "occasional") as ExposureFrequency;
  const status = (String(formData.get("status") ?? "active").trim() || "active") as ExposureStatus;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!material && !personRole) {
    redirect(authMessage("/exposure-map", "Enter at least a material or a person/role."));
  }

  const result = await createExposure({
    labId,
    hazardId,
    material,
    personRole,
    exposureRoute,
    frequency,
    status,
    notes,
  });

  redirect(authMessage("/exposure-map", result.message));
}

export async function updateExposureStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = (String(formData.get("status") ?? "").trim() || "mitigated") as ExposureStatus;
  if (!id) redirect("/exposure-map");

  const result = await setExposureStatus(id, status);
  redirect(authMessage("/exposure-map", result.message));
}
