export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { UserCheck, Plus, AlertTriangle, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AiDraftBanner } from "@/components/AiDraftBanner";
import { listQualifiedPersons, listOrgMembers } from "@/lib/supabase/qualified-person-service";
import { addQualifiedPersonAction, toggleQualifiedPersonAction } from "./actions";

export const metadata: Metadata = { title: "Qualified Persons – PredictSafe" };

type Props = { searchParams: Promise<{ message?: string; success?: string }> };

const COMMON_TASKS = "risk_register_status, capa_closure, chemical_approval, manifest_signoff, change_approval, all";

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isExpiringSoon(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const exp = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 90);
  return exp >= new Date() && exp <= cutoff;
}

export default async function QualifiedPersonsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [people, members] = await Promise.all([
    listQualifiedPersons().catch(() => []),
    listOrgMembers().catch(() => []),
  ]);

  const activeCount = people.filter((p) => p.active).length;
  const expiredCount = people.filter((p) => p.active && isExpired(p.expirationDate)).length;
  const expiringSoonCount = people.filter((p) => p.active && isExpiringSoon(p.expirationDate)).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Plan · <a href="/plan/risk-register">Risk Register</a> / Governance</p>
            <h1>Qualified Person Registry</h1>
            <p className="muted">
              Who may approve restricted decisions — register changes, CAPA closure, chemical approvals,
              and manifests. Restricted actions are blocked unless the user is listed here.
            </p>
          </div>
          <a className="button-secondary" href="/plan/risk-register">← Risk Register</a>
        </header>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        <section className="command-card-grid" aria-label="Registry summary">
          <article className="command-card platform-blue">
            <div><span><Users size={16} /></span><strong>Total in registry</strong></div>
            <small>{people.length}</small><em>All registered reviewers.</em>
          </article>
          <article className={`command-card ${activeCount === 0 ? "platform-red" : "platform-green"}`}>
            <div><span><UserCheck size={16} /></span><strong>Active</strong></div>
            <small>{activeCount}</small>
            <em>{activeCount === 0 ? "No active reviewers — approvals blocked." : "Authorized reviewers."}</em>
          </article>
          <article className={`command-card ${expiredCount > 0 ? "platform-red" : expiringSoonCount > 0 ? "platform-blue" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Expired / expiring</strong></div>
            <small>{expiredCount + expiringSoonCount}</small>
            <em>
              {expiredCount > 0 ? `${expiredCount} expired — approvals at risk.` : expiringSoonCount > 0 ? `${expiringSoonCount} expiring within 90 days.` : "All current."}
            </em>
          </article>
        </section>

        {expiredCount > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{expiredCount} active reviewer{expiredCount !== 1 ? "s have" : " has"} an expired qualification.</strong>{" "}
              Expired qualifications no longer authorize restricted approvals. Update or deactivate.
            </span>
          </div>
        )}
        {expiringSoonCount > 0 && expiredCount === 0 && (
          <div className="ai-context-bar ai-context-bar--warning">
            <AlertTriangle size={15} />
            <span>
              <strong>{expiringSoonCount} qualification{expiringSoonCount !== 1 ? "s expire" : " expires"} within 90 days.</strong>{" "}
              Renew before expiry to avoid approval gaps.
            </span>
          </div>
        )}

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Registry</p>
              <h2>{people.length} record{people.length !== 1 ? "s" : ""}</h2>
            </div>
          </div>
          {people.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No qualified people registered</p>
              <p className="muted">Add reviewers below so restricted decisions can be approved.</p>
            </div>
          ) : (
            <div className="action-list">
              {people.map((p) => {
                const expired = isExpired(p.expirationDate);
                const expiring = isExpiringSoon(p.expirationDate);
                return (
                  <article className="action-row" key={p.id}>
                    <div>
                      <strong>{p.personName ?? "Unknown"}</strong>
                      <span className={p.active ? "status-ok" : "status-unknown"}>{p.active ? "Active" : "Inactive"}</span>
                      {expired && <span className="status-missing">Expired</span>}
                      {!expired && expiring && <span className="status-needs-review">Expiring soon</span>}
                      <small className="muted">
                        {p.roleTitle ? `${p.roleTitle} · ` : ""}
                        Qualified for: {p.qualifiedFor.length ? p.qualifiedFor.join(", ") : "—"}
                        {p.expirationDate ? ` · Expires ${p.expirationDate}` : ""}
                      </small>
                    </div>
                    <form action={toggleQualifiedPersonAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={p.active ? "0" : "1"} />
                      <button className="button-secondary compact" type="submit">{p.active ? "Deactivate" : "Reactivate"}</button>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <AiDraftBanner>
          The registry is the control behind restricted approvals. Keep it current — expired entries no
          longer authorize approvals.
        </AiDraftBanner>

        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Add</p><h2>Add a qualified person</h2></div>
            <Plus size={22} />
          </div>
          <form action={addQualifiedPersonAction} className="stacked-form">
            <div className="form-grid">
              <label>Person
                <select name="profileId" defaultValue="">
                  <option value="">— Select —</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label>Role title<input name="roleTitle" type="text" placeholder="e.g. Biosafety Officer" /></label>
              <label>Expiration date<input name="expirationDate" type="date" /></label>
            </div>
            <label>Qualified for (comma-separated task types)
              <input name="qualifiedFor" type="text" placeholder={COMMON_TASKS} />
              <span className="muted">
                Use <code>risk_register_status</code> to authorize register Active/Restricted/Closed changes,
                or <code>all</code> for full authority.
              </span>
            </label>
            <label>Qualification basis<input name="qualificationBasis" type="text" placeholder="e.g. Certified BSO, IBC chair" /></label>
            <button className="button-primary" type="submit">Add to registry</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
