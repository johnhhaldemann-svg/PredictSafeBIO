import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { updateAssessmentReviewAction } from "@/app/assessments/actions";
import { getAssessmentDetail, getCompanyProfile } from "@/lib/supabase/data";
import { listTeamMembers } from "@/lib/supabase/team-service";
import { getProfileContext } from "@/lib/supabase/data-helpers";
import { isAdminOrAbove } from "@/lib/role-permissions";
import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import {
  getAuditEventTarget,
  getHumanReviewStatusLabel,
  getLatestReviewEvent,
  humanReviewStatusOptions
} from "@/lib/review-workflow";
import { DraftAssistButton } from "@/components/DraftAssistButton";

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
            <p className="section-label">Risk Register</p>
            <h1>BioRisk record not found</h1>
          </header>
          <section className="panel">
            <p>This assessment was not found in the current signed-in workspace.</p>
          </section>
        </div>
      </AppShell>
    );
  }

  const [context, teamMembers] = await Promise.all([getProfileContext(), listTeamMembers()]);
  const canAssign = isAdminOrAbove(context ? { role: context.role } : null);
  const latestReviewEvent = getLatestReviewEvent(assessment.auditEvents);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Risk Register Detail</p>
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
          <article className="profile-row">
            <span>Assigned reviewer</span>
            <strong>{assessment.assignedReviewerName ?? <span className="muted">Unassigned</span>}</strong>
          </article>
          <article className="profile-row">
            <span>Review due date</span>
            <strong>{assessment.reviewDueDate ? new Date(assessment.reviewDueDate).toLocaleDateString() : <span className="muted">Not set</span>}</strong>
          </article>
        </section>
        <section className="panel">
          <h2>Latest review event</h2>
          {latestReviewEvent ? (
            <p>{latestReviewEvent.createdAt ?? "Pending timestamp"} - {latestReviewEvent.summary}</p>
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
            <button className="button-primary" type="submit">Save review</button>
          </div>
          <div className="form-grid">
            <label>
              Review status
              <select
                name="humanReviewStatus"
                defaultValue={assessment.humanReviewStatus === "routine_monitoring" ? "reviewed_monitoring" : assessment.humanReviewStatus}
              >
                {humanReviewStatusOptions.map((status) => (
                  <option value={status} key={status}>{getHumanReviewStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label>
              Reviewed at
              <input value={assessment.reviewedAt ?? "Not reviewed"} readOnly />
            </label>
            {canAssign && (
              <label>
                Assign reviewer
                <select name="assignedReviewerId" defaultValue={assessment.assignedReviewerId ?? ""}>
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName ?? member.id.slice(0, 8)} ({member.role})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {canAssign && (
              <label>
                Review due date
                <input type="date" name="reviewDueDate" defaultValue={assessment.reviewDueDate ?? ""} />
              </label>
            )}
          </div>
          <label className="wide-fields">
            <span className="draft-assist-label">
              <span>Reviewer notes</span>
              <DraftAssistButton
                type="reviewer_notes"
                targetId="reviewer-notes"
                label="Draft with AI"
                context={{
                  workflow: assessment.workflow,
                  area: assessment.area,
                  riskLevel: assessment.level,
                  score: String(assessment.score),
                  confidence: assessment.confidence,
                  topDrivers: assessment.output.topDrivers.map((d: any) => d.label).join(", "),
                  criticalGaps: assessment.output.criticalControlGaps.join("; "),
                  missingInformation: assessment.output.missingInformation.join("; "),
                }}
              />
            </span>
            <textarea id="reviewer-notes" name="reviewerNotes" defaultValue={assessment.reviewerNotes ?? ""} rows={4} />
          </label>
        </form>
        <section className="panel">
          <h2>Guarded explanation</h2>
          <p>{assessment.output.explanation}</p>
          <p className="muted">{draftAiRecommendationGuardrail}</p>
        </section>
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Export report</p>
            <h2>Shareable BioRisk report</h2>
            <p className="muted">Draft only — for human review. Not a regulatory release or approval record.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="button-primary" href={`/api/reports/assessment/${assessment.id}?format=pdf`} target="_blank" rel="noopener noreferrer">
              Download PDF
            </a>
            <a className="button-secondary" href={`/api/reports/assessment/${assessment.id}?format=docx`}>
              Download DOCX
            </a>
          </div>
        </section>
        <section className="split-list wide">
          <div className="panel">
            <h2>Top drivers</h2>
            <ul>
              {assessment.output.topDrivers.map((driver: any) => (
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
              {assessment.output.criticalControlGaps.map((gap: string) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        </section>
        <section className="split-list wide">
          <div className="panel">
            <h2>Missing information</h2>
            <ul>
              {assessment.output.missingInformation.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2>Signals</h2>
            <ul>
              {assessment.signals.map((signal: any, i: number) => (
                <li key={i}>
                  <strong>{signal.label ?? signal.type}</strong>
                  {signal.evidence ? <span>{signal.evidence}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="panel">
          <h2>Recommended actions</h2>
          <div className="action-list">
            {assessment.output.recommendedActions.map((action: any) => (
              <article className="action-row" key={action.title}>
                <div>
                  <strong>{action.title}</strong>
                  <span>{action.priority}</span>
                </div>
                <p>{action.reason}</p>
              </article>
            ))}
          </div>
        </section>
        {assessment.auditEvents.length > 0 ? (
          <section className="panel">
            <h2>Audit trail</h2>
            <div className="timeline">
              {assessment.auditEvents.map((event: any, i: number) => (
                <article className="timeline-row" key={i}>
                  <span>{event.createdAt}</span>
                  <strong>{event.eventType.replace(/_/g, " ")}</strong>
                  <p>{event.summary}</p>
                  {getAuditEventTarget(event) ? (
                    <Link className="text-link" href={getAuditEventTarget(event)!}>View record</Link>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
