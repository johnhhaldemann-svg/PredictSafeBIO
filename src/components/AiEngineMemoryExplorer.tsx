"use client";

/**
 * AiEngineMemoryExplorer
 *
 * Superadmin-only interactive view of the AI Engine's built-in knowledge:
 * risk bands, score weights, risk families, domain objects, guardrails,
 * escalation overrides, and non-negotiable rules.
 *
 * All data is sourced from engine-constants.ts and risk-families.ts — the
 * same files the engine itself uses — so this view always reflects live state.
 */

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Database,
  FlaskConical,
  GitBranch,
  Lock,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { bioRiskFamilies } from "@/lib/bio-ai/risk-families";
import {
  DOMAIN_OBJECTS,
  ENGINE_META,
  ESCALATION_OVERRIDES,
  GUARDRAIL_ALLOWED_LANGUAGE,
  GUARDRAIL_NEVER_SAY,
  NON_NEGOTIABLE_RULES,
  RISK_BANDS,
  SCORE_WEIGHTS,
} from "@/lib/bio-ai/engine-constants";

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelId =
  | "overview"
  | "risk"
  | "families"
  | "objects"
  | "guardrails"
  | "overrides"
  | "rules";

// ── Helpers ───────────────────────────────────────────────────────────────────

const riskBandClass: Record<string, string> = {
  low: "risk-low",
  moderate: "risk-moderate",
  high: "risk-high",
  critical: "risk-critical",
};

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV: { id: PanelId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Activity size={14} /> },
  { id: "risk", label: "Risk model", icon: <ShieldAlert size={14} /> },
  { id: "families", label: "Risk families", icon: <FlaskConical size={14} /> },
  { id: "objects", label: "Domain objects", icon: <Database size={14} /> },
  { id: "guardrails", label: "Guardrails", icon: <Lock size={14} /> },
  { id: "overrides", label: "Escalations", icon: <AlertTriangle size={14} /> },
  { id: "rules", label: "Core rules", icon: <BookOpen size={14} /> },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AiEngineMemoryExplorer() {
  const [activePanel, setActivePanel] = useState<PanelId>("overview");
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

  function toggleFamily(id: string) {
    setSelectedFamily((prev) => (prev === id ? null : id));
  }

  const detailFamily =
    selectedFamily != null
      ? bioRiskFamilies.find((f) => f.id === selectedFamily) ?? null
      : null;

  return (
    <div className="ai-mem-shell">
      {/* ── Sidebar nav ── */}
      <nav className="ai-mem-nav" aria-label="Engine memory sections">
        {NAV.map(({ id, label, icon }) => (
          <button
            key={id}
            className={`ai-mem-nav-btn${activePanel === id ? " active" : ""}`}
            onClick={() => setActivePanel(id)}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* ── Panel body ── */}
      <div className="ai-mem-body">

        {/* Overview */}
        {activePanel === "overview" && (
          <div>
            <p className="section-label">Engine identity</p>
            <div className="ai-mem-meta-grid">
              <div className="ai-mem-meta-card">
                <span className="ai-mem-meta-label">Name</span>
                <span className="ai-mem-meta-val">{ENGINE_META.name}</span>
              </div>
              <div className="ai-mem-meta-card">
                <span className="ai-mem-meta-label">Version</span>
                <span className="ai-mem-meta-val">{ENGINE_META.version}</span>
              </div>
              <div className="ai-mem-meta-card">
                <span className="ai-mem-meta-label">Generated</span>
                <span className="ai-mem-meta-val">{ENGINE_META.generatedDate}</span>
              </div>
              <div className="ai-mem-meta-card">
                <span className="ai-mem-meta-label">Domain</span>
                <span className="ai-mem-meta-val">{ENGINE_META.domain}</span>
              </div>
              <div className="ai-mem-meta-card">
                <span className="ai-mem-meta-label">Risk families</span>
                <span className="ai-mem-meta-val">{bioRiskFamilies.length} active</span>
              </div>
              <div className="ai-mem-meta-card">
                <span className="ai-mem-meta-label">Domain objects</span>
                <span className="ai-mem-meta-val">{DOMAIN_OBJECTS.length} tracked</span>
              </div>
              <div className="ai-mem-meta-card">
                <span className="ai-mem-meta-label">Guardrails</span>
                <span className="ai-mem-meta-val">{GUARDRAIL_NEVER_SAY.length} enforced</span>
              </div>
              <div className="ai-mem-meta-card">
                <span className="ai-mem-meta-label">Escalation overrides</span>
                <span className="ai-mem-meta-val">{ESCALATION_OVERRIDES.length} rules</span>
              </div>
            </div>

            <p className="section-label" style={{ marginTop: "1.25rem" }}>Mission</p>
            <ul className="ai-mem-rule-list">
              {[
                "Prevent biosafety and contamination incidents.",
                "Protect product quality and patient safety.",
                "Detect data-integrity and documentation risk.",
                "Manage SOPs, deviations, CAPA, change controls, training, audits, and batch/study readiness.",
                "Predict operational, quality, and compliance risk before it becomes a failure.",
              ].map((m, i) => (
                <li key={i} className="ai-mem-rule-item">
                  <span className="ai-mem-rule-num">{i + 1}</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk model */}
        {activePanel === "risk" && (
          <div>
            <p className="section-label">Score bands</p>
            <div className="ai-mem-band-list">
              {RISK_BANDS.map((band) => (
                <div key={band.level} className="ai-mem-band-row">
                  <span className={`rbadge ${riskBandClass[band.level]}`}>
                    {band.level.charAt(0).toUpperCase() + band.level.slice(1)}
                  </span>
                  <span className="ai-mem-band-score">{band.scoreRange}</span>
                  <span className="ai-mem-band-action muted">{band.defaultAction}</span>
                  <span className="ai-mem-band-time muted">{band.timeframe}</span>
                </div>
              ))}
            </div>

            <p className="section-label" style={{ marginTop: "1.25rem" }}>Score weights</p>
            <div className="ai-mem-weight-list">
              {SCORE_WEIGHTS.map(({ label, weight }) => (
                <div key={label} className="ai-mem-weight-row">
                  <span className="ai-mem-weight-label muted">{label}</span>
                  <div className="ai-mem-weight-bar-bg">
                    <div
                      className="ai-mem-weight-bar"
                      style={{ width: `${weight * 100}%` }}
                    />
                  </div>
                  <span className="ai-mem-weight-pct">
                    {Math.round(weight * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk families */}
        {activePanel === "families" && (
          <div>
            <p className="section-label">
              {bioRiskFamilies.length} families — click to expand
            </p>
            <div className="ai-mem-family-grid">
              {bioRiskFamilies.map((family) => (
                <button
                  key={family.id}
                  className={`ai-mem-family-card${selectedFamily === family.id ? " selected" : ""}`}
                  onClick={() => toggleFamily(family.id)}
                >
                  <GitBranch size={16} className="ai-mem-family-icon" aria-hidden />
                  <span className="ai-mem-family-title">{family.label}</span>
                  <span className="ai-mem-family-sub muted">
                    {family.signalTypes.length} signal{family.signalTypes.length !== 1 ? "s" : ""} ·{" "}
                    {family.criticalControls.length} controls
                  </span>
                </button>
              ))}
            </div>

            {detailFamily && (
              <div className="ai-mem-family-detail">
                <h3 style={{ marginBottom: "0.75rem" }}>{detailFamily.label}</h3>

                <p className="section-label">Signal types</p>
                <div className="ai-mem-tag-row">
                  {detailFamily.signalTypes.map((s) => (
                    <span key={s} className="ai-mem-tag">{s.replace(/_/g, " ")}</span>
                  ))}
                </div>

                <p className="section-label" style={{ marginTop: "0.75rem" }}>Keywords</p>
                <div className="ai-mem-tag-row">
                  {detailFamily.keywords.map((k) => (
                    <span key={k} className="ai-mem-tag">{k}</span>
                  ))}
                </div>

                <p className="section-label" style={{ marginTop: "0.75rem" }}>Critical controls</p>
                <div className="ai-mem-tag-row">
                  {detailFamily.criticalControls.map((c) => (
                    <span key={c} className="ai-mem-tag ai-mem-tag-control">{c}</span>
                  ))}
                </div>

                <p className="section-label" style={{ marginTop: "0.75rem" }}>Review owners</p>
                <div className="ai-mem-tag-row">
                  {detailFamily.ownerRoles.map((o) => (
                    <span key={o} className="ai-mem-tag ai-mem-tag-owner">
                      {o.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Domain objects */}
        {activePanel === "objects" && (
          <div>
            <p className="section-label">{DOMAIN_OBJECTS.length} tracked entities</p>
            <div className="ai-mem-obj-grid">
              {DOMAIN_OBJECTS.map((obj) => (
                <div key={obj} className="ai-mem-obj-card">
                  <Database size={12} aria-hidden />
                  {obj}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guardrails */}
        {activePanel === "guardrails" && (
          <div>
            <p className="section-label">Never say</p>
            <div className="ai-mem-guardrail-list">
              {GUARDRAIL_NEVER_SAY.map((s) => (
                <div key={s} className="ai-mem-guardrail-item ai-mem-guardrail-never">
                  <XCircle size={13} aria-hidden />
                  {s}
                </div>
              ))}
            </div>

            <p className="section-label" style={{ marginTop: "1rem" }}>Allowed language</p>
            <div className="ai-mem-guardrail-list">
              {GUARDRAIL_ALLOWED_LANGUAGE.map((s) => (
                <div key={s} className="ai-mem-guardrail-item ai-mem-guardrail-allow">
                  <CheckCircle2 size={13} aria-hidden />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Escalation overrides */}
        {activePanel === "overrides" && (
          <div>
            <p className="section-label">
              {ESCALATION_OVERRIDES.length} conditions that auto-escalate risk bands
            </p>
            <div className="ai-mem-rule-list">
              {ESCALATION_OVERRIDES.map((rule, i) => (
                <div key={i} className="ai-mem-override-item">
                  <span className="ai-mem-override-num">{i + 1}</span>
                  {rule}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Core rules */}
        {activePanel === "rules" && (
          <div>
            <p className="section-label">Non-negotiable rules</p>
            <ul className="ai-mem-rule-list">
              {NON_NEGOTIABLE_RULES.map((rule, i) => (
                <li key={i} className="ai-mem-rule-item">
                  <span className="ai-mem-rule-num">{i + 1}</span>
                  {rule}
                </li>
              ))}
            </ul>

            <div
              className="verification-pass-box"
              style={{ marginTop: "1.25rem" }}
            >
              <strong>
                <ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                AI will never replace human judgment
              </strong>
              <span>
                Every assessment is draft-only. Human review is required before any
                regulatory or safety decision. The engine assists — it does not approve.
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
