import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Plus,
  ShieldCheck
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import {
  capaStatusLabels,
  capaStatusOptions,
  getCapaDetail
} from "@/lib/supabase/capa-service";
import {
  addCapaActionAction,
  updateCapaActionStatusAction,
  updateCapaStatusAction
} from "../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
};

export default async function CapaDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const [capa, adminAccess] = await Promise.all([
    getCapaDetail(id).catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  if (!capa) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <p className="section-label">HSE Management</p>
            <h1>CAPA not found</h1>
          </header>
          <Link href="/operations/capa" className="button-secondary">Back to CAPA register</Link>
        </div>
      </AppShell>
    );
  }

  const overdue =
    capa.dueDate &&
    new Date(capa.dueDate) < new Date() &&
    capa.status !== "closed" &&
    capa.status !== "void";

  const isActive = capa.status !== "closed" && capa.status !== "void";

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">
            <Link href="/operations/capa">CAPA Register</Link> / Detail
          </p>
          <h1>{capa.title}</h1>
        </header>

        {sp.message && <p className="form-message">{sp.message}</p>}

        {/* Status banner */}
        <section className={`panel access-banner ${capa.status === "closed" ? "access-enabled" : capa.status === "draft_human_review_required" ? "access-readonly" : ""}`}>
          <strong>{capaStatusLabels[capa.status]}</strong>
          <span>
            {capa.ownerRole ? `Owner: ${capa.ownerRole}` : "No owner assigned"}
            {capa.dueDate ? ` · Due ${new Date(capa.dueDate).toLocaleDateString()}` : ""}
            {overdue ? " · OVERDUE" : ""}
          </span>
        </section>

        {/* Metadata */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">CAPA details</p>
              <h2>Record information</h2>
            </div>
            <ClipboardList size={22} />
          </div>
          <div className="verification-status-grid">
            <article>
              <span>Status</span>
              <strong>{capaStatusLabels[capa.status]}</strong>
            </article>
            <article>
              <span>Owner role</span>
              <strong>{capa.ownerRole ?? "Not assigned"}</strong>
            </article>
            <article>
              <span>Due date</span>
              <strong className={overdue ? "text-danger" : ""}>{capa.dueDate ? new Date(capa.dueDate).toLocaleDateString() : "Not set"}</strong>
            </article>
            <article>
              <span>Effectiveness check</span>
              <strong>{capa.effectivenessCheckDue ? new Date(capa.effectivenessCheckDue).toLocaleDateString() : "Not set"}</strong>
            </article>
            <article>
              <span>Source</span>
              <strong>
                {capa.sourceAssessmentId ? (
                  <Link href={`/assessments/${capa.sourceAssessmentId}`}>Linked assessment</Link>
                ) : capa.sourceIncidentId ? (
                  "Linked incident"
                ) : (
                  "Manual creation"
                )}
              </strong>
            </article>
            <article>
              <span>Created</span>
              <strong>{capa.createdAt ? new Date(capa.createdAt).toLocaleDateString() : "—"}</strong>
            </article>
          </div>
        </section>

        {/* Status update */}
        {adminAccess.signedIn && isActive && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Update status</p>
                <h2>Move this CAPA forward</h2>
              </div>
            </div>
            <form action={updateCapaStatusAction} className="stacked-form">
              <input type="hidden" name="capaId" value={capa.id} />
              <input type="hidden" name="returnTo" value={`/operations/capa/${capa.id}`} />
              <div className="form-grid">
                <label>
                  New status
                  <select name="status" defaultValue={capa.status}>
                    {capaStatusOptions.map((s) => (
                      <option key={s} value={s}>{capaStatusLabels[s]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Note (optional)
                  <input name="note" type="text" placeholder="e.g. Root cause confirmed, moving to in-progress" />
                </label>
              </div>
              <button className="button-primary" type="submit">Update status</button>
            </form>
          </section>
        )}

        {/* Actions list */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Corrective / Preventive Actions</p>
              <h2>
                {capa.actionCount ?? 0} action{(capa.actionCount ?? 0) !== 1 ? "s" : ""}
                {(capa.openActionCount ?? 0) > 0 ? ` · ${capa.openActionCount} open` : " · all complete"}
              </h2>
            </div>
          </div>
          {capa.actions.length === 0 ? (
            <p className="muted">No actions yet. Add a corrective or preventive action below.</p>
          ) : (
            <div className="action-list">
              {capa.actions.map((action) => (
                <article className="action-row" key={action.id}>
                  <div>
                    <strong>{action.title}</strong>
                    <span className={action.status === "complete" ? "status-current" : "status-needs-review"}>
                      {action.actionType} · {action.status.replace("_", " ")}
                    </span>
                  </div>
                  <p>
                    {action.dueDate ? `Due ${new Date(action.dueDate).toLocaleDateString()}` : "No due date"}
                    {action.completedAt ? ` · Completed ${new Date(action.completedAt).toLocaleDateString()}` : ""}
                  </p>
                  {adminAccess.signedIn && action.status !== "complete" && (
                    <form action={updateCapaActionStatusAction} style={{ display: "inline-flex", gap: 8, marginTop: 6 }}>
                      <input type="hidden" name="actionId" value={action.id} />
                      <input type="hidden" name="capaId" value={capa.id} />
                      <select name="status" defaultValue={action.status}>
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="complete">Complete</option>
                        <option value="blocked">Blocked</option>
                      </select>
                      <button className="button-secondary compact" type="submit">
                        <CheckCircle2 size={14} /> Update
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* Add action form */}
          {adminAccess.signedIn && isActive && (
            <details className="stacked-form" style={{ marginTop: 18 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 12 }}>
                <Plus size={14} style={{ display: "inline", marginRight: 4 }} />
                Add action
              </summary>
              <form action={addCapaActionAction} className="stacked-form">
                <input type="hidden" name="capaId" value={capa.id} />
                <div className="form-grid">
                  <label>
                    Action title
                    <input name="title" type="text" placeholder="e.g. Retrain staff on aseptic technique" required />
                  </label>
                  <label>
                    Type
                    <select name="actionType" defaultValue="corrective">
                      <option value="corrective">Corrective</option>
                      <option value="preventive">Preventive</option>
                    </select>
                  </label>
                  <label>
                    Due date
                    <input name="dueDate" type="date" />
                  </label>
                </div>
                <button className="button-secondary" type="submit">Add action</button>
              </form>
            </details>
          )}
        </section>

        {/* Close CAPA */}
        {adminAccess.isOwner && capa.status === "in_progress" && (capa.openActionCount ?? 0) === 0 && (
          <section className="panel access-banner access-enabled">
            <div>
              <strong>Ready to close</strong>
              <span>All actions are complete. Close this CAPA after confirming effectiveness.</span>
            </div>
            <form action={updateCapaStatusAction}>
              <input type="hidden" name="capaId" value={capa.id} />
              <input type="hidden" name="status" value="closed" />
              <input type="hidden" name="returnTo" value={`/operations/capa/${capa.id}`} />
              <input type="hidden" name="note" value="All actions complete — effectiveness verified by owner." />
              <button className="button-primary" type="submit">
                <CheckCircle2 size={15} /> Close CAPA
              </button>
            </form>
          </section>
        )}

        {/* Audit trail */}
        {capa.auditTrail.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Audit trail</p>
                <h2>Activity history</h2>
              </div>
            </div>
            <div className="action-list compact-list">
              {capa.auditTrail.map((event, i) => (
                <article className="action-row" key={i}>
                  <div>
                    <strong>{event.summary}</strong>
                    <span>{event.eventType}</span>
                  </div>
                  <p>{event.createdAt ? new Date(event.createdAt).toLocaleString() : "—"}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Human review required</h2>
            <p className="muted">
              Root-cause determination, corrective action selection, effectiveness verification,
              and final closure are the sole responsibility of qualified quality personnel.
              Draft — Human Review Required.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
