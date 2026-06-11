export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Risk Register – PredictSafe" };
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { listAssessments } from "@/lib/supabase/data";
import { getProfileContext } from "@/lib/supabase/data-helpers";
import { getHumanReviewStatusLabel } from "@/lib/review-workflow";
import { Sparkles, TrendingUp, Clock, UserCheck } from "lucide-react";

type AssessmentFilters = {
  review?: string;
  level?: string;
  reviewer?: string;
  assigned?: string;
  due?: string;
};

function isDueOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function isDueThisWeek(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date(new Date().toDateString());
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  return due >= today && due <= weekEnd;
}

function formatDueDate(dueDate: string | null | undefined): string {
  if (!dueDate) return "—";
  const due = new Date(dueDate);
  const today = new Date(new Date().toDateString());
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Overdue " + Math.abs(diff) + "d";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff <= 7) return "Due in " + diff + "d";
  return due.toLocaleDateString();
}

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<AssessmentFilters>;
}) {
  const filters = await searchParams;
  const [assessments, context] = await Promise.all([
    listAssessments(),
    getProfileContext(),
  ]);
  const currentUserId = context?.userId ?? null;

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesReview =
      !filters.review || filters.review === "all" ||
      assessment.humanReviewStatus === filters.review;
    const matchesLevel =
      !filters.level || filters.level === "all" ||
      assessment.level === filters.level;
    const matchesReviewer =
      !filters.reviewer || filters.reviewer === "all" ||
      (filters.reviewer === "reviewed" && Boolean(assessment.reviewedAt)) ||
      (filters.reviewer === "not_reviewed" && !assessment.reviewedAt);
    const matchesAssigned =
      !filters.assigned || filters.assigned === "all" ||
      (filters.assigned === "mine" && assessment.assignedReviewerId === currentUserId) ||
      (filters.assigned === "unassigned" && !assessment.assignedReviewerId);
    const matchesDue =
      !filters.due || filters.due === "all" ||
      (filters.due === "overdue" && isDueOverdue(assessment.reviewDueDate)) ||
      (filters.due === "this_week" && isDueThisWeek(assessment.reviewDueDate)) ||
      (filters.due === "no_due_date" && !assessment.reviewDueDate);
    return matchesReview && matchesLevel && matchesReviewer && matchesAssigned && matchesDue;
  });

  const needsActionCount = assessments.filter((a) => a.humanReviewStatus === "reviewed_needs_action").length;
  const monitoringCount = assessments.filter(
    (a) => a.humanReviewStatus === "reviewed_monitoring" || a.humanReviewStatus === "routine_monitoring"
  ).length;
  const pendingReviewCount = assessments.filter((a) => a.humanReviewStatus === "draft_human_review_required").length;
  const overdueCount = assessments.filter((a) => isDueOverdue(a.reviewDueDate)).length;
  const assignedToMeCount = assessments.filter((a) => a.assignedReviewerId === currentUserId).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Assess</p>
            <h1>Risk Register</h1>
          </div>
          <div className="command-center-link-strip">
            <Link className="button-secondary" href="/assessments/framework">Trigger logic</Link>
            <Link className="button-primary" href={currentUserId ? "/workbench" : "/login?next=/workbench"}>New assessment</Link>
          </div>
        </header>

        {pendingReviewCount > 0 ? (
          <div className="ai-context-bar ai-context-bar--warning">
            <Sparkles size={15} />
            <span><strong>AI flagged {pendingReviewCount} pending review{pendingReviewCount !== 1 ? "s" : ""}.</strong> Human approval required before these risks are considered resolved.</span>
            <Link className="ai-fill-btn" href="/assessments?review=draft_human_review_required">Review now</Link>
          </div>
        ) : null}
        {needsActionCount > 0 ? (
          <div className="ai-context-bar ai-context-bar--warning">
            <TrendingUp size={15} />
            <span><strong>{needsActionCount} assessment{needsActionCount !== 1 ? "s" : ""} need corrective action.</strong> Outstanding steps are blocking closure.</span>
            <Link className="ai-fill-btn ai-fill-btn--warning" href="/assessments?review=reviewed_needs_action">View</Link>
          </div>
        ) : null}
        {overdueCount > 0 ? (
          <div className="ai-context-bar ai-context-bar--danger">
            <Clock size={15} />
            <span><strong>{overdueCount} assessment{overdueCount !== 1 ? "s" : ""} past review due date.</strong> Overdue reviews may block audit readiness.</span>
            <Link className="ai-fill-btn ai-fill-btn--danger" href="/assessments?due=overdue">View overdue</Link>
          </div>
        ) : null}
        {assignedToMeCount > 0 && currentUserId ? (
          <div className="ai-context-bar ai-context-bar--success">
            <UserCheck size={15} />
            <span><strong>{assignedToMeCount} assessment{assignedToMeCount !== 1 ? "s" : ""} assigned to you for review.</strong></span>
            <Link className="ai-fill-btn ai-fill-btn--success" href="/assessments?assigned=mine">My assignments</Link>
          </div>
        ) : null}

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Risk Register / Risk Factors</p>
              <h2>Traceability filters</h2>
              <p className="muted">Filter by review status, risk level, reviewer assignment, and due date. Does not approve or release records.</p>
            </div>
          </div>
          <div className="summary-strip">
            <span>{pendingReviewCount} draft review required</span>
            <span>{needsActionCount} needs action</span>
            <span>{monitoringCount} monitoring</span>
            {overdueCount > 0 && <span className="overdue-cell">{overdueCount} overdue</span>}
          </div>
          <form className="filter-grid">
            <label>Review status
              <select name="review" defaultValue={filters.review ?? "all"}>
                <option value="all">All review statuses</option>
                <option value="draft_human_review_required">{getHumanReviewStatusLabel("draft_human_review_required")}</option>
                <option value="in_review">{getHumanReviewStatusLabel("in_review")}</option>
                <option value="reviewed_needs_action">{getHumanReviewStatusLabel("reviewed_needs_action")}</option>
                <option value="reviewed_monitoring">{getHumanReviewStatusLabel("reviewed_monitoring")}</option>
              </select>
            </label>
            <label>Risk level
              <select name="level" defaultValue={filters.level ?? "all"}>
                <option value="all">All BioRisk levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>Reviewer state
              <select name="reviewer" defaultValue={filters.reviewer ?? "all"}>
                <option value="all">All reviewer states</option>
                <option value="reviewed">Has been reviewed</option>
                <option value="not_reviewed">Not yet reviewed</option>
              </select>
            </label>
            <label>Assignment
              <select name="assigned" defaultValue={filters.assigned ?? "all"}>
                <option value="all">All assignments</option>
                <option value="mine">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </label>
            <label>Due date
              <select name="due" defaultValue={filters.due ?? "all"}>
                <option value="all">All due dates</option>
                <option value="overdue">Overdue</option>
                <option value="this_week">Due this week</option>
                <option value="no_due_date">No due date set</option>
              </select>
            </label>
            <button className="button-primary" type="submit">Apply filters</button>
            <Link className="button-secondary" href="/assessments">Clear</Link>
          </form>
        </section>

        <section className="table-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Results</p>
              <h2>
                {filteredAssessments.length === assessments.length
                  ? `${assessments.length} assessment${assessments.length !== 1 ? "s" : ""}`
                  : `${filteredAssessments.length} of ${assessments.length} shown`}
              </h2>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Workflow</th>
                <th>Area</th>
                <th>Level</th>
                <th>Score</th>
                <th>Human review</th>
                <th>Assigned reviewer</th>
                <th>Due date</th>
                <th>Last reviewed</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssessments.map((assessment) => {
                const overdue = isDueOverdue(assessment.reviewDueDate);
                return (
                  <tr key={assessment.id}>
                    <td><Link href={"/assessments/" + assessment.id}>{assessment.id.slice(0, 8)}{"…"}</Link></td>
                    <td>{assessment.workflow}</td>
                    <td>{assessment.area}</td>
                    <td><StatusBadge level={assessment.level} /></td>
                    <td>{assessment.score}</td>
                    <td>{getHumanReviewStatusLabel(assessment.humanReviewStatus)}</td>
                    <td>{assessment.assignedReviewerName ?? <span className="muted">Unassigned</span>}</td>
                    <td className={overdue ? "overdue-cell" : undefined}>{formatDueDate(assessment.reviewDueDate)}</td>
                    <td>{assessment.reviewedAt ? new Date(assessment.reviewedAt).toLocaleDateString() : "Not reviewed"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredAssessments.length === 0 && assessments.length === 0 ? (
            <div className="empty-action-state">
              <strong>No risk assessments saved yet.</strong>
              <p>Run a BioRisk assessment on the <Link href="/workbench">Workbench</Link> and save it to start building your risk register. Assessments track risk level, score, reviewer activity, and source evidence over time.</p>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <p className="empty-table-note">No BioRisk records match the selected filters. <Link href="/assessments">Clear filters</Link></p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
