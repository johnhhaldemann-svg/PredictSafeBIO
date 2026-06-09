export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { GitBranch, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AiDraftBanner } from "@/components/AiDraftBanner";
import { listMocRecords, MOC_STATUS_LABELS, MOC_STATUS_CLASS, type MocStatus } from "@/lib/supabase/moc-service";
import { createMocAction } from "./actions";

export const metadata: Metadata = { title: "Management of Change – PredictSafeBIO" };

const CHANGE_TYPES = ["material", "process", "equipment", "location", "scale", "product", "work_method", "facility", "supplier", "organization"];
const SCREEN_FLAGS = ["PSM", "HPAPI", "Cold Chain", "Select Agents", "Security"];

type Props = { searchParams: Promise<{ message?: string; success?: string }> };

export default async function ManagementOfChangePage({ searchParams }: Props) {
  const params = await searchParams;
  const records = await listMocRecords().catch(() => []);
  const inReview = records.filter((r) => r.status === "in_review").length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · <a href="/change-management">Change Management</a></p>
            <h1>Management of Change</h1>
            <p className="muted">
              When material, process, equipment, scale, or location changes, controls must be revalidated.
              Submitting a change auto-routes it to the right reviewers based on the affected programs.
            </p>
          </div>
        </header>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        <section className="command-card-grid" aria-label="MOC summary">
          <article className="command-card platform-blue">
            <div><span><GitBranch size={16} /></span><strong>Total changes</strong></div>
            <small>{records.length}</small><em>Change records.</em>
          </article>
          <article className={`command-card ${inReview > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><GitBranch size={16} /></span><strong>Awaiting review</strong></div>
            <small>{inReview}</small><em>{inReview > 0 ? "Routed to qualified reviewers." : "Nothing pending."}</em>
          </article>
        </section>

        <section className="panel">
          <div className="panel-heading"><div><p className="section-label">Change log</p><h2>{records.length} record{records.length !== 1 ? "s" : ""}</h2></div></div>
          {records.length === 0 ? (
            <div className="empty-state-card"><p className="empty-state-title">No changes recorded</p><p className="muted">Submit a change below to start the MOC workflow.</p></div>
          ) : (
            <div className="action-list">
              {records.map((r) => (
                <article className="action-row" key={r.id}>
                  <div>
                    <strong>{r.changeType ? r.changeType[0].toUpperCase() + r.changeType.slice(1) : "Change"}: {r.changeDescription?.slice(0, 80)}</strong>
                    <span className={MOC_STATUS_CLASS[r.status as MocStatus]}>{MOC_STATUS_LABELS[r.status as MocStatus]}</span>
                    <small className="muted">
                      {r.affectedPrograms.length ? `Affects: ${r.affectedPrograms.join(", ")} · ` : ""}
                      {r.routingRequired.length ? `Routed to: ${r.routingRequired.join(", ")}` : "No routing"}
                      {r.postChangeReviewDue ? ` · Review by ${r.postChangeReviewDue}` : ""}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <AiDraftBanner>
          Routing is auto-suggested from the affected programs. Final approval of a change is a qualified
          human decision — AI cannot approve a change or certify revalidation.
        </AiDraftBanner>

        <section className="panel">
          <div className="panel-heading"><div><p className="section-label">Submit change</p><h2>New change request</h2></div><Plus size={22} /></div>
          <form action={createMocAction} className="stacked-form">
            <div className="form-grid">
              <label>Change type <span aria-hidden="true">*</span>
                <select name="changeType" defaultValue="process">
                  {CHANGE_TYPES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                </select>
              </label>
              <label>Residual risk
                <select name="residualRisk" defaultValue="medium">
                  {["low", "medium", "high", "critical"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </div>
            <label>Change description <span aria-hidden="true">*</span>
              <textarea name="changeDescription" rows={2} placeholder="What is changing and why?" required />
            </label>
            <label>Affected programs (comma-separated)
              <input name="affectedPrograms" type="text" placeholder="e.g. Biosafety, Chemical Hygiene, Waste Management" />
            </label>
            <fieldset className="checkbox-group">
              <legend>Specialized screens</legend>
              {SCREEN_FLAGS.map((f) => (
                <label key={f}>
                  <input type="checkbox" name="flags" value={f} /> {f}
                </label>
              ))}
            </fieldset>
            <label>New hazards introduced<textarea name="newHazards" rows={2} placeholder="Any new hazards from this change?" /></label>
            <label>Changed controls<textarea name="changedControls" rows={2} placeholder="Which controls need to change or be revalidated?" /></label>
            <button className="button-primary" type="submit">Submit for review</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
