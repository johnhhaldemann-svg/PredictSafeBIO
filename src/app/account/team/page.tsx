import { ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { listWorkspaceInvitations } from "@/lib/supabase/invite-service";
import { listTeamMembers } from "@/lib/supabase/team-service";
import {
  changeMemberRoleAction,
  createInviteAction,
  removeMemberAction,
  revokeInviteAction
} from "./actions";

export default async function TeamPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const [adminAccess, members, invitations] = await Promise.all([
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false,
      signedIn: false,
      isOwner: false,
      message: ""
    })),
    listTeamMembers().catch(() => []),
    listWorkspaceInvitations().catch(() => [])
  ]);

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">System Reliance</p>
          <h1>Team &amp; Invitations</h1>
        </header>

        {/* Summary */}
        <section className="command-card-grid" aria-label="Team summary">
          <article className="command-card platform-blue">
            <div><span><Users size={16} /></span><strong>Members</strong></div>
            <small>{members.length}</small>
            <em>Active workspace members.</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><UserPlus size={16} /></span><strong>Pending invites</strong></div>
            <small>{pendingInvitations.length}</small>
            <em>Invitations awaiting acceptance.</em>
          </article>
        </section>

        <section className={`panel access-banner ${adminAccess.isOwner ? "access-enabled" : "access-readonly"}`}>
          <strong>{adminAccess.isOwner ? "Owner access" : "Read-only"}</strong>
          <span>{adminAccess.message}</span>
        </section>

        {params.message && <p className="form-message">{params.message}</p>}

        {/* Current members */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Current members</p>
              <h2>{members.length} member{members.length !== 1 ? "s" : ""}</h2>
            </div>
            <Users size={22} />
          </div>
          {members.length === 0 ? (
            <p className="muted">No members yet.</p>
          ) : (
            <div className="action-list">
              {members.map((member) => (
                <article className="action-row" key={member.id}>
                  <div>
                    <strong>
                      {member.fullName ?? "Unnamed user"}
                      {member.isCurrentUser ? " (you)" : ""}
                    </strong>
                    <span className={member.role === "owner" ? "status-current" : ""}>
                      {member.role}
                    </span>
                  </div>
                  <p>
                    Joined{" "}
                    {member.createdAt
                      ? new Date(member.createdAt).toLocaleDateString()
                      : "—"}
                  </p>

                  {/* Owner controls — not shown for self */}
                  {adminAccess.isOwner && !member.isCurrentUser && member.role !== "owner" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      {/* Change role */}
                      <form action={changeMemberRoleAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <input
                          type="hidden"
                          name="role"
                          value={member.role === "owner" ? "member" : "owner"}
                        />
                        <button className="button-secondary compact" type="submit">
                          Promote to owner
                        </button>
                      </form>
                      {/* Remove */}
                      <form action={removeMemberAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <button
                          className="button-secondary compact"
                          type="submit"
                          style={{ color: "var(--danger, #C00000)" }}
                        >
                          <UserMinus size={13} style={{ display: "inline", marginRight: 3 }} />
                          Remove
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Send invite */}
        {adminAccess.isOwner && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Invite a team member</p>
                <h2>Send an invite link</h2>
              </div>
              <UserPlus size={22} />
            </div>
            <p className="muted">
              The recipient will receive an invitation email with a link to join your workspace.
              Invites expire after 7 days. Requires custom SMTP to be configured in your
              authentication settings — without it the email will not send.
            </p>
            <form action={createInviteAction} className="stacked-form">
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  placeholder="scientist@your-org.com"
                  required
                  autoComplete="off"
                />
              </label>
              <label>
                Role
                <select name="role" defaultValue="member">
                  <option value="member">Member — can view and update assigned tasks</option>
                  <option value="owner">Owner — full workspace management access</option>
                </select>
              </label>
              <button className="button-primary" type="submit">
                Send invitation
              </button>
            </form>
          </section>
        )}

        {/* Invitations */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Workspace invitations</p>
              <h2>
                {invitations.length} invitation{invitations.length !== 1 ? "s" : ""}
                {pendingInvitations.length > 0 ? ` · ${pendingInvitations.length} pending` : ""}
              </h2>
            </div>
          </div>
          {invitations.length === 0 ? (
            <p className="muted">No invitations yet. Send one above to add team members.</p>
          ) : (
            <div className="action-list">
              {invitations.map((invite) => {
                const expiry = new Date(invite.expiresAt);
                const expired = expiry < new Date() && invite.status === "pending";
                return (
                  <article className="action-row" key={invite.id}>
                    <div>
                      <strong>{invite.email}</strong>
                      <span
                        className={
                          invite.status === "accepted"
                            ? "status-current"
                            : invite.status === "revoked" || expired
                              ? "status-missing"
                              : "status-needs-review"
                        }
                      >
                        {invite.role} ·{" "}
                        {expired && invite.status === "pending"
                          ? "expired"
                          : invite.status}
                      </span>
                    </div>
                    <p>
                      {invite.status === "pending"
                        ? `Expires ${expiry.toLocaleDateString()}${expired ? " · EXPIRED" : ""}`
                        : invite.acceptedAt
                          ? `Accepted ${new Date(invite.acceptedAt).toLocaleDateString()}`
                          : "—"}
                    </p>
                    {adminAccess.isOwner && invite.status === "pending" && !expired && (
                      <form action={revokeInviteAction} style={{ marginTop: 6 }}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <button className="button-secondary compact" type="submit">
                          Revoke
                        </button>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Access boundary</p>
            <h2>Workspace isolation</h2>
            <p className="muted">
              All data access is scoped to your organization. Removed members lose access
              immediately — their account is preserved but their org association is cleared.
              Owners are protected and cannot be removed; change their role first.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
