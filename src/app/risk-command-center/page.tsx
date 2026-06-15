export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Activity, AlertTriangle, CheckCircle2, ShieldCheck, TrendingUp, Zap } from "lucide-react";

export const metadata: Metadata = { title: "Risk Monitor – PredictSafe" };
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { getProfileContext } from "@/lib/supabase/data-helpers";
import { ComplianceAssistant } from "@/components/ComplianceAssistant";
import { RiskCellReviewCard } from "@/components/RiskCellReviewCard";
import { LoopNext } from "@/components/LoopNext";
import { getManualSignals } from "@/lib/supabase/manual-signals-service";
import {
  getRiskSummary,
  cellTypeLabels,
  cellTypeDescriptions,
  type CellType,
  type CellSeverity
} from "@/lib/supabase/risk-dashboard-service";
import {
  acknowledgeRiskCellAction,
  dismissRiskCellAction,
  escalateToCapaAction,
} from "@/app/risk-command-center/actions";

const CELL_TYPE_ORDER: CellType[] = [
  "failure_cell", "precursor_cell", "control_cell",
  "behavior_cell", "event_cell", "improvement_cell"
];

const SEVERITY_ORDER: CellSeverity[] = ["critical", "high", "medium", "low"];

const SEVERITY_BADGE: Record<CellSeverity, string> = {
  critical: "status-critical",
  high: "status-missing",
  medium: "status-needs-review",
  low: "status-current"
};

