import Link from "next/link";
import { ClipboardCheck, FileText, ShieldCheck, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getTrainingMatrixSummary } from "@/lib/supabase/data";

export default async function TrainingMatrixPage() {
  const summary = await getTrainingMatrixSummary();

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">HSE Management Systems</p>
          <h1>Training Matrix</h1>
        </header>

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
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.requirement}</td>
                  <td>{row.source}</td>
                  <td>{row.ownerRole}</td>
                  <td>
                    <Link href={row.documentHref}>{row.documentTitle}</Link>
                  </td>
                  <td>
                    {row.assignmentStatus}
                    {row.dueDate ? ` / due ${row.dueDate}` : ""}
                  </td>
                  <td>{row.evidenceLabel}</td>
                  <td>{row.readiness}</td>
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
