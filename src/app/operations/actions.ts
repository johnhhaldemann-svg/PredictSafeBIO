"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createMapOperationsBundle } from "@/lib/supabase/data";

function field(formData: FormData, name: string, fallback: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function redirectWithMessage(path: string, message: string): never {
  const params = new URLSearchParams({ message });
  redirect(`${path}?${params.toString()}`);
}

export async function createMapOperationsBundleAction(formData: FormData) {
  const result = await createMapOperationsBundle({
    siteName: field(formData, "siteName", "PredictSafeBIO Pilot Site"),
    labName: field(formData, "labName", "QC Microbiology Lab"),
    workflow: field(formData, "workflow", "Biosafety readiness review"),
    referenceTitle: field(formData, "referenceTitle", "Pilot biosafety reference"),
    documentTitle: field(formData, "documentTitle", "Biosafety and BBP SOP"),
    trainingTitle: field(formData, "trainingTitle", "Annual biosafety and BBP training"),
    incidentTitle: field(formData, "incidentTitle", "Biosafety deviation readiness review"),
    equipmentTag: field(formData, "equipmentTag", "BSC-001"),
    sampleIdentifier: field(formData, "sampleIdentifier", "SAMPLE-001")
  });

  if (!result.ok) {
    redirectWithMessage("/operations", result.message);
  }

  revalidatePath("/operations");
  revalidatePath("/workbench");
  revalidatePath("/documents");
  revalidatePath("/admin/audit");
  redirectWithMessage(
    "/operations",
    `${result.bundleLabel} created. Incident ${result.incidentId} and task ${result.taskId} now feed the AI Workbench.`
  );
}
