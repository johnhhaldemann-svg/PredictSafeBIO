"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function updateProviderProfileAction(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const specialty      = String(formData.get("specialty") ?? "").trim();
  const npi_number     = String(formData.get("npi_number") ?? "").trim();
  const license_number = String(formData.get("license_number") ?? "").trim();
  const license_state  = String(formData.get("license_state") ?? "").trim();
  const accepting      = formData.get("accepting_patients") === "true";
  const credentials    = formData.getAll("credentials").map(String);

  if (!specialty) {
    redirect("/account/provider?error=Specialty+is+required");
  }

  const admin = getSupabaseAdminClient();
   
  const { error } = await (admin as any)
    .from("provider_profiles")
    .update({
      specialty,
      npi_number:         npi_number || null,
      license_number:     license_number || null,
      license_state:      license_state || null,
      credentials,
      accepting_patients: accepting,
      // Reset to pending if editing — requires re-review
      review_status:      "pending",
      is_public:          false,
      submitted_at:       new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) redirect(`/account/provider?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/account/provider");
  redirect("/account/provider?success=Profile+updated+and+resubmitted+for+review");
}

export async function withdrawProviderProfileAction() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getSupabaseAdminClient();
   
  const { error } = await (admin as any)
    .from("provider_profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) redirect(`/account/provider?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/account/provider");
  redirect("/account/provider?success=Profile+withdrawn");
}
