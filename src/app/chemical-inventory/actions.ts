"use server";

import { redirect } from "next/navigation";
import { archiveChemical, createChemical, type HazardClass } from "@/lib/supabase/chemical-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";

export async function createChemicalAction(formData: FormData) {
  const chemicalName = String(formData.get("chemicalName") ?? "").trim();
  const casNumber = String(formData.get("casNumber") ?? "").trim() || null;
  const hazardClass = (String(formData.get("hazardClass") ?? "").trim() || null) as HazardClass | null;
  const storageGroup = String(formData.get("storageGroup") ?? "").trim() || null;
  const storageLocation = String(formData.get("storageLocation") ?? "").trim() || null;
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const expirationDate = String(formData.get("expirationDate") ?? "").trim() || null;
  const spillResponseNotes = String(formData.get("spillResponseNotes") ?? "").trim() || null;
  const wasteRoute = String(formData.get("wasteRoute") ?? "").trim() || null;
  const restricted = formData.get("restricted") === "on";

  if (!chemicalName) {
    redirect(authMessage("/chemical-inventory", "Chemical name is required."));
  }

  const result = await createChemical({
    chemicalName,
    casNumber,
    hazardClass,
    storageGroup,
    storageLocation,
    quantity,
    expirationDate,
    spillResponseNotes,
    wasteRoute,
    restricted
  });

  redirect(result.ok ? authSuccess("/chemical-inventory", result.message) : authMessage("/chemical-inventory", result.message));
}

export async function archiveChemicalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/chemical-inventory");

  const result = await archiveChemical(id);
  redirect(result.ok ? authSuccess("/chemical-inventory", result.message) : authMessage("/chemical-inventory", result.message));
}
