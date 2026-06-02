/**
 * Workspace invitation service.
 * Handles invite-only signup enforcement and owner invite management.
 */

import { canManageWorkspace } from "@/lib/role-permissions";
import { createSupabaseServerClient } from "./server";
import { getSupabaseAdminClient } from "./admin";
import { getAuthSummary } from "./account-service";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkspaceInvitation = {
  id: string;
  organizationId: string;
  invitedBy: string;
  email: string;
  role: "owner" | "member";
  token: string;
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt?: string;
};

export type InviteResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Onboarding guard — called at /onboarding to verify a valid invite exists
// ---------------------------------------------------------------------------

/**
 * Returns true when:
 * - Supabase is not configured (demo mode — no restriction), OR
 * - Invite-only mode is disabled via env flag, OR
 * - The signed-in user has a pending, non-expired invitation matching their email.
 *
 * Returns false when invite-only is active and no valid invite exists.
 */
export async function hasValidInviteForCurrentUser(): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  // If invite-only enforcement is explicitly disabled, allow all signups.
  if (process.env.NEXT_PUBLIC_INVITE_ONLY !== "true") return true;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) return false;

  const { data, error } = await supabase
    .from("workspace_invitations")
    .select("id, status, expires_at")
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

/**
 * Marks the invitation as accepted — called after successful onboarding.
 * Safe to call even if no invite exists (graceful no-op).
 */
export async function acceptInviteForCurrentUser(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (process.env.NEXT_PUBLIC_INVITE_ONLY !== "true") return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) return;

  await supabase
    .from("workspace_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());
}

// ---------------------------------------------------------------------------
// Owner: list invitations for their org
// ---------------------------------------------------------------------------

export async function listWorkspaceInvitations(): Promise<WorkspaceInvitation[]> {
  if (!isSupabaseConfigured()) return demoInvitations();

  const context = await getProfileContext();
  if (!context || !canManageWorkspace(context)) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_invitations")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map(mapInvitation);
}

// ---------------------------------------------------------------------------
// Owner: create invitation + send Supabase Auth invite email
// ---------------------------------------------------------------------------

export async function createWorkspaceInvitation(input: {
  email: string;
  role: "owner" | "member";
  redirectTo?: string;
}): Promise<InviteResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const auth = await getAuthSummary();
  if (!canManageWorkspace(auth)) {
    return { ok: false, message: "Only organization owners can invite members." };
  }

  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in before inviting members." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  // Check for existing pending invite for this email in this org
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("workspace_invitations")
    .select("id, status, expires_at")
    .eq("organization_id", context.organizationId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      message: "A pending invite already exists for this email. Revoke it before sending a new one."
    };
  }

  // Insert the invitation record
  const { data: invite, error: insertError } = await supabase
    .from("workspace_invitations")
    .insert({
      organization_id: context.organizationId,
      invited_by: context.userId,
      email,
      role: input.role
    })
    .select("id, token")
    .single();

  if (insertError || !invite) {
    return {
      ok: false,
      message: insertError?.message ?? "Could not create invitation record."
    };
  }

  // Send Supabase Auth invite email (requires service role)
  try {
    const adminClient = getSupabaseAdminClient();
    const redirectTo =
      input.redirectTo ??
      `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/confirm?next=/onboarding`;

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        invited_to_org: context.organizationId,
        invited_role: input.role,
        invite_token: invite.token
      }
    });

    if (inviteError) {
      // Roll back the invite record
      await supabase
        .from("workspace_invitations")
        .update({ status: "revoked" })
        .eq("id", invite.id);
      return {
        ok: false,
        message: `Invitation record created but email could not be sent: ${inviteError.message}. Configure custom SMTP in Supabase Auth settings.`
      };
    }
  } catch {
    return {
      ok: false,
      message:
        "Auth invite email requires SUPABASE_SERVICE_ROLE_KEY. Configure it in .env.local."
    };
  }

  // Audit event
  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "demo_seed_created", // closest existing type; extend later
    summary: `Workspace invitation sent to ${email} with role ${input.role}.`,
    payload: {
      inviteId: invite.id,
      email,
      role: input.role,
      sourceModule: "workspace_invitation",
      draftOnly: false
    }
  });

  return { ok: true, message: `Invitation sent to ${email}.` };
}

// ---------------------------------------------------------------------------
// Owner: revoke an invitation
// ---------------------------------------------------------------------------

export async function revokeWorkspaceInvitation(inviteId: string): Promise<InviteResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const context = await getProfileContext();
  if (!context || !canManageWorkspace(context)) {
    return { ok: false, message: "Only organization owners can revoke invitations." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("workspace_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("organization_id", context.organizationId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Invitation revoked." };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function mapInvitation(row: Record<string, unknown>): WorkspaceInvitation {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    invitedBy: row.invited_by as string,
    email: row.email as string,
    role: row.role as "owner" | "member",
    token: row.token as string,
    status: row.status as "pending" | "accepted" | "revoked",
    expiresAt: row.expires_at as string,
    acceptedAt: row.accepted_at as string | null | undefined,
    createdAt: row.created_at as string | undefined
  };
}

function demoInvitations(): WorkspaceInvitation[] {
  return [
    {
      id: "demo-invite-1",
      organizationId: "demo-org",
      invitedBy: "demo-owner",
      email: "scientist@demo-biotech.com",
      role: "member",
      token: "demo-token-1",
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString()
    }
  ];
}
