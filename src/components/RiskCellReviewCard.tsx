"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert, Zap } from "lucide-react";
// Actions passed as props from the server page (avoids client→server-only import chain)
import type { RiskCell } from "@/lib/supabase/risk-dashboard-service";

// Defined inline to avoid importing server-only risk-dashboard-service in a client component
const linkedRecordRoutes: Record<string, string> = {
  chemical_inventory: "/chemical-inventory",
  waste_records: "/waste-management",
  capa_records: "/operations/capa",
  controlled_work_permits: "/permits",
  pesticide_disinfectant_records: "/pesticide",
  biosafety_risk_assessments: "/assessments",
  audit_findings: "/inspections",
  assessment_signals: "/assessments",
  ergonomic_risk_signals: "/ergonomics/self-assessment",
};

// ---------------------------------------------------------------------------
// Payload shape written by continuous-scoring-service
// ---------------------------------------------------------------------------
type AiPayload = {
  ai_score?: number;
  ai_level?: string;
  ai_confidence?: string;
  ai_action_timeframe?: string;
  ai_human_review_required?: boolean;
  ai_human_review_reason?: string;
  ai_escalation_required?: boolean;
  ai_top_drivers?: string[];
  ai_recommended_actions?: Array<{ title: string; owner: string; type: string }>;
  ai_critical_control_gaps?: string[];
  ai_explanation?: string;
  scored_at?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SEVERITY_BADGE: Record<string, string> = {
  critical: "status-overdue",
  high:     "status-overdue",
  medium:   "status-needs-review",
  low:      "status-current",
};

const TIMEFRAME_LABEL: Record<string, string> = {
  immediate:          "Immediate action",
  before_continuing:  "Before continuing work",
  same_day:           "Same day",
  routine:            "Routine monitoring",
};

const CONFIDENCE_CLASS: Record<string, string> = {
  high:   "status-current",
  medium: "status-needs-review",
  low:    "status-overdue",
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color =
    pct >= 81 ? "#c0392b" :
    pct >= 61 ? "#e67e22" :
    pct >= 41 ? "#e9b44c" :
    "#27ae60";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem" }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "var(--border, #e0e0e0)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color }}>
        {pct}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function RiskCellReviewCard({
  cell,
  returnTo = "/risk-command-center",
  acknowledgeRiskCellAction,
  dismissRiskCellAction,
  escalateToCapaAction,
}: {
  cell: RiskCell;
  returnTo?: string;
  acknowledgeRiskCellAction: (formData: FormData) => Promise<void>;
  dismissRiskCellAction: (formData: FormData) => Promise<void>;
  escalateToCapaAction: (formData: FormData) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeForm, setActiveForm] = useState<"dismiss" | "escalate" | null>(null);

  const payload = (cell.payload ?? {}) as AiPayload;
  const hasAi   = typeof payload.ai_score === "number";
  const route   = cell.linkedRecordType ? linkedRecordRoutes[cell.linkedRecordType] : null;

  const drivers  = payload.ai_top_drivers ?? [];
  const actions  = payload.ai_recommended_actions ?? [];
  const gaps     = payload.ai_critical_control_gaps ?? [];
  const timeframe = payload.ai_action_timeframe
    ? TIMEFRAME_LABEL[payload.ai_action_timeframe] ?? payload.ai_action_timeframe
    : null;

  return (
    <article
      className="action-row risk-cell-review-card"
      style={{ gap: "0.6rem", flexDirection: "column", alignItems: "stretch" }}
    >
      {/* ── Header row ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
            <strong style={{ fontSize: "0.9rem" }}>
              {route && cell.linkedRecordId ? (
                <Link href={route}>{cell.label}</Link>
              ) : (
                cell.label
              )}
            </strong>
            <span className={SEVERITY_BADGE[cell.severity] ?? "status-needs-review"} style={{ textTransform: "capitalize" }}>
              {cell.severity}
            </span>
            {payload.ai_human_review_required && (
              <span className="status-overdue" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.72rem" }}>
                <ShieldAlert size={11} /> Review required
              </span>
            )}
            {payload.ai_escalation_required && (
              <span className="status-overdue" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.72rem" }}>
                <Zap size={11} /> Escalation required
              </span>
            )}
          </div>
          {cell.linkedRecordType && (
            <span className="muted" style={{ fontSize: "0.75rem" }}>
              {cell.linkedRecordType.replace(/_/g, " ")}
              {cell.createdAt ? ` · ${new Date(cell.createdAt).toLocaleDateString()}` : ""}
            </span>
          )}
        </div>

        {/* AI score */}
        {hasAi && (
          <div style={{ textAlign: "right", flexShrink: 0, minWidth: 80 }}>
            <div style={{ fontSize: "0.68rem", color: "var(--muted, #888)", marginBottom: 2 }}>AI RISK SCORE</div>
            <ScoreBar score={payload.ai_score!} />
            {payload.ai_confidence && (
              <span
                className={CONFIDENCE_CLASS[payload.ai_confidence] ?? "status-needs-review"}
                style={{ fontSize: "0.68rem", marginTop: 3, display: "inline-block" }}
              >
                {payload.ai_confidence} confidence
              </span>
            )}
          </div>
        )}
      </div>

      {/* Timeframe pill */}
      {timeframe && (
        <div style={{ fontSize: "0.75rem" }}>
          <AlertTriangle size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
          <strong>{timeframe}</strong>
        </div>
      )}

      {/* ── Expand/collapse toggle ── */}
      {hasAi && (
        <button
          className="button-secondary compact"
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4 }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "Hide AI detail" : "Show AI detail"}
        </button>
      )}

      {/* ── Expanded AI detail ── */}
      {expanded && hasAi && (
        <div
          style={{
            background: "var(--surface, #fafafa)",
            border: "1px solid var(--border, #e0e0e0)",
            borderRadius: 8,
            padding: "0.9rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            fontSize: "0.82rem",
          }}
        >
          {/* Explanation */}
          {payload.ai_explanation && (
            <div>
              <strong style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6 }}>
                AI Assessment
              </strong>
              <p style={{ marginTop: 4, lineHeight: 1.55 }}>{payload.ai_explanation}</p>
            </div>
          )}

          {/* Human review reason */}
          {payload.ai_human_review_reason && (
            <div style={{ borderLeft: "3px solid var(--border, #e0e0e0)", paddingLeft: "0.75rem" }}>
              <strong style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6 }}>
                Review Reason
              </strong>
              <p style={{ marginTop: 4, lineHeight: 1.5 }}>{payload.ai_human_review_reason}</p>
            </div>
          )}

          {/* Top drivers */}
          {drivers.length > 0 && (
            <div>
              <strong style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6 }}>
                Risk Drivers
              </strong>
              <ul style={{ margin: "4px 0 0 0", padding: "0 0 0 1.1rem", lineHeight: 1.6 }}>
                {drivers.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          )}

          {/* Recommended actions */}
          {actions.length > 0 && (
            <div>
              <strong style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6 }}>
                Recommended Actions
              </strong>
              <ul style={{ margin: "4px 0 0 0", padding: "0 0 0 1.1rem", lineHeight: 1.6 }}>
                {actions.map((a) => (
                  <li key={a.title}>
                    {a.title}
                    <span className="muted" style={{ fontSize: "0.78em" }}> · {a.owner.replace(/_/g, " ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Control gaps */}
          {gaps.length > 0 && (
            <div>
              <strong style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--red, #c0392b)" }}>
                Critical Control Gaps
              </strong>
              <ul style={{ margin: "4px 0 0 0", padding: "0 0 0 1.1rem", lineHeight: 1.6 }}>
                {gaps.map((g) => <li key={g} style={{ color: "var(--red, #c0392b)" }}>{g}</li>)}
              </ul>
            </div>
          )}

          {payload.scored_at && (
            <p className="muted" style={{ fontSize: "0.7rem" }}>
              Scored {new Date(payload.scored_at).toLocaleString()} · Draft — human review required
            </p>
          )}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.1rem" }}>
        {/* Acknowledge */}
        <form action={acknowledgeRiskCellAction}>
          <input type="hidden" name="cellId" value={cell.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button className="button-secondary compact" type="submit">
            Acknowledge
          </button>
        </form>

        {/* Dismiss toggle */}
        <button
          className="button-secondary compact"
          type="button"
          onClick={() => setActiveForm(activeForm === "dismiss" ? null : "dismiss")}
        >
          Dismiss
        </button>

        {/* Escalate to CAPA toggle */}
        <button
          className="button-primary compact"
          type="button"
          onClick={() => setActiveForm(activeForm === "escalate" ? null : "escalate")}
        >
          Escalate to CAPA
        </button>

        {route && cell.linkedRecordId && (
          <Link className="button-secondary compact" href={route}>
            Open source
          </Link>
        )}
      </div>

      {/* ── Dismiss form ── */}
      {activeForm === "dismiss" && (
        <form
          action={dismissRiskCellAction}
          style={{
            background: "var(--surface, #fafafa)",
            border: "1px solid var(--border, #e0e0e0)",
            borderRadius: 8,
            padding: "0.9rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <input type="hidden" name="cellId" value={cell.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <strong style={{ fontSize: "0.82rem" }}>Dismiss this risk cell</strong>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            Provide a reason — this is logged to the audit trail and cannot be undone.
          </p>
          <label style={{ fontSize: "0.82rem" }}>
            Dismissal reason (required)
            <textarea
              name="reason"
              placeholder="e.g. False positive — investigated and confirmed no hazard present."
              rows={2}
              required
              style={{ marginTop: "0.3rem", width: "100%" }}
            />
          </label>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className="button-secondary compact" type="submit">Confirm dismiss</button>
            <button className="button-secondary compact" type="button" onClick={() => setActiveForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {/* ── Escalate to CAPA form ── */}
      {activeForm === "escalate" && (
        <form
          action={escalateToCapaAction}
          style={{
            background: "var(--surface, #fafafa)",
            border: "1px solid var(--border, #e0e0e0)",
            borderRadius: 8,
            padding: "0.9rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <input type="hidden" name="cellId" value={cell.id} />
          <input type="hidden" name="cellLabel" value={cell.label} />
          <input type="hidden" name="severity" value={cell.severity} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <strong style={{ fontSize: "0.82rem" }}>Escalate to CAPA</strong>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            Creates a CAPA record linked to this cell. The cell will be resolved and the CAPA becomes
            the tracked corrective action.
          </p>
          <label style={{ fontSize: "0.82rem" }}>
            Assign owner role
            <select name="ownerRole" defaultValue={payload.ai_recommended_actions?.[0]?.owner ?? "qa"} style={{ marginTop: "0.3rem" }}>
              <option value="qa">QA</option>
              <option value="quality_unit">Quality Unit</option>
              <option value="biosafety_officer">Biosafety Officer</option>
              <option value="ehs">EHS</option>
              <option value="validation_lead">Validation Lead</option>
              <option value="responsible_scientist">Responsible Scientist</option>
            </select>
          </label>
          <label style={{ fontSize: "0.82rem" }}>
            Initial investigation note (optional)
            <textarea
              name="note"
              placeholder="Describe the issue and initial findings for the CAPA record."
              rows={2}
              style={{ marginTop: "0.3rem", width: "100%" }}
            />
          </label>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className="button-primary compact" type="submit">Create CAPA</button>
            <button className="button-secondary compact" type="button" onClick={() => setActiveForm(null)}>Cancel</button>
          </div>
        </form>
      )}
    </article>
  );
}
