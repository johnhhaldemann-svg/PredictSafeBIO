import Link from "next/link";
import { ClipboardList, Ruler, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getErgonomicLevel2LaunchContext } from "@/lib/supabase/data";
import { Level2InspectionClient } from "./Level2InspectionClient";

type Level2SearchParams = {
  requestId?: string;
  context?: string;
};

export default async function AdvancedErgonomicEvaluationPage({
  searchParams
}: {
  searchParams: Promise<Level2SearchParams>;
}) {
  const params = await searchParams;
  const context = await getErgonomicLevel2LaunchContext({ requestId: params.requestId, context: params.context });

  return (
    <AppShell>
      <div className="page-stack level2-page">
        <header className="level2-page-header">
          <div>
            <div className="ergonomic-title-row">
              <h1>Advanced HSE Audit Evaluation</h1>
              <span>Level 2 Measurement Inspection</span>
            </div>
            <p>Specialist/auditor workflow for measurements, evidence, notes, recommendations, and corrective-action review.</p>
          </div>
          <div className="level2-header-icon" aria-hidden="true">
            <Ruler size={58} />
          </div>
        </header>

        <section className="split-list wide level2-intro-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Access rule</p>
                <h2>{context.allowed ? "Context verified" : "Request or audit required"}</h2>
                <p className="muted">{context.reason}</p>
              </div>
              <ShieldCheck size={22} />
            </div>
          </div>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Hazard Screening Boundary</p>
                <h2>Separate advanced workflow</h2>
                <p className="muted">Measurements are captured here, not in the basic worker Level 1 screening.</p>
              </div>
              <ClipboardList size={22} />
            </div>
          </div>
        </section>

        <div className="level2-layout">
          <Level2InspectionClient context={context} />
          <aside className="panel level2-recent-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Inspection / Audit Management</p>
                <h2>Measurement inspections</h2>
              </div>
              <Ruler size={22} />
            </div>
            <div className="action-list">
              {context.recentInspections.length > 0 ? (
                context.recentInspections.map((inspection) => (
                  <article className="action-row" key={inspection.id}>
                    <div>
                      <strong>{inspection.taskType}</strong>
                      <span>{inspection.status}</span>
                    </div>
                    <p>{inspection.riskSummary}</p>
                  </article>
                ))
              ) : (
                <p className="muted">No Level 2 measurement inspections yet.</p>
              )}
            </div>
            <Link className="button-secondary" href="/inspections">
              Back to Inspections
            </Link>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
