"use server";

import { redirect } from "next/navigation";
import {
  createPesticideRecord,
  resolveDeviation,
  type ProductType
} from "@/lib/supabase/pesticide-service";
import { authMessage } from "@/lib/auth-routing";

export async function createPesticideAction(formData: FormData) {
  const productName = String(formData.get("productName") ?? "").trim();
  const productType = String(formData.get("productType") ?? "disinfectant") as ProductType;
  const epaRegistrationNumber = String(formData.get("epaRegistrationNumber") ?? "").trim() || null;
  const approvedUse = String(formData.get("approvedUse") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const applicationDate = String(formData.get("applicationDate") ?? "").trim() || null;
  const vendorName = String(formData.get("vendorName") ?? "").trim() || null;
  const contactTimeMinutes = parseInt(String(formData.get("contactTimeMinutes") ?? ""), 10) || null;
  const reentryTimeMinutes = parseInt(String(formData.get("reentryTimeMinutes") ?? ""), 10) || null;
  const deviationNoted = formData.get("deviationNoted") === "on";
  const deviationNotes = String(formData.get("deviationNotes") ?? "").trim() || null;

  if (!productName) redirect(authMessage("/pesticide", "Product name is required."));

  const result = await createPesticideRecord({
    productName,
    productType,
    epaRegistrationNumber,
    approvedUse,
    location,
    applicationDate,
    vendorName,
    contactTimeMinutes,
    reentryTimeMinutes,
    deviationNoted,
    deviationNotes
  });

  redirect(authMessage("/pesticide", result.message));
}

export async function resolveDeviationAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim();

  if (!id) redirect("/pesticide");

  const result = await resolveDeviation(id, resolutionNote || "Deviation reviewed and resolved by EHS.");
  redirect(authMessage("/pesticide", result.message));
}
