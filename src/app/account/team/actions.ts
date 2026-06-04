"use server";

import { redirect } from "next/navigation";
import {
  createWorkspaceInvitation,
  revokeWorkspaceInvitation
} from "@/lib/supabase/invite-service";
import { authMessage } from "@/lib/auth-routing";

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
