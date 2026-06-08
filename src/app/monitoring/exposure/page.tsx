import type { Metadata } from "next";
import { Activity, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Exposure Monitoring – PredictSafeBIO" };

const MONITORING_TYPES = [
  {
    label: "Air Sampling (Chemical)",
    desc: "Personal and area air samples for VOCs, particulates, and specific chemicals vs. OSHA PELs and ACGIH TLVs",
    standard: "OSHA 1910.1000; NIOSH methods",
  },
  {
    label: "Biological Exposure Monitoring",
    desc: "Blood, urine, or breath biomarker sampling to confirm agent absorption below ACGIH BEIs",
    standard: "ACGIH BEIs; OSHA substance-specific standards",
  },
  {
    label: "Noise Dosimetry",
    desc: "Personal noise dose measurements; action level 85 dB(A) TWA, PEL 90 dB(A) TWA",
    standard: "OSHA 1910.95; NIOSH 1998",
  },
  {
    label: "Radiation Monitoring",
    desc: "Personnel dosimetry (TLD/OSL) and area surveys for ionising and non-ionising radiation",
    standard: "NRC 10 CFR 20; OSHA 1910.1096",
  },
  {
    label: "Heat Stress",
    desc: "WBGT measurements for outdoor/indoor heat work; controls triggered above NIOSH/OSHA REL",
    standard: "ACGIH TLV Heat Stress; OSHA heat NEP",
  },
  {
    label: "BSC / Fume Hood Face Velocity",
    desc: "Periodic airflow velocity checks confirming containment effectiveness",
    standard: "NSF/ANSI 49; ANSI/ASHRAE 110",
  },
];

export default function ExposureMonitoringPage() {
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Monitor · Exposure Monitoring</p>
          <h1>Exposure Monitoring</h1>
          <p className="muted">
            Live and historical records of industrial hygiene sampling — air, biological, noise,
            and radiation. Results are compared against regulatory limits and feed directly into
            the Hazard Register and Risk Monitor.
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
            <Activity size={18} style={{ color: "var(--brand)" }} />
            <span style={{ fontWeight: 700 }}>Module in Development</span>
          </div>
          <p style={{ fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "16px" }}>
            Sampling result logging, OEL comparison, trend charts, and overexposure alert routing
            are on the roadmap. Today, exposure data entered in the Hazard Register feeds the
            Predictive Engine risk forecasts.
          </p>
          <a
            href="/exposure-map"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              fontSize: ".83rem", fontWeight: 600, color: "var(--brand)", textDecoration: "none"
            }}
          >
            Open Exposure Map <ArrowRight size={13} />
          </a>
        </div>

        {/* Monitoring types */}
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>
            Exposure Monitoring Programme — Types
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", maxWidth: "860px" }}>
            {MONITORING_TYPES.map((t) => (
              <div
                key={t.label}
                style={{
                  padding: "14px 16px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: ".85rem", marginBottom: "4px" }}>{t.label}</div>
                <div style={{ fontSize: ".78rem", color: "var(--muted)", lineHeight: 1.5, marginBottom: "6px" }}>{t.desc}</div>
                <div style={{ fontSize: ".73rem", color: "var(--brand)", fontWeight: 600 }}>{t.standard}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
