export const dynamic = "force-dynamic";

import { BookOpen, ClipboardList, HeartPulse, LayoutDashboard, Lock, ShieldCheck, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { getAuthSummary } from "@/lib/supabase/data";
import { listWorkspaceInvitations } from "@/lib/supabase/invite-service";
import { getRoleLabel, getRoleBadgeClass } from "@/lib/role-permissions";
import { createInviteAction, revokeInviteAction } from "./actions";

// Workspace role capabilities matrix for display (org scope: Member vs Owner).
// Platform roles (Platform Staff / Super Admin) are PredictSafeBIO-internal and
// are intentionally not shown on this customer-facing team page.
const roleMatrix = [
  { feature: "Dashboard & My Work",          member: true,  owner: true },
  { feature: "Hazard Screening (Level 1)",   member: true,  owner: true },
  { feature: "Programs library & checklists",member: true,  owner: true },
  { feature: "Documents (view)",             member: true,  owner: true },
  { feature: "View Inspections",             member: true,  owner: true },
  { feature: "Assigned tasks (update)",      member: true,  owner: true },
  { feature: "Schedule & manage Inspections",member: false, owner: true },
  { feature: "Risk Assessment & BioRisk",    member: false, owner: true },
  { feature: "Compliance Map & Foundation",  member: false, owner: true },
  { feature: "Operations & CAPA",            member: false, owner: true },
  { feature: "Level 2 Evaluation (conduct)", member: false, owner: true },
  { feature: "Reports & Audit Log",          member: false, owner: true },
  { feature: "Document editing",             member: false, owner: true },
  { feature: "Training Matrix management",   member: false, owner: true },
  { feature: "Team management & invitations",member: false, owner: true },
  { feature: "Company profile (edit)",       member: false, owner: true },
];

const statusLabel: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked"
};

const statusBg: Record<string, string> = {
  pending: "checklist-pending",
  accepted: "checklist-pass",
  revoked: ""
};

