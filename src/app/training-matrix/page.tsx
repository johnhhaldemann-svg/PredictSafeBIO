export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  CheckCircle2,
  FileText,
  Gauge,
  Plus,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { formatOwnerRole } from "@/lib/display-labels";
import { getFoundationAdminAccessSummary, getTrainingMatrixSummary } from "@/lib/supabase/data";
import {
  createTrainingRequirementAction,
  deleteTrainingRequirementAction,
  markTrainingCompleteAction,
} from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

export const metadata: Metadata = { title: "Training Matrix – PredictSafe" };

const COUNT_ICONS: Record<string, React.ReactNode> = {
  "Training requirements": <BookOpen size={18} />,
  "Current":              <CheckCircle2 size={18} />,
  "Needs review":         <AlertTriangle size={18} />,
  "Expired":              <XCircle size={18} />,
  "Missing":              <XCircle size={18} />,
  "Change impacts":       <FileText size={18} />,
};

function readinessTrend(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 50) return "Needs improvement";
  return "Action required";
}

function statusClass(readiness: string) {
  if (readiness === "Current")      return "status-current";
  if (readiness === "Expired")      return "status-expired";
  if (readiness === "Needs review") return "status-needs-review";
  return "status-missing";
}

export default async function TrainingMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; success?: string }>;
}) {
  const params = await searchParams;
  const [summaryResult, adminAccess] = await Promise.all([
    getTrainingMatrixSummary().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  const loadFailed = summaryResult === null;
  const summary = summaryResult ?? {
    counts: [], readinessScore: 0, rows: [], changeImpacts: [],
    biotypeRequirements: [], guardrailText: "",
  };

  /* Surface the 4 most actionable counts for the strip (5 cards total incl. readiness score) */
  const stripCounts = summary.counts.filter((c) =>
    ["Training requirements", "Current", "Needs review", "Expired"].includes(c.label)
  );

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · Training &amp; Competency</p>
            <h1>Training Matrix</h1>
            <p className="muted">
              Role-based training, document-change refreshers, and assignment evidence for {" "}
              {summary.biotypeRequirements.length > 0
                ? `${summary.biotypeRequirements.length} active BioType${summary.biotypeRequirements.length !== 1 ? "s" : ""}`
                : "your BioTypes"}.
              Completion must be verified by a qualified reviewer.
            </p>
          </div>
          <Link className="button-secondary" href="/plan/qualified-persons">Qualified Persons →</Link>
        </header>

        {params.success && (
          <div className="verification-pass-box"><span>✓ {params.success}</span></div>
        )}
        {params.message && <p className="form-message">{params.message}</p>}
        {loadFailed && <DataLoadError resource="the training matrix" />}

        {/* KPI strip */}
        <section className="kpi-strip" aria-label="Training matrix summary">
          <div className="kpi-card">
            <div className="kpi-icon"><Gauge size={18} /></div>
            <div className="kpi-body">
              <div className="kpi-val">{summary.readinessScore}</div>
              <div className="kpi-label">Training Readiness</div>
              <div className="kpi-trend">{readinessTrend(summary.readinessScore)}</div>
            </div>
          </div>
          {stripCounts.map((count) => (
            <div className="kpi-card" key={count.label}>
              <div className="kpi-icon">{COUNT_ICONS[count.label] ?? <BookOpen size={18} />}</div>
              <div className="kpi-body">
                <div className="kpi-val">{count.value}</div>
                <div className="kpi-label">{count.label}</div>
                <div className="kpi-trend">
                  {count.label === "Current"      ? "up to date"       :
                   count.label === "Needs review" ? "review due"       :
                   count.label === "Expired"      ? "overdue"          :
                   count.label === "Missing"      ? "not assigned"     :
                   "total requirements"}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Training matrix table */}
        <section className="table-panel" aria-label="Training matrix readiness table">
          <div className="panel-heading" style={{ padding: "14px 16px 0" }}>
            <div>
              <p className="section-label">Training Matrix</p>
              <h2>Requirements &amp; readiness</h2>
            </div>
            <TrendingUp size={20} />
          </div>
          <table>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Source</th>
                <th>Owner</th>
                <th>Document</th>
                <th>Status</th>
                <th>Evidence</th>
                <th>Readiness</th>
                <th></th>
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
                  <td><strong>{row.requirement}</strong></td>
                  <td>{row.source}</td>
                  <td>{formatOwnerRole(row.ownerRole ?? "")}</td>
                  <td>
                    {row.documentHref ? (
                      <Link href={row.documentHref}>{row.documentTitle}</Link>
                    ) : (
                      <span className="muted">{row.documentTitle || "—"}</span>
                    )}
                  </td>
                  <td>
                    <span>{row.assignmentStatus}</span>
                    {row.dueDate && (
                      <small className="muted" style={{ display: "block" }}>
                        due {new Date(row.dueDate).toLocaleDateString()}
                      </small>
                    )}
                  </td>
                  <td>{row.evidenceLabel}</td>
                  <td>
                    <span className={statusClass(row.readiness)}>{row.readiness}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {adminAccess.signedIn && row.assignmentStatus !== "completed" && (
                      <form action={markTrainingCompleteAction} style={{ display: "inline" }}>
                        <input type="hidden" name="assignmentId" value={row.id} />
                        <button className="icon-button" type="submit" title="Mark complete" aria-label="Mark complete">
                          <CheckCircle size={15} />
                        </button>
                      </form>
                    )}
                    {adminAccess.isOwner && (
                      <form action={deleteTrainingRequirementAction} style={{ display: "inline" }}>
                        <input type="hidden" name="requirementId" value={row.id} />
                        <button className="icon-button" type="submit" title="Delete" aria-label="Delete">
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

        {/* BioType requirements + Change impacts */}
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
              {summary.biotypeRequirements.length === 0 ? (
                <p className="muted">No BioType training requirements configured.</p>
              ) : (
                summary.biotypeRequirements.map((item) => (
                  <article className="history-row" key={item.biotype}>
                    <strong>{item.biotype}</strong>
                    <ul>
                      {item.training.map((training) => (
                        <li key={training}>{training}</li>
                      ))}
                    </ul>
                  </article>
                ))
              )}
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
              {summary.changeImpacts.length === 0 ? (
                <p className="muted">No change-impact training triggers found yet.</p>
              ) : (
                summary.changeImpacts.map((change) => (
                  <article className="history-row" key={change.id}>
                    <span>{change.type}</span>
                    <strong>{change.summary}</strong>
                    <p>
                      {change.trainingImpacts.length > 0
                        ? change.trainingImpacts.join(", ")
                        : "Training impact pending owner review."}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Add requirement form — owner only */}
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
      </div>
    </AppShell>
  );
}
