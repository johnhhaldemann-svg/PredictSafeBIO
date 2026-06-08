import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ClipboardList, Clock, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Incident Reporting – PredictSafeBIO" };

const INCIDENT_TYPES = [
  { label: "Near Miss",          desc: "Unplanned event with potential for injury or loss — no harm occurred" },
  { label: "First Aid Case",     desc: "Minor injury treated on-site; no lost time" },
  { label: "Recordable Injury",  desc: "OSHA 300 recordable — medical treatment beyond first aid" },
  { label: "Exposure Event",     desc: "Chemical, biological, or physical agent exposure" },
  { label: "Property Damage",    desc: "Equipment, facility, or material damage" },
  { label: "Environmental Release", desc: "Spill, emission, or release reaching the environment" },
];

export default function IncidentReportingPage() {
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Operate · Incident Reporting</p>
          <h1>Incident Reporting</h1>
          <p className="muted">
            Log safety incidents within 24 hours. Every report auto-creates a CAPA entry for root
            cause investigation and feeds trend data into the Predictive Engine.
          </p>
        </header>

        {/* Coming-soon build-out notice */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderLeft: "4px solid var(--brand)",
          borderRadius: "10px",
          padding: "20px 24px",
          maxWidth: "680px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <AlertCircle size={18} style={{ color: "var(--brand)" }} />
            <span style={{ fontWeight: 700 }}>Module in Development</span>
          </div>
          <p style={{ fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "16px" }}>
            The full incident reporting workflow — intake form, triage, OSHA 300 log, and 24-hour
            notification routing — is being built. In the meantime, use the CAPA module to log and
            track corrective actions for any incidents that have occurred.
          </p>
          <Link
            href="/operations/capa"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              fontSize: ".83rem", fontWeight: 600, color: "var(--brand)", textDecoration: "none"
            }}
          >
            Go to CAPA <ArrowRight size={13} />
          </Link>
        </div>

        {/* Incident type reference */}
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>
            Incident Types — Reporting Scope
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", maxWidth: "760px" }}>
            {INCIDENT_TYPES.map((t) => (
              <div
                key={t.label}
                style={{
                  padding: "12px 16px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: ".85rem", marginBottom: "4px" }}>{t.label}</div>
                <div style={{ fontSize: ".78rem", color: "var(--muted)", lineHeight: 1.5 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Reporting obligation reminder */}
        <div style={{
          background: "#fef3c7",
          border: "1px solid #fbbf24",
          borderRadius: "8px",
          padding: "14px 18px",
          maxWidth: "680px",
          fontSize: ".83rem",
          color: "#78350f",
          lineHeight: 1.6,
        }}>
          <strong>⏱ Reporting obligations:</strong> OSHA requires recordable incidents be logged on
          the 300 Log within 7 days. Fatalities and in-patient hospitalisations must be reported to
          OSHA within 8 hours. Amputations and eye losses within 24 hours.
        </div>
      </div>
    </AppShell>
  );
}
