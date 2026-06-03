export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
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
          <p className="section-label">{project.name}</p>
          <h1>Risk Cells</h1>
          <p className="muted">
            AMAYA precursor / control / failure / behavior / event intelligence — live feed.
          </p>
        </header>

        {!summary ? (
          <section className="panel">
            <p className="muted">Could not load risk data. Sign in to your organization to view risk signals.</p>
          </section>
        ) : (
          <>
            {/* KPI strip */}
            <section className="command-card-grid" aria-label="Risk summary">
              <article className={`command-card ${summary.criticalCount > 0 || summary.highCount > 0 ? "platform-red" : "platform-green"}`}>
                <div><span><AlertTriangle size={16} /></span><strong>Critical / High</strong></div>
                <small>{summary.criticalCount + summary.highCount}</small>
                <em>
                  {summary.criticalCount > 0 ? `${summary.criticalCount} critical · ` : ""}
                  {summary.highCount > 0 ? `${summary.highCount} high` : ""}
                  {summary.criticalCount === 0 && summary.highCount === 0 ? "No critical or high risk cells." : ""}
                </em>
              </article>
              <article className="command-card platform-blue">
                <div><span><Activity size={16} /></span><strong>Active signals</strong></div>
                <small>{summary.totalActive}</small>
                <em>Total active risk cells.</em>
              </article>
              <article className={`command-card ${summary.byType.failure_cell > 0 ? "platform-red" : "platform-green"}`}>
                <div><span><Zap size={16} /></span><strong>Failures</strong></div>
                <small>{summary.byType.failure_cell}</small>
                <em>{summary.byType.failure_cell > 0 ? "Control breakdowns requiring action." : "No active failures."}</em>
              </article>
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
                <div style={{ padding: "2rem 0", textAlign: "center" }}>
                  <CheckCircle2 size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
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
                          <span style={{ fontSize: "0.78em", opacity: 0.7 }}>
                            {cellTypeLabels[cell.cellType]}
                          </span>
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
              <p className="muted" style={{ fontSize: "0.85rem" }}>
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
