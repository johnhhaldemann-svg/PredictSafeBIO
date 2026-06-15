export const dynamic = "force-dynamic";

import Link from "next/link";
import { CheckCircle2, ClipboardList, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getProgramsByGroup, programData, frequencyBadge } from "@/lib/programs/program-data";

const groups = getProgramsByGroup();
const groupOrder = ["admin", "laboratory", "emergency", "physical", "warehouse", "environmental"];
const groupLabels: Record<string, string> = {
  admin: "Administrative & Communication",
  laboratory: "Laboratory & Chemical Safety",
  emergency: "Emergency Response & Spill",
  physical: "Physical Safety & Hazard Controls",
  warehouse: "Warehouse & Material Handling",
  environmental: "Environmental & Regulatory",
};

const totalCount = programData.length;
const withModuleCount = programData.filter((p) => p.relatedHref).length;

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

        {/* Summary */}
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
            <div className="kpi-value">{totalCount > 0 ? Math.round((withModuleCount / totalCount) * 100) : 0}%</div>
            <div className="kpi-sub">Module coverage rate</div>
          </div>
        </section>

        {/* Program groups */}
        {groupOrder.map((groupKey) => {
          const programs = groups.get(groupKey) ?? [];
          if (!programs.length) return null;
          return (
            <section key={groupKey} className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Safety Program Area</p>
                  <h2>{groupLabels[groupKey]}</h2>
                </div>
              </div>
              <div className="action-list">
                {programs.map((program) => {
                  const freq = frequencyBadge[program.frequency];
                  return (
                    <article className="action-row" key={program.id}>
                      <div>
                        <strong>
                          <Link href={`/programs/${program.id}`}>{program.title}</Link>
                          {program.subtitle
                            ? <em className="program-subtitle">— {program.subtitle}</em>
                            : null}
                        </strong>
                        <span className={freq.className}>{freq.label} · {program.owner}</span>
                      </div>
                      <p className="program-regulation">{program.regulation}</p>
                      <div className="program-actions">
                        <Link className="button-primary compact" href={`/programs/${program.id}`}>
                          Open tool
                        </Link>
                        {program.relatedHref ? (
                          <Link className="button-secondary compact" href={program.relatedHref}>
                            {program.relatedLabel ?? "Platform module"}
                          </Link>
                        ) : (
                          <Link className="button-secondary compact" href={program.inspectionHref}>
                            Log inspection
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Program compliance requires qualified EHS personnel</h2>
            <p className="muted">
              SafePredict surfaces program requirements and inspection triggers, but all compliance determinations, regulatory interpretations, and corrective action decisions are the sole responsibility of qualified EHS and biosafety professionals. All records are <strong>Draft — Human Review Required</strong> until closed by an authorized reviewer.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>

      </div>
    </AppShell>
  );
}
