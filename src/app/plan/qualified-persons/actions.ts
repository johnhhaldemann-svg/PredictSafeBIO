"use server";
import { redirect } from "next/navigation";
import { addQualifiedPerson, setQualifiedPersonActive } from "@/lib/supabase/qualified-person-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";
const PATH = "/plan/qualified-persons";

export async function addQualifiedPersonAction(formData: FormData) {
  const profileId = String(formData.get("profileId") ?? "").trim();
  if (!profileId) redirect(authMessage(PATH, "Select a person."));
  const qualifiedFor = String(formData.get("qualifiedFor") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const result = await addQualifiedPerson({
    profileId,
    roleTitle: String(formData.get("roleTitle") ?? "").trim() || undefined,
    qualifiedFor,
    qualificationBasis: String(formData.get("qualificationBasis") ?? "").trim() || undefined,
    expirationDate: String(formData.get("expirationDate") ?? "").trim() || null,
  });
  redirect(result.ok ? authSuccess(PATH, result.message) : authMessage(PATH, result.message));
}

export async function toggleQualifiedPersonAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "1";
  if (!id) redirect(PATH);
  const result = await setQualifiedPersonActive(id, active);
  redirect(result.ok ? authSuccess(PATH, result.message) : authMessage(PATH, result.message));
}
