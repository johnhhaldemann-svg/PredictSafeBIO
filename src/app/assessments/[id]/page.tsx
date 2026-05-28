import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { getAssessmentDetail } from "@/lib/supabase/data";

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = await getAssessmentDetail(id);

  if (!assessment) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <p className="section-label">Assessment detail</p>
            <h1>Assessment not found</h1>
          </header>
          <section className="panel">
            <p>This assessment was not found in the current signed-in workspace.</p>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Assessment detail</p>
          <h1>{assessment.workflow}</h1>
        </header>
        <section className="profile-grid">
          <article className="profile-row">
            <span>Risk level</span>
            <StatusBadge level={assessment.level} />
          </article>
          <article className="profile-row">
            <span>Score</span>
            <strong>{assessment.score}</strong>
          </article>
          <article className="profile-row">
            <span>Confidence</span>
            <strong>{assessment.confidence}</strong>
          </article>
          <article className="profile-row">
            <span>Human review status</span>
            <strong>{assessment.humanReviewStatus}</strong>
          </article>
        </section>
        <section className="panel">
          <h2>Guarded explanation</h2>
          <p>{assessment.output.explanation}</p>
          <p className="muted">No release, approval, compliance, diagnosis, or regulatory acceptance claim is made.</p>
        </section>
        <section className="split-list wide">
          <div className="panel">
            <h2>Top drivers</h2>
            <ul>
              {assessment.output.topDrivers.map((driver) => (
                <li key={driver.label}>
                  <strong>{driver.label}</strong>
                  <span>{driver.explanation}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2>Critical gaps</h2>
            <ul>
              {assessment.output.criticalControlGaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        </section>
        <section className="split-list wide">
          <div className="panel">
            <h2>Missing information</h2>
            <ul>
              {assessment.output.missingInformation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2>Signals</h2>
            <ul>
              {assessment.signals.map((signal, index) => (
                <li key={`${signal.type}-${index}`}>
                  <strong>{signal.label}</strong>
                  <span>{signal.type}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="panel">
          <h2>Snapshots</h2>
          <div className="snapshot-grid">
            <div>
              <h3>Input</h3>
              <pre>{JSON.stringify(assessment.input, null, 2)}</pre>
            </div>
            <div>
              <h3>Output</h3>
              <pre>{JSON.stringify(assessment.output, null, 2)}</pre>
            </div>
          </div>
        </section>
        <section className="timeline">
          {assessment.auditEvents.length === 0 ? (
            <article className="timeline-row">
              <span>No linked audit events found</span>
              <p>Newly saved assessments write an audit event with the assessment ID in the payload.</p>
            </article>
          ) : null}
          {assessment.auditEvents.map((event) => (
            <article className="timeline-row" key={event.id ?? event.summary}>
              <span>{event.createdAt ?? "Pending timestamp"}</span>
              <strong>{event.eventType}</strong>
              <p>{event.summary}</p>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
