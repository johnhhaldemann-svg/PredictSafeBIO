import { UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { listWorkspaceInvitations } from "@/lib/supabase/invite-service";
import { createInviteAction, revokeInviteAction } from "./actions";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const [adminAccess, invitations] = await Promise.all([
    getFoundationAdminAccessSummary().catch(() => ({ configured: false, signedIn: false, isOwner: false, message: "" })),
    listWorkspaceInvitations().catch(() => [])
  ]);

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

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">System Reliance</p>
          <h1>Team &amp; Invitations</h1>
        </header>

        <section className={`panel access-banner ${adminAccess.isOwner ? "access-enabled" : "access-readonly"}`}>
          <strong>{adminAccess.isOwner ? "Owner access" : "Read-only"}</strong>
          <span>{adminAccess.message}</span>
        </section>

        {params.message ? <p className="form-message">{params.message}</p> : null}

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
              Enter an email address and role. The recipient will receive a Supabase Auth invite
              email with a link to complete onboarding. Invites expire after 7 days.
              Requires custom SMTP to be configured in Supabase Auth settings.
            </p>
            <form action={createInviteAction} className="stacked-form">
              <label>
                Email address
                <input name="email" type="email" placeholder="scientist@your-org.com" required autoComplete="off" />
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
              {invitations.map((invite) => (
                <article className="action-row" key={invite.id}>
                  <div>
                    <strong>{invite.email}</strong>
                    <span>{invite.role} / {statusLabel[invite.status] ?? invite.status}</span>
                  </div>
                  <p>
                    Expires {invite.status === "pending"
                      ? new Date(invite.expiresAt).toLocaleDateString()
                      : "—"}
                    {invite.acceptedAt ? ` · Accepted ${new Date(invite.acceptedAt).toLocaleDateString()}` : ""}
                  </p>
                  {adminAccess.isOwner && invite.status === "pending" && (
                    <form action={revokeInviteAction}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button className="button-secondary compact" type="submit">
                        Revoke
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {!adminAccess.configured && (
          <section className="panel">
            <p className="muted">
              Connect Supabase to manage real invitations. In demo mode, the invitation list
              above shows demo data.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
