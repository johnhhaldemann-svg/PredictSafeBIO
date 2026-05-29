import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { listAssessments } from "@/lib/supabase/data";
import { getHumanReviewStatusLabel } from "@/lib/review-workflow";

type AssessmentFilters = {
  review?: string;
  level?: string;
  reviewer?: string;
};

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<AssessmentFilters> }) {
  const filters = await searchParams;
  const assessments = await listAssessments();
  const filteredAssessments = assessments.filter((assessment) => {
    const matchesReview = !filters.review || filters.review === "all" || assessment.humanReviewStatus === filters.review;
    const matchesLevel = !filters.level || filters.level === "all" || assessment.level === filters.level;
    const matchesReviewer =
      !filters.reviewer ||
      filters.reviewer === "all" ||
      (filters.reviewer === "reviewed" && Boolean(assessment.reviewedAt)) ||
      (filters.reviewer === "not_reviewed" && !assessment.reviewedAt);

    return matchesReview && matchesLevel && matchesReviewer;
  });
  const needsActionCount = assessments.filter((assessment) => assessment.humanReviewStatus === "reviewed_needs_action").length;
  const monitoringCount = assessments.filter((assessment) => assessment.humanReviewStatus === "reviewed_monitoring").length;
  const pendingReviewCount = assessments.filter((assessment) => assessment.humanReviewStatus === "draft_human_review_required").length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Risk Intelligence</p>
          <h1>Risk Register</h1>
        </header>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Risk Register / Risk Factors</p>
              <h2>Traceability filters</h2>
              <p className="muted">Filter saved BioRisk records by review status, risk level, and reviewer activity. These views do not approve or release records.</p>
            </div>
          </div>
          <div className="summary-strip">
            <span>{pendingReviewCount} draft review required</span>
            <span>{needsActionCount} needs action</span>
            <span>{monitoringCount} monitoring</span>
          </div>
          <form className="filter-grid">
            <label>
              Review status
              <select name="review" defaultValue={filters.review ?? "all"}>
                <option value="all">All review statuses</option>
                <option value="draft_human_review_required">{getHumanReviewStatusLabel("draft_human_review_required")}</option>
                <option value="in_review">{getHumanReviewStatusLabel("in_review")}</option>
                <option value="reviewed_needs_action">{getHumanReviewStatusLabel("reviewed_needs_action")}</option>
                <option value="reviewed_monitoring">{getHumanReviewStatusLabel("reviewed_monitoring")}</option>
              </select>
            </label>
            <label>
              Risk level
              <select name="level" defaultValue={filters.level ?? "all"}>
                <option value="all">All BioRisk levels</option>
                <option value="critical">critical</option>
                <option value="high">high</option>
                <option value="moderate">moderate</option>
                <option value="low">low</option>
              </select>
            </label>
            <label>
              Reviewer state
              <select name="reviewer" defaultValue={filters.reviewer ?? "all"}>
                <option value="all">All reviewer states</option>
                <option value="reviewed">Reviewed timestamp present</option>
                <option value="not_reviewed">No reviewed timestamp</option>
              </select>
            </label>
            <button className="button-primary" type="submit">
              Apply filters
            </button>
            <Link className="button-secondary" href="/assessments">
              Clear
            </Link>
          </form>
        </section>
        <section className="table-panel">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Workflow</th>
                <th>Area</th>
                <th>Level</th>
                <th>Score</th>
                <th>Human review</th>
                <th>Last reviewed</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssessments.map((assessment) => (
                <tr key={assessment.id}>
                  <td>
                    <Link href={`/assessments/${assessment.id}`}>{assessment.id}</Link>
                  </td>
                  <td>{assessment.workflow}</td>
                  <td>{assessment.area}</td>
                  <td>
                    <StatusBadge level={assessment.level} />
                  </td>
                  <td>{assessment.score}</td>
                  <td>{getHumanReviewStatusLabel(assessment.humanReviewStatus)}</td>
                  <td>{assessment.reviewedAt ?? "Not reviewed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAssessments.length === 0 ? <p className="empty-table-note">No BioRisk records match the selected filters.</p> : null}
        </section>
      </div>
    </AppShell>
  );
}
