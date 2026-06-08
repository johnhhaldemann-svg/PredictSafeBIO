import type { Metadata } from "next";
import { Gauge, ArrowRight, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Equipment & Calibration – PredictSafeBIO" };

const EQUIPMENT_CATEGORIES = [
  { label: "Biosafety Cabinets (BSC)",     freq: "Annual cert + after any move", reg: "NSF/ANSI 49" },
  { label: "Fume Hoods",                   freq: "Annual cert + after filter change", reg: "ANSI/ASHRAE 110" },
  { label: "Autoclaves / Sterilisers",     freq: "Weekly spore test + annual PM", reg: "ANSI/AAMI ST8" },
  { label: "Centrifuges",                  freq: "Annual service; rotor inspection", reg: "Manufacturer spec" },
  { label: "Analytical Balances",          freq: "Daily check + 6-month calibration", reg: "USP 41" },
  { label: "Temperature-controlled units", freq: "Continuous monitoring + quarterly cal", reg: "21 CFR Part 11" },
  { label: "pH Meters",                    freq: "Before each use (2-point cal)", reg: "GxP requirement" },
  { label: "Pipettes",                     freq: "Annual gravimetric calibration", reg: "ISO 8655" },
  { label: "Gas Detectors / PID",          freq: "Before each use + annual cert", reg: "OSHA 1910.119" },
  { label: "Eye Wash Stations",            freq: "Weekly activation test", reg: "ANSI Z358.1" },
];

export default function EquipmentCalibrationPage() {
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Operate · Equipment & Calibration</p>
          <h1>Equipment & Calibration</h1>
          <p className="muted">
            Preventive maintenance schedules, calibration records, and certification logs for all
            safety-critical and GxP-controlled equipment. Overdue items surface in the Risk Monitor.
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
            <Gauge size={18} style={{ color: "var(--brand)" }} />
            <span style={{ fontWeight: 700 }}>Module in Development</span>
          </div>
          <p style={{ fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "16px" }}>
            Equipment registry, PM scheduling, calibration certificate upload, and overdue alerts
            are on the roadmap. Calibration due dates will feed directly into Compliance Calendar
            and Predictive Engine warnings when built.
          </p>
          <a
            href="/plan/compliance-calendar"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              fontSize: ".83rem", fontWeight: 600, color: "var(--brand)", textDecoration: "none"
            }}
          >
            Open Compliance Calendar <ArrowRight size={13} />
          </a>
        </div>

        {/* Equipment reference table */}
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>
            Common Lab Equipment — Calibration &amp; PM Requirements
          </h2>
          <div style={{ overflowX: "auto", maxWidth: "900px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-raised, #f1f5f9)" }}>
                  <th style={{ padding: "9px 14px", textAlign: "left", fontWeight: 700, borderBottom: "2px solid var(--border)" }}>Equipment</th>
                  <th style={{ padding: "9px 14px", textAlign: "left", fontWeight: 700, borderBottom: "2px solid var(--border)" }}>Frequency</th>
                  <th style={{ padding: "9px 14px", textAlign: "left", fontWeight: 700, borderBottom: "2px solid var(--border)" }}>Standard / Reg</th>
                </tr>
              </thead>
              <tbody>
                {EQUIPMENT_CATEGORIES.map((eq, i) => (
                  <tr key={eq.label} style={{ background: i % 2 === 0 ? "transparent" : "var(--surface)" }}>
                    <td style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{eq.label}</td>
                    <td style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{eq.freq}</td>
                    <td style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{eq.reg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
