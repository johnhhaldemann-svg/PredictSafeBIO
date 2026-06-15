export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import {
  getRiskSummary,
  cellTypeLabels,
  linkedRecordRoutes,
  type CellSeverity,
} from "@/lib/supabase/risk-dashboard-service";

/**
 * Project → Risk Cells — /project/[projectId]/risk-cells
 * Shows live AMAYA precursor / control / failure / behavior / event cell intelligence
 * for the organization, scoped to active cells.
 */
type Props = { params: Promise<{ projectId: string }> };

const SEVERITY_BADGE: Record<CellSeverity, string> = {
  critical: "status-overdue",
  high: "status-overdue",
  medium: "status-needs-review",
  low: "status-current",
};

export default async function ProjectRiskCellsPage({ params }: Props) {
  const { projectId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("id", projectId)
    .single();

  if (!project) redirect("/");

  const isOrgMember = profile?.organization_id != null;
  if (!isOrgMember) redirect("/");

  const summary = await getRiskSummary().catch(() => null);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Project · {project.name}</p>
            <h1>Risk Cells</h1>
            <p className="muted">
              AMAYA precursor / control / failure / behavior / event intelligence — live feed.
            </p>
          </div>
          <Link href={`/project/${projectId}/dashboard`} className="button-secondary">← Dashboard</Link>
        </header>

        {!summary ? (
          <section className="panel">
            <p className="muted">Could not load risk data. Sign in to your organization to view risk signals.</p>
          </section>
        ) : (
          <>
            {/* KPI strip */}
            <section className="kpi-grid" aria-label="Risk summary">
              <div className={`kpi-card ${summary.criticalCount > 0 || summary.highCount > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
                <div className="kpi-label">Critical / High</div>
                <div className="kpi-value">{summary.criticalCount + summary.highCount}</div>
                <div className="kpi-sub">
                  {summary.criticalCount > 0 ? `${summary.criticalCount} critical` : summary.highCount > 0 ? `${summary.highCount} high priority` : "No critical signals"}
                </div>
              </div>
              <div className="kpi-card kpi-card--blue">
                <div className="kpi-label">Active Signals</div>
                <div className="kpi-value">{summary.totalActive}</div>
                <div className="kpi-sub">Total active risk cells</div>
              </div>
              <div className={`kpi-card ${summary.byType.failure_cell > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
                <div className="kpi-label">Failures</div>
                <div className="kpi-value">{summary.byType.failure_cell}</div>
                <div className="kpi-sub">{summary.byType.failure_cell > 0 ? "Control breakdowns" : "No active failures"}</div>
              </div>
              <div className="kpi-card kpi-card--purple">
                <div className="kpi-label">Precursors</div>
                <div className="kpi-value">{summary.byType.precursor_cell}</div>
                <div className="kpi-sub">Early warning signals</div>
              </div>
            </section>

            {/* Live feed */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Live risk feed</p>
                  <h2>All active signals — most recent first</h2>
                </div>
              </div>
              {summary.recentCells.length === 0 ? (
                <div className="empty-state-card">
                  <p className="empty-state-title">All clear</p>
                  <p className="muted">No active risk signals. All controls are in good standing.</p>
                </div>
              ) : (
                <div className="action-list">
                  {summary.recentCells.map((cell) => {
                    const route = cell.linkedRecordType ? linkedRecordRoutes[cell.linkedRecordType] : null;
                    return (
                      <article className="action-row" key={cell.id}>
                        <div>
                          <strong>
                            {route && cell.linkedRecordId ? (
                              <Link href={route}>{cell.label}</Link>
                            ) : (
                              cell.label
                            )}
                          </strong>
                          <span className={SEVERITY_BADGE[cell.severity]}>{cell.severity}</span>
                          <span className="muted">{cellTypeLabels[cell.cellType]}</span>
                        </div>
                        <p>
                          {cell.linkedRecordType?.replace(/_/g, " ") ?? ""}
                          {cell.createdAt ? ` · ${new Date(cell.createdAt).toLocaleDateString()}` : ""}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* AI guardrail */}
            <section className="panel inline-action-panel">
              <div>
                <p className="section-label">AI Guardrail</p>
                <h2>Risk intelligence supports — not replaces — human judgment</h2>
                <p className="muted">
                  Risk cells surface signals from across your EHS platform. Severity classification,
                  escalation decisions, and corrective action authorization are the sole responsibility
                  of qualified EHS personnel. All AI outputs are{" "}
                  <strong>Draft — Human Review Required</strong>.
                </p>
              </div>
              <ShieldCheck size={24} />
            </section>

            {/* Link to full command center */}
            <section className="panel">
              <p className="muted">
                For the full cross-org risk dashboard, visit the{" "}
                <Link href="/risk-command-center" className="text-link">AI Risk Command Center</Link>.
              </p>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
