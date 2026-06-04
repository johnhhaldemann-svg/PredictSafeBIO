import type { ReactNode } from "react";
/**
 * SuperAdminDashboard — replaces WorkbenchClient for superadmin users.
 *
 * Sections:
 *   1. KPI strip          — orgs, users, assessments, docs, tasks
 *   2. Approvals queue    — AI knowledge + provider bio moderation
 *   3. Platform health    — env/config checklist
 *   4. Tenant overview    — per-org breakdown
 *   5. AI engine          — smoke-test status + link to diagnostics
 *   6. Recent activity    — cross-org audit events
 *   7. Quick actions      — links to all admin tools
 */

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Brain,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  FileCheck,
  Flag,
  HardDrive,
  Lock,
  Server,
  ShieldCheck,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import type { PlatformData } from "@/lib/supabase/platform-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SuperAdminDashboardProps = {
  platform: PlatformData;
  knowledgePending: number;
  moderationPending: number;
  moderationReports: number;
  fetchedAt: string;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: "pass" | "fail" | "warn" | "unknown" }) {
  if (status === "pass") return <CheckCircle2 size={14} className="status-icon-pass" />;
  if (status === "fail") return <XCircle size={14} className="status-icon-fail" />;
  if (status === "warn") return <AlertTriangle size={14} className="status-icon-warn" />;
  return <Clock size={14} className="status-icon-unknown" />;
}

function statusRowClass(status: "pass" | "fail" | "warn" | "unknown") {
  if (status === "pass") return "platform-check-pass";
  if (status === "fail") return "platform-check-fail";
  if (status === "warn") return "platform-check-warn";
  return "platform-check-unknown";
}

function Kpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <article className="command-card platform-blue">
      <div>
        <span>{icon}</span>
        <strong>{label}</strong>
      </div>
      <small>{value}</small>
      {sub && <em>{sub}</em>}
    </article>
  );
}

