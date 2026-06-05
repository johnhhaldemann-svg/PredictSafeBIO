import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Assessment – PredictSafeBIO" };
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
import { LoopNext } from "@/components/LoopNext";

// ── Work-stop banner ─────────────────────────────────────────────────────────

function WorkStopBanner({
  level,
  createdAt,
}: {
  level: "high" | "critical";
  createdAt?: string;
}) {
  const isHigh = level === "high";

  // Compute deadline and overdue state from assessment creation time
  const deadlineHours = isHigh ? 48 : 24;
  const escalationHours = isHigh ? 24 : 0;
  const createdMs = createdAt ? new Date(createdAt).getTime() : null;
  const capaDeadline = createdMs ? new Date(createdMs + deadlineHours * 3600 * 1000) : null;
  const escalationDeadline = createdMs && escalationHours > 0
    ? new Date(createdMs + escalationHours * 3600 * 1000)
    : null;
  const now = new Date();
  const capaOverdue = capaDeadline ? now > capaDeadline : false;
  const escalated = escalationDeadline ? now > escalationDeadline : false;

  const regulatoryItems = [
    { key: "OSHA", label: "Occupational Safety and Health Administration" },
    { key: "CDC", label: "Centers for Disease Control and Prevention" },
    { key: "IBC", label: "Institutional Biosafety Committee" },
  ];

  if (isHigh) {
    return (
      <div
        style={{
          background: "#FCEBEB",
          border: "2px solid #E24B4A",
          borderRadius: 10,
          padding: "16px 20px",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
        }}
      >
        <span style={{ fontSize: 24, marginTop: 1 }}>🛑</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#A32D2D", letterSpacing: "-0.01em", marginBottom: 6 }}>
            WORK STOP RECOMMENDED
          </div>
          <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.6, marginBottom: 10 }}>
            High risk assessment requires immediate supervisor review. Work should pause pending
            CAPA acknowledgment. A CAPA has been auto-created with a {deadlineHours}-hour deadline.
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            {capaDeadline && (
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 5,
                  background: capaOverdue ? "#A32D2D" : "#fecaca",
                  color: capaOverdue ? "#fff" : "#7f1d1d",
                  fontWeight: 700,
                  border: "1px solid rgba(162,45,45,0.3)",
                }}
              >
                CAPA deadline: {capaDeadline.toLocaleDateString()}{capaOverdue ? " — OVERDUE" : ""}
              </span>
            )}
            {escalationDeadline && (
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 5,
                  background: escalated ? "#7f1d1d" : "#fef2f2",
                  color: escalated ? "#fff" : "#991b1b",
                  fontWeight: 700,
                  border: "1px solid rgba(127,29,29,0.25)",
                }}
              >
                {escalated ? "⬆ Escalated to dept head" : `Escalates to dept head: ${escalationDeadline.toLocaleDateString()}`}
              </span>
            )}
          </div>
          <Link className="button-secondary" href="/operations/capa" style={{ fontSize: 13 }}>
            View CAPA records →
          </Link>
        </div>
      </div>
    );
  }

  // Critical
  return (
    <div
      style={{
        background: "#f3effe",
        border: "2px solid #7c3aed",
        borderRadius: 10,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <span style={{ fontSize: 26, marginTop: 1 }}>🆘</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#5b21b6", letterSpacing: "-0.01em", marginBottom: 6 }}>
            WORK STOP REQUIRED — IMMINENT HAZARD
          </div>
          <div style={{ fontSize: 13, color: "#4c1d95", lineHeight: 1.6 }}>
            Executive sign-off required before work resumes. Incident record initiated.
            Mandatory investigation must be completed within 72 hours. Immutable audit trail is active.
          </div>
        </div>
      </div>

      {/* Deadline chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, fontSize: 12, fontFamily: "monospace" }}>
        {capaDeadline && (
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 5,
              background: capaOverdue ? "#5b21b6" : "#ede9fe",
              color: capaOverdue ? "#fff" : "#4c1d95",
              fontWeight: 700,
              border: "1px solid rgba(91,33,182,0.3)",
            }}
          >
            CAPA deadline: {capaDeadline.toLocaleDateString()}{capaOverdue ? " — OVERDUE" : ""}
          </span>
        )}
        <span style={{ padding: "3px 10px", borderRadius: 5, background: "#ede9fe", color: "#4c1d95", fontWeight: 700, border: "1px solid rgba(91,33,182,0.3)" }}>
          🔐 Executive sign-off required to resume
        </span>
        <span style={{ padding: "3px 10px", borderRadius: 5, background: "#ede9fe", color: "#4c1d95", fontWeight: 700, border: "1px solid rgba(91,33,182,0.3)" }}>
          🛡 Audit trail locked — immutable
        </span>
      </div>

      {/* Regulatory notification checklist */}
      <div
        style={{
          background: "rgba(255,255,255,0.6)",
          border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#7c3aed",
            marginBottom: 10,
          }}
        >
          Regulatory Notification Checklist
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {regulatoryItems.map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                color: "#4c1d95",
              }}
            >
              <input
                type="checkbox"
                disabled
                style={{ width: 15, height: 15, accentColor: "#7c3aed", flexShrink: 0 }}
              />
              <span>
                <strong style={{ marginRight: 6 }}>{item.key}</strong>
                <span style={{ color: "#6d28d9" }}>{item.label}</span>
                <span style={{ color: "#7c3aed", opacity: 0.7 }}> — pending confirmation</span>
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#7c3aed", marginTop: 10, opacity: 0.7 }}>
          Mark notifications complete in your incident record once confirmed with each agency.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="button-secondary" href="/operations/capa" style={{ fontSize: 13 }}>
          View CAPA records →
        </Link>
        <Link className="button-secondary" href="/risk-command-center" style={{ fontSize: 13 }}>
          Risk Monitor →
        </Link>
      </div>
    </div>
  );
}

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

        {/* ── Work-stop banners ───────────────────────────────────────────── */}
        {assessment.level === "high" && (
          <WorkStopBanner level="high" createdAt={assessment.createdAt} />
        )}
        {assessment.level === "critical" && (
          <WorkStopBanner level="critical" createdAt={assessment.createdAt} />
        )}

        <LoopNext
          stage="Assess"
          nextStage="Plan"
          blurb="This risk is scored. Open the Compliance Map to turn it into source-traced compliance tasks."
          ctaLabel="Open Compliance Map"
          ctaHref="/foundation"
        />
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
