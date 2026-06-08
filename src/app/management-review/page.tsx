import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, RefreshCw, ShieldCheck, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { feedFindingToHazardRegisterAction } from "./actions";

export const metadata: Metadata = { title: "Management Review – PredictSafeBIO" };

const REVIEW_INPUTS = [
  "Results of internal and external audits",
  "Incident trends — TRIR, near miss rate, CAPA backlog",
  "CAPA effectiveness — recurrence rate, on-time closure",
  "Training completion rate by role and department",
  "Regulatory changes and new compliance obligations",
  "Resource adequacy — staffing, equipment, budget",
  "Risk register updates — new hazards, residual risk changes",
  "Corrective actions from the previous review",
  "Stakeholder feedback — employees, regulators, customers",
  "Objectives and KPIs performance vs. targets",
];

const REVIEW_OUTPUTS = [
  "Decisions on opportunities for continual improvement",
  "Any need for changes to the EHS management system",
  "Resource requirements for the next period",
  "Updated EHS objectives and targets",
  "Risk register revisions feeding back to Phase 1 (Assess)",
];

type Props = { searchParams: Promise<{ message?: string }> };

export default async function ManagementReviewPage({ searchParams }: Props) {
  const { message } = await searchParams;
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Monitor · Management Review</p>
            <h1>Management Review</h1>
            <p className="muted">
              Formal quarterly and annual review of the EHS management system by senior leadership.
              This is the Phase 6 close-the-loop mechanism — findings feed directly back into
              risk assessments and the improvement plan. Required under ISO 45001 and ICH Q10.
            </p>
          </div>
          <Link className="button-secondary" href="/trends">Trend Analysis →</Link>
        </header>

        <div className="ai-context-bar ai-context-bar--warning">
          <BarChart3 size={15} />
          <span>
            <strong>Module in Development.</strong>{" "}
            Structured management review workflows — agenda builder, auto-populated KPI summaries,
            action item tracking, and signed meeting records — are on the roadmap. Use the Risk Monitor
            and Predictive Engine dashboards to assemble your review inputs today.
          </span>
          <a className="ai-fill-btn ai-fill-btn--warning" href="/risk-command-center">Open Risk Monitor</a>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Inputs</p>
              <h2>Review Inputs</h2>
            </div>
            <CheckCircle size={20} />
          </div>
          <div className="action-list">
            {REVIEW_INPUTS.map((item) => (
              <article className="action-row" key={item}>
                <div><strong>{item}</strong></div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Outputs</p>
              <h2>Review Outputs</h2>
            </div>
            <RefreshCw size={20} />
          </div>
          <div className="action-list">
            {REVIEW_OUTPUTS.map((item) => (
              <article className="action-row" key={item}>
                <div><strong>{item}</strong></div>
              </article>
            ))}
          </div>
          <div className="ai-context-bar ai-context-bar--success">
            <ShieldCheck size={14} />
            <span>
              <strong>ISO 45001 Clause 9.3:</strong> Management review outputs must include decisions
              related to continual improvement opportunities, changes to the OH&S management system,
              and resource needs. Records must be retained as documented information.
            </span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Phase 6 → Phase 1 Loop-back</p>
              <h2>Feed finding to Hazard Register</h2>
            </div>
            <RefreshCw size={22} />
          </div>
          <p className="muted">
            When this review surfaces a new or uncontrolled risk, log it directly into the
            Hazard Register. It will be scored by the Predictive Engine as a leading indicator.
          </p>
          {message && <p className="form-message">{message}</p>}
          <form action={feedFindingToHazardRegisterAction} className="stacked-form">
            <div className="form-grid">
              <label>
                Finding / Hazard name
                <input name="name" type="text" placeholder="e.g. Inadequate fume hood maintenance schedule" required />
              </label>
              <label>
                Hazard type
                <select name="hazardType" defaultValue="other">
                  <option value="biological">Biological</option>
                  <option value="chemical">Chemical</option>
                  <option value="ergonomic">Ergonomic</option>
                  <option value="radiation">Radiation</option>
                  <option value="equipment">Equipment</option>
                  <option value="environmental">Environmental</option>
                  <option value="fire">Fire / flammable</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Location (optional)
                <input name="location" type="text" placeholder="e.g. Lab 101" />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" rows={2} placeholder="What was found during review and why it needs reassessment" />
            </label>
            <button className="button-primary" type="submit">
              Add to Hazard Register
            </button>
          </form>
          <p className="muted">
            Record will be created as <strong>Identified — Draft, Human Review Required</strong> and
            linked back to the risk scoring engine. A qualified reviewer must assess and classify it.
          </p>
        </section>

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Before your review</p>
            <h2>Pull trend data</h2>
            <p className="muted">View current CAPA backlog, training completion, and audit readiness score.</p>
          </div>
          <Link href="/trends" className="button-secondary">Open Trend Analysis</Link>
        </section>
      </div>
    </AppShell>
  );
}
