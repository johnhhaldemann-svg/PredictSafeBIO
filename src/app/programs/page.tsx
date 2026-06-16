import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { programData } from "@/lib/programs/program-data";
import ProgramsLibrary, { type ViewProgram, type ProgramStatus } from "@/components/ProgramsLibrary";

/* ─── Static status overlay ──────────────────────────────────────────────────
   Each program's compliance status is derived from its last inspection date.
   Until a live `program_statuses` service exists, this map provides the
   initial draft status. Replace values with DB-fetched status as the
   inspection log service matures.
   ─────────────────────────────────────────────────────────────────────────── */

const PROGRAM_STATUS: Record<string, ProgramStatus> = {
  "communication":       "current",
  "ehs-management":      "current",
  "iipp":                "due_soon",
  "osha-log":            "current",
  "biosafety":           "due_soon",
  "bloodborne-pathogens":"overdue",
  "chemical-hygiene":    "overdue",
  "chemical-management": "current",
  "vivarium":            "not_started",
  "emergency-response":  "current",
  "spill-response":      "overdue",
  "er-equipment":        "due_soon",
  "ergonomics":          "current",
  "loto":                "current",
  "machine-guarding":    "not_started",
  "fall-protection":     "current",
  "ppe":                 "current",
  "workplace-violence":  "due_soon",
  "warehouse-safety":    "current",
  "forklift":            "current",
  "rack-inspections":    "due_soon",
  "waste-management":    "current",
  "stormwater":          "current",
  "air-quality":         "current",
  "regulatory-permits":  "due_soon",
  "work-permits":        "current",
  "injury-investigation":"not_started",
};

const programs: ViewProgram[] = programData.map((p) => ({
  id:            p.id,
  name:          p.title + (p.subtitle ? ` — ${p.subtitle}` : ""),
  category:      p.groupLabel,
  frequency:     p.frequency,
  owner:         p.owner,
  citation:      p.regulation,
  status:        PROGRAM_STATUS[p.id] ?? "not_started",
  module:        !!p.relatedHref,
  href:          `/programs/${p.id}`,
  relatedHref:   p.relatedHref,
  relatedLabel:  p.relatedLabel,
  inspectionHref: p.inspectionHref,
}));

const totalCount      = programs.length;
const withModuleCount = programs.filter((p) => p.module).length;

export default function ProgramsPage() {
  return (
    <AppShell>
      <div className="page-stack">

        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Plan</p>
            <h1>Safety Programs Library</h1>
            <p className="muted">
              All {totalCount} required EHS / biosafety program areas. Open any program for its
              requirements, guidance, and inspection checklist.
            </p>
          </div>
        </header>

        {/* KPI strip */}
        <section className="kpi-grid" aria-label="Programs summary">
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-label">Total Programs</div>
            <div className="kpi-value">{totalCount}</div>
            <div className="kpi-sub">EHS program areas</div>
          </div>
          <div className="kpi-card kpi-card--green">
            <div className="kpi-label">Dedicated Modules</div>
            <div className="kpi-value">{withModuleCount}</div>
            <div className="kpi-sub">Full platform workflows</div>
          </div>
          <div className="kpi-card kpi-card--amber">
            <div className="kpi-label">Via Inspections</div>
            <div className="kpi-value">{totalCount - withModuleCount}</div>
            <div className="kpi-sub">Tracked via inspection system</div>
          </div>
          <div className="kpi-card kpi-card--purple">
            <div className="kpi-label">Coverage</div>
            <div className="kpi-value">
              {totalCount > 0 ? Math.round((withModuleCount / totalCount) * 100) : 0}%
            </div>
            <div className="kpi-sub">Module coverage rate</div>
          </div>
        </section>

        {/* Interactive library (search, filter, health strip, card grid) */}
        <ProgramsLibrary programs={programs} />

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Program compliance requires qualified EHS personnel</h2>
            <p className="muted">
              PredictSafe surfaces program requirements and inspection triggers, but all compliance
              determinations, regulatory interpretations, and corrective-action decisions are the sole
              responsibility of qualified EHS and biosafety professionals. All records are{" "}
              <strong>Draft — Human Review Required</strong> until closed by an authorised reviewer.
              Program health status shown is a draft signal only.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>

      </div>
    </AppShell>
  );
}
