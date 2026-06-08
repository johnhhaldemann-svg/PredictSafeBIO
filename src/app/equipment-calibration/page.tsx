import type { Metadata } from "next";
import Link from "next/link";
import { Gauge, ShieldCheck } from "lucide-react";
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
          <div className="page-header-left">
            <p className="section-label">Operate · Equipment &amp; Calibration</p>
            <h1>Equipment &amp; Calibration</h1>
            <p className="muted">
              Preventive maintenance schedules, calibration records, and certification logs for all
              safety-critical and GxP-controlled equipment. Overdue items surface in the Risk Monitor.
            </p>
          </div>
          <Link className="button-secondary" href="/plan/compliance-calendar">Compliance Calendar →</Link>
        </header>

        <div className="ai-context-bar ai-context-bar--warning">
          <Gauge size={15} />
          <span>
            <strong>Module in Development.</strong>{" "}
            Equipment registry, PM scheduling, calibration certificate upload, and overdue alerts are
            on the roadmap. Calibration due dates will feed directly into the Compliance Calendar and
            Predictive Engine warnings when built.
          </span>
          <Link className="ai-fill-btn ai-fill-btn--warning" href="/plan/compliance-calendar">
            Compliance Calendar
          </Link>
        </div>

        <section className="table-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Reference</p>
              <h2>Common Lab Equipment — Calibration &amp; PM Requirements</h2>
            </div>
            <ShieldCheck size={20} />
          </div>
          <table>
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Frequency</th>
                <th>Standard / Reg</th>
              </tr>
            </thead>
            <tbody>
              {EQUIPMENT_CATEGORIES.map((eq) => (
                <tr key={eq.label}>
                  <td><strong>{eq.label}</strong></td>
                  <td className="muted">{eq.freq}</td>
                  <td className="muted">{eq.reg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
