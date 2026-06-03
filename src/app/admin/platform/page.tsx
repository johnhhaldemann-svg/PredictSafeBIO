export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, Clock, Database, Server, ShieldCheck, Users, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getPlatformData, type PlatformChecklistItem } from "@/lib/supabase/platform-service";

/**
 * Platform Operations Page — /admin/platform
 *
 * Cross-org visibility for platform operators. Gated by PLATFORM_ADMIN_KEY
 * environment variable. Access by visiting:
 *   /admin/platform?key=<PLATFORM_ADMIN_KEY>
 *
 * Never add this page to the AppShell nav — it is internal tooling only.
 */

type Props = {
  searchParams: Promise<{ key?: string; message?: string }>;
};

function statusIcon(status: PlatformChecklistItem["status"]) {
  if (status === "pass") return <CheckCircle2 size={16} className="status-icon-pass" />;
  if (status === "fail") return <XCircle size={16} className="status-icon-fail" />;
  if (status === "warn") return <AlertTriangle size={16} className="status-icon-warn" />;
  return <Clock size={16} className="status-icon-unknown" />;
}

function statusClass(status: PlatformChecklistItem["status"]) {
  if (status === "pass") return "platform-check-pass";
  if (status === "fail") return "platform-check-fail";
  if (status === "warn") return "platform-check-warn";
  return "platform-check-unknown";
}

export default async function PlatformOpsPage({ searchParams }: Props) {
  const params = await searchParams;
  const adminKey = process.env.PLATFORM_ADMIN_KEY;

  // Access gate — require matching key
  if (!adminKey || params.key !== adminKey) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <p className="section-label">Platform Operations</p>
            <h1>Access restricted</h1>
          </header>
          <section className="panel">
            <p className="muted">
              Platform operator access requires the <code>PLATFORM_ADMIN_KEY</code> environment
              variable to be set and the matching key to be passed as a URL query parameter.
            </p>
            <p className="muted">
              Example: <code>/admin/platform?key=your-secret-key</code>
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  const data = await getPlatformData();
  const { metrics, security, orgs, recentAuditEvents, checklist } = data;

  const passCount = checklist.filter((c) => c.status === "pass").length;
  const warnCount = checklist.filter((c) => c.status === "warn").length;
  const failCount = checklist.filter((c) => c.status === "fail").length;
  const overallReady = failCount === 0 && warnCount <= 1;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Platform Operations</p>
          <h1>Platform health &amp; operations</h1>
          <p className="muted">
            Cross-org platform view. Visible only to platform operators with the admin key.
          </p>
        </header>

        {/* Overall readiness */}
        <section className={`panel access-banner ${overallReady ? "access-enabled" : "access-readonly"}`}>
          <strong>{overallReady ? "Platform ready" : "Action required"}</strong>
          <span>
            {passCount} checks passing · {warnCount} warnings · {failCount} failures
          </span>
        </section>

        {/* KPI cards */}
        <section className="command-card-grid" aria-label="Platform metrics">
          <article className="command-card platform-blue">
            <div><span><Users size={16} /></span><strong>Organizations</strong></div>
            <small>{metrics.totalOrgs}</small>
            <em>{metrics.onboardedUsers} onboarded users</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><Activity size={16} /></span><strong>Assessments</strong></div>
            <small>{metrics.totalAssessments}</small>
            <em>Across all orgs</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><Database size={16} /></span><strong>Documents</strong></div>
            <small>{metrics.totalDocuments}</small>
            <em>{metrics.totalAuditEvents} audit events</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><Server size={16} /></span><strong>Tasks / CAPAs</strong></div>
            <small>{metrics.totalTasks} / {metrics.totalCapaRecords}</small>
            <em>{metrics.totalInspections} inspections</em>
          </article>
        </section>

        {/* Readiness checklist */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Platform readiness</p>
              <h2>Configuration &amp; security checklist</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="action-list">
            {checklist.map((item) => (
              <article className={`action-row ${statusClass(item.status)}`} key={item.id}>
                <div>
                  {statusIcon(item.status)}
                  <strong>{item.label}</strong>
                  <span className={
                    item.status === "pass" ? "status-current" :
                    item.status === "fail" ? "status-missing" :
                    item.status === "warn" ? "status-needs-review" : ""
                  }>
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

        {/* RLS status */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Data isolation</p>
              <h2>Row-level security</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          {metrics.tablesWithoutRls === 0 ? (
            <div className="verification-pass-box">
              <strong>RLS enabled on all {metrics.tablesWithRls} public tables</strong>
              <span>Organization data is fully isolated. No cross-org data leaks are possible via the API.</span>
            </div>
          ) : (
            <div className="verification-pending-box">
              <strong>{metrics.tablesWithoutRls} tables missing RLS</strong>
              <span>{metrics.rlsTablesListed.join(", ")}</span>
            </div>
          )}
        </section>

        {/* Organization breakdown */}
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

        {/* Recent cross-org audit activity */}
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

        {/* Next actions */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Next steps</p>
            <h2>To fully activate the platform</h2>
            <div className="action-list" style={{ marginTop: "0.75rem" }}>
              {!security.smtpConfigured && (
                <article className="action-row">
                  <div><AlertTriangle size={14} /><strong>Configure custom SMTP</strong></div>
                  <p>Required for email confirmation, password reset, and team invites. See <code>docs/smtp-setup.md</code>.</p>
                </article>
              )}
              <article className="action-row">
                <div><AlertTriangle size={14} /><strong>Enable leaked password protection</strong></div>
                <p>Supabase Auth → Password Security → Enable leaked password protection (HaveIBeenPwned integration).</p>
              </article>
              {!security.serviceRolePresent && (
                <article className="action-row">
                  <div><AlertTriangle size={14} /><strong>Add SUPABASE_SERVICE_ROLE_KEY</strong></div>
                  <p>Required for team invite emails and admin operations. Add to Vercel environment variables.</p>
                </article>
              )}
              <article className="action-row">
                <div><CheckCircle2 size={14} /><strong>Run RLS integration tests</strong></div>
                <p>Set up a dedicated test Supabase project and run <code>npx tsx scripts/test-rls.mts</code>.</p>
              </article>
            </div>
          </div>
          <ShieldCheck size={24} />
        </section>

        <section className="panel">
          <p className="muted" style={{ fontSize: "0.75rem" }}>
            Platform ops page — for authorized platform operators only. Do not share the admin key or this URL.
            Data shown reflects live production state at time of page load.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