function Check() {
  return <span style={{ color: "var(--color-green)", fontWeight: 700 }}>✓</span>;
}
function X() {
  return <span style={{ color: "var(--border-color)", fontWeight: 400 }}>—</span>;
}

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ message?: string; inviteLink?: string }> }) {
  const params = await searchParams;
  const [adminAccess, auth, invitations] = await Promise.all([
    getFoundationAdminAccessSummary().catch(() => ({ configured: false, signedIn: false, isOwner: false, message: "" })),
    getAuthSummary().catch(() => null),
    listWorkspaceInvitations().catch(() => [])
  ]);

  const currentRoleLabel = getRoleLabel(auth?.role);
  const currentBadgeClass = getRoleBadgeClass(auth?.role);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">System Reliance</p>
          <h1>Team &amp; Role Management</h1>
          <p className="muted">
            Manage your workspace team, send invitations, and see what each role can access.
          </p>
        </header>

        {/* Current user's role */}
        <section className={`panel access-banner ${adminAccess.isOwner ? "access-enabled" : "access-readonly"}`}>
          <div>
            <strong>Your role: <span className={currentBadgeClass}>{currentRoleLabel}</span></strong>
            <span style={{ marginLeft: "0.75rem" }}>{adminAccess.message}</span>
          </div>
          <ShieldCheck size={18} />
        </section>

        {params.message ? <p className="form-message">{params.message}</p> : null}

        {/* Invite link display — shown after generating an invite */}
        {params.inviteLink && (
          <section className="panel" style={{ borderLeft: "3px solid var(--color-green, #16a34a)" }}>
            <div className="panel-heading">
              <div>
                <p className="section-label">Invite Link Ready</p>
                <h2 style={{ fontSize: "1rem" }}>Copy and share this link directly</h2>
              </div>
              <UserPlus size={18} />
            </div>
            <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              This one-time link authenticates the invited user and brings them to onboarding.
              Share it via Slack, email, or any channel. It expires after 7 days.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                readOnly
                value={decodeURIComponent(params.inviteLink)}
                style={{ flex: 1, fontFamily: "monospace", fontSize: "0.78rem", padding: "0.5rem 0.75rem", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)" }}
              />
            </div>
          </section>
        )}

        {/* Role capabilities matrix */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Access Control</p>
              <h2>Role capabilities matrix</h2>
              <p className="muted">What each role can see and do in PredictSafeBIO.</p>
            </div>
            <Users size={22} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875em" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600 }}>Feature</th>
                  <th style={{ textAlign: "center", padding: "0.5rem 0.75rem", fontWeight: 600 }}>
                    <span className="status-needs-review">Member</span>
                  </th>
                  <th style={{ textAlign: "center", padding: "0.5rem 0.75rem", fontWeight: 600 }}>
                    <span className="status-current">Owner</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {roleMatrix.map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid var(--border-color)", background: i % 2 === 0 ? "var(--surface-subtle, transparent)" : "transparent" }}>
                    <td style={{ padding: "0.45rem 0.75rem" }}>{row.feature}</td>
                    <td style={{ textAlign: "center", padding: "0.45rem 0.75rem" }}>{row.member ? <Check /> : <X />}</td>
                    <td style={{ textAlign: "center", padding: "0.45rem 0.75rem" }}>{row.owner ? <Check /> : <X />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Invite form — owner only */}
        {adminAccess.isOwner ? (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Invite a team member</p>
                <h2>Generate an invite link</h2>
              </div>
              <UserPlus size={22} />
            </div>
            <p className="muted">
              Enter an email address and role. A one-time invite link is generated — copy it and share it directly via Slack, email, or any channel.
              No SMTP required. Links expire after 7 days.
            </p>
            <form action={createInviteAction} className="stacked-form">
              <label>
                Email address
                <input name="email" type="email" placeholder="scientist@your-org.com" required autoComplete="off" />
              </label>
              <label>
                Role
                <select name="role" defaultValue="member">
                  <option value="member">Team Member — screening, programs, view inspections</option>
                  <option value="owner">Owner — full workspace access including reports, CAPA, team management</option>
                </select>
              </label>
              <button className="button-primary" type="submit">
                <UserPlus size={15} />
                Generate invite link
              </button>
            </form>
          </section>
        ) : (
          <section className="panel access-banner access-readonly">
            <Lock size={18} />
            <div>
              <strong>Team invitations require Owner access.</strong>
              <span className="muted" style={{ marginLeft: "0.5rem" }}>Contact your workspace owner to invite additional team members or change your role.</span>
            </div>
          </section>
        )}

        {/* Invitations list */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Workspace invitations</p>
              <h2>{invitations.length} invitation{invitations.length !== 1 ? "s" : ""}</h2>
            </div>
          </div>
          {invitations.length === 0 ? (
            <p className="muted">No invitations yet. Send an invite above to add team members.</p>
          ) : (
            <div className="action-list">
              {invitations.map((invite) => {
                const inviteRoleLabel = getRoleLabel(invite.role);
                const inviteRoleBadge = getRoleBadgeClass(invite.role);
                return (
                  <article className="action-row" key={invite.id}>
                    <div>
                      <strong>{invite.email}</strong>
                      <span>
                        <span className={inviteRoleBadge}>{inviteRoleLabel}</span>
                        {" · "}
                        <span className={statusBg[invite.status] ?? ""}>{statusLabel[invite.status] ?? invite.status}</span>
                      </span>
                    </div>
                    <p className="muted">
                      {invite.status === "pending"
                        ? `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`
                        : "—"}
                      {invite.acceptedAt ? ` · Accepted ${new Date(invite.acceptedAt).toLocaleDateString()}` : ""}
                    </p>
                    {adminAccess.isOwner && invite.status === "pending" && (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <button className="button-secondary compact" type="submit">Revoke</button>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {!adminAccess.configured && (
          <section className="panel">
            <p className="muted">
              Connect your workspace to manage real invitations. In demo mode the invitation list shows sample data.
              To enable invitations, configure authentication settings in your workspace admin panel.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
