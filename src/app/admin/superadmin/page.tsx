export const dynamic = "force-dynamic";

/**
 * Superadmin Operations Page — /admin/superadmin
 *
 * Full cross-platform visibility for superadmin operators:
 *   1. Platform ops & security checks
 *   2. AI Engine diagnostics (risk families, guardrails, smoke test)
 *   3. Database visual (record counts per table, category breakdown)
 *
 * Gated by PLATFORM_ADMIN_KEY environment variable.
 * Access: /admin/superadmin?key=<PLATFORM_ADMIN_KEY>
 *
 * Never link from AppShell nav — internal tooling only.
 */

import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Database,
  Server,
  ShieldCheck,
  Cpu,
  Users,
  XCircle,
  Zap,
  BarChart2,
  Lock,
  FileCheck,
  FlaskConical,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getSuperadminData, type DbTableStat } from "@/lib/supabase/superadmin-service";
import type { PlatformChecklistItem } from "@/lib/supabase/platform-service";

type Props = {
  searchParams: Promise<{ key?: string }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusIcon(status: PlatformChecklistItem["status"]) {
  if (status === "pass") return <CheckCircle2 size={15} className="status-icon-pass" />;
  if (status === "fail") return <XCircle size={15} className="status-icon-fail" />;
  if (status === "warn") return <AlertTriangle size={15} className="status-icon-warn" />;
  return <Clock size={15} className="status-icon-unknown" />;
}

function statusClass(status: PlatformChecklistItem["status"]) {
  if (status === "pass") return "platform-check-pass";
  if (status === "fail") return "platform-check-fail";
  if (status === "warn") return "platform-check-warn";
  return "platform-check-unknown";
}

const CATEGORY_COLORS: Record<DbTableStat["category"], string> = {
  core:       "#2563eb",
  compliance: "#16a34a",
  ai:         "#7c3aed",
  ops:        "#ea580c",
};

const CATEGORY_LABELS: Record<DbTableStat["category"], string> = {
  core:       "Core",
  compliance: "Compliance",
  ai:         "AI / Assessment",
  ops:        "Operations",
};

function DbBar({ stat, max }: { stat: DbTableStat; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((stat.count / max) * 100)) : 2;
  const color = CATEGORY_COLORS[stat.category];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
      <span style={{ width: "10rem", fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0, textAlign: "right" }}>
        {stat.label}
      </span>
      <div style={{ flex: 1, background: "var(--panel-soft)", borderRadius: "4px", height: "16px", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: "4px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ width: "3.5rem", fontSize: "0.72rem", fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>
        {stat.count.toLocaleString()}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SuperadminPage({ searchParams }: Props) {
  const params = await searchParams;
  const adminKey = process.env.PLATFORM_ADMIN_KEY;

  if (!adminKey || params.key !== adminKey) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <p className="section-label">Superadmin</p>
            <h1>Access restricted</h1>
          </header>
          <section className="panel">
            <p className="muted">
              Superadmin access requires the <code>PLATFORM_ADMIN_KEY</code> environment variable to
              be set and the matching key passed as a URL query parameter.
            </p>
            <p className="muted">
              Example: <code>/admin/superadmin?key=your-secret-key</code>
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  const data = await getSuperadminData();
  const { platform, aiEngine, dbStats, fetchedAt } = data;
  const { metrics, security, orgs, recentAuditEvents, checklist } = platform;

  const passCount = checklist.filter((c) => c.status === "pass").length;
  const warnCount = checklist.filter((c) => c.status === "warn").length;
  const failCount = checklist.filter((c) => c.status === "fail").length;
  const overallReady = failCount === 0 && warnCount <= 1;

  const dbMax = Math.max(...dbStats.map((s) => s.count), 1);
  const dbTotal = dbStats.reduce((sum, s) => sum + s.count, 0);

  const categoryTotals = dbStats.reduce(
    (acc, s) => { acc[s.category] = (acc[s.category] ?? 0) + s.count; return acc; },
    {} as Record<string, number>
  );

  return (
    <AppShell>
      <div className="page-stack">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="page-header">
          <p className="section-label">Superadmin</p>
          <h1>Platform · AI Engine · Database</h1>
          <p className="muted">
            Full superadmin view. Requires admin key. Data live as of{" "}
            {new Date(fetchedAt).toLocaleString()}.
          </p>
        </header>

        {/* ── Overall readiness banner ───────────────────────────────────── */}
        <section
          className={`panel access-banner ${overallReady ? "access-enabled" : "access-readonly"}`}
        >
          <strong>{overallReady ? "Platform ready" : "Action required"}</strong>
          <span>
            {passCount} checks passing · {warnCount} warnings · {failCount} failures ·{" "}
            AI Engine {aiEngine.smokeTestResult === "pass" ? "✓ healthy" : "✗ check required"}
          </span>
        </section>

        {/* ── KPI strip ─────────────────────────────────────────────────── */}
        <section className="command-card-grid" aria-label="Platform metrics">
          <article className="command-card platform-blue">
            <div><span><Users size={15} /></span><strong>Organizations</strong></div>
            <small>{metrics.totalOrgs}</small>
            <em>{metrics.onboardedUsers} onboarded users</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><Brain size={15} /></span><strong>Assessments</strong></div>
            <small>{metrics.totalAssessments}</small>
            <em>AI risk assessments</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><Database size={15} /></span><strong>Documents</strong></div>
            <small>{metrics.totalDocuments}</small>
            <em>{metrics.totalAuditEvents} audit events</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><Server size={15} /></span><strong>Tasks / CAPAs</strong></div>
            <small>{metrics.totalTasks} / {metrics.totalCapaRecords}</small>
            <em>{metrics.totalInspections} inspections</em>
          </article>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 1 — PLATFORM OPS CHECKS
        ════════════════════════════════════════════════════════════════ */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Platform operations</p>
              <h2>Configuration &amp; security checklist</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="action-list">
            {checklist.map((item) => (
              <article
                className={`action-row ${statusClass(item.status)}`}
                key={item.id}
              >
                <div>
                  {statusIcon(item.status)}
                  <strong>{item.label}</strong>
                  <span
                    className={
                      item.status === "pass" ? "status-current" :
                      item.status === "fail" ? "status-missing" :
                      item.status === "warn" ? "status-needs-review" : ""
                    }
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <p>{item.detail}</p>
                {item.actionUrl && (
                  <a className="text-link" href={item.actionUrl} target="_blank" rel="noopener noreferrer">
                    Open in Supabase →
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* RLS isolation status */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Data isolation</p>
              <h2>Row-level security</h2>
            </div>
            <Lock size={22} />
          </div>
          {metrics.tablesWithoutRls === 0 ? (
            <div className="verification-pass-box">
              <strong>RLS enabled on all {metrics.tablesWithRls} public tables</strong>
              <span>Organization data is fully isolated. No cross-org data leaks via the API.</span>
            </div>
          ) : (
            <div className="verification-pending-box">
              <strong>{metrics.tablesWithoutRls} tables missing RLS</strong>
              <span>{metrics.rlsTablesListed.join(", ")}</span>
            </div>
          )}
        </section>

        {/* Org breakdown */}
        {orgs.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Organization breakdown</p>
                <h2>{orgs.length} organization{orgs.length !== 1 ? "s" : ""}</h2>
              </div>
              <Users size={22} />
            </div>
            <div className="action-list">
              {orgs.map((org) => (
                <article className="action-row" key={org.organizationId}>
                  <div>
                    <strong>{org.organizationId.slice(0, 8)}…</strong>
                    <span>{org.memberCount} member{org.memberCount !== 1 ? "s" : ""}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Recent audit events */}
        {recentAuditEvents.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Recent cross-org activity</p>
                <h2>Latest {recentAuditEvents.length} audit events</h2>
              </div>
              <Activity size={22} />
            </div>
            <div className="timeline">
              {recentAuditEvents.map((event, i) => (
                <article className="timeline-row" key={i}>
                  <span>{new Date(event.createdAt).toLocaleString()}</span>
                  <strong>{event.eventType.replace(/_/g, " ")}</strong>
                  <p>{event.summary}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SECTION 2 — AI ENGINE DIAGNOSTICS
        ════════════════════════════════════════════════════════════════ */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">AI Engine</p>
              <h2>Engine health &amp; diagnostics</h2>
            </div>
            <Cpu size={22} />
          </div>

          {/* Engine KPI strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            {[
              { icon: <Brain size={14} />, label: "Risk Families", value: aiEngine.riskFamiliesLoaded },
              { icon: <Zap size={14} />, label: "Signal Types", value: aiEngine.signalTypesSupported },
              { icon: <ShieldCheck size={14} />, label: "Guardrails Active", value: aiEngine.guardrailsActive },
              { icon: <FileCheck size={14} />, label: "Source Artifacts", value: aiEngine.sourceArtifactsLinked },
            ].map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  background: "var(--panel-soft)",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <span style={{ color: "var(--text-muted)", display: "flex", gap: "0.35rem", alignItems: "center", fontSize: "0.72rem" }}>
                  {kpi.icon} {kpi.label}
                </span>
                <strong style={{ fontSize: "1.4rem", lineHeight: 1 }}>{kpi.value}</strong>
              </div>
            ))}
          </div>

          {/* Smoke test result */}
          <div
            className={aiEngine.smokeTestResult === "pass" ? "verification-pass-box" : "verification-pending-box"}
            style={{ marginBottom: "1.25rem" }}
          >
            <strong>
              Smoke test: {aiEngine.smokeTestResult === "pass" ? "✓ Engine functional" : "✗ Engine error — check logs"}
            </strong>
            <span>
              {aiEngine.smokeTestResult === "pass"
                ? `Returned score ${aiEngine.smokeTestScore} · level ${aiEngine.smokeTestLevel} · confidence ${aiEngine.smokeTestConfidence}. All guardrails and doNotClaim labels present.`
                : "assessBioRisk() threw an exception or returned an invalid result. Review engine.ts and risk-families.ts."}
            </span>
          </div>

          {/* Engine version */}
          <p className="muted" style={{ fontSize: "0.75rem", marginBottom: "1rem" }}>
            <strong>Engine:</strong> {aiEngine.engineVersion}
          </p>

          {/* Risk families table */}
          <div className="panel-heading" style={{ marginBottom: "0.5rem" }}>
            <div>
              <p className="section-label">Loaded risk families</p>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, margin: 0 }}>
                {aiEngine.riskFamilies.length} families active
              </h3>
            </div>
            <FlaskConical size={18} />
          </div>
          <div className="action-list">
            {aiEngine.riskFamilies.map((family) => (
              <article className="action-row platform-check-pass" key={family.id}>
                <div>
                  <CheckCircle2 size={14} className="status-icon-pass" />
                  <strong>{family.label}</strong>
                  <span className="status-current" style={{ fontSize: "0.65rem" }}>
                    {family.signalTypes.length} signal{family.signalTypes.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p style={{ fontSize: "0.72rem" }}>
                  Signals: {family.signalTypes.join(", ")} · Owners: {family.ownerRoles.join(", ")}
                </p>
              </article>
            ))}
          </div>

          {/* Guardrails */}
          <div className="panel-heading" style={{ margin: "1.25rem 0 0.5rem" }}>
            <div>
              <p className="section-label">Active guardrails</p>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, margin: 0 }}>
                {aiEngine.doNotClaim.length} doNotClaim / draft labels enforced
              </h3>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="action-list">
            {aiEngine.doNotClaim.map((claim, i) => (
              <article className="action-row platform-check-warn" key={i}>
                <div>
                  <ShieldCheck size={14} className="status-icon-warn" />
                  <p style={{ margin: 0, fontSize: "0.78rem" }}>{claim}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 3 — DATABASE VISUAL
        ════════════════════════════════════════════════════════════════ */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Database</p>
              <h2>Record distribution</h2>
            </div>
            <BarChart2 size={22} />
          </div>

          {/* Category summary chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {(Object.keys(CATEGORY_LABELS) as DbTableStat["category"][]).map((cat) => (
              <div
                key={cat}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "var(--panel-soft)",
                  borderRadius: "100px",
                  padding: "0.25rem 0.65rem",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: CATEGORY_COLORS[cat], flexShrink: 0
                  }}
                />
                {CATEGORY_LABELS[cat]}
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                  {(categoryTotals[cat] ?? 0).toLocaleString()}
                </span>
              </div>
            ))}
            <div
              style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                background: "var(--panel-soft)", borderRadius: "100px",
                padding: "0.25rem 0.65rem", fontSize: "0.72rem",
              }}
            >
              <Database size={10} />
              <strong>Total: {dbTotal.toLocaleString()} records</strong>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ padding: "0.25rem 0" }}>
            {dbStats.map((stat) => (
              <DbBar key={stat.table} stat={stat} max={dbMax} />
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
            {(Object.keys(CATEGORY_LABELS) as DbTableStat["category"][]).map((cat) => (
              <span key={cat} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "2px", background: CATEGORY_COLORS[cat], flexShrink: 0 }} />
                {CATEGORY_LABELS[cat]}
              </span>
            ))}
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <section className="panel">
          <p className="muted" style={{ fontSize: "0.72rem" }}>
            Superadmin page — authorized operators only. Do not share the admin key or this URL.
            All data reflects live production state at page-load time.
            AI Engine results are draft — human review required before clinical or regulatory use.
          </p>
        </section>

      </div>
    </AppShell>
  );
}
