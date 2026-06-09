"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkPersonnelLimit } from "@/lib/supabase/plan-limits-service";

export async function submitPersonnelRecordAction(formData: FormData) {
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
  const limitCheck = await checkPersonnelLimit(orgId);
  if (!limitCheck.allowed) {
    redirect(`/bios/new?error=${encodeURIComponent(limitCheck.reason)}`);
  }

  const display_name = String(formData.get("display_name") ?? "").trim();

  if (!display_name) redirect("/bios/new?error=Display+name+is+required");

  const admin = getSupabaseAdminClient();

  const { error } = await (admin as any).from("personnel_records").insert({
    organization_id:   orgId,
    user_id:           user.id,
    display_name,
    is_active:  true,
    created_by: user.id,
  });

  if (error) {
    console.error("[submitPatientBio]", error.message);
    redirect(`/bios/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/bios/new?success=1");
}
