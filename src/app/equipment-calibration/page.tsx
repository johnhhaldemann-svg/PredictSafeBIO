export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AlertTriangle, Gauge, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  listEquipmentRecords,
  equipmentTypeLabels,
  calibrationFrequencyLabels,
  equipmentStatusLabels,
  type EquipmentStatus,
} from "@/lib/supabase/equipment-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createEquipmentAction, logCalibrationAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

export const metadata: Metadata = { title: "Equipment & Calibration – PredictSafeBIO" };

const STATUS_CLASS: Record<EquipmentStatus, string> = {
  current:  "status-current",
  due_soon: "status-needs-review",
  overdue:  "status-overdue",
  retired:  "status-current",
};

type Props = {
  searchParams: Promise<{ message?: string; success?: string; filter?: string }>;
};

export default async function EquipmentCalibrationPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const [allRecordsResult, adminAccess] = await Promise.all([
    listEquipmentRecords().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  const loadFailed  = allRecordsResult === null;
  const allRecords  = allRecordsResult ?? [];
  const active      = allRecords.filter((r) => r.status !== "retired");
  const overdueList = active.filter((r) => r.status === "overdue");
  const dueSoonList = active.filter((r) => r.status === "due_soon");

  const records = allRecords.filter((r) => {
    if (filter === "overdue")  return r.status === "overdue";
    if (filter === "due_soon") return r.status === "due_soon";
    return r.status !== "retired";
  });

  const filterCounts = {
    all:      active.length,
    overdue:  overdueList.length,
    due_soon: dueSoonList.length,
  };

  const EQUIPMENT_REF = [
    { label: "Biosafety Cabinets (BSC)",      freq: "Annual cert + after any move",       reg: "NSF/ANSI 49" },
    { label: "Fume Hoods",                    freq: "Annual cert + after filter change",   reg: "ANSI/ASHRAE 110" },
    { label: "Autoclaves / Sterilizers",      freq: "Weekly spore test + annual PM",       reg: "ANSI/AAMI ST8" },
    { label: "Centrifuges",                   freq: "Annual service; rotor inspection",    reg: "Manufacturer spec" },
    { label: "Analytical Balances",           freq: "Daily check + 6-month calibration",  reg: "USP 41" },
    { label: "Temperature-controlled units",  freq: "Continuous monitoring + quarterly",   reg: "Manufacturer spec" },
    { label: "pH Meters",                     freq: "Before each use (2-point cal)",       reg: "Manufacturer spec" },
    { label: "Pipettes",                      freq: "Annual gravimetric calibration",      reg: "ISO 8655" },
    { label: "Gas Detectors / PID",           freq: "Before each use + annual cert",      reg: "OSHA 1910.119" },
    { label: "Eye Wash Stations",             freq: "Weekly activation test",              reg: "ANSI Z358.1" },
  ];

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · Equipment &amp; Calibration</p>
            <h1>Equipment &amp; Calibration</h1>
            <p className="muted">
              Preventive maintenance schedules, calibration records, and certification logs for
              safety-critical and monitored equipment. Overdue items surface in the Risk Monitor.
            </p>
          </div>
          <Link className="button-secondary" href="/plan/compliance-calendar">Compliance Calendar →</Link>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Equipment summary">
          <article className="command-card platform-blue">
            <div><span><Gauge size={16} /></span><strong>Equipment on registry</strong></div>
            <small>{active.length}</small>
            <em>Active items being tracked.</em>
          </article>
          <article className={`command-card ${overdueList.length > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Overdue calibration</strong></div>
            <small>{overdueList.length}</small>
            <em>
              {overdueList.length > 0
                ? `${overdueList.length} item${overdueList.length !== 1 ? "s" : ""} past due.`
                : "All calibrations current."}
            </em>
          </article>
          <article className={`command-card ${dueSoonList.length > 0 ? "platform-blue" : "platform-green"}`}>
            <div><span><Gauge size={16} /></span><strong>Due within 30 days</strong></div>
            <small>{dueSoonList.length}</small>
            <em>
              {dueSoonList.length > 0
                ? `${dueSoonList.length} calibration${dueSoonList.length !== 1 ? "s" : ""} coming up.`
                : "No calibrations due soon."}
            </em>
          </article>
        </section>

        {overdueList.length > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{overdueList.length} item{overdueList.length !== 1 ? "s" : ""} overdue.</strong>{" "}
              Overdue calibrations may indicate safety or compliance gaps. Log calibrations or retire retired items.
            </span>
            <Link className="ai-fill-btn ai-fill-btn--danger" href="/equipment-calibration?filter=overdue">View overdue</Link>
          </div>
        )}

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Equipment filter">
          {(["all", "overdue", "due_soon"] as const).map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/equipment-calibration" : `/equipment-calibration?filter=${f}`}
              className={`button-secondary compact ${filter === f ? "active-filter" : ""}`}
            >
              {f === "all" ? "All equipment" : f === "overdue" ? "Overdue" : "Due soon"}
              <span className="filter-count-badge">{filterCounts[f] ?? 0}</span>
            </Link>
          ))}
        </nav>

        {/* Equipment register */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Equipment register</p>
              <h2>
                {records.length === active.length
                  ? `${active.length} item${active.length !== 1 ? "s" : ""}`
                  : `${records.length} of ${active.length} shown`}
              </h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="equipment records" />
          ) : records.length === 0 ? (
            <p className="muted">No equipment found for this filter. Add equipment below.</p>
          ) : (
            <div className="action-list">
              {records.map((rec) => (
                <article className="action-row" key={rec.id}>
                  <div>
                    <strong>{rec.name}</strong>
                    <span className={STATUS_CLASS[rec.status]}>{equipmentStatusLabels[rec.status]}</span>
                    <span>{equipmentTypeLabels[rec.equipmentType]}</span>
                    {rec.location && <span className="muted">{rec.location}</span>}
                    {rec.serialNumber && <span className="muted">S/N: {rec.serialNumber}</span>}
                  </div>
                  <p className="muted">
                    {rec.lastCalibrated
                      ? `Last calibrated: ${new Date(rec.lastCalibrated).toLocaleDateString()}`
                      : "No calibration on record"}
                    {rec.nextDue
                      ? ` · Next due: ${new Date(rec.nextDue).toLocaleDateString()}`
                      : ""}
                    {" · "}{calibrationFrequencyLabels[rec.calibrationFrequency]}
                  </p>

                  {adminAccess.signedIn && rec.status !== "retired" && (
                    <form action={logCalibrationAction} className="inline-form">
                      <input type="hidden" name="id" value={rec.id} />
                      <input
                        name="calibratedDate"
                        type="date"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        aria-label="Calibration date"
                      />
                      <button className="button-secondary compact" type="submit">Log calibration</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Add equipment form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Add equipment</p>
                <h2>Register a new item</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createEquipmentAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Equipment name <span aria-hidden="true">*</span>
                  <input name="name" type="text" placeholder="e.g. BSC Class II Type A2 — Lab 101" required />
                </label>
                <label>
                  Type <span aria-hidden="true">*</span>
                  <select name="equipmentType" defaultValue="other" required>
                    <option value="bsc">Biosafety Cabinet (BSC)</option>
                    <option value="fume_hood">Chemical Fume Hood</option>
                    <option value="autoclave">Autoclave / Sterilizer</option>
                    <option value="centrifuge">Centrifuge</option>
                    <option value="balance">Analytical Balance</option>
                    <option value="temperature_unit">Incubator / Refrigerator / Freezer</option>
                    <option value="ph_meter">pH Meter</option>
                    <option value="pipette">Pipette</option>
                    <option value="gas_detector">Gas Detector / PID</option>
                    <option value="eyewash">Eyewash / Emergency Shower</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Calibration frequency <span aria-hidden="true">*</span>
                  <select name="calibrationFrequency" defaultValue="annual" required>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semiannual">Semi-annual</option>
                    <option value="annual">Annual</option>
                    <option value="biennial">Biennial</option>
                    <option value="as_needed">As needed</option>
                  </select>
                </label>
                <label>
                  Last calibrated
                  <input name="lastCalibrated" type="date" />
                </label>
                <label>
                  Location
                  <input name="location" type="text" placeholder="e.g. Lab 101" />
                </label>
                <label>
                  Department
                  <input name="department" type="text" placeholder="e.g. Research" />
                </label>
                <label>
                  Serial number
                  <input name="serialNumber" type="text" placeholder="e.g. BSC-2023-001" />
                </label>
                <label>
                  Manufacturer
                  <input name="manufacturer" type="text" placeholder="e.g. Thermo Scientific" />
                </label>
              </div>
              <label>
                Notes
                <input name="notes" type="text" placeholder="Optional notes" />
              </label>
              <button className="button-primary" type="submit">Add to registry</button>
            </form>
          </section>
        )}

        {/* Reference table */}
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
              <tr><th>Equipment</th><th>Frequency</th><th>Standard / Reg</th></tr>
            </thead>
            <tbody>
              {EQUIPMENT_REF.map((eq) => (
                <tr key={eq.label}>
                  <td><strong>{eq.label}</strong></td>
                  <td className="muted">{eq.freq}</td>
                  <td className="muted">{eq.reg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Calibration requires certified technicians and traceable standards</h2>
            <p className="muted">
              Calibration records logged here are <strong>Draft — Human Review Required</strong> until
              confirmed by a qualified metrology or instrument technician. Safety-critical equipment
              (balances, temperature units, pH meters) requires traceability to NIST or equivalent
              national standards. AI may surface overdue alerts but cannot substitute for
              physical calibration or certification.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
