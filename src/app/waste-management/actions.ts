"use server";

import { redirect } from "next/navigation";
import {
  createWasteRecord,
  updateFillLevel,
  markPickedUp,
  type WasteType
} from "@/lib/supabase/waste-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";

export async function createWasteAction(formData: FormData) {
  const wasteType = String(formData.get("wasteType") ?? "other") as WasteType;
  const containerLabel = String(formData.get("containerLabel") ?? "").trim() || null;
  const containerId = String(formData.get("containerId") ?? "").trim() || null;
  const fillLevelRaw = parseInt(String(formData.get("fillLevel") ?? "0"), 10);
  const fillLevel = isNaN(fillLevelRaw) ? 0 : Math.min(100, Math.max(0, fillLevelRaw));
  const disposalVendor = String(formData.get("disposalVendor") ?? "").trim() || null;
  const pickupScheduledDate = String(formData.get("pickupScheduledDate") ?? "").trim() || null;

  const result = await createWasteRecord({
    wasteType,
    containerLabel,
    containerId,
    fillLevel,
    disposalVendor,
    pickupScheduledDate
  });

  redirect(result.ok ? authSuccess("/waste-management", result.message) : authMessage("/waste-management", result.message));
}

export async function updateFillLevelAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const fillLevel = parseInt(String(formData.get("fillLevel") ?? "0"), 10);

  if (!id) redirect("/waste-management");

  const result = await updateFillLevel(id, Math.min(100, Math.max(0, fillLevel)));
  redirect(result.ok ? authSuccess("/waste-management", result.message) : authMessage("/waste-management", result.message));
}

export async function markPickedUpAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const manifestNumber = String(formData.get("manifestNumber") ?? "").trim() || undefined;

  if (!id) redirect("/waste-management");

  const result = await markPickedUp(id, manifestNumber);
  redirect(result.ok ? authSuccess("/waste-management", result.message) : authMessage("/waste-management", result.message));
}
