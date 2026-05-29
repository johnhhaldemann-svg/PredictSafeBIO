import Link from "next/link";
import { ClipboardList, HeartPulse } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getErgonomicLevel1Summary } from "@/lib/supabase/data";
import { ErgonomicSelfAssessmentClient } from "./ErgonomicSelfAssessmentClient";

export default async function ErgonomicSelfAssessmentPage() {
  const summary = await getErgonomicLevel1Summary();

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">SafePredict Ergonomics</p>
          <h1>Ergonomic Self-Assessment - Level 1 Screening</h1>
        </header>

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Worker-facing screening</p>
            <h2>No measurements required</h2>
            <p className="muted">
              This Level 1 tool captures discomfort, body strain, and task frequency. The ergonomic equation and measurements stay in a separate Level 2 advanced evaluation.
            </p>
          </div>
          <Link className="button-secondary" href="/inspections">
            <ClipboardList size={16} />
            Open Inspections
          </Link>
        </section>

        <section className="summary-strip" aria-label="Ergonomic screening counts">
          {summary.counts.map((count) => (
            <span key={count.label}>
              {count.label}: {count.value}
            </span>
          ))}
        </section>

        <ErgonomicSelfAssessmentClient />

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Recent ergonomic screenings</p>
                <h2>Level 1 signal history</h2>
              </div>
              <HeartPulse size={22} />
            </div>
            <div className="action-list">
              {summary.recentScreenings.length > 0 ? (
                summary.recentScreenings.map((screening) => (
                  <article className="action-row" key={screening.id}>
                    <div>
                      <strong>{screening.taskTypeLabel}</strong>
                      <span>{screening.riskLevel} / {screening.riskScore}</span>
                    </div>
                    <p>
                      {screening.location ?? "No location"} / {screening.departmentTrade ?? "No department"}.{" "}
                      {screening.repeatedModerateFlag ? "Repeated moderate pattern flagged." : screening.escalationStatus}
                    </p>
                  </article>
                ))
              ) : (
                <p className="muted">No saved Level 1 ergonomic screenings yet.</p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Level 2 boundary</p>
                <h2>Advanced evaluation stays separate</h2>
              </div>
              <ClipboardList size={22} />
            </div>
            <ul>
              <li>Measurements</li>
              <li>Photos</li>
              <li>Industrial ergonomic equation data points</li>
              <li>Specialist review</li>
              <li>Formal recommendations</li>
              <li>Corrective actions</li>
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
