export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2, ChevronLeft, Users, Settings, Shield, Activity,
  UserPlus, Copy
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlatformConfigError } from "@/components/PlatformConfigError";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import {
  updateOrgProfileAction,
  updateUserRoleAction,
  setUserStatusAction,
  inviteUserToOrgAction,
  removeUserFromOrgAction,
  setOrgStatusAction,
  updateOrgControlsAction,
} from "./actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "overview" | "users" | "profile" | "controls";

type Props = {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ tab?: string; success?: string; error?: string }>;
};

// ---------------------------------------------------------------------------
// Role options
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
  { value: "member",         label: "Member" },
  { value: "owner",          label: "Owner" },
  { value: "admin",          label: "Admin" },
  { value: "company_admin",  label: "Company Admin" },
  { value: "provider",       label: "Provider" },
  { value: "qa",             label: "QA" },
  { value: "ehs",            label: "EHS" },
  { value: "viewer",         label: "Viewer" },
];

function roleBadge(role: string) {
  if (role === "owner" || role === "company_admin") return "status-needs-review";
  if (role === "admin") return "status-overdue";
  if (role === "superadmin") return "status-critical";
  return "status-current";
}

function statusBadge(status: string | null) {
  if (!status || status === "active") return "status-current";
  if (status === "suspended") return "status-overdue";
  if (status === "pending") return "status-needs-review";
  return "status-current";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OrgManagementPage({ params, searchParams }: Props) {
  const { orgId } = await params;
  const { tab: tabParam, success, error } = await searchParams;
  const activeTab: Tab = (tabParam as Tab) ?? "overview";

  // Auth gate — superadmin only
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin") redirect("/workbench");

  if (!isSupabaseServiceConfigured()) return <PlatformConfigError feature="Organization" />;

  const admin = getSupabaseAdminClient();

  // Fetch org
  const { data: org } = await admin
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (!org) redirect("/admin/organizations");

  // Fetch members. Email and last-sign-in live in auth.users (not profiles),
  // so enrich the profile rows from the admin auth API.
  const { data: rawMembers } = await admin
    .from("profiles")
    .select("id, full_name, role, account_status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const { data: authList } = await admin.auth.admin.listUsers();
  const authById = new Map(
    (authList?.users ?? []).map((u: any) => [u.id, u])
  );
  const members = (rawMembers ?? []).map((m: any) => {
    const authUser = authById.get(m.id);
    return {
      ...m,
      email: authUser?.email ?? null,
      last_sign_in: authUser?.last_sign_in_at ?? null,
    };
  });

  // Fetch org-scoped stats
  const [
    { count: assessmentCount },
    { count: documentCount },
    { count: capaCount },
    { data: recentActivity },
  ] = await Promise.all([
    admin.from("biosafety_risk_assessments").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    admin.from("document_metadata").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    admin.from("capa_records").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    admin
      .from("audit_events")
      .select("event_type, summary, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const memberList = members ?? [];

  function tabHref(t: Tab) {
    return `/admin/org/${orgId}?tab=${t}`;
  }

  return (
    <AppShell>
      <div className="page-stack">

        {/* Header */}
        <header className="page-header">
          <div className="page-header-left">
            <Link href="/admin/organizations" className="muted" style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <ChevronLeft size={13} /> All organizations
            </Link>
            <p className="section-label">Platform Admin · Company</p>
            <h1>{org.name}</h1>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className={statusBadge(org.status)} style={{ textTransform: "capitalize" }}>
              {org.status ?? "active"}
            </span>
            <span className="muted" style={{ fontSize: "0.8rem", textTransform: "capitalize" }}>
              {org.environment ?? "production"}
            </span>
          </div>
        </header>

        {/* Feedback banners */}
        {success && (
          <div className="ai-context-bar" style={{ background: "var(--green-light,#f0fdf4)", borderColor: "#bbf7d0", color: "#15803d" }}>
            ✓ {decodeURIComponent(success)}
          </div>
        )}
        {error && (
          <div className="ai-context-bar" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>
            ✗ {decodeURIComponent(error)}
          </div>
        )}

        {/* Tabs */}
        <nav className="command-center-link-strip" aria-label="Company management tabs">
          <Link
            href={tabHref("overview")}
            className={activeTab === "overview" ? "button-primary compact" : "button-secondary compact"}
          >
            <Building2 size={13} /> Overview
          </Link>
          <Link
            href={tabHref("users")}
            className={activeTab === "users" ? "button-primary compact" : "button-secondary compact"}
          >
            <Users size={13} /> Users ({memberList.length})
          </Link>
          <Link
            href={tabHref("profile")}
            className={activeTab === "profile" ? "button-primary compact" : "button-secondary compact"}
          >
            <Settings size={13} /> Profile
          </Link>
          <Link
            href={tabHref("controls")}
            className={activeTab === "controls" ? "button-primary compact" : "button-secondary compact"}
          >
            <Shield size={13} /> Controls
          </Link>
        </nav>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <>
            <section className="command-card-grid" aria-label="Org quick stats">
              <article className="command-card platform-blue">
                <div><span><Users size={16} /></span><strong>Members</strong></div>
                <small>{memberList.length}</small>
                <em>Users in this organization.</em>
              </article>
              <article className="command-card platform-blue">
                <div><span><Activity size={16} /></span><strong>Assessments</strong></div>
                <small>{assessmentCount ?? 0}</small>
                <em>BioRisk assessments saved.</em>
              </article>
              <article className="command-card platform-blue">
                <div><span><Building2 size={16} /></span><strong>Documents</strong></div>
                <small>{documentCount ?? 0}</small>
                <em>Registered documents.</em>
              </article>
              <article className="command-card platform-blue">
                <div><span><Shield size={16} /></span><strong>CAPAs</strong></div>
                <small>{capaCount ?? 0}</small>
                <em>Corrective action records.</em>
              </article>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Organization details</p>
                  <h2>Identity & configuration</h2>
                </div>
              </div>
              <div className="action-list">
                {[
                  ["Org ID", org.id],
                  ["Name", org.name],
                  ["Status", org.status ?? "active"],
                  ["Environment", org.environment ?? "production"],
                  ["Plan tier", org.plan_tier ?? "—"],
                  ["Seat limit", org.seat_limit ?? "Unlimited"],
                  ["Demo mode", org.demo_mode ? "Yes" : "No"],
                  ["Created", new Date(org.created_at).toLocaleString()],
                ].map(([label, value]) => (
                  <article className="action-row" key={String(label)} style={{ alignItems: "center" }}>
                    <div><strong style={{ fontSize: "0.85rem" }}>{label}</strong></div>
                    <p style={{ fontFamily: label === "Org ID" ? "monospace" : undefined, fontSize: "0.85rem" }}>
                      {String(value)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Audit trail</p>
                  <h2>Recent activity</h2>
                </div>
              </div>
              {!recentActivity?.length ? (
                <p className="muted" style={{ padding: "1rem" }}>No audit events recorded yet.</p>
              ) : (
                <div className="action-list">
                  {recentActivity.map((evt, i) => (
                    <article className="action-row" key={i}>
                      <div>
                        <strong style={{ fontSize: "0.82rem" }}>{evt.event_type.replace(/_/g, " ")}</strong>
                      </div>
                      <p style={{ fontSize: "0.82rem" }}>{evt.summary}</p>
                      <span className="muted" style={{ fontSize: "0.74rem" }}>
                        {new Date(evt.created_at).toLocaleString()}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === "users" && (
          <>
            {/* Invite form */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Add user</p>
                  <h2>Invite or assign a user to this organization</h2>
                </div>
                <UserPlus size={20} />
              </div>
              <form action={inviteUserToOrgAction} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
                <input type="hidden" name="orgId" value={orgId} />
                <label style={{ flex: "1 1 200px", minWidth: 160 }}>
                  Email address
                  <input name="email" type="email" placeholder="user@company.com" required />
                </label>
                <label style={{ flex: "1 1 160px", minWidth: 120 }}>
                  Full name (optional)
                  <input name="fullName" type="text" placeholder="Jane Smith" />
                </label>
                <label style={{ flex: "0 0 140px" }}>
                  Role
                  <select name="role" defaultValue="member">
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <button className="button-primary" type="submit" style={{ height: 38, alignSelf: "flex-end" }}>
                  Add user
                </button>
              </form>
            </section>

            {/* User table */}
            <section className="table-panel">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last sign-in</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {memberList.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                        No members in this organization yet.
                      </td>
                    </tr>
                  ) : (
                    memberList.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <strong style={{ fontSize: "0.85rem" }}>{member.full_name ?? "—"}</strong>
                          <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>{member.email ?? "—"}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "monospace" }}>{member.id.slice(0, 8)}…</div>
                        </td>
                        <td>
                          <form action={updateUserRoleAction} style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                            <input type="hidden" name="orgId" value={orgId} />
                            <input type="hidden" name="userId" value={member.id} />
                            <select name="role" defaultValue={member.role} style={{ fontSize: "0.8rem" }}>
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            <button className="button-secondary compact" type="submit" style={{ fontSize: "0.76rem" }}>
                              Save
                            </button>
                          </form>
                        </td>
                        <td>
                          <span className={statusBadge(member.account_status)} style={{ textTransform: "capitalize" }}>
                            {member.account_status ?? "active"}
                          </span>
                        </td>
                        <td className="muted" style={{ fontSize: "0.8rem" }}>
                          {member.last_sign_in ? new Date(member.last_sign_in).toLocaleDateString() : "Never"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                            {/* Toggle status */}
                            <form action={setUserStatusAction}>
                              <input type="hidden" name="orgId" value={orgId} />
                              <input type="hidden" name="userId" value={member.id} />
                              <input type="hidden" name="status" value={member.account_status === "suspended" ? "active" : "suspended"} />
                              <button className="button-secondary compact" type="submit" style={{ fontSize: "0.76rem" }}>
                                {member.account_status === "suspended" ? "Reinstate" : "Suspend"}
                              </button>
                            </form>
                            {/* Remove */}
                            <form action={removeUserFromOrgAction}>
                              <input type="hidden" name="orgId" value={orgId} />
                              <input type="hidden" name="userId" value={member.id} />
                              <button className="button-secondary compact" type="submit" style={{ fontSize: "0.76rem", color: "var(--red,#dc2626)" }}>
                                Remove
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Company profile</p>
                <h2>Edit organization details</h2>
              </div>
            </div>
            <form action={updateOrgProfileAction} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 480 }}>
              <input type="hidden" name="orgId" value={orgId} />
              <label>
                Organization name
                <input name="name" defaultValue={org.name} required />
              </label>
              <label>
                Status
                <select name="status" defaultValue={org.status ?? "active"}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label>
                Environment
                <select name="environment" defaultValue={org.environment ?? "production"}>
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="demo">Demo</option>
                  <option value="development">Development</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button className="button-primary" type="submit">Save profile</button>
                <Link href={tabHref("profile")} className="button-secondary">Cancel</Link>
              </div>
            </form>

            <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <p className="section-label">Org ID</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.3rem" }}>
                <code style={{ fontSize: "0.82rem", background: "var(--surface)", padding: "0.3rem 0.5rem", borderRadius: 4, border: "1px solid var(--border)" }}>
                  {orgId}
                </code>
                <Copy size={14} className="muted" />
              </div>
            </div>
          </section>
        )}

        {/* ── CONTROLS TAB ── */}
        {activeTab === "controls" && (
          <>
            {/* Suspend / reinstate */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Organization status</p>
                  <h2>Suspend or reinstate this organization</h2>
                </div>
              </div>
              <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
                Suspending an org blocks all member logins. All data is preserved.
                Current status: <strong>{org.status ?? "active"}</strong>
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <form action={setOrgStatusAction}>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input type="hidden" name="status" value="active" />
                  <button className="button-primary" type="submit" disabled={!org.status || org.status === "active"}>
                    Reinstate
                  </button>
                </form>
                <form action={setOrgStatusAction}>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input type="hidden" name="status" value="suspended" />
                  <button
                    className="button-secondary"
                    type="submit"
                    style={{ color: "var(--red,#dc2626)", borderColor: "var(--red,#dc2626)" }}
                    disabled={org.status === "suspended"}
                  >
                    Suspend org
                  </button>
                </form>
              </div>
            </section>

            {/* Feature controls */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Platform controls</p>
                  <h2>Seat limits, plan tier, and feature flags</h2>
                </div>
              </div>
              <form action={updateOrgControlsAction} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 480 }}>
                <input type="hidden" name="orgId" value={orgId} />
                <label>
                  Plan tier
                  <select name="planTier" defaultValue={org.plan_tier ?? ""}>
                    <option value="">Default</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="trial">Trial</option>
                  </select>
                </label>
                <label>
                  Seat limit (leave blank for unlimited)
                  <input
                    name="seatLimit"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    defaultValue={org.seat_limit ?? ""}
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    name="demoMode"
                    value="true"
                    defaultChecked={Boolean(org.demo_mode)}
                  />
                  <span>Demo mode (uses seeded demo data, not live records)</span>
                </label>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button className="button-primary" type="submit">Save controls</button>
                </div>
              </form>
            </section>

            {/* Danger zone */}
            <section className="panel inline-action-panel" style={{ borderColor: "var(--red,#dc2626)" }}>
              <div>
                <p className="section-label" style={{ color: "var(--red,#dc2626)" }}>Danger zone</p>
                <h2>Destructive actions</h2>
                <p className="muted" style={{ fontSize: "0.85rem" }}>
                  These actions cannot be undone. All are logged to the platform audit trail.
                  Hard-delete is not available from this UI — contact your database admin.
                </p>
              </div>
              <Shield size={24} style={{ color: "var(--red,#dc2626)", flexShrink: 0 }} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
