"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkPatientLimit } from "@/lib/supabase/plan-limits-service";

export async function submitPatientBioAction(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bios/new");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/onboarding");

  const orgId = profile.organization_id;

  // Plan limit check
  const limitCheck = await checkPatientLimit(orgId);
  if (!limitCheck.allowed) {
    redirect(`/bios/new?error=${encodeURIComponent(limitCheck.reason)}`);
  }

  const display_name       = String(formData.get("display_name") ?? "").trim();
  const date_of_birth_year = formData.get("dob_year") ? parseInt(String(formData.get("dob_year")), 10) : null;
  const biological_sex     = String(formData.get("biological_sex") ?? "").trim() || null;
  const conditions         = formData.getAll("conditions").map(String).filter(Boolean);
  const allergies          = formData.getAll("allergies").map(String).filter(Boolean);
  const custom_conditions  = String(formData.get("custom_conditions") ?? "").trim();
  const custom_allergies   = String(formData.get("custom_allergies") ?? "").trim();

  if (!display_name) redirect("/bios/new?error=Display+name+is+required");

  // Merge custom entries
  if (custom_conditions) conditions.push(...custom_conditions.split(",").map(s => s.trim()).filter(Boolean));
  if (custom_allergies)  allergies.push(...custom_allergies.split(",").map(s => s.trim()).filter(Boolean));

  const admin = getSupabaseAdminClient();
   
  const { error } = await (admin as any).from("patient_bios").insert({
    organization_id:   orgId,
    user_id:           user.id,
    display_name,
    date_of_birth_year,
    biological_sex,
    conditions,
    allergies,
    is_active:  true,
    created_by: user.id,
  });

  if (error) {
    console.error("[submitPatientBio]", error.message);
    redirect(`/bios/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/bios/new?success=1");
}
