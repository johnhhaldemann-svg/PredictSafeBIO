"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import {
  changeUserRole,
  sendPasswordResetEmail,
  setUserAccountStatus,
} from "@/lib/supabase/user-admin-service";
import {
  canViewPlatform,
  isSuperAdmin,
  isPlatformRole,
  ASSIGNABLE_ORG_ROLES,
  ASSIGNABLE_PLATFORM_ROLES,
} from "@/lib/role-permissions";

const ASSIGNABLE_ROLE_VALUES = new Set(
  [...ASSIGNABLE_ORG_ROLES, ...ASSIGNABLE_PLATFORM_ROLES].map((r) => r.value)
);

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAdminActor() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };

  if (!canViewPlatform(access)) redirect("/");

  return {
    actorId: user.id,
    organizationId: profile?.organization_id as string,
    isSuperAdminActor: isSuperAdmin(access),
  };
}

// ── Change role ───────────────────────────────────────────────────────────────

export async function changeUserRoleAction(formData: FormData) {
  const { actorId, organizationId, isSuperAdminActor } = await requireAdminActor();

  const targetUserId = String(formData.get("userId") ?? "");
  const newRole = String(formData.get("role") ?? "");

  if (!targetUserId || !newRole) return;

  // Reject unknown roles — only the curated assignable set is allowed.
  if (!ASSIGNABLE_ROLE_VALUES.has(newRole)) {
    redirect(`/admin/users/${targetUserId}?error=${encodeURIComponent("Invalid role")}`);
  }

  // Only a Super Admin may grant platform roles (platform_staff / superadmin).
  // This blocks a platform_staff user from POSTing role=superadmin to self-escalate.
  if (isPlatformRole(newRole) && !isSuperAdminActor) {
    redirect(`/admin/users/${targetUserId}?error=${encodeURIComponent("Only a Super Admin can assign platform roles")}`);
  }

  const { error } = await changeUserRole(actorId, targetUserId, newRole, organizationId);
  if (error) {
    redirect(`/admin/users/${targetUserId}?error=${encodeURIComponent(error)}`);
  }

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/users");
  redirect(`/admin/users/${targetUserId}?success=Role+updated`);
}

// ── Suspend / activate ────────────────────────────────────────────────────────

export async function suspendUserAction(formData: FormData) {
  const { actorId, organizationId } = await requireAdminActor();
  const targetUserId = String(formData.get("userId") ?? "");

  const { error } = await setUserAccountStatus(actorId, targetUserId, "suspended", organizationId);
  if (error) redirect(`/admin/users/${targetUserId}?error=${encodeURIComponent(error)}`);

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/users");
  redirect(`/admin/users/${targetUserId}?success=User+suspended`);
}

export async function activateUserAction(formData: FormData) {
  const { actorId, organizationId } = await requireAdminActor();
  const targetUserId = String(formData.get("userId") ?? "");

  const { error } = await setUserAccountStatus(actorId, targetUserId, "active", organizationId);
  if (error) redirect(`/admin/users/${targetUserId}?error=${encodeURIComponent(error)}`);

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/users");
  redirect(`/admin/users/${targetUserId}?success=User+activated`);
}

// ── Password reset ────────────────────────────────────────────────────────────

export async function sendPasswordResetAction(formData: FormData) {
  const { actorId, organizationId } = await requireAdminActor();
  const targetEmail = String(formData.get("email") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");

  const origin = (await headers()).get("origin") ?? "";
  const redirectUrl = `${origin}/auth/confirm?next=/account/password`;

  const { error } = await sendPasswordResetEmail(actorId, targetEmail, organizationId, redirectUrl);
  if (error) redirect(`/admin/users/${targetUserId}?error=${encodeURIComponent(error)}`);

  redirect(`/admin/users/${targetUserId}?success=Password+reset+email+sent`);
}
