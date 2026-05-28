import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { listAssessments } from "@/lib/supabase/data";
import { getHumanReviewStatusLabel } from "@/lib/review-workflow";

export default async function AssessmentsPage() {
  const assessments = await listAssessments();

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Saved assessments</p>
          <h1>Assessment register</h1>
        </header>
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
              {assessments.map((assessment) => (
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
        </section>
      </div>
    </AppShell>
  );
}
