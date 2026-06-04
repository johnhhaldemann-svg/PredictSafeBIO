export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Activity, AlertTriangle, CheckCircle2, ShieldCheck, TrendingUp, Zap } from "lucide-react";

export const metadata: Metadata = { title: "Risk Monitor – PredictSafeBIO" };
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { getProfileContext } from "@/lib/supabase/data-helpers";
import { ComplianceAssistant } from "@/components/ComplianceAssistant";
import { RiskCellReviewCard } from "@/components/RiskCellReviewCard";
import { LoopNext } from "@/components/LoopNext";
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

  if (!summary) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <p className="section-label">Monitor</p>
            <h1>Risk Monitor</h1>
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
          <p className="section-label">Monitor</p>
          <h1>Risk Monitor</h1>
        </header>

        <LoopNext
          stage="Monitor"
          nextStage="Assess"
          blurb="Seeing new signals here? Close the loop — feed them into your next BioRisk assessment. Escalate any cell to CAPA from its card below."
          ctaLabel="Run an assessment"
          ctaHref="/workbench"
        />

        {/* Top KPI strip */}
        <section className="command-card-grid" aria-label="Risk summary">
          <article className={`command-card ${criticalCount > 0 ? "platform-red" : highCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Critical / High</strong></div>
            <small>{criticalCount + highCount}</small>
            <em>
              {criticalCount > 0 ? `${criticalCount} critical · ` : ""}
              {highCount > 0 ? `${highCount} high.` : ""}
              {criticalCount === 0 && highCount === 0 ? "No critical or high risk cells active." : ""}
            </em>
          </article>
          <article className="command-card platform-blue">
            <div><span><Activity size={16} /></span><strong>Active signals</strong></div>
            <small>{totalActive}</small>
            <em>Total active risk cells across all tools.</em>
          </article>
          <article className={`command-card ${byType.failure_cell > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><Zap size={16} /></span><strong>Failures</strong></div>
            <small>{byType.failure_cell}</small>
            <em>{byType.failure_cell > 0 ? "Control breakdowns requiring action." : "No active failure cells."}</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><TrendingUp size={16} /></span><strong>Precursors</strong></div>
            <small>{byType.precursor_cell}</small>
            <em>Early warning signals detected.</em>
          </article>
        </section>

        {/* Cell type breakdown */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Signal type breakdown</p>
              <h2>Active cells by type</h2>
            </div>
          </div>
          <div className="command-card-grid" style={{ gap: "0.75rem" }}>
            {CELL_TYPE_ORDER.map((type) => (
              <article key={type} className="command-card platform-blue" style={{ minHeight: "auto", padding: "0.9rem 1rem" }}>
                <div>
                  <strong style={{ fontSize: "0.82em", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {cellTypeLabels[type]}
                  </strong>
                </div>
                <small style={{ fontSize: "1.6rem" }}>{byType[type]}</small>
                <em style={{ fontSize: "0.75em" }}>{cellTypeDescriptions[type]}</em>
              </article>
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
              <article className="action-row" key={sev} style={{ alignItems: "center" }}>
                <div>
                  <span className={SEVERITY_BADGE[sev]} style={{ textTransform: "capitalize" }}>{sev}</span>
                </div>
                <p style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "1.1rem" }}>
                  {bySeverity[sev]}
                </p>
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
            <div style={{ padding: "2rem 0", textAlign: "center" }}>
              <CheckCircle2 size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
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
          <nav className="command-center-link-strip" style={{ flexWrap: "wrap" }}>
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
