import Link from "next/link";
import { ClipboardList, HeartPulse, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getErgonomicLevel1Summary } from "@/lib/supabase/data";

export default async function InspectionsPage() {
  const ergonomic = await getErgonomicLevel1Summary();

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">HSE Management Systems</p>
          <h1>Inspection / Audit Management</h1>
        </header>

        <section className="inspection-type-grid">
          <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Hazard & Exposure Tracking</p>
              <h2>{ergonomic.inspectionType.title}</h2>
              <p className="muted">{ergonomic.inspectionType.description}</p>
            </div>
            <HeartPulse size={24} />
          </div>
          <div className="inspection-type-row">
            <div className="inspection-icon">
              <ClipboardList size={24} />
            </div>
            <div>
              <strong>Level 1 hazard screening</strong>
              <p>
                Capture task type, discomfort, body strain, frequency, comments, and optional context. No measurement fields appear in this basic screen.
              </p>
            </div>
            <Link className="button-primary large-action" href={ergonomic.inspectionType.href}>
              Start Hazard Screening
            </Link>
          </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Inspection / Audit Management</p>
                <h2>{ergonomic.level2InspectionType.title}</h2>
                <p className="muted">{ergonomic.level2InspectionType.description}</p>
              </div>
              <RulerIcon />
            </div>
            <div className="inspection-type-row">
              <div className="inspection-icon">
                <ClipboardList size={24} />
              </div>
              <div>
                <strong>Level 2 audit evaluation</strong>
                <p>
                  Requires a saved Level 1 request or an audit/inspection context. Captures measurements, evidence, specialist notes, and recommendations.
                </p>
              </div>
              <Link className="button-secondary large-action" href={ergonomic.level2InspectionType.href}>
                Open Audit Evaluation
              </Link>
            </div>
            <p className="auth-note">{ergonomic.level2InspectionType.gatedLabel}</p>
          </article>
        </section>

        <section className="summary-strip" aria-label="Inspection counts">
          {ergonomic.counts.map((count) => (
            <span key={count.label}>
              {count.label}: {count.value}
            </span>
          ))}
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Hazard & Exposure Tracking</p>
                <h2>Level 1 signal history</h2>
              </div>
              <ClipboardList size={22} />
            </div>
            <div className="action-list">
              {ergonomic.recentScreenings.length > 0 ? (
                ergonomic.recentScreenings.map((screening) => (
                  <article className="action-row" key={screening.id}>
                    <div>
                      <strong>{screening.taskTypeLabel}</strong>
                      <span>{screening.riskLevel} risk</span>
                    </div>
                    <p>
                      Score {screening.riskScore}/9. {screening.location ?? "No location"} /{" "}
                      {screening.departmentTrade ?? "No department"}.
                    </p>
                  </article>
                ))
              ) : (
                <p className="muted">No hazard-screening submissions yet.</p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Risk Intelligence</p>
                <h2>PredictSafeBIO HSE insight</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <p className="explanation">{ergonomic.aiInsight}</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function RulerIcon() {
  return <ClipboardList size={24} />;
}
