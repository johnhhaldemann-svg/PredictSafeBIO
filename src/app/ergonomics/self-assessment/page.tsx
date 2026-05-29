import { Activity, CheckCircle2, ClipboardList, HeartPulse, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getErgonomicLevel1Summary } from "@/lib/supabase/data";
import { ErgonomicSelfAssessmentClient } from "./ErgonomicSelfAssessmentClient";

export default async function ErgonomicSelfAssessmentPage() {
  const summary = await getErgonomicLevel1Summary();

  return (
    <AppShell>
      <div className="page-stack ergonomic-dashboard">
        <header className="ergonomic-page-header">
          <div>
            <div className="ergonomic-title-row">
              <h1>Ergonomic Self-Assessment</h1>
              <span>Level 1 Screening</span>
            </div>
            <p>Answer a few simple questions about your task.</p>
            <p>No measurements needed.</p>
          </div>
          <div className="ergo-hero-figure" aria-hidden="true">
            <ErgoHeroSignal />
          </div>
        </header>

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

function ErgoHeroSignal() {
  return (
    <div className="ergo-signal-card">
      <div className="ergo-signal-top">
        <span className="ergo-signal-badge">
          <ShieldCheck size={18} />
        </span>
        <div>
          <strong>Ergo signal</strong>
          <small>Level 1 screen</small>
        </div>
      </div>
      <div className="ergo-signal-bars">
        <span className="ergo-signal-bar strong" />
        <span className="ergo-signal-bar medium" />
        <span className="ergo-signal-bar soft" />
      </div>
      <div className="ergo-signal-footer">
        <span>
          <CheckCircle2 size={15} />
          No measurements
        </span>
        <span>
          <Activity size={15} />
          Pattern-ready
        </span>
      </div>
    </div>
  );
}
