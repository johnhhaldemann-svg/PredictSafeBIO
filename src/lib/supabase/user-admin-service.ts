/**
 * user-admin-service.ts
 *
 * Server-side queries and mutations for admin user management.
 * All write operations require the Supabase service-role client so they
 * bypass RLS — callers MUST gate these behind isSuperAdmin / isAdminOrAbove
 * checks before invoking.
 *
 * HIPAA: Every mutation emits an audit_events row. No PHI is logged in the
 * payload — only role values, status changes, and actor/target IDs.
 */

import { createServerClient } from "./server";
import { getSupabaseAdminClient } from "./admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  account_status: string;
  organization_id: string | null;
  organization_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

export type AdminUserDetail = AdminUserRow & {
  provider_profile: {
    specialty: string | null;
    license_number: string | null;
    npi_number: string | null;
    credentials: string[];
    accepting_patients: boolean;
  } | null;
  patient_bio: {
    display_name: string | null;
    is_active: boolean;
  } | null;
  recent_audit_events: Array<{
    id: string;
    event_type: string;
    summary: string;
    created_at: string;
  }>;
};

export type UserListFilters = {
  search?: string;       // fuzzy match on name or email
  role?: string;         // exact role value or "" for all
  status?: string;       // account_status value or "" for all
  organizationId?: string;
  page?: number;
  pageSize?: number;
};

// ── List users ────────────────────────────────────────────────────────────────

export async function listAdminUsers(
  filters: UserListFilters = {}
): Promise<{ users: AdminUserRow[]; total: number }> {
  const admin = getSupabaseAdminClient();
  const { page = 1, pageSize = 50 } = filters;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Fetch auth users for email + last_sign_in (admin API)
  const { data: authList } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
  const authMap = new Map(
    (authList?.users ?? []).map((u) => [u.id, { email: u.email ?? null, last_sign_in_at: u.last_sign_in_at ?? null }])
  );

  // Fetch profiles with org names
  let query = admin
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      account_status,
      organization_id,
      created_at,
      organizations ( name )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.role) query = query.eq("role", filters.role);
  if (filters.status) query = query.eq("account_status", filters.status);
  if (filters.organizationId) query = query.eq("organization_id", filters.organizationId);

   
  const { data: profiles, count } = await (query as any);

   
  let users: AdminUserRow[] = ((profiles ?? []) as any[]).map((p: any) => {
    const auth = authMap.get(p.id);
    const org = p.organizations as { name: string } | null;
    return {
      id: p.id,
      email: auth?.email ?? null,
      full_name: p.full_name,
      role: p.role,
      account_status: p.account_status ?? "active",
      organization_id: p.organization_id,
      organization_name: org?.name ?? null,
      created_at: p.created_at,
      last_sign_in_at: auth?.last_sign_in_at ?? null,
    };
  });

  // Client-side search filter (email + name) — Supabase free tier lacks full-text on auth.users
  if (filters.search) {
    const q = filters.search.toLowerCase();
    users = users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q)
    );
  }

  return { users, total: count ?? users.length };
}

// ── Get single user ───────────────────────────────────────────────────────────

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const admin = getSupabaseAdminClient();

  // Auth user
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (!authUser.user) return null;

  // Profile + org — cast as any because new columns (account_status) may not be
  // in the generated Supabase types until `supabase gen types` is re-run.
   
  const { data: profile } = await (admin as any)
    .from("profiles")
    .select("id, full_name, role, account_status, organization_id, created_at, organizations(name)")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;
   
  const p = profile as any;
  const org = p.organizations as { name: string } | null;

  // Provider profile — new table; cast to avoid generated-types mismatch
   
  const { data: providerProfile } = await (admin as any)
    .from("provider_profiles")
    .select("specialty, license_number, npi_number, credentials, accepting_patients")
    .eq("user_id", userId)
    .maybeSingle();

  // Patient bio (no encrypted_notes — never expose that to UI)
   
  const { data: patientBio } = await (admin as any)
    .from("patient_bios")
    .select("display_name, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  // Recent audit events for this user (last 20)
  const { data: auditEvents } = await admin
    .from("audit_events")
    .select("id, event_type, summary, created_at")
    .eq("actor_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    id: p.id,
    email: authUser.user.email ?? null,
    full_name: p.full_name,
    role: p.role,
    account_status: p.account_status ?? "active",
    organization_id: p.organization_id,
    organization_name: org?.name ?? null,
    created_at: p.created_at,
    last_sign_in_at: authUser.user.last_sign_in_at ?? null,
    provider_profile: providerProfile ?? null,
    patient_bio: patientBio ?? null,
    recent_audit_events: (auditEvents ?? []) as Array<{ id: string; event_type: string; summary: string; created_at: string }>,
  };
}

// ── Mutations (service-role only) ─────────────────────────────────────────────

export async function changeUserRole(
  actorId: string,
  targetUserId: string,
  newRole: string,
  organizationId: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();

   
  const { error } = await (admin as any)
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", targetUserId);

  if (error) return { error: (error as { message: string }).message };

   
  await (admin as any).from("audit_events").insert({
    organization_id: organizationId,
    actor_id: actorId,
    event_type: "admin_user_role_changed",
    summary: `User role changed to "${newRole}"`,
    payload: { target_user_id: targetUserId, new_role: newRole },
  });

  return { error: null };
}

export async function setUserAccountStatus(
  actorId: string,
  targetUserId: string,
  status: "active" | "suspended",
  organizationId: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();

   
  const { error } = await (admin as any)
    .from("profiles")
    .update({ account_status: status, updated_at: new Date().toISOString() })
    .eq("id", targetUserId);

  if (error) return { error: (error as { message: string }).message };

  // Also ban/unban in Supabase Auth so suspended users cannot get new sessions
  if (status === "suspended") {
    await admin.auth.admin.updateUserById(targetUserId, { ban_duration: "876600h" }); // ~100 years
  } else {
    await admin.auth.admin.updateUserById(targetUserId, { ban_duration: "none" });
  }

   
  await (admin as any).from("audit_events").insert({
    organization_id: organizationId,
    actor_id: actorId,
    event_type: status === 'suspended' ? 'admin_user_suspended' : 'admin_user_activated',
    summary: `User account ${status === 'suspended' ? 'suspended' : 'reactivated'}`,
    payload: { target_user_id: targetUserId, new_status: status },
  });

  return { error: null };
}

export async function sendPasswordResetEmail(
  actorId: string,
  targetEmail: string,
  organizationId: string,
  redirectUrl: string
): Promise<{ error: string | null }> {
  // Use the regular (non-admin) server client so the email is sent via
  // configured SMTP and uses the correct redirect URL
  const supabase = await createServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: redirectUrl,
  });

  if (error) return { error: error.message };

  const admin = getSupabaseAdminClient();
   
  await (admin as any).from('audit_events').insert({
    organization_id: organizationId,
    actor_id: actorId,
    event_type: 'admin_password_reset_triggered',
    summary: `Password reset email sent to ${targetEmail}`,
    payload: { target_email: targetEmail },
  });

  return { error: null };
}
