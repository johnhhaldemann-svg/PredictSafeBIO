"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function deactivateBioAction(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const bioId = String(formData.get("bioId") ?? "");
  if (!bioId) redirect("/bios?error=Missing+record+ID");

  const admin = getSupabaseAdminClient();
   
  const { error } = await (admin as any)
    .from("patient_bios")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", bioId)
    .eq("organization_id", profile?.organization_id);

  if (error) redirect(`/bios?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/bios");
  redirect("/bios?success=Record+deactivated");
}
