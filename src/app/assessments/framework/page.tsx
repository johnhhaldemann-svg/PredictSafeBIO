import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Risk Trigger Framework – PredictSafe" };

// ── Tier data ────────────────────────────────────────────────────────────────

const tiers = [
  {
    key: "low",
    label: "Risk Level 01",
    name: "Low Risk",
    badge: "BSL-1 / Admin",
    appliesTo:
      "BSL-1 work, administrative hazards, low-severity chemical exposure, minimal ergonomic risk",
    triggers: [
      { icon: "📋", bold: "Log assessment", desc: "to worker's record automatically" },
      { icon: "📄", bold: "Generate safe work reminder", desc: "(PDF or in-app notification)" },
      { icon: "🗓️", bold: "Schedule routine review", desc: "in 90–180 days" },
      { icon: "🔕", bold: "No supervisor notification", desc: "required" },
    ],
    reassess: "90–180 days",
    color: "#639922",
    bg: "#EAF3DE",
    border: "rgba(99,153,34,0.3)",
    glowShadow: "0 8px 32px rgba(99,153,34,0.18)",
  },
  {
    key: "moderate",
    label: "Risk Level 02",
    name: "Moderate Risk",
    badge: "BSL-2 / Chem",
    appliesTo:
      "BSL-2 agents, moderate chemical hazards, repetitive strain risk, non-trivial CAPA items",
    triggers: [
      { icon: "📧", bold: "Notify direct supervisor", desc: "via email + in-app alert" },
      { icon: "🔧", bold: "Auto-create CAPA", desc: "assigned, due within 7 days" },
      { icon: "📅", bold: "Flag for safety committee", desc: "at next scheduled meeting" },
      { icon: "📚", bold: "Required training prompt", desc: "if knowledge gap detected" },
      { icon: "🔒", bold: "Lock work record", desc: "until supervisor acknowledges" },
    ],
    reassess: "30–60 days",
    color: "#EF9F27",
    bg: "#FAEEDA",
    border: "rgba(239,159,39,0.3)",
    glowShadow: "0 8px 32px rgba(239,159,39,0.2)",
  },
  {
    key: "high",
    label: "Risk Level 03",
    name: "High Risk",
    badge: "BSL-3 / Permit",
    appliesTo:
      "BSL-3 agents, acute chemical hazards, confined space entries, serious near-miss, permit-required work",
    triggers: [
      { icon: "🚨", bold: "Push notification", desc: "to supervisor AND safety manager immediately" },
      { icon: "🛑", bold: "Work STOP recommendation", desc: "displayed prominently in app" },
      { icon: "🔧", bold: "Auto-generate CAPA", desc: "pre-assigned owner — 48 hr deadline" },
      { icon: "📋", bold: "Trigger permit review", desc: "if Controlled Work module connected" },
      { icon: "🔍", bold: "Root cause analysis field", desc: "required before closure" },
      { icon: "📈", bold: "Escalate to dept head", desc: "if CAPA not acknowledged in 24 hrs" },
      { icon: "📝", bold: "Auto-generate incident log", desc: "entry with timestamp" },
    ],
    reassess: "7–14 days",
    color: "#E24B4A",
    bg: "#FCEBEB",
    border: "rgba(226,75,74,0.3)",
    glowShadow: "0 8px 32px rgba(226,75,74,0.2)",
  },
  {
    key: "critical",
    label: "Risk Level 04",
    name: "Critical / Imminent",
    badge: "BSL-4 / Life Safety",
    appliesTo:
      "BSL-4 exposure risk, containment failure, major chemical release, life-safety threats",
    triggers: [
      { icon: "📡", bold: "Multi-channel alert", desc: "supervisor + safety mgr + site director + EHS simultaneously" },
      { icon: "🆘", bold: "Emergency protocol displayed", desc: "on screen (evac, spill, PPE requirements)" },
      { icon: "📄", bold: "Auto-generate incident report", desc: "pre-filled with assessment data" },
      { icon: "🔐", bold: "Lock work order/permit", desc: "executive sign-off required to resume" },
      { icon: "⚖️", bold: "Regulatory notification checklist", desc: "triggered (OSHA, CDC, IBC)" },
      { icon: "🔬", bold: "Mandatory investigation record", desc: "72 hr completion requirement" },
      { icon: "🛡️", bold: "Immutable audit trail", desc: "timestamp log, cannot be edited" },
    ],
    reassess: "Immediate",
    color: "#7c3aed",
    bg: "#f3effe",
    border: "rgba(124,58,237,0.3)",
    glowShadow: "0 8px 32px rgba(124,58,237,0.2)",
  },
] as const;

