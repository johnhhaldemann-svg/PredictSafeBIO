import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight, CheckCircle, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Lessons Learned – PredictSafeBIO" };

const LESSON_SOURCES = [
  { label: "Incident investigations",       desc: "Root cause findings that reveal systemic issues beyond the immediate event" },
  { label: "CAPA closures",                 desc: "What worked, what needed adjustment, and why the issue recurred (or did not)" },
  { label: "Audit observations",            desc: "Patterns across audits that point to process or culture gaps" },
  { label: "Near misses",                   desc: "High-value signals — the near miss that did not become a recordable" },
  { label: "Regulatory changes",            desc: "How rule changes forced a process update and what the transition revealed" },
  { label: "Management review outputs",     desc: "Strategic insights from leadership that should propagate to the team" },
  { label: "External benchmarking",         desc: "Industry incidents (OSHA enforcement actions, EPA enforcement) relevant to your operations" },
];

const LOOP_BACK = [
  { phase: "Phase 1 — Assess",   action: "New hazard identified → add to Hazard Register and re-score Risk Register" },
  { phase: "Phase 2 — Plan",     action: "Control gaps found → update Control Register and SOP library" },
  { phase: "Phase 3 — Operate",  action: "Procedural failures → revise work instructions and retrain" },
  { phase: "Phase 4 — Monitor",  action: "KPI weakness surfaced → add monitoring frequency or new leading indicator" },
  { phase: "Phase 5 — CAPA",     action: "Recurring issue pattern → systemic CAPA targeting root system" },
];

export default function LessonsLearnedPage() {
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Monitor · Phase 6 — Review &amp; Improve</p>
          <h1>Lessons Learned</h1>
          <p className="muted">
            Capture, share, and act on insights from incidents, CAPAs, audits, and near misses.
            Lessons Learned closes the loop — every insight feeds back into Phase 1 to make the
            next cycle smarter. Required documentation under ICH Q10 and ISO 45001.
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
            <BookOpen size={18} style={{ color: "var(--brand)" }} />
            <span style={{ fontWeight: 700 }}>Module in Development</span>
          </div>
          <p style={{ fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "16px" }}>
            A structured lessons learned registry — tagging entries by phase, hazard type, and
            affected program, with auto-distribution to relevant team members — is on the roadmap.
            Today, capture lessons as CAPA notes or in the Documents library and share in
            Management Review.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link
              href="/operations/capa"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                fontSize: ".83rem", fontWeight: 600, color: "var(--brand)", textDecoration: "none"
              }}
            >
              Open CAPA <ArrowRight size={13} />
            </Link>
            <Link
              href="/management-review"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                fontSize: ".83rem", fontWeight: 600, color: "var(--brand)", textDecoration: "none"
              }}
            >
              Management Review <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "900px" }}>
          {/* Sources */}
          <section>
            <h2 style={{ fontSize: ".95rem", fontWeight: 700, marginBottom: "12px" }}>
              📥 Where Lessons Come From
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {LESSON_SOURCES.map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: "10px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "7px",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: ".83rem", marginBottom: "3px" }}>{s.label}</div>
                  <div style={{ fontSize: ".77rem", color: "var(--muted)", lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Loop back */}
          <section>
            <h2 style={{ fontSize: ".95rem", fontWeight: 700, marginBottom: "12px" }}>
              🔄 How Lessons Feed Back into the Cycle
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {LOOP_BACK.map((l) => (
                <div
                  key={l.phase}
                  style={{
                    padding: "10px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "7px",
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <RefreshCw size={13} style={{ color: "var(--brand)", marginTop: "3px", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: ".80rem", marginBottom: "2px", color: "var(--brand)" }}>{l.phase}</div>
                    <div style={{ fontSize: ".77rem", color: "var(--muted)", lineHeight: 1.5 }}>{l.action}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: "14px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "8px",
              padding: "12px 16px",
              fontSize: ".80rem",
              color: "#14532d",
              lineHeight: 1.6,
            }}>
              <strong>ICH Q10 §2.7:</strong> The pharmaceutical quality system should include
              a process for knowledge management, including the sharing of knowledge and lessons
              learned across products, processes, and sites.
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
