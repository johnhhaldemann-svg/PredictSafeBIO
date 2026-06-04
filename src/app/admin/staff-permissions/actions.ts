"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/role-permissions";

export async function togglePlatformPermissionAction(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single();
  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!isSuperAdmin(access)) redirect("/");

  const userId  = formData.get("userId") as string;
  const feature = formData.get("feature") as string;
  const allowed = formData.get("allowed") === "true";

  const admin = getSupabaseAdminClient();
   
  const { error } = await (admin as any)
    .from("feature_permission_grants")
    .upsert({ user_id: userId, granted_by: user.id, scope: "platform", feature, allowed, updated_at: new Date().toISOString() },
      { onConflict: "user_id,scope,feature" });

  if (error) {
    redirect(`/admin/staff-permissions?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/admin/staff-permissions?success=${encodeURIComponent(`Permission updated: ${feature} → ${allowed ? "enabled" : "disabled"}`)}`);
}
