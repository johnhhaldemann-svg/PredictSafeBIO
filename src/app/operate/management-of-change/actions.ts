"use server";
import { redirect } from "next/navigation";
import { createMocRecord } from "@/lib/supabase/moc-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";
const PATH = "/operate/management-of-change";

export async function createMocAction(formData: FormData) {
  const changeType = String(formData.get("changeType") ?? "").trim();
  const changeDescription = String(formData.get("changeDescription") ?? "").trim();
  if (!changeType || !changeDescription) redirect(authMessage(PATH, "Change type and description are required."));

  const affectedPrograms = String(formData.get("affectedPrograms") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const flags = formData.getAll("flags").map((f) => String(f)).filter(Boolean);

  const result = await createMocRecord({
    changeType,
    changeDescription,
    affectedPrograms,
    specializedScreenFlags: flags,
    newHazards: String(formData.get("newHazards") ?? "").trim() || undefined,
    changedControls: String(formData.get("changedControls") ?? "").trim() || undefined,
    residualRisk: String(formData.get("residualRisk") ?? "").trim() || undefined,
  });
  redirect(result.ok ? authSuccess(PATH, result.message) : authMessage(PATH, result.message));
}
