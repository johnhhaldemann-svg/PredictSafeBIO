/**
 * Team management service.
 * Lists org members from profiles and allows owners to remove members.
 */

import { withAuditTrace } from "@/lib/audit-trace";
import { canManageWorkspace } from "@/lib/role-permissions";
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TeamMember = {
  id: string;
  organizationId: string;
  fullName?: string | null;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  isCurrentUser: boolean;
};

export type TeamResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Demo fallback
// ---------------------------------------------------------------------------

function demoTeamMembers(): TeamMember[] {
  return [
    {
      id: "demo-user-owner",
      organizationId: "demo-org",
      fullName: "Demo Owner",
      role: "owner",
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      isCurrentUser: true
    },
    {
      id: "demo-user-member",
      organizationId: "demo-org",
      fullName: "Demo Scientist",
      role: "member",
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      isCurrentUser: false
    }
  ];
}

// ---------------------------------------------------------------------------
// Read: list team members
// ---------------------------------------------------------------------------

export async function listTeamMembers(): Promise<TeamMember[]> {
  if (!isSupabaseConfigured()) return demoTeamMembers();

  const context = await getProfileContext();
  if (!context) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, organization_id, full_name, role, created_at, updated_at")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isCurrentUser: row.id === context.userId
  }));
}

// ---------------------------------------------------------------------------
// Write: remove a member (clears their org association)
// ---------------------------------------------------------------------------

export async function removeMember(memberId: string): Promise<TeamResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in before removing a member." };
  }

  if (!canManageWorkspace(context)) {
    return { ok: false, message: "Only organization owners can remove members." };
  }

  // Safety: cannot remove yourself
  if (memberId === context.userId) {
    return { ok: false, message: "You cannot remove yourself from the organization." };
  }

  const supabase = await createSupabaseServerClient();

  // Verify the member belongs to this org
  const { data: member } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", memberId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (!member) {
    return { ok: false, message: "Member not found in this organization." };
  }

  // Cannot remove another owner
  if (member.role === "owner") {
    return { ok: false, message: "Cannot remove an organization owner. Change their role first." };
  }

  // Clear their org association (soft removal — keeps their auth account)
  const { error } = await supabase
    .from("profiles")
    .update({
      organization_id: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", memberId)
    .eq("organization_id", context.organizationId);

  if (error) return { ok: false, message: error.message };

  // Audit
  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "account_profile_updated",
    summary: `Member ${member.full_name ?? memberId} removed from organization.`,
    payload: withAuditTrace(
      { removedMemberId: memberId, removedMemberName: member.full_name },
      {
        sourceModule: "company_profile",
        sourceRecordId: memberId,
        targetModule: "company_profile",
        draftOnly: false
      }
    )
  });

  return { ok: true, message: `${member.full_name ?? "Member"} removed from organization.` };
}

// ---------------------------------------------------------------------------
// Write: change a member's role
// ---------------------------------------------------------------------------

export async function changeMemberRole(
  memberId: string,
  newRole: "owner" | "member"
): Promise<TeamResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const context = await getProfileContext();
  if (!context || !canManageWorkspace(context)) {
    return { ok: false, message: "Only organization owners can change roles." };
  }

  if (memberId === context.userId) {
    return { ok: false, message: "You cannot change your own role." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("organization_id", context.organizationId);

  if (error) return { ok: false, message: error.message };

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "account_profile_updated",
    summary: `Member role changed to ${newRole}.`,
    payload: withAuditTrace(
      { targetMemberId: memberId, newRole },
      { sourceModule: "company_profile", sourceRecordId: memberId, draftOnly: false }
    )
  });

  return { ok: true, message: `Role updated to ${newRole}.` };
}
