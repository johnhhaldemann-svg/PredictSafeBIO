"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Auth guard — all actions require superadmin
// ---------------------------------------------------------------------------

async function requireSuperAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin") throw new Error("Forbidden");
  return { actorId: user.id };
}

async function auditLog(actorId: string, orgId: string, eventType: string, summary: string, payload?: Record<string, unknown>) {
  const admin = getSupabaseAdminClient();
  await admin.from("audit_events").insert({
    organization_id: orgId,
    actor_id: actorId,
    event_type: eventType,
    summary,
    payload: payload ?? {},
  });
}

// ---------------------------------------------------------------------------
// Update company profile
// ---------------------------------------------------------------------------

export async function updateOrgProfileAction(formData: FormData) {
  const { actorId } = await requireSuperAdmin();
  const orgId   = String(formData.get("orgId") ?? "").trim();
  const name    = String(formData.get("name") ?? "").trim();
  const status  = String(formData.get("status") ?? "active").trim();
  const environment = String(formData.get("environment") ?? "production").trim();
  const returnTo = `/admin/org/${orgId}?tab=profile`;

  if (!orgId || !name) redirect(`${returnTo}&error=Name+is+required`);

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ name, status, environment, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  if (error) redirect(`${returnTo}&error=${encodeURIComponent(error.message)}`);

  await auditLog(actorId, orgId, "superadmin_org_updated", `Org profile updated: name="${name}", status="${status}", environment="${environment}"`, { name, status, environment });
  redirect(`/admin/org/${orgId}?tab=profile&success=Profile+saved`);
}

// ---------------------------------------------------------------------------
// Update user role within an org
// ---------------------------------------------------------------------------