const principles = [
  {
    icon: "⚡",
    title: "No Manual Escalation",
    desc: "Human error in escalating is the #1 gap in safety systems. System acts automatically.",
  },
  {
    icon: "📦",
    title: "Every Trigger = A Record",
    desc: "Regulatory audits need to see the system acted — not just flagged.",
  },
  {
    icon: "✋",
    title: "Acknowledgment Gates",
    desc: "High/Critical items require a human to confirm receipt before the record progresses.",
  },
  {
    icon: "⏱️",
    title: "Escalation on Inaction",
    desc: "No response in X hours? Next level auto-notifies. No exceptions.",
  },
  {
    icon: "🔄",
    title: "Re-assessment Scheduling",
    desc: "Risk doesn't end at assessment. Close the loop with auto-scheduled reviews.",
  },
  {
    icon: "🔗",
    title: "Module Cross-Triggering",
    desc: "High risk auto-connects to CAPA, Permits, Incident Log — no siloed data.",
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RiskTriggerFrameworkPage() {
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Assess / Risk Register</p>
            <h1>Auto-Trigger Framework</h1>
            <p className="muted">
              What the platform does automatically when an assessment resolves to each risk tier.
            </p>
          </div>
          <Link className="button-secondary" href="/assessments">
            ← Risk Register
          </Link>
        </header>

        {/* Intro callout */}
        <div className="ai-context-bar">
          <span>⚙️</span>
          <span>
            <strong>Automated response, not just classification.</strong> Each risk level activates a
            defined chain of records, notifications, and gates — no human has to remember to escalate.
          </span>
        </div>

        {/* Tier cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {tiers.map((tier) => (
            <div
              key={tier.key}
              style={{
                background: "var(--panel)",
                border: `1px solid ${tier.border}`,
                borderRadius: 12,
                overflow: "hidden",
                transition: "box-shadow 0.2s",
              }}
              className="framework-tier-card"
              data-tier={tier.key}
            >
              {/* Card header */}
              <div
                style={{
                  padding: "16px 20px 14px",
                  background: tier.bg,
                  borderBottom: `1px solid ${tier.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: tier.color,
                    boxShadow: `0 0 8px ${tier.color}`,
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: tier.color,
                      opacity: 0.75,
                      marginBottom: 2,
                    }}
                  >
                    {tier.label}
                  </div>
                  <div
                    style={{ fontSize: 17, fontWeight: 800, color: tier.color, letterSpacing: "-0.02em" }}
                  >
                    {tier.name}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "3px 9px",
                    borderRadius: 5,
                    background: "rgba(255,255,255,0.6)",
                    border: `1px solid ${tier.border}`,
                    color: tier.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tier.badge}
                </span>
              </div>

              {/* Applies-to strip */}
              <div
                style={{
                  padding: "10px 20px",
                  background: "var(--panel-soft)",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 4,
                  }}
                >
                  Applies to
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>
                  {tier.appliesTo}
                </div>
              </div>

              {/* Triggers */}
              <div style={{ padding: "14px 20px" }}>
                {tier.triggers.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "7px 0",
                      borderBottom:
                        i < tier.triggers.length - 1
                          ? "1px solid var(--line)"
                          : "none",
                    }}
                  >
                    <span style={{ fontSize: 13, marginTop: 1, flexShrink: 0, width: 18, textAlign: "center" }}>
                      {t.icon}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>
                      <strong style={{ color: "var(--text)", fontWeight: 700 }}>{t.bold}</strong>
                      {" "}{t.desc}
                    </span>
                  </div>
                ))}
              </div>

              {/* Re-assess footer */}
              <div
                style={{
                  margin: "0 16px 16px",
                  background: tier.bg,
                  border: `1px solid ${tier.border}`,
                  borderRadius: 7,
                  padding: "9px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--muted)",
                  }}
                >
                  Re-assess in
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: tier.color }}>
                  {tier.reassess}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Principles */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Design Principles</p>
              <h2>Core trigger logic rules</h2>
              <p className="muted">
                These invariants apply across all tiers — they are non-negotiable constraints on
                how the trigger system behaves.
              </p>
            </div>
          </div>
          <div className="plan-grid">
            {principles.map((p) => (
              <div key={p.title} className="plan-card">
                <div style={{ fontSize: 20, marginBottom: 6 }}>{p.icon}</div>
                <strong>{p.title}</strong>
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer nav */}
        <div className="command-center-link-strip">
          <Link className="button-secondary" href="/assessments">← Risk Register</Link>
          <Link className="button-secondary" href="/workbench">Run a new assessment →</Link>
        </div>
      </div>
    </AppShell>
  );
}
