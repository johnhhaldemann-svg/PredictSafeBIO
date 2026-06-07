export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { UserCheck, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AiDraftBanner } from "@/components/AiDraftBanner";
import { listQualifiedPersons, listOrgMembers } from "@/lib/supabase/qualified-person-service";
import { addQualifiedPersonAction, toggleQualifiedPersonAction } from "./actions";

export const metadata: Metadata = { title: "Qualified Persons – PredictSafeBIO" };

type Props = { searchParams: Promise<{ message?: string; success?: string }> };

const COMMON_TASKS = "risk_register_status, capa_closure, chemical_approval, manifest_signoff, change_approval, all";

export default async function QualifiedPersonsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [people, members] = await Promise.all([
    listQualifiedPersons().catch(() => []),
    listOrgMembers().catch(() => []),
  ]);
  const activeCount = people.filter((p) => p.active).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Plan · Governance</p>
          <h1>Qualified Person Registry</h1>
          <p className="muted">
            Who is qualified to approve restricted decisions — register status changes, CAPA closure,
            chemical approvals, manifests, and changes. Restricted actions are blocked unless the user is listed here.
          </p>
        </header>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        <section className="command-card-grid" aria-label="Registry summary">
          <article className="command-card platform-blue">
            <div><span><UserCheck size={16} /></span><strong>Active qualified people</strong></div>
            <small>{activeCount}</small><em>Authorized reviewers.</em>
          </article>
        </section>

        <section className="panel">
          <div className="panel-heading"><div><p className="section-label">Registry</p><h2>{people.length} record{people.length !== 1 ? "s" : ""}</h2></div></div>
          {people.length === 0 ? (
            <div className="empty-state-card"><p className="empty-state-title">No qualified people registered</p><p className="muted">Add reviewers below so restricted decisions can be approved.</p></div>
          ) : (
            <div className="action-list">
              {people.map((p) => (
                <article className="action-row" key={p.id}>
                  <div>
                    <strong>{p.personName ?? "Unknown"}</strong>
                    <span className={p.active ? "status-ok" : "status-unknown"}>{p.active ? "Active" : "Inactive"}</span>
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
              ))}
            </div>
          )}
        </section>

        <AiDraftBanner>
          The registry is the control behind restricted approvals. Keep it current — expired entries no
          longer authorize approvals.
        </AiDraftBanner>

        <section className="panel">
          <div className="panel-heading"><div><p className="section-label">Add</p><h2>Add a qualified person</h2></div><Plus size={22} /></div>
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
            </label>
            <label>Qualification basis<input name="qualificationBasis" type="text" placeholder="e.g. Certified BSO, IBC chair" /></label>
            <button className="button-primary" type="submit">Add to registry</button>
          </form>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Use <code>risk_register_status</code> to authorize register Active/Restricted/Closed changes, or <code>all</code> for full authority.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
