export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity, ArrowLeft, Lock, ShieldAlert, ShieldCheck, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getAdminUserDetail } from "@/lib/supabase/user-admin-service";
import {
  canViewPlatform,
  isSuperAdmin,
  getDbRoleLabel,
  getRoleBadgeClass,
  ASSIGNABLE_ORG_ROLES,
  ASSIGNABLE_PLATFORM_ROLES,
} from "@/lib/role-permissions";
import {
  changeUserRoleAction,
  suspendUserAction,
  activateUserAction,
  sendPasswordResetAction,
} from "../actions";

/**
 * /admin/users/[id] — User Detail & Edit
 *
 * Gated: admin tier and above.
 * Superadmins can change any user's role including to superadmin.
 * Admins can change roles up to (but not including) superadmin.
 */

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

function statusBadgeClass(status: string) {
  if (status === "active") return "status-current";
  if (status === "suspended") return "status-critical";
  return "status-unknown";
}

export default async function UserDetailPage({ params, searchParams }: Props) {
  // Auth gate
  const supabase = await createServerClient();
  const { data: { user: actorUser } } = await supabase.auth.getUser();
  if (!actorUser) redirect("/login");

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", actorUser.id)
    .single();

  const actorAccess = {
    signedIn: true,
    userId: actorUser.id,
    organizationId: actorProfile?.organization_id,
    role: actorProfile?.role,
  };

  if (!canViewPlatform(actorAccess)) redirect("/");

  const { id } = await params;
  const sp = await searchParams;
  const isActorSuperAdmin = isSuperAdmin(actorAccess);

  const userDetail = await getAdminUserDetail(id);
  if (!userDetail) notFound();

  // Admins can only see users in their own org (superadmins see all)
  if (!isActorSuperAdmin && userDetail.organization_id !== actorProfile?.organization_id) {
    redirect("/admin/users");
  }

  // Roles available in the dropdown — only superadmins may assign platform roles
  // (platform_staff / superadmin). Platform staff can assign org roles only.
  const availableRoles = isActorSuperAdmin
    ? [...ASSIGNABLE_ORG_ROLES, ...ASSIGNABLE_PLATFORM_ROLES]
    : ASSIGNABLE_ORG_ROLES;

  const isSuspended = userDetail.account_status === "suspended";

  return (
    <AppShell>
      <div className="page-stack">
        {/* Back nav */}
        <div>
          <Link href="/admin/users" className="text-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
            <ArrowLeft size={14} /> Back to Users
          </Link>
        </div>

        <header className="page-header">
          <p className="section-label">Admin › User Detail</p>
          <h1>{userDetail.full_name ?? userDetail.email ?? "Unknown user"}</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <span className={`role-chip ${getRoleBadgeClass(userDetail.role)}`}>
              {getDbRoleLabel(userDetail.role)}
            </span>
            <span className={`status-chip ${statusBadgeClass(userDetail.account_status)}`}>
              {userDetail.account_status}
            </span>
          </div>
        </header>

        {/* Flash messages */}
        {sp.success && (
          <div className="verification-pass-box">
            <ShieldCheck size={16} />
            <span>{decodeURIComponent(sp.success)}</span>
          </div>
        )}
        {sp.error && (
          <div className="verification-fail-box">
            <ShieldAlert size={16} />
            <span>{decodeURIComponent(sp.error)}</span>
          </div>
        )}

        {/* Profile overview */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Account</p>
              <h2>Profile overview</h2>
            </div>
            <User size={20} />
          </div>
          <div className="action-list">
            <article className="action-row">
              <div><strong>Email</strong></div>
              <p>{userDetail.email ?? "—"}</p>
            </article>
            <article className="action-row">
              <div><strong>User ID</strong></div>
              <p style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{userDetail.id}</p>
            </article>
            <article className="action-row">
              <div><strong>Organization</strong></div>
              <p>{userDetail.organization_name ?? "No organization"}</p>
            </article>
            <article className="action-row">
              <div><strong>Joined</strong></div>
              <p>{new Date(userDetail.created_at).toLocaleString()}</p>
            </article>
            <article className="action-row">
              <div><strong>Last sign-in</strong></div>
              <p>{userDetail.last_sign_in_at ? new Date(userDetail.last_sign_in_at).toLocaleString() : "Never"}</p>
            </article>
          </div>
        </section>

        {/* Provider profile (if applicable) */}
        {userDetail.provider_profile && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Provider</p>
                <h2>Provider profile</h2>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="action-list">
              <article className="action-row">
                <div><strong>Specialty</strong></div>
                <p>{userDetail.provider_profile.specialty ?? "—"}</p>
              </article>
              <article className="action-row">
                <div><strong>NPI Number</strong></div>
                <p>{userDetail.provider_profile.npi_number ?? "—"}</p>
              </article>
              <article className="action-row">
                <div><strong>License</strong></div>
                <p>{userDetail.provider_profile.license_number ?? "—"} ({userDetail.provider_profile.credentials?.join(", ") || "—"})</p>
              </article>
              <article className="action-row">
                <div><strong>Accepting patients</strong></div>
                <p>{userDetail.provider_profile.accepting_patients ? "Yes" : "No"}</p>
              </article>
            </div>
          </section>
        )}

        {/* Patient bio (if applicable) — no clinical PHI shown */}
        {userDetail.patient_bio && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Patient</p>
                <h2>Patient bio</h2>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="verification-pending-box" style={{ marginBottom: "0.75rem" }}>
              <ShieldAlert size={14} />
              <span>PHI protected. Clinical notes are encrypted and not displayed here.</span>
            </div>
            <div className="action-list">
              <article className="action-row">
                <div><strong>Display name</strong></div>
                <p>{userDetail.patient_bio.display_name ?? "—"}</p>
              </article>
              <article className="action-row">
                <div><strong>Biological sex</strong></div>
                <p>{userDetail.patient_bio.biological_sex ?? "—"}</p>
              </article>
              <article className="action-row">
                <div><strong>Birth year</strong></div>
                <p>{userDetail.patient_bio.date_of_birth_year ?? "—"}</p>
              </article>
              <article className="action-row">
                <div><strong>Conditions</strong></div>
                <p>{userDetail.patient_bio.conditions?.join(", ") || "—"}</p>
              </article>
              <article className="action-row">
                <div><strong>Allergies</strong></div>
                <p>{userDetail.patient_bio.allergies?.join(", ") || "—"}</p>
              </article>
              <article className="action-row">
                <div><strong>Record active</strong></div>
                <p>{userDetail.patient_bio.is_active ? "Yes" : "No (soft-deleted)"}</p>
              </article>
            </div>
          </section>
        )}

        {/* ── Admin actions ─────────────────────────────────────────────────── */}

        {/* Change role */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Role management</p>
              <h2>Change role</h2>
            </div>
            <ShieldCheck size={20} />
          </div>
          <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
            Changing a user&apos;s role takes effect immediately. The change is logged to the immutable audit trail.
          </p>
          <form action={changeUserRoleAction} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <input type="hidden" name="userId" value={userDetail.id} />
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
              New role
              <select name="role" defaultValue={userDetail.role} style={{ minWidth: 180 }}>
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
            <button className="button-primary" type="submit">Save role</button>
          </form>
        </section>

        {/* Suspend / Activate */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Account status</p>
              <h2>{isSuspended ? "Account suspended" : "Suspend or activate"}</h2>
            </div>
            <ShieldAlert size={20} />
          </div>
          <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
            Suspending a user immediately revokes their ability to sign in. Reactivating restores access.
            All status changes are logged.
          </p>
          {isSuspended ? (
            <form action={activateUserAction}>
              <input type="hidden" name="userId" value={userDetail.id} />
              <button className="button-primary" type="submit">Activate account</button>
            </form>
          ) : (
            <form action={suspendUserAction}>
              <input type="hidden" name="userId" value={userDetail.id} />
              <button
                className="button-secondary"
                type="submit"
                style={{ color: "var(--error, #c0392b)" }}
              >
                Suspend account
              </button>
            </form>
          )}
        </section>

        {/* Password reset */}
        {userDetail.email && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Security</p>
                <h2>Reset password</h2>
              </div>
              <Lock size={20} />
            </div>
            <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
              Sends a password-reset link to <strong>{userDetail.email}</strong>. Requires SMTP to be configured.
            </p>
            <form action={sendPasswordResetAction}>
              <input type="hidden" name="userId" value={userDetail.id} />
              <input type="hidden" name="email" value={userDetail.email} />
              <button className="button-secondary" type="submit">Send password reset email</button>
            </form>
          </section>
        )}

        {/* Audit trail for this user */}
        {userDetail.recent_audit_events.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Activity</p>
                <h2>Recent audit events</h2>
              </div>
              <Activity size={20} />
            </div>
            <div className="timeline">
              {userDetail.recent_audit_events.map((ev) => (
                <article className="timeline-row" key={ev.id}>
                  <span>{new Date(ev.created_at).toLocaleString()}</span>
                  <strong>{ev.event_type.replace(/_/g, " ")}</strong>
                  <p>{ev.summary}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