export default async function RiskCommandCenterPage() {
  const [summary, ctx] = await Promise.all([
    getRiskSummary().catch(() => null),
    getProfileContext().catch(() => null)
  ]);
  const manualSignals = await getManualSignals().catch(() => null);

  if (!summary) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <div className="page-header-left">
              <p className="section-label">Monitor · Live Risk Feed</p>
              <h1>Risk Monitor</h1>
            </div>
          </header>
          <p className="muted">Could not load risk data. Sign in to view your organization&apos;s risk feed.</p>
        </div>
      </AppShell>
    );
  }

  const { totalActive, criticalCount, highCount, byType, bySeverity, recentCells, topFailures, topPrecursors } = summary;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Monitor · Live Risk Feed</p>
            <h1>Risk Monitor</h1>
            <p className="muted">
              Active risk cells surfaced across all EHS tools — failures, precursors, control gaps,
              and behavioral signals. Review and escalate to CAPA from each card.
            </p>
          </div>
          <Link className="button-secondary" href="/trends">Trend Analysis →</Link>
        </header>

        <LoopNext
          stage="Monitor"
          nextStage="Assess"
          blurb="Seeing new signals here? Close the loop — feed them into your next BioRisk assessment. Escalate any cell to CAPA from its card below."
          ctaLabel="Run an assessment"
          ctaHref="/workbench"
        />

        {/* Top KPI strip */}
        <section className="kpi-grid" aria-label="Risk summary">
          <div className={`kpi-card ${criticalCount > 0 ? "kpi-card--red" : highCount > 0 ? "kpi-card--amber" : "kpi-card--green"}`}>
            <div className="kpi-label">Critical / High</div>
            <div className="kpi-value">{criticalCount + highCount}</div>
            <div className="kpi-sub">
              {criticalCount > 0 ? `${criticalCount} critical` : highCount > 0 ? `${highCount} high priority` : "No critical signals"}
            </div>
          </div>
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-label">Active Signals</div>
            <div className="kpi-value">{totalActive}</div>
            <div className="kpi-sub">Risk cells across all tools</div>
          </div>
          <div className={`kpi-card ${byType.failure_cell > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
            <div className="kpi-label">Failures</div>
            <div className="kpi-value">{byType.failure_cell}</div>
            <div className="kpi-sub">{byType.failure_cell > 0 ? "Control breakdowns" : "No active failures"}</div>
          </div>
          <div className="kpi-card kpi-card--purple">
            <div className="kpi-label">Precursors</div>
            <div className="kpi-value">{byType.precursor_cell}</div>
            <div className="kpi-sub">Early warning signals</div>
          </div>
        </section>

        {/* Manual v1.1 - platform alignment signals */}
        {manualSignals && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Platform alignment</p>
                <h2>Risk register, programs &amp; change signals</h2>
              </div>
            </div>
            <div className="kpi-grid" style={{ padding: "16px" }}>
              <div className={`kpi-card ${manualSignals.overdueRiskRegister > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
                <div className="kpi-label">Overdue Register Items</div>
                <div className="kpi-value">{manualSignals.overdueRiskRegister}</div>
                <div className="kpi-sub">Risk register past due</div>
              </div>
              <div className={`kpi-card ${manualSignals.programsPending > 0 ? "kpi-card--amber" : "kpi-card--green"}`}>
                <div className="kpi-label">Programs Pending</div>
                <div className="kpi-value">{manualSignals.programsPending}</div>
                <div className="kpi-sub">Awaiting activation</div>
              </div>
              <div className={`kpi-card ${manualSignals.mocAwaitingReview > 0 ? "kpi-card--amber" : "kpi-card--green"}`}>
                <div className="kpi-label">Changes Awaiting Review</div>
                <div className="kpi-value">{manualSignals.mocAwaitingReview}</div>
                <div className="kpi-sub">MOC records in review</div>
              </div>
              <div className={`kpi-card ${manualSignals.aiPendingReview > 0 ? "kpi-card--purple" : "kpi-card--green"}`}>
                <div className="kpi-label">AI Drafts to Review</div>
                <div className="kpi-value">{manualSignals.aiPendingReview}</div>
                <div className="kpi-sub">Pending human review</div>
              </div>
            </div>
          </section>
        )}

        {/* Cell type breakdown */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Signal type breakdown</p>
              <h2>Active cells by type</h2>
            </div>
          </div>
          <div className="kpi-grid" style={{ padding: "16px" }}>
            {CELL_TYPE_ORDER.map((type) => (
              <div key={type} className={`kpi-card ${byType[type] > 0 ? "kpi-card--blue" : "kpi-card--green"}`}>
                <div className="kpi-label">{cellTypeLabels[type]}</div>
                <div className="kpi-value">{byType[type]}</div>
                <div className="kpi-sub">{cellTypeDescriptions[type]}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Severity breakdown */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Severity distribution</p>
              <h2>Active cells by severity</h2>
            </div>
          </div>
          <div className="action-list">
            {SEVERITY_ORDER.map((sev) => (
              <article className="action-row severity-row" key={sev}>
                <div>
                  <span className={`${SEVERITY_BADGE[sev]} severity-badge--capitalize`}>{sev}</span>
                </div>
                <p className="severity-count">{bySeverity[sev]}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Top failures — with AI detail + review actions */}
        {topFailures.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Failure cells — human review required</p>
                <h2>Control breakdowns requiring action</h2>
              </div>
            </div>
            <div className="action-list">
              {topFailures.map((cell) => (
                <RiskCellReviewCard key={cell.id} cell={cell} returnTo="/risk-command-center" acknowledgeRiskCellAction={acknowledgeRiskCellAction} dismissRiskCellAction={dismissRiskCellAction} escalateToCapaAction={escalateToCapaAction} />
              ))}
            </div>
          </section>
        )}

        {/* Top precursors — with AI detail + review actions */}
        {topPrecursors.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Precursor cells</p>
                <h2>Early warning signals</h2>
              </div>
            </div>
            <div className="action-list">
              {topPrecursors.map((cell) => (
                <RiskCellReviewCard key={cell.id} cell={cell} returnTo="/risk-command-center" acknowledgeRiskCellAction={acknowledgeRiskCellAction} dismissRiskCellAction={dismissRiskCellAction} escalateToCapaAction={escalateToCapaAction} />
              ))}
            </div>
          </section>
        )}

        {/* Full live feed — AI detail + review actions on every cell */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Live risk feed</p>
              <h2>All active signals — most recent first</h2>
            </div>
          </div>
          {recentCells.length === 0 ? (
            <div className="risk-feed-empty">
              <CheckCircle2 size={32} />
              <p className="muted">No active risk signals. All tools are in good standing.</p>
            </div>
          ) : (
            <div className="action-list">
              {recentCells.map((cell) => (
                <RiskCellReviewCard key={cell.id} cell={cell} returnTo="/risk-command-center" acknowledgeRiskCellAction={acknowledgeRiskCellAction} dismissRiskCellAction={dismissRiskCellAction} escalateToCapaAction={escalateToCapaAction} />
              ))}
            </div>
          )}
        </section>

        {/* Quick links to all tools */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Platform tools</p>
              <h2>Go to source</h2>
            </div>
          </div>
          <nav className="command-center-link-strip">
            {[
              { href: "/chemical-inventory", label: "Chemical & SDS" },
              { href: "/waste-management", label: "Waste Management" },
              { href: "/operations/capa", label: "CAPA" },
              { href: "/permits", label: "Work Permits" },
              { href: "/pesticide", label: "Pesticide & Disinfectant" },
              { href: "/inspections", label: "Inspections" },
              { href: "/ergonomics/self-assessment", label: "Ergonomics" },
              { href: "/assessments", label: "Biosafety" }
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="button-secondary compact">{label}</Link>
            ))}
          </nav>
        </section>

        {/* AI Compliance Assistant */}
        {ctx?.organizationId && (
          <ComplianceAssistant orgId={ctx.organizationId} defaultContext="general" />
        )}

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Risk intelligence supports — not replaces — human judgment</h2>
            <p className="muted">
              Risk cells surface signals from across your EHS platform, but severity classification,
              escalation decisions, and corrective action authorization are the sole responsibility
              of qualified EHS personnel. All AI outputs are{" "}
              <strong>Draft — Human Review Required</strong>.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
