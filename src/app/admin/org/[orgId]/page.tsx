export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2, Users, Settings, Shield, Activity,
  UserPlus, Copy, Download, BookOpen,
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
  updateModuleFlagsAction,
  archiveOrgAction,
  deleteOrgAction,
} from "./actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "overview" | "users" | "profile" | "controls" | "audit";

type Props = {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{
    tab?: string;
    success?: string;
    error?: string;
    from?: string;
    to?: string;
    actor?: string;
  }>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
  { value: "member",        label: "Member" },
  { value: "owner",         label: "Owner" },
  { value: "admin",         label: "Admin" },
  { value: "company_admin", label: "Company Admin" },
  { value: "provider",      label: "Provider" },
  { value: "qa",            label: "QA" },
  { value: "ehs",           label: "EHS" },
  { value: "viewer",        label: "Viewer" },
];

const PLATFORM_MODULES = [
  { key: "assessments",        label: "Assessments" },
  { key: "documents",          label: "Documents" },
  { key: "capas",              label: "CAPAs" },
  { key: "biosafety",          label: "Biosafety" },
  { key: "chemical_sds",       label: "Chemical SDS" },
  { key: "capa_tracker",       label: "CAPA Tracker" },
  { key: "inspection_audit",   label: "Inspection & Audit" },
  { key: "ergonomics",         label: "Ergonomics" },
  { key: "waste_management",   label: "Waste Management" },
  { key: "pesticide_control",  label: "Pesticide Control" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roleBadge(role: string) {
  if (role === "owner" || role === "company_admin") return "status-needs-review";
  if (role === "admin") return "status-overdue";
  if (role === "superadmin") return "status-critical";
  return "status-current";
}

function statusBadge(status: string | null) {
  if (!status || status === "active") return "status-current";
  if (status === "suspended") return "status-overdue";
  if (status === "archived") return "status-critical";
  if (status === "trial" || status === "pending") return "status-needs-review";
  return "status-current";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OrgManagementPage({ params, searchParams }: Props) {
  const { orgId } = await params;
  const { tab: tabParam, success, error, from, to, actor } = await searchParams;
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

  // Fetch members — enrich with auth email + last sign-in
  const { data: rawMembers } = await admin
    .from("profiles")
    .select("id, full_name, role, account_status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const { data: authList } = await admin.auth.admin.listUsers();
  const authById = new Map((authList?.users ?? []).map((u: any) => [u.id, u]));
  const members = (rawMembers ?? []).map((m: any) => {
    const authUser = authById.get(m.id);
    return { ...m, email: authUser?.email ?? null, last_sign_in: authUser?.last_sign_in_at ?? null };
  });

  // Core stats + recent activity (always fetched for overview)
  const [
    { count: assessmentCount },
    { count: documentCount },
    { count: capaCount },
    { data: recentActivity },
  ] = await Promise.all([
    admin.from("biosafety_risk_assessments").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    admin.from("document_metadata").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    admin.from("capa_records").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    admin.from("audit_events").select("event_type, summary, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(8),
  ]);

  // Audit log (only fetched on the audit tab)
  let auditEvents: any[] = [];
  let auditActorMap = new Map<string, string>();
  if (activeTab === "audit") {
    let auditQuery = admin
      .from("audit_events")
      .select("id, event_type, summary, created_at, actor_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (from) auditQuery = auditQuery.gte("created_at", from);
    if (to)   auditQuery = auditQuery.lte("created_at", `${to}T23:59:59.999Z`);

    const { data: events } = await auditQuery;
    auditEvents = events ?? [];

    const actorIds = [...new Set(auditEvents.map((e: any) => e.actor_id).filter(Boolean))];
    if (actorIds.length) {
      const { data: actorProfiles } = await admin.from("profiles").select("id, full_name").in("id", actorIds);
      const emailById = new Map((authList?.users ?? []).map((u: any) => [u.id, u.email ?? ""]));
      for (const p of actorProfiles ?? []) {
        auditActorMap.set(p.id, `${p.full_name ?? "Unknown"}|||${emailById.get(p.id) ?? ""}`);
      }
    }

    // Client-side user filter (name or email substring)
    if (actor) {
      const lc = actor.toLowerCase();
      auditEvents = auditEvents.filter((e: any) => {
        const info = auditActorMap.get(e.actor_id) ?? "";
        return info.toLowerCase().includes(lc);
      });
    }
  }

  const memberList = members ?? [];
  const moduleFlags: Record<string, boolean> = (org.module_flags ?? {}) as Record<string, boolean>;

  function tabHref(t: Tab) { return `/admin/org/${orgId}?tab=${t}`; }

  return (
    <AppShell>
      <div className="page-stack">

        {/* ── Header ── */}
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Platform Admin · <Link href="/admin/organizations">Organizations</Link></p>
            <h1>{org.name}</h1>
            <div className="form-action-row">
              <span className={`${statusBadge(org.status)} capitalize`}>{org.status ?? "active"}</span>
              <span className="muted capitalize">{org.environment ?? "production"}</span>
            </div>
          </div>
          <Link href="/admin/organizations" className="button-secondary">← All Orgs</Link>
        </header>

        {/* ── Feedback banners ── */}
        {success && (
          <div className="ai-context-bar ai-context-bar--success">
            ✓ {decodeURIComponent(success)}
          </div>
        )}
        {error && (
          <div className="ai-context-bar ai-context-bar--danger">
            ✗ {decodeURIComponent(error)}
          </div>
        )}

        {/* ── Tabs ── */}
        <nav className="command-center-link-strip" aria-label="Company management tabs">
          <Link href={tabHref("overview")} className={activeTab === "overview" ? "button-primary compact" : "button-secondary compact"}>
            <Building2 size={13} /> Overview
          </Link>
          <Link href={tabHref("users")} className={activeTab === "users" ? "button-primary compact" : "button-secondary compact"}>
            <Users size={13} /> Users ({memberList.length})
          </Link>
          <Link href={tabHref("profile")} className={activeTab === "profile" ? "button-primary compact" : "button-secondary compact"}>
            <Settings size={13} /> Profile
          </Link>
          <Link href={tabHref("controls")} className={activeTab === "controls" ? "button-primary compact" : "button-secondary compact"}>
            <Shield size={13} /> Controls
          </Link>
          <Link href={tabHref("audit")} className={activeTab === "audit" ? "button-primary compact" : "button-secondary compact"}>
            <BookOpen size={13} /> Audit Log
          </Link>
        </nav>

        {/* ══════════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════════ */}
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

            {/* Data export — Ticket 4 */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Data export</p>
                  <h2>Export organization data</h2>
                </div>
                <Download size={20} />
              </div>
              <p className="muted">
                Download a CSV archive of this organization&apos;s records for compliance audits or offboarding.
                Export actions are recorded in the audit log.
              </p>
              <form method="GET" action={`/api/admin/export/org/${orgId}`} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
                <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                  <legend className="section-label">Select data to include</legend>
                  <div className="command-center-link-strip">
                    {[
                      { label: "Assessments", value: "assessments" },
                      { label: "Documents",   value: "documents" },
                      { label: "CAPAs",       value: "capas" },
                    ].map(({ label, value }) => (
                      <label key={value} className="check-row">
                        <input type="checkbox" name="types" value={value} defaultChecked />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button className="button-secondary compact" type="submit">
                  <Download size={14} className="icon-mr" /> Download CSV
                </button>
              </form>
            </section>

            {/* Org details */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Organization details</p>
                  <h2>Identity & configuration</h2>
                </div>
              </div>
              <div className="action-list">
                {[
                  ["Org ID",      org.id],
                  ["Name",        org.name],
                  ["Status",      org.status ?? "active"],
                  ["Environment", org.environment ?? "production"],
                  ["Plan tier",   org.plan_tier ?? "—"],
                  ["Seat limit",  org.seat_limit ?? "Unlimited"],
                  ["Demo mode",   org.demo_mode ? "Yes" : "No"],
                  ["Created",     new Date(org.created_at).toLocaleString()],
                ].map(([label, value]) => (
                  <article className="action-row" key={String(label)}>
                    <div><strong>{label}</strong></div>
                    <p style={{ fontFamily: label === "Org ID" ? "monospace" : undefined }}>
                      {String(value)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            {/* Recent activity */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Audit trail</p>
                  <h2>Recent activity</h2>
                </div>
                <Link href={tabHref("audit")} className="button-secondary compact">View full log</Link>
              </div>
              {!recentActivity?.length ? (
                <p className="muted">No audit events recorded yet.</p>
              ) : (
                <div className="action-list">
                  {recentActivity.map((evt, i) => (
                    <article className="action-row" key={i}>
                      <div>
                        <strong>{evt.event_type.replace(/_/g, " ")}</strong>
                      </div>
                      <p>{evt.summary}</p>
                      <span className="muted">
                        {new Date(evt.created_at).toLocaleString()}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ══════════════════════════════════════════════
            USERS TAB
        ══════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <>
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
                      <td colSpan={5} className="table-empty-cell">
                        No members in this organization yet.
                      </td>
                    </tr>
                  ) : (
                    memberList.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <strong>{member.full_name ?? "—"}</strong>
                          <div className="muted">{member.email ?? "—"}</div>
                          <div className="muted" style={{ fontFamily: "monospace" }}>{member.id.slice(0, 8)}…</div>
                        </td>
                        <td>
                          <form action={updateUserRoleAction} className="form-action-row">
                            <input type="hidden" name="orgId" value={orgId} />
                            <input type="hidden" name="userId" value={member.id} />
                            <select name="role" defaultValue={member.role}>
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            <button className="button-secondary compact" type="submit">Save</button>
                          </form>
                        </td>
                        <td>
                          <span className={statusBadge(member.account_status)} style={{ textTransform: "capitalize" }}>
                            {member.account_status ?? "active"}
                          </span>
                        </td>
                        <td className="muted">
                          {member.last_sign_in ? new Date(member.last_sign_in).toLocaleDateString() : "Never"}
                        </td>
                        <td>
                          <div className="command-center-link-strip">
                            <form action={setUserStatusAction}>
                              <input type="hidden" name="orgId" value={orgId} />
                              <input type="hidden" name="userId" value={member.id} />
                              <input type="hidden" name="status" value={member.account_status === "suspended" ? "active" : "suspended"} />
                              <button className="button-secondary compact" type="submit">
                                {member.account_status === "suspended" ? "Reinstate" : "Suspend"}
                              </button>
                            </form>
                            <form action={removeUserFromOrgAction}>
                              <input type="hidden" name="orgId" value={orgId} />
                              <input type="hidden" name="userId" value={member.id} />
                              <button className="button-secondary compact" type="submit" style={{ color: "var(--red)" }}>
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

        {/* ══════════════════════════════════════════════
            PROFILE TAB  — Tickets 1 & 5
        ══════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <>
            {/* Edit form — Ticket 1: status options + typed confirmation */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Company profile</p>
                  <h2>Edit organization details</h2>
                </div>
              </div>
              <form action={updateOrgProfileAction} className="stacked-form" style={{ maxWidth: 480 }}>
                <input type="hidden" name="orgId" value={orgId} />
                <label>
                  Organization name
                  <input name="name" defaultValue={org.name} required />
                </label>
                <label>
                  Status
                  <select name="status" defaultValue={org.status ?? "active"}>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                    <option value="archived">Archived</option>
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
                <div className="guardrail-box" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                  <strong>Confirmation required for Suspended or Archived.</strong>
                  <span className="muted">Type the exact organization name to confirm sensitive status changes. Leave blank if keeping the current status.</span>
                  <input name="confirmName" type="text" placeholder={`e.g. ${org.name}`} />
                </div>
                <div className="form-action-row">
                  <button className="button-primary" type="submit">Save profile</button>
                  <Link href={tabHref("profile")} className="button-secondary">Cancel</Link>
                </div>
              </form>

              <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
                <p className="section-label">Org ID</p>
                <div className="command-center-link-strip">
                  <code className="muted" style={{ background: "var(--bg)", padding: "0.3rem 0.5rem", borderRadius: 4, border: "1px solid var(--line)" }}>
                    {orgId}
                  </code>
                  <Copy size={14} className="muted" />
                </div>
              </div>
            </section>

            {/* Danger Zone — Ticket 5 */}
            <section className="panel" style={{ borderColor: "var(--red)" }}>
              <div className="panel-heading">
                <div>
                  <p className="section-label" style={{ color: "var(--red)" }}>Danger zone</p>
                  <h2>Archive or delete this organization</h2>
                </div>
                <Shield size={24} style={{ color: "var(--red)" }} />
              </div>
              <p className="muted">
                Both actions require typing the exact organization name to confirm. All actions are recorded in the audit log.
              </p>

              {/* Archive */}
              <div style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--line)" }}>
                <strong>Archive organization</strong>
                <p className="muted">
                  Hides this org from the active tenants list. All data is preserved. Status changes to Archived.
                  Reversible — set status back to Active via the Profile form above.
                </p>
                <form action={archiveOrgAction} className="stacked-form" style={{ maxWidth: 360 }}>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input
                    name="confirmName"
                    type="text"
                    placeholder={`Type "${org.name}" to confirm`}
                    required
                  />
                  <button
                    className="button-secondary"
                    type="submit"
                    style={{ color: "var(--red)", borderColor: "var(--red)" }}
                  >
                    Archive org
                  </button>
                </form>
              </div>

              {/* Delete */}
              <div>
                <strong>Delete organization</strong>
                <p className="muted">
                  Permanently removes this organization and all its data. This cannot be undone.
                </p>
                <form action={deleteOrgAction} className="stacked-form" style={{ maxWidth: 360 }}>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input
                    name="confirmName"
                    type="text"
                    placeholder={`Type "${org.name}" to confirm`}
                    required
                  />
                  <button
                    className="button-secondary"
                    type="submit"
                    style={{ color: "var(--red)", borderColor: "var(--red)" }}
                  >
                    Delete org permanently
                  </button>
                </form>
              </div>
            </section>
          </>
        )}

        {/* ══════════════════════════════════════════════
            CONTROLS TAB  — Ticket 2 (module toggles)
        ══════════════════════════════════════════════ */}
        {activeTab === "controls" && (
          <>
            {/* Module toggles — Ticket 2 */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Module access</p>
                  <h2>Enable or disable platform modules</h2>
                </div>
              </div>
              <p className="muted">
                Disabled modules are hidden from all users in this organization immediately.
                New organizations default to all modules enabled.
              </p>
              <form action={updateModuleFlagsAction} className="stacked-form">
                <input type="hidden" name="orgId" value={orgId} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.5rem 1.5rem" }}>
                  {PLATFORM_MODULES.map(({ key, label }) => {
                    const isEnabled = moduleFlags[key] !== false;
                    return (
                      <label key={key} className="check-row">
                        <input
                          type="checkbox"
                          name="enabledModules"
                          value={key}
                          defaultChecked={isEnabled}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
                <button className="button-primary" type="submit">Save module flags</button>
              </form>
            </section>

            {/* Suspend / reinstate quick action */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Organization status</p>
                  <h2>Suspend or reinstate this organization</h2>
                </div>
              </div>
              <p className="muted">
                Suspending blocks all member logins. All data is preserved.
                Current status: <strong style={{ textTransform: "capitalize" }}>{org.status ?? "active"}</strong>
              </p>
              <div className="command-center-link-strip">
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
                    style={{ color: "var(--red)", borderColor: "var(--red)" }}
                    disabled={org.status === "suspended"}
                  >
                    Suspend org
                  </button>
                </form>
              </div>
            </section>

            {/* Plan tier / seat limit / demo mode */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Platform controls</p>
                  <h2>Seat limits, plan tier, and feature flags</h2>
                </div>
              </div>
              <form action={updateOrgControlsAction} className="stacked-form" style={{ maxWidth: 480 }}>
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
                  <input type="checkbox" name="demoMode" value="true" defaultChecked={Boolean(org.demo_mode)} />
                  <span>Demo mode (uses seeded demo data, not live records)</span>
                </label>
                <div className="form-action-row">
                  <button className="button-primary" type="submit">Save controls</button>
                </div>
              </form>
            </section>
          </>
        )}

        {/* ══════════════════════════════════════════════
            AUDIT LOG TAB  — Ticket 3
        ══════════════════════════════════════════════ */}
        {activeTab === "audit" && (
          <>
            {/* Filter form */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Audit log</p>
                  <h2>All activity for this organization</h2>
                </div>
                <BookOpen size={20} />
              </div>
              <form method="GET" action={`/admin/org/${orgId}`} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
                <input type="hidden" name="tab" value="audit" />
                <label style={{ flex: "0 0 160px" }}>
                  From
                  <input type="date" name="from" defaultValue={from ?? ""} />
                </label>
                <label style={{ flex: "0 0 160px" }}>
                  To
                  <input type="date" name="to" defaultValue={to ?? ""} />
                </label>
                <label style={{ flex: "1 1 200px", minWidth: 140 }}>
                  User (name or email)
                  <input type="text" name="actor" defaultValue={actor ?? ""} placeholder="Search user…" />
                </label>
                <button className="button-secondary compact" type="submit">Filter</button>
                <Link href={tabHref("audit")} className="button-secondary compact">Clear</Link>
              </form>
            </section>

            {/* Audit table */}
            <section className="table-panel">
              {auditEvents.length === 0 ? (
                <p className="muted" style={{ padding: "1.5rem" }}>No audit events match the current filters.</p>
              ) : (
                <>
                  <p className="muted" style={{ padding: "0.5rem 1rem 0" }}>
                    Showing {auditEvents.length} event{auditEvents.length !== 1 ? "s" : ""}
                    {auditEvents.length === 500 ? " (limit 500 — apply filters to narrow)" : ""}
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Date &amp; Time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditEvents.map((evt) => {
                        const [actorName, actorEmail] = (auditActorMap.get(evt.actor_id) ?? "|||").split("|||");
                        return (
                          <tr key={evt.id}>
                            <td className="muted" style={{ whiteSpace: "nowrap" }}>
                              {new Date(evt.created_at).toLocaleString()}
                            </td>
                            <td>
                              {evt.actor_id ? (
                                <>
                                  <div>{actorName || "Unknown"}</div>
                                  {actorEmail && (
                                    <div className="muted">{actorEmail}</div>
                                  )}
                                </>
                              ) : (
                                <span className="muted">System</span>
                              )}
                            </td>
                            <td>
                              <code style={{ background: "var(--bg)", padding: "0.1rem 0.35rem", borderRadius: 3, whiteSpace: "nowrap" }}>
                                {evt.event_type}
                              </code>
                            </td>
                            <td style={{ maxWidth: 320 }}>
                              {evt.summary}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </section>
          </>
        )}

      </div>
    </AppShell>
  );
}
