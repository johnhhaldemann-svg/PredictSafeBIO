import { ClipboardList, HeartPulse } from "lucide-react";
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
            <ErgoHeroIllustration />
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

function ErgoHeroIllustration() {
  return (
    <svg className="ergo-hero-svg" viewBox="0 0 260 150" role="img" aria-label="Worker lifting safely">
      <defs>
        <linearGradient id="ergoPerson" x1="86" x2="162" y1="22" y2="130">
          <stop offset="0" stopColor="#0b63f6" />
          <stop offset="1" stopColor="#0040a8" />
        </linearGradient>
        <linearGradient id="ergoBox" x1="158" x2="218" y1="75" y2="128">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0b63f6" />
        </linearGradient>
      </defs>
      <path d="M39 128h181" stroke="#b9d3f5" strokeLinecap="round" strokeWidth="4" />
      <circle cx="147" cy="32" r="15" fill="#0b63f6" />
      <path d="M125 51c17-12 42-4 50 14l7 16" fill="none" stroke="url(#ergoPerson)" strokeLinecap="round" strokeWidth="16" />
      <path d="M137 65l-19 33-22 23" fill="none" stroke="url(#ergoPerson)" strokeLinecap="round" strokeWidth="16" />
      <path d="M157 75l-6 31 20 22" fill="none" stroke="url(#ergoPerson)" strokeLinecap="round" strokeWidth="16" />
      <path d="M111 91l44 6" stroke="#06337c" strokeLinecap="round" strokeWidth="8" />
      <rect x="169" y="81" width="45" height="45" rx="8" fill="url(#ergoBox)" />
      <path d="M179 94h25M179 106h17" stroke="#dff6ff" strokeLinecap="round" strokeWidth="4" />
      <circle cx="58" cy="55" r="20" fill="#e8f1ff" />
      <path d="M49 57l7 7 15-18" fill="none" stroke="#32b649" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
      <path d="M221 35c8 6 13 15 13 26" fill="none" stroke="#bfdbfe" strokeLinecap="round" strokeWidth="5" />
      <path d="M35 99c-7-10-8-21-2-32" fill="none" stroke="#bfdbfe" strokeLinecap="round" strokeWidth="5" />
    </svg>
  );
}
