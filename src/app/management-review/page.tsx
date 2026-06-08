import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowRight, CheckCircle, RefreshCw } from "lucide-react";
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
          <p className="section-label">Monitor · Management Review</p>
          <h1>Management Review</h1>
          <p className="muted">
            Formal quarterly and annual review of the EHS management system by senior leadership.
            This is the Phase 6 close-the-loop mechanism — findings feed directly back into
            risk assessments and the improvement plan. Required under ISO 45001 and ICH Q10.
          </p>
        </header>

        {/* Module status */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderLeft: "4px solid var(--brand)",
          borderRadius: "10px",
          padding: "20px 24px",
          maxWidth: "680px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <BarChart3 size={18} style={{ color: "var(--brand)" }} />
            <span style={{ fontWeight: 700 }}>Module in Development</span>
          </div>
          <p style={{ fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "16px" }}>
            Structured management review workflows — agenda builder, auto-populated KPI summaries,
            action item tracking, and signed meeting records — are on the roadmap. Today, use the
            Risk Monitor and Predictive Engine dashboards to assemble your review inputs.
          </p>
          <a
            href="/risk-command-center"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              fontSize: ".83rem", fontWeight: 600, color: "var(--brand)", textDecoration: "none"
            }}
          >
            Open Risk Monitor <ArrowRight size={13} />
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "860px" }}>
          {/* Inputs */}
          <section>
            <h2 style={{ fontSize: ".95rem", fontWeight: 700, marginBottom: "12px", color: "var(--brand)" }}>
              📥 Review Inputs
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {REVIEW_INPUTS.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    padding: "8px 12px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: ".80rem",
                    lineHeight: 1.5,
                  }}
                >
                  <CheckCircle size={13} style={{ color: "var(--brand)", marginTop: "2px", flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Outputs */}
          <section>
            <h2 style={{ fontSize: ".95rem", fontWeight: 700, marginBottom: "12px", color: "#2e7d32" }}>
              📤 Review Outputs
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {REVIEW_OUTPUTS.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    padding: "8px 12px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: ".80rem",
                    lineHeight: 1.5,
                  }}
                >
                  <ArrowRight size={13} style={{ color: "#2e7d32", marginTop: "2px", flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>

            <div style={{
              marginTop: "16px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "8px",
              padding: "12px 16px",
              fontSize: ".80rem",
              color: "#14532d",
              lineHeight: 1.6,
            }}>
              <strong>ISO 45001 Clause 9.3:</strong> Management review outputs must include decisions
              related to continual improvement opportunities, changes to the OH&S management system,
              and resource needs. Records must be retained as documented information.
            </div>
          </section>
        </div>

        {/* Phase 6 → Phase 1 feedback loop */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Phase 6 → Phase 1 Loop-back</p>
              <h2>Feed finding to Hazard Register</h2>
            </div>
            <RefreshCw size={22} style={{ color: "var(--brand)" }} />
          </div>
          <p className="muted" style={{ marginBottom: "16px" }}>
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
          <p style={{ fontSize: ".75rem", color: "var(--muted)", marginTop: "10px" }}>
            Record will be created as <strong>Identified — Draft, Human Review Required</strong> and
            linked back to the risk scoring engine. A qualified reviewer must assess and classify it.
          </p>
        </section>

        {/* Trend data shortcut */}
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
