export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Clock, BarChart3 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { listCapaRecords } from "@/lib/supabase/capa-service";
import { getTrainingMatrixSummary } from "@/lib/supabase/data";
import { getAuditReadinessConsoleSummary } from "@/lib/supabase/data";

export const metadata: Metadata = { title: "Trend Analysis – PredictSafe" };

function trendIcon(value: number, goodDirection: "up" | "down") {
  if (value === 0) return <Minus size={14} className="muted" />;
  const isGood = goodDirection === "up" ? value > 0 : value < 0;
  return isGood
    ? <TrendingDown size={14} style={{ color: "var(--green)" }} />
    : <TrendingUp size={14} style={{ color: "var(--red)" }} />;
}

export default async function TrendsPage() {
  const [capas, training, audit] = await Promise.all([
    listCapaRecords().catch(() => []),
    getTrainingMatrixSummary().catch(() => null),
    getAuditReadinessConsoleSummary().catch(() => null),
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo  = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // CAPA metrics
  const open     = capas.filter((c) => c.status === "open" || c.status === "in_progress" || c.status === "draft_human_review_required").length;
  const overdue  = capas.filter((c) => c.dueDate && new Date(c.dueDate) < now && c.status !== "closed" && c.status !== "void").length;
  const closedLast30 = capas.filter((c) => c.status === "closed" && c.updatedAt && new Date(c.updatedAt) >= thirtyDaysAgo).length;
  const openedLast30 = capas.filter((c) => c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo).length;
  const openedPrev30 = capas.filter((c) => c.createdAt && new Date(c.createdAt) >= sixtyDaysAgo && new Date(c.createdAt) < thirtyDaysAgo).length;
  const capaTrend = openedLast30 - openedPrev30;

  // Training metrics
  const trainingRows = training?.rows ?? [];
  const totalTraining  = trainingRows.length;
  const currentTraining = trainingRows.filter((r) => r.readiness === "Current").length;
  const overdueTraining = trainingRows.filter((r) => r.readiness === "Expired" || r.readiness === "Needs review").length;
  const completionPct  = totalTraining > 0 ? Math.round((currentTraining / totalTraining) * 100) : 0;

  // Audit readiness
  const auditScore = audit?.latestScore ?? 0;
  const auditGaps  = audit?.unresolvedGaps ?? [];

  // Status breakdown for CAPA
  const statusBreakdown = [
    { label: "Draft / Pending Review", count: capas.filter((c) => c.status === "draft_human_review_required").length, color: "var(--amber)" },
    { label: "Open",        count: capas.filter((c) => c.status === "open").length,        color: "var(--blue)" },
    { label: "In Progress", count: capas.filter((c) => c.status === "in_progress").length, color: "var(--blue-mid)" },
    { label: "Closed",      count: capas.filter((c) => c.status === "closed").length,      color: "var(--green-dk)" },
    { label: "Void",        count: capas.filter((c) => c.status === "void").length,         color: "var(--muted)" },
  ];
  const totalCapas = capas.length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Monitor · Phase 6 — Review &amp; Improve</p>
            <h1>Trend Analysis</h1>
            <p className="muted">
              KPI trends across CAPAs, training completion, and audit readiness — the inputs for
              Management Review.
            </p>
          </div>
          <Link className="button-secondary" href="/risk-command-center">Risk Monitor →</Link>
        </header>

        {/* KPI cards */}
        <section className="kpi-grid" aria-label="Trend KPIs">
          <div className={`kpi-card ${overdue > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
            <div className="kpi-label">Overdue CAPAs</div>
            <div className="kpi-value">{overdue}</div>
            <div className="kpi-sub">{overdue > 0 ? "Immediate action needed" : "None overdue"}</div>
          </div>
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-label">Open CAPAs</div>
            <div className="kpi-value">{open}</div>
            <div className="kpi-sub">{openedLast30} opened last 30 days</div>
          </div>
          <div className={`kpi-card ${completionPct >= 95 ? "kpi-card--green" : completionPct >= 80 ? "kpi-card--amber" : "kpi-card--red"}`}>
            <div className="kpi-label">Training Completion</div>
            <div className="kpi-value">{completionPct}%</div>
            <div className="kpi-sub">{overdueTraining} overdue · target ≥ 95%</div>
          </div>
          <div className={`kpi-card ${auditScore >= 80 ? "kpi-card--green" : auditScore >= 60 ? "kpi-card--amber" : "kpi-card--red"}`}>
            <div className="kpi-label">Audit Readiness</div>
            <div className="kpi-value">{auditScore}%</div>
            <div className="kpi-sub">{auditGaps.length > 0 ? `${auditGaps.length} gap area${auditGaps.length !== 1 ? "s" : ""}` : "No gaps"}</div>
          </div>
        </section>

        <div className="form-grid">
          {/* CAPA status breakdown */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">CAPA Register</p>
                <h2>Status breakdown — {totalCapas} total</h2>
              </div>
              <Link href="/operations/capa" className="button-secondary compact">View all</Link>
            </div>
            {totalCapas === 0 ? (
              <div className="empty-state-card">
                <p className="empty-state-title">No CAPA records yet</p>
                <p className="muted">Open and closed CAPAs will appear here as they are logged.</p>
              </div>
            ) : (
              <div className="trend-bar-list">
                {statusBreakdown.map((s) => (
                  <div key={s.label} className="trend-bar-row">
                    <div className="trend-bar-fill" style={{
                      width: `${Math.max(4, Math.round((s.count / totalCapas) * 100))}%`,
                      minWidth: s.count > 0 ? "24px" : "4px",
                      background: s.color,
                    }} />
                    <span className="muted trend-bar-label">{s.label}</span>
                    <strong className="trend-bar-count">{s.count}</strong>
                  </div>
                ))}
                <p className="muted">Closed last 30 days: <strong>{closedLast30}</strong></p>
              </div>
            )}
          </section>

          {/* Audit gaps + training issues */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Requires attention</p>
                <h2>Current gaps</h2>
              </div>
            </div>
            {auditGaps.length === 0 && overdueTraining === 0 && overdue === 0 ? (
              <div className="empty-state-card">
                <p className="empty-state-title">No critical gaps detected</p>
                <p className="muted">Overdue CAPAs, training lapses, and audit gaps will surface here.</p>
              </div>
            ) : (
              <div className="action-list">
                {overdue > 0 && (
                  <div className="ai-context-bar ai-context-bar--danger">
                    <AlertCircle size={14} />
                    <span><strong>{overdue} overdue CAPA{overdue !== 1 ? "s" : ""}</strong></span>
                    <Link className="ai-fill-btn ai-fill-btn--danger" href="/operations/capa?filter=open">Review →</Link>
                  </div>
                )}
                {overdueTraining > 0 && (
                  <div className="ai-context-bar ai-context-bar--warning">
                    <AlertCircle size={14} />
                    <span><strong>{overdueTraining} overdue training assignment{overdueTraining !== 1 ? "s" : ""}</strong></span>
                    <Link className="ai-fill-btn ai-fill-btn--warning" href="/training-matrix">Review →</Link>
                  </div>
                )}
                {auditGaps.slice(0, 5).map((gap, i) => (
                  <article className="action-row" key={i}>
                    <div>
                      <strong>{gap.label}</strong>
                      <span className="muted">{gap.status.replace(/_/g, " ")}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Loop back CTAs */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Phase 6 → Phase 1</p>
            <h2>Act on these trends</h2>
            <p className="muted">
              Trends that surface new risk sources should feed back into the Hazard Register.
              Use Management Review to record decisions; use Lessons Learned to capture the insight.
            </p>
          </div>
          <div className="command-center-link-strip">
            <Link href="/management-review" className="button-primary">Management Review</Link>
            <Link href="/lessons-learned" className="button-secondary">Lessons Learned</Link>
            <Link href="/hazards" className="button-secondary">Add to Hazard Register</Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
