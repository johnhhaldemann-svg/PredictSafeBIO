import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { updateAssessmentReviewAction } from "@/app/assessments/actions";
import { getAssessmentDetail, getCompanyProfile } from "@/lib/supabase/data";
import {
  buildAssessmentReportMarkdown,
  getHumanReviewStatusLabel,
  getLatestReviewEvent,
  humanReviewStatusOptions
} from "@/lib/review-workflow";

export default async function AssessmentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const assessment = await getAssessmentDetail(id);
  const company = await getCompanyProfile();

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

  const latestReviewEvent = getLatestReviewEvent(assessment.auditEvents);
  const reportText = buildAssessmentReportMarkdown({
    assessment,
    companyName: company.companyName,
    generatedAt: new Date().toISOString()
  });

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Assessment detail</p>
          <h1>{assessment.workflow}</h1>
        </header>
        {query.message ? <p className="form-message">{query.message}</p> : null}
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
            <strong>{getHumanReviewStatusLabel(assessment.humanReviewStatus)}</strong>
          </article>
        </section>
        <section className="panel">
          <h2>Latest review event</h2>
          {latestReviewEvent ? (
            <p>
              {latestReviewEvent.createdAt ?? "Pending timestamp"} - {latestReviewEvent.summary}
            </p>
          ) : (
            <p className="muted">No review-status audit event has been recorded yet.</p>
          )}
        </section>
        <form action={updateAssessmentReviewAction} className="panel">
          <input type="hidden" name="assessmentId" value={assessment.id} />
          <div className="panel-heading">
            <div>
              <p className="section-label">Human review</p>
              <h2>Review status and notes</h2>
              <p className="muted">Records reviewer traceability only. This does not approve, release, validate, or make regulatory claims.</p>
            </div>
            <button className="button-primary" type="submit">
              Save review
            </button>
          </div>
          <div className="form-grid">
            <label>
              Review status
              <select
                name="humanReviewStatus"
                defaultValue={assessment.humanReviewStatus === "routine_monitoring" ? "reviewed_monitoring" : assessment.humanReviewStatus}
              >
                {humanReviewStatusOptions.map((status) => (
                  <option value={status} key={status}>
                    {getHumanReviewStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reviewed at
              <input value={assessment.reviewedAt ?? "Not reviewed"} readOnly />
            </label>
          </div>
          <label className="wide-fields">
            Reviewer notes
            <textarea name="reviewerNotes" defaultValue={assessment.reviewerNotes ?? ""} rows={4} />
          </label>
        </form>
        <section className="panel">
          <h2>Guarded explanation</h2>
          <p>{assessment.output.explanation}</p>
          <p className="muted">No release, approval, compliance, diagnosis, or regulatory acceptance claim is made.</p>
        </section>
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Demo export</p>
            <h2>Shareable assessment report</h2>
            <p className="muted">Downloads a draft-only text report for demo review. It is not a release or approval record.</p>
          </div>
          <a
            className="button-secondary"
            download={`${assessment.workflow.replace(/[^a-zA-Z0-9._-]/g, "-")}-demo-report.txt`}
            href={`data:text/markdown;charset=utf-8,${encodeURIComponent(reportText)}`}
          >
            Download report
          </a>
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
