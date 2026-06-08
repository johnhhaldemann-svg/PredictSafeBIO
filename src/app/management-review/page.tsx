import type { Metadata } from "next";
import { BarChart3, ArrowRight, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";

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

export default function ManagementReviewPage() {
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
      </div>
    </AppShell>
  );
}