export async function updateUserRoleAction(formData: FormData) {
  const { actorId } = await requireSuperAdmin();
  const orgId  = String(formData.get("orgId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  const role   = String(formData.get("role") ?? "").trim();

  if (!orgId || !userId || !role) redirect(`/admin/org/${orgId}?tab=users&error=Missing+fields`);

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("organization_id", orgId);

  if (error) redirect(`/admin/org/${orgId}?tab=users&error=${encodeURIComponent(error.message)}`);

  await auditLog(actorId, orgId, "superadmin_user_role_changed", `User ${userId} role changed to "${role}"`, { userId, role });
  redirect(`/admin/org/${orgId}?tab=users&success=Role+updated`);
}

// ---------------------------------------------------------------------------
// Deactivate / reactivate user
// ---------------------------------------------------------------------------

export async function setUserStatusAction(formData: FormData) {
  const { actorId } = await requireSuperAdmin();
  const orgId    = String(formData.get("orgId") ?? "").trim();
  const userId   = String(formData.get("userId") ?? "").trim();
  const newStatus = String(formData.get("status") ?? "active").trim();

  if (!orgId || !userId) redirect(`/admin/org/${orgId}?tab=users&error=Missing+fields`);

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ account_status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("organization_id", orgId);

  if (error) redirect(`/admin/org/${orgId}?tab=users&error=${encodeURIComponent(error.message)}`);

  await auditLog(actorId, orgId, "superadmin_user_status_changed", `User ${userId} status set to "${newStatus}"`, { userId, newStatus });
  redirect(`/admin/org/${orgId}?tab=users&success=User+status+updated`);
}

// ---------------------------------------------------------------------------
// Invite user to org (creates auth user + profile)
// ---------------------------------------------------------------------------

export async function inviteUserToOrgAction(formData: FormData) {
  const { actorId } = await requireSuperAdmin();
  const orgId = String(formData.get("orgId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role  = String(formData.get("role") ?? "member").trim();
  const fullName = String(formData.get("fullName") ?? "").trim() || null;

  if (!orgId || !email) redirect(`/admin/org/${orgId}?tab=users&error=Email+is+required`);

  const admin = getSupabaseAdminClient();

  // Email lives in auth.users, not profiles — look the user up there.
  const { data: authList } = await admin.auth.admin.listUsers();
  const existingAuthUser = (authList?.users ?? []).find(
    (u: any) => (u.email ?? "").toLowerCase() === email
  );

  if (existingAuthUser) {
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, organization_id")
      .eq("id", existingAuthUser.id)
      .maybeSingle();

    if (existingProfile?.organization_id && existingProfile.organization_id !== orgId) {
      redirect(`/admin/org/${orgId}?tab=users&error=User+already+belongs+to+another+org`);
    }
    // Re-assign / ensure profile in this org
    await admin.from("profiles").upsert({
      id: existingAuthUser.id,
      organization_id: orgId,
      role,
      full_name: fullName ?? undefined,
      account_status: "active",
    }, { onConflict: "id" });
    await auditLog(actorId, orgId, "superadmin_user_added", `Existing user ${email} added to org with role "${role}"`, { email, role });
    redirect(`/admin/org/${orgId}?tab=users&success=User+added`);
  }

  // Invite new user via Supabase auth
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role, organization_id: orgId },
  });

  if (inviteError || !invited?.user) {
    redirect(`/admin/org/${orgId}?tab=users&error=${encodeURIComponent(inviteError?.message ?? "Invite failed")}`);
  }

  // Ensure profile row exists (email is not stored on profiles)
  await admin.from("profiles").upsert({
    id: invited.user.id,
    full_name: fullName,
    role,
    organization_id: orgId,
    account_status: "pending",
  }, { onConflict: "id" });

  await auditLog(actorId, orgId, "superadmin_user_invited", `User ${email} invited with role "${role}"`, { email, role });
  redirect(`/admin/org/${orgId}?tab=users&success=Invitation+sent`);
}

// ---------------------------------------------------------------------------
// Remove user from org (clears org link, does not delete auth user)
// ---------------------------------------------------------------------------

export async function removeUserFromOrgAction(formData: FormData) {
  const { actorId } = await requireSuperAdmin();
  const orgId  = String(formData.get("orgId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!orgId || !userId) redirect(`/admin/org/${orgId}?tab=users&error=Missing+fields`);

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ organization_id: null, role: "member", updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("organization_id", orgId);

  if (error) redirect(`/admin/org/${orgId}?tab=users&error=${encodeURIComponent(error.message)}`);

  await auditLog(actorId, orgId, "superadmin_user_removed", `User ${userId} removed from org`, { userId });
  redirect(`/admin/org/${orgId}?tab=users&success=User+removed`);
}

// ---------------------------------------------------------------------------
// Controls: suspend / reinstate org
// ---------------------------------------------------------------------------

export async function setOrgStatusAction(formData: FormData) {
  const { actorId } = await requireSuperAdmin();
  const orgId  = String(formData.get("orgId") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!orgId) redirect(`/admin/org/${orgId}?tab=controls&error=Missing+orgId`);

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  if (error) redirect(`/admin/org/${orgId}?tab=controls&error=${encodeURIComponent(error.message)}`);

  await auditLog(actorId, orgId, "superadmin_org_status_changed", `Org status set to "${status}"${reason ? `: ${reason}` : ""}`, { status, reason });
  redirect(`/admin/org/${orgId}?tab=controls&success=Org+status+updated`);
}

// ---------------------------------------------------------------------------
// Controls: update feature flags / seat limit for org
// ---------------------------------------------------------------------------

export async function updateOrgControlsAction(formData: FormData) {
  const { actorId } = await requireSuperAdmin();
  const orgId     = String(formData.get("orgId") ?? "").trim();
  const seatLimit = formData.get("seatLimit") ? Number(formData.get("seatLimit")) : null;
  const planTier  = String(formData.get("planTier") ?? "").trim() || null;
  const demoMode  = formData.get("demoMode") === "true";

  if (!orgId) redirect(`/admin/org/${orgId}?tab=controls&error=Missing+orgId`);

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({
      seat_limit: seatLimit,
      plan_tier: planTier,
      demo_mode: demoMode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  if (error) redirect(`/admin/org/${orgId}?tab=controls&error=${encodeURIComponent(error.message)}`);

  await auditLog(actorId, orgId, "superadmin_org_controls_updated", `Controls updated: seatLimit=${seatLimit}, planTier="${planTier}", demoMode=${demoMode}`, { seatLimit, planTier, demoMode });
  redirect(`/admin/org/${orgId}?tab=controls&success=Controls+saved`);
}
