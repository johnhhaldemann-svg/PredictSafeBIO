"use server";

import { redirect } from "next/navigation";
import {
  archiveHazard,
  createHazard,
  type HazardType,
  type HazardStatus,
} from "@/lib/supabase/hazard-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";

export async function createHazardAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const hazardType = (String(formData.get("hazardType") ?? "other").trim() || "other") as HazardType;
  const riskFamily = String(formData.get("riskFamily") ?? "").trim() || null;
  const bslLevelRaw = String(formData.get("bslLevel") ?? "").trim();
  const bslLevel = bslLevelRaw && bslLevelRaw !== "n/a" ? bslLevelRaw : null;
  const containment = String(formData.get("containment") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const associatedMaterial = String(formData.get("associatedMaterial") ?? "").trim() || null;
  const status = (String(formData.get("status") ?? "identified").trim() || "identified") as HazardStatus;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) {
    redirect(authMessage("/hazards", "Hazard name is required."));
  }

  const result = await createHazard({
    name,
    hazardType,
    riskFamily,
    bslLevel,
    containment,
    location,
    associatedMaterial,
    status,
    description,
  });

  redirect(result.ok ? authSuccess("/hazards", result.message) : authMessage("/hazards", result.message));
}

export async function archiveHazardAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/hazards");

  const result = await archiveHazard(id);
  redirect(result.ok ? authSuccess("/hazards", result.message) : authMessage("/hazards", result.message));
}
