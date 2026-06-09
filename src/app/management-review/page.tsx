export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AlertTriangle, BarChart3, CheckCircle, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  listReviews,
  listActionItems,
  reviewTypeLabels,
  reviewStatusLabels,
} from "@/lib/supabase/management-review-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import {
  createReviewAction,
  createActionItemAction,
  closeActionItemAction,
  feedFindingToHazardRegisterAction,
} from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

export const metadata: Metadata = { title: "Management Review – PredictSafeBIO" };

type Props = {
  searchParams: Promise<{ message?: string; success?: string }>;
};

export default async function ManagementReviewPage({ searchParams }: Props) {
  const params = await searchParams;

  const [reviewsResult, actionItemsResult, adminAccess] = await Promise.all([
    listReviews().catch(() => null),
    listActionItems().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  const loadFailed   = reviewsResult === null;
  const reviews      = reviewsResult ?? [];
  const actionItems  = actionItemsResult ?? [];

  const thisYear       = new Date().getFullYear();
  const reviewsYear    = reviews.filter((r) => new Date(r.reviewDate).getFullYear() === thisYear).length;
  const openItems      = actionItems.filter((a) => a.status === "open").length;
  const overdueItems   = actionItems.filter((a) => a.isOverdue).length;

  // Most recent review for the action-item form default
  const latestReview   = reviews[0] ?? null;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Monitor · Management Review</p>
            <h1>Management Review</h1>
            <p className="muted">
              Formal quarterly and annual review of the EHS management system by senior leadership.
              Closes the PDCA loop — findings feed back into risk assessments and the improvement plan.
              Required under ISO 45001 Clause 9.3 and ICH Q10.
            </p>
          </div>
          <Link className="button-secondary" href="/trends">Trend Analysis →</Link>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Management review summary">
          <article className={`command-card ${reviewsYear > 0 ? "platform-green" : "platform-blue"}`}>
            <div><span><BarChart3 size={16} /></span><strong>Reviews this year</strong></div>
            <small>{reviewsYear}</small>
            <em>{reviewsYear > 0 ? "Reviews on record." : "No reviews recorded yet this year."}</em>
          </article>
          <article className={`command-card ${openItems > 0 ? "platform-blue" : "platform-green"}`}>
            <div><span><CheckCircle size={16} /></span><strong>Open action items</strong></div>
            <small>{openItems}</small>
            <em>{openItems > 0 ? `${openItems} item${openItems !== 1 ? "s" : ""} in progress.` : "All action items closed."}</em>
          </article>
          <article className={`command-card ${overdueItems > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Overdue action items</strong></div>
            <small>{overdueItems}</small>
            <em>
              {overdueItems > 0
                ? `${overdueItems} item${overdueItems !== 1 ? "s" : ""} past due date.`
                : "No overdue action items."}
            </em>
          </article>
        </section>

        {overdueItems > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{overdueItems} action item{overdueItems !== 1 ? "s" : ""} overdue.</strong>{" "}
              Close or reassign overdue items before the next review cycle.
            </span>
          </div>
        )}

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Reviews list */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Review records</p>
              <h2>{reviews.length} review{reviews.length !== 1 ? "s" : ""} on record</h2>
            </div>
          </div>
          {loadFailed ? (
            <DataLoadError resource="management reviews" />
          ) : reviews.length === 0 ? (
            <p className="muted">No reviews recorded yet. Create your first review below.</p>
          ) : (
            <div className="action-list">
              {reviews.map((rev) => (
                <article className="action-row" key={rev.id}>
                  <div>
                    <strong>{reviewTypeLabels[rev.reviewType]}</strong>
                    <span className={rev.status === "completed" ? "status-current" : "status-needs-review"}>
                      {reviewStatusLabels[rev.status]}
                    </span>
                    <span>{new Date(rev.reviewDate).toLocaleDateString()}</span>
                  </div>
                  {rev.attendees && <p className="muted">Attendees: {rev.attendees}</p>}
                  {rev.agendaSummary && <p className="muted">{rev.agendaSummary}</p>}
                  {rev.kpiSnapshot && (
                    <p className="muted">
                      KPI snapshot:{" "}
                      {Object.entries(rev.kpiSnapshot)
                        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                        .join(" · ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Action items list */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Action items</p>
              <h2>{actionItems.length} total · {openItems} open</h2>
            </div>
          </div>
          {actionItems.length === 0 ? (
            <p className="muted">No action items yet. Add one after recording a review.</p>
          ) : (
            <div className="action-list">
              {actionItems.map((item) => (
                <article className="action-row" key={item.id}>
                  <div>
                    <strong>{item.description}</strong>
                    <span className={item.status === "closed" ? "status-current" : item.isOverdue ? "status-overdue" : "status-needs-review"}>
                      {item.status === "closed" ? "Closed" : item.isOverdue ? "Overdue" : "Open"}
                    </span>
                    {item.ownerRole && <span>{item.ownerRole}</span>}
                    {item.dueDate && (
                      <span className={item.isOverdue ? "status-overdue" : "muted"}>
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {adminAccess.signedIn && item.status === "open" && (
                    <form action={closeActionItemAction} className="inline-form">
                      <input type="hidden" name="id" value={item.id} />
                      <button className="button-secondary compact" type="submit">Mark closed</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Create review form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Record a review</p>
                <h2>Create review record</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createReviewAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Review type <span aria-hidden="true">*</span>
                  <select name="reviewType" defaultValue="quarterly" required>
                    <option value="quarterly">Quarterly Review</option>
                    <option value="annual">Annual Review</option>
                    <option value="special">Special Review</option>
                  </select>
                </label>
                <label>
                  Review date <span aria-hidden="true">*</span>
                  <input name="reviewDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </label>
                <label>
                  Period start
                  <input name="reviewPeriodStart" type="date" />
                </label>
                <label>
                  Period end
                  <input name="reviewPeriodEnd" type="date" />
                </label>
              </div>
              <label>
                Attendees
                <input name="attendees" type="text" placeholder="e.g. EHS Manager, Lab Director, Operations Lead" />
              </label>
              <label>
                Agenda / summary
                <textarea name="agendaSummary" rows={2} placeholder="Key topics covered in this review" />
              </label>
              <button className="button-primary" type="submit">Create review record</button>
            </form>
          </section>
        )}

        {/* Add action item form */}
        {adminAccess.signedIn && latestReview && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Add action item</p>
                <h2>Assign follow-up from review</h2>
              </div>
              <Plus size={22} />
            </div>
            <p className="muted">
              Adding to: <strong>{reviewTypeLabels[latestReview.reviewType]}</strong> —{" "}
              {new Date(latestReview.reviewDate).toLocaleDateString()}
            </p>
            <form action={createActionItemAction} className="stacked-form">
              <input type="hidden" name="reviewId" value={latestReview.id} />
              <div className="form-grid">
                <label>
                  Description <span aria-hidden="true">*</span>
                  <input name="description" type="text" placeholder="e.g. Update chemical inventory SOP" required />
                </label>
                <label>
                  Owner / role
                  <input name="ownerRole" type="text" placeholder="e.g. EHS Manager" />
                </label>
                <label>
                  Due date
                  <input name="dueDate" type="date" />
                </label>
              </div>
              <button className="button-primary" type="submit">Add action item</button>
            </form>
          </section>
        )}

        {/* Phase 6 → Phase 1 loop-back */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Phase 6 → Phase 1 Loop-back</p>
              <h2>Feed finding to Hazard Register</h2>
            </div>
            <RefreshCw size={22} />
          </div>
          <p className="muted">
            When this review surfaces a new or uncontrolled risk, log it directly into the
            Hazard Register. It will be scored by the Predictive Engine as a leading indicator.
          </p>
          <form action={feedFindingToHazardRegisterAction} className="stacked-form">
            <div className="form-grid">
              <label>
                Finding / Hazard name
                <input name="name" type="text" placeholder="e.g. Inadequate fume hood maintenance schedule" required />
              </label>
              <label>
                Hazard type
                <select name="hazardType" defaultValue="other">
                  <option value="biological">Biological</option>
                  <option value="chemical">Chemical</option>
                  <option value="ergonomic">Ergonomic</option>
                  <option value="radiation">Radiation</option>
                  <option value="equipment">Equipment</option>
                  <option value="environmental">Environmental</option>
                  <option value="fire">Fire / flammable</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Location (optional)
                <input name="location" type="text" placeholder="e.g. Lab 101" />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" rows={2} placeholder="What was found during review and why it needs reassessment" />
            </label>
            <button className="button-primary" type="submit">Add to Hazard Register</button>
          </form>
          <p className="muted">
            Created as <strong>Identified — Draft, Human Review Required</strong> and linked to
            the risk scoring engine. A qualified reviewer must assess and classify it.
          </p>
        </section>

        {/* KPI quick links */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Before your review</p>
            <h2>Pull current trend data</h2>
            <p className="muted">
              View CAPA backlog, training completion, and audit readiness score to populate your KPI inputs.
            </p>
          </div>
          <Link href="/trends" className="button-secondary">Open Trend Analysis</Link>
        </section>

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Management review outputs require senior leadership sign-off</h2>
            <p className="muted">
              ISO 45001 Clause 9.3 requires that management review records be retained as documented
              information and that outputs include decisions on continual improvement. AI may surface
              KPI signals, but review decisions and resource commitments require human authority.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