function ApprovalBadge({ count, label, href, icon }: { count: number; label: string; href: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.85rem 1rem",
        background: count > 0 ? "var(--alert-bg, #fff7ed)" : "var(--panel-soft)",
        border: `1px solid ${count > 0 ? "var(--alert-border, #fed7aa)" : "var(--border)"}`,
        borderRadius: "8px",
        textDecoration: "none",
        color: "var(--text)",
        transition: "opacity 0.15s",
      }}
    >
      <span style={{ color: count > 0 ? "var(--warning, #ea580c)" : "var(--text-muted)" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem" }}>{label}</p>
        <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>
          {count > 0 ? `${count} item${count !== 1 ? "s" : ""} awaiting action` : "All clear"}
        </p>
      </div>
      {count > 0 && (
        <span
          style={{
            background: "var(--warning, #ea580c)",
            color: "#fff",
            borderRadius: "100px",
            padding: "0.1rem 0.55rem",
            fontSize: "0.75rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {count}
        </span>
      )}
      <ExternalLink size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SuperAdminDashboard({
  platform,
  knowledgePending,
  moderationPending,
  moderationReports,
  fetchedAt,
}: SuperAdminDashboardProps) {
  const { metrics, security, orgs, recentAuditEvents, checklist } = platform;

  const passCount = checklist.filter((c) => c.status === "pass").length;
  const failCount = checklist.filter((c) => c.status === "fail").length;
  const warnCount = checklist.filter((c) => c.status === "warn").length;
  const platformHealthy = failCount === 0;

  const totalApprovalsPending = knowledgePending + moderationPending + moderationReports;

  return (
    <div className="page-stack">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="page-header">
        <p className="section-label">Super Admin</p>
        <h1>Platform Command Center</h1>
        <p className="muted">
          Cross-platform view · Data as of {new Date(fetchedAt).toLocaleTimeString()}
        </p>
      </header>

      {/* ── Health banner ──────────────────────────────────────────────── */}
      <section
        className={`panel access-banner ${platformHealthy ? "access-enabled" : "access-readonly"}`}
      >
        <strong>{platformHealthy ? "Platform healthy" : "Platform attention required"}</strong>
        <span>
          {passCount} checks passing · {warnCount} warnings · {failCount} failures
          {totalApprovalsPending > 0 && ` · ${totalApprovalsPending} items pending approval`}
        </span>
      </section>

      {/* ── KPI strip ──────────────────────────────────────────────────── */}
      <section className="command-card-grid" aria-label="Platform metrics">
        <Kpi icon={<Building2 size={15} />} label="Organizations" value={metrics.totalOrgs} sub={`${metrics.totalUsers} total users`} />
        <Kpi icon={<Users size={15} />} label="Onboarded Users" value={metrics.onboardedUsers} sub="with completed onboarding" />
        <Kpi icon={<Brain size={15} />} label="Assessments" value={metrics.totalAssessments} sub="AI risk assessments" />
        <Kpi icon={<Database size={15} />} label="Documents" value={metrics.totalDocuments} sub={`${metrics.totalAuditEvents} audit events`} />
        <Kpi icon={<Zap size={15} />} label="Tasks / CAPAs" value={`${metrics.totalTasks} / ${metrics.totalCapaRecords}`} sub={`${metrics.totalInspections} inspections`} />
      </section>

      {/* ── Two-column: Approvals + Quick Actions ──────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

        {/* Approvals queue */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Data approvals</p>
              <h2>Pending review</h2>
            </div>
            <FileCheck size={20} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <ApprovalBadge
              count={knowledgePending}
              label="AI Knowledge Entries"
              href="/admin/ai-knowledge"
              icon={<Brain size={16} />}
            />
            <ApprovalBadge
              count={moderationPending}
              label="Provider Bio Reviews"
              href="/admin/moderation"
              icon={<Users size={16} />}
            />
            <ApprovalBadge
              count={moderationReports}
              label="Flagged Reports"
              href="/admin/moderation?tab=reports"
              icon={<Flag size={16} />}
            />
          </div>
        </section>

        {/* Quick actions */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Admin tools</p>
              <h2>Quick access</h2>
            </div>
            <Server size={20} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
            }}
          >
            {[
              { label: "Organizations", href: "/admin/organizations", icon: Building2 },
              { label: "Users", href: "/admin/users", icon: Users },
              { label: "Billing", href: "/admin/billing", icon: HardDrive },
              { label: "Analytics", href: "/admin/analytics", icon: Activity },
              { label: "Audit Log", href: "/admin/audit", icon: FileCheck },
              { label: "Feature Flags", href: "/admin/config/flags", icon: Zap },
              { label: "Staff Permissions", href: "/admin/staff-permissions", icon: Lock },
              { label: "AI Diagnostics", href: "/admin/superadmin", icon: Brain },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 0.75rem",
                  background: "var(--panel-soft)",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "var(--text)",
                  textDecoration: "none",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ── Platform health checklist ───────────────────────────────────── */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Platform operations</p>
            <h2>Configuration &amp; security checklist</h2>
          </div>
          <ShieldCheck size={20} />
        </div>
        <div className="action-list">
          {checklist.map((item) => (
            <article className={`action-row ${statusRowClass(item.status)}`} key={item.id}>
              <div>
                <StatusIcon status={item.status} />
                <strong>{item.label}</strong>
                <span
                  className={
                    item.status === "pass" ? "status-current" :
                    item.status === "fail" ? "status-missing" :
                    "status-needs-review"
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

        {/* RLS summary */}
        <div style={{ marginTop: "1rem" }}>
          {metrics.tablesWithoutRls === 0 ? (
            <div className="verification-pass-box">
              <strong>RLS enabled on all {metrics.tablesWithRls} public tables</strong>
              <span>Organization data fully isolated. No cross-org leaks via API.</span>
            </div>
          ) : (
            <div className="verification-pending-box">
              <strong>{metrics.tablesWithoutRls} tables missing RLS</strong>
              <span>{metrics.rlsTablesListed.join(", ")}</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Tenant overview ─────────────────────────────────────────────── */}
      {orgs.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Tenant overview</p>
              <h2>{orgs.length} organization{orgs.length !== 1 ? "s" : ""} on platform</h2>
            </div>
            <Building2 size={20} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "0.6rem",
            }}
          >
            {orgs.map((org) => (
              <Link
                key={org.organizationId}
                href={`/admin/organizations`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.3rem",
                  padding: "0.75rem 1rem",
                  background: "var(--panel-soft)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "var(--text)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.8rem", fontFamily: "monospace" }}>
                    {org.organizationId.slice(0, 8)}…
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  <span>{org.assessmentCount} assessments</span>
                  <span>{org.documentCount} docs</span>
                  <span>{org.taskCount} tasks</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <Link href="/admin/organizations" className="text-link" style={{ fontSize: "0.8rem" }}>
              View all organizations →
            </Link>
          </div>
        </section>
      )}

      {/* ── Security summary ────────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Security &amp; infrastructure</p>
            <h2>Environment status</h2>
          </div>
          <Lock size={20} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {[
            {
              label: "Supabase configured",
              ok: security.supabaseConfigured,
            },
            {
              label: "Service role present",
              ok: security.serviceRolePresent,
            },
            {
              label: "Email / SMTP configured",
              ok: security.smtpConfigured,
            },
            {
              label: "Leaked password protection",
              ok: security.leakedPasswordProtection === "enabled",
              unknown: security.leakedPasswordProtection === "unknown",
            },
          ].map(({ label, ok, unknown }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 0.85rem",
                background: "var(--panel-soft)",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                fontSize: "0.8rem",
              }}
            >
              {unknown ? (
                <Clock size={14} className="status-icon-unknown" />
              ) : ok ? (
                <CheckCircle2 size={14} className="status-icon-pass" />
              ) : (
                <XCircle size={14} className="status-icon-fail" />
              )}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recent cross-org audit events ───────────────────────────────── */}
      {recentAuditEvents.length > 0 && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Recent cross-org activity</p>
              <h2>Latest {recentAuditEvents.length} audit events</h2>
            </div>
            <Activity size={20} />
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
          <div style={{ marginTop: "0.75rem" }}>
            <Link href="/admin/audit" className="text-link" style={{ fontSize: "0.8rem" }}>
              View full audit log →
            </Link>
          </div>
        </section>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <section className="panel">
        <p className="muted" style={{ fontSize: "0.72rem" }}>
          Super Admin view — restricted to platform operators. All metrics are live production data.
          For AI engine diagnostics and database record distribution, visit{" "}
          <Link href="/admin/superadmin" className="text-link">
            /admin/superadmin
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
