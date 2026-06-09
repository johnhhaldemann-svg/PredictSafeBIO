export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Training Matrix – PredictSafeBIO" };
import { CheckCircle, ClipboardCheck, FileText, Plus, ShieldCheck, Trash2, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { formatOwnerRole } from "@/lib/display-labels";
import { getFoundationAdminAccessSummary, getTrainingMatrixSummary } from "@/lib/supabase/data";
import {
  createTrainingRequirementAction,
  deleteTrainingRequirementAction,
  markTrainingCompleteAction
} from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

export default async function TrainingMatrixPage({ searchParams }: { searchParams: Promise<{ message?: string; success?: string }> }) {
  const params = await searchParams;
  const [summaryResult, adminAccess] = await Promise.all([
    getTrainingMatrixSummary().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  const loadFailed = summaryResult === null;
  const summary = summaryResult ?? {
    counts: [], readinessScore: 0, rows: [], changeImpacts: [],
    biotypeRequirements: [], guardrailText: "Draft - Human Review Required"
  };

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · Training &amp; Competency</p>
            <h1>Training Matrix</h1>
            <p className="muted">
              Role-based training, document-change refreshers, and assignment evidence. Completion must
              be verified by a qualified reviewer — AI does not authorize training closure.
            </p>
          </div>
          <Link className="button-secondary" href="/plan/qualified-persons">Qualified Persons →</Link>
        </header>

        {loadFailed && <DataLoadError resource="the training matrix" />}

        <section className="command-center panel" aria-labelledby="training-matrix-title">
          <div className="command-hero">
            <div>
              <p className="section-label">Training & Competency</p>
              <h1 id="training-matrix-title">BioType, document, and change-impact training readiness</h1>
              <p>
                Track required training from BioType branches, controlled document changes, and live training assignment evidence in one
                review queue.
              </p>
            </div>
            <div className="command-score">
              <span>{summary.readinessScore}</span>
              <strong>Training readiness</strong>
              <small>Human validation required</small>
            </div>
          </div>
        </section>

        <section className="command-card-grid" aria-label="Training matrix summary">
          {summary.counts.map((count) => (
            <article className="command-card platform-green" key={count.label}>
              <div>
                <span>
                  <ClipboardCheck size={16} />
                </span>
                <strong>{count.label}</strong>
              </div>
              <small>{count.value}</small>
              <em>{count.label === "Change impacts" ? "Document and process changes that may trigger retraining." : "Training matrix signal."}</em>
            </article>
          ))}
        </section>

        <section className="table-panel" aria-label="Training matrix readiness table">
          <table>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Source</th>
                <th>Owner</th>
                <th>Document Impact</th>
                <th>Status</th>
                <th>Evidence</th>
                <th>Readiness</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="table-empty-cell">
                    No training requirements yet. Add one below.
                  </td>
                </tr>
              )}
              {summary.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.requirement}</td>
                  <td>{row.source}</td>
                  <td>{formatOwnerRole(row.ownerRole ?? "")}</td>
                  <td>
                    <Link href={row.documentHref}>{row.documentTitle}</Link>
                  </td>
                  <td>
                    <span className={row.readiness === "Expired" ? "overdue-cell" : row.readiness === "Current" ? "status-current" : ""}>
                      {row.assignmentStatus}
                    </span>
                    {row.dueDate ? ` / due ${new Date(row.dueDate).toLocaleDateString()}` : ""}
                  </td>
                  <td>{row.evidenceLabel}</td>
                  <td>
                    <span className={
                      row.readiness === "Current" ? "status-current" :
                      row.readiness === "Expired" ? "status-expired" :
                      row.readiness === "Needs review" ? "status-needs-review" : "status-missing"
                    }>
                      {row.readiness}
                    </span>
                  </td>
                  <td>
                    {adminAccess.signedIn && row.assignmentStatus !== "completed" && (
                      <form action={markTrainingCompleteAction}>
                        <input type="hidden" name="assignmentId" value={row.id} />
                        <button className="icon-button" type="submit" title="Mark complete" aria-label="Mark complete">
                          <CheckCircle size={15} />
                        </button>
                      </form>
                    )}
                    {adminAccess.isOwner && (
                      <form action={deleteTrainingRequirementAction}>
                        <input type="hidden" name="requirementId" value={row.id} />
                        <button className="icon-button" type="submit" title="Delete requirement" aria-label="Delete">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">BioType Requirements</p>
                <h2>Branch-driven training</h2>
              </div>
              <TrendingUp size={22} />
            </div>
            <div className="history-list">
              {summary.biotypeRequirements.map((item) => (
                <article className="history-row" key={item.biotype}>
                  <strong>{item.biotype}</strong>
                  <ul>
                    {item.training.map((training) => (
                      <li key={training}>{training}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Change Impact</p>
                <h2>Training triggers</h2>
              </div>
              <FileText size={22} />
            </div>
            <div className="history-list">
              {summary.changeImpacts.length === 0 ? <p className="muted">No change-impact training triggers found yet.</p> : null}
              {summary.changeImpacts.map((change) => (
                <article className="history-row" key={change.id}>
                  <span>{change.type}</span>
                  <strong>{change.summary}</strong>
                  <p>{change.trainingImpacts.length > 0 ? change.trainingImpacts.join(", ") : "Training impact pending owner review."}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message ? <p className="form-message">{params.message}</p> : null}

        {adminAccess.isOwner && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Add training requirement</p>
                <h2>Create a new requirement</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createTrainingRequirementAction} className="stacked-form">
              <label>
                Title
                <input name="title" type="text" placeholder="Annual Biosafety Training" required />
              </label>
              <div className="form-grid">
                <label>
                  Assigned role
                  <input name="roleKey" type="text" placeholder="e.g. Biosafety Officer" />
                </label>
                <label>
                  Frequency (months)
                  <input name="frequencyMonths" type="number" min={1} max={60} placeholder="12" />
                </label>
              </div>
              <button className="button-primary" type="submit">
                Add requirement
              </button>
            </form>
          </section>
        )}

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Training remains human validated</h2>
            <p className="muted">{summary.guardrailText}</p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
