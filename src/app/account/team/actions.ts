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

  redirect(
    authMessage(
      "/account/team",
      result.ok ? result.message : `Error: ${result.message}`
    )
  );
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
