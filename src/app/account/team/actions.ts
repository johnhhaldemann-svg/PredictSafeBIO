"use server";

import { redirect } from "next/navigation";
import {
  createWorkspaceInvitation,
  revokeWorkspaceInvitation
} from "@/lib/supabase/invite-service";
import { authMessage } from "@/lib/auth-routing";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminOrAbove } from "@/lib/role-permissions";

export async function toggleMemberPermissionAction(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single();
  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!isAdminOrAbove(access)) redirect("/");

  const memberId  = formData.get("memberId") as string;
  const feature   = formData.get("feature") as string;
  const allowed   = formData.get("allowed") === "true";

  const admin = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("feature_permission_grants")
    .upsert({
      user_id: memberId,
      granted_by: user.id,
      organization_id: profile?.organization_id,
      scope: "org",
      feature,
      allowed,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,scope,feature" });

  if (error) {
    redirect(authMessage("/account/team", `Error: ${error.message}`));
  }
  redirect(authMessage("/account/team", `Permission ${allowed ? "enabled" : "disabled"}: ${feature}`));
}

export async function createInviteAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const role = formData.get("role") === "owner" ? "owner" : "member";

  const result = await createWorkspaceInvitation({ email, role });

  if (!result.ok) {
    redirect(authMessage("/account/team", `Error: ${result.message}`));
  }

  // Encode the invite link in the URL so the team page can display it
  const params = new URLSearchParams({ message: result.message });
  if (result.inviteLink) params.set("inviteLink", result.inviteLink);
  redirect(`/account/team?${params.toString()}`);
}

export async function revokeInviteAction(formData: FormData) {
  const inviteId = String(formData.get("inviteId") ?? "").trim();
  if (!inviteId) redirect(authMessage("/account/team", "Missing invite ID."));

  const result = await revokeWorkspaceInvitation(inviteId);

  redirect(
    authMessage(
      "/account/team",
      result.ok ? result.message : `Error: ${result.message}`
    )
  );
}
