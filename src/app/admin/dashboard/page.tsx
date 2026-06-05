export const dynamic = "force-dynamic";

/**
 * /admin/dashboard — Super Admin Command Center
 *
 * The dark "Platform Console v2.4" landing page. Server component, gated to the
 * superadmin role. Live cross-tenant counts come from getPlatformData() and the
 * AI engine smoke test; sections that have no model yet (regulatory deadlines)
 * render from a typed const and are clearly marked.
 *
 * Visual source of truth: docs/mockup-superadmin-command-center.html
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getAuthSummary } from "@/lib/supabase/account-service";
import { isSuperAdmin } from "@/lib/role-permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import {
  getPlatformData,
  getUpcomingRegulatoryDeadlines,
  getOrgDashboardData,
  type PlatformOrgSummary,
} from "@/lib/supabase/platform-service";
import { getAiEngineStatus } from "@/lib/supabase/superadmin-service";
import { getPlatformEscalations, type EscalationSeverity } from "@/lib/supabase/escalations-service";
import { setOrgStatusAction } from "@/app/admin/org/[orgId]/actions";

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function initials(seed: string): string {
  const clean = seed.replace(/[^a-zA-Z ]/g, " ").trim();
  if (!clean) return "··";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Coarse per-org health proxy derived from the live counts we have today
 * (members + workspace activity). Not a compliance audit — labelled "engagement"
 * in the UI. Returns 0–99 so the bar/threshold logic reads sensibly.
 * TODO: replace with a real per-org compliance metric once one is modelled.
 */
function orgScore(o: PlatformOrgSummary): number {
  const activity = o.assessmentCount + o.documentCount + o.taskCount;
  const memberPart = Math.min(24, o.memberCount * 4);
  const activityPart = Math.min(15, activity);
  return Math.min(99, 60 + memberPart + activityPart);
}

function scoreBand(score: number): { bar: string; stat: string; label: string } {
  if (score >= 85) return { bar: "b-green", stat: "s-active", label: "Active" };
  if (score >= 70) return { bar: "b-amber", stat: "s-review", label: "Review" };
  return { bar: "b-red", stat: "s-critical", label: "Critical" };
}

type HealthDot = "ok" | "warn" | "err";

type DeadlineRow = { month: string; day: string; title: string; meta: string };

// Fallback only — shown if the regulatory_deadlines table is empty/unavailable.
const FALLBACK_DEADLINES: DeadlineRow[] = [
  { month: "Jul", day: "01", title: "EPA TRI Reporting (Form R)", meta: "EPCRA §313 · All Sites" },
  { month: "Feb", day: "01", title: "OSHA 300A Posting Period Begins", meta: "OSHA 29 CFR 1904 · All Sites" },
  { month: "Mar", day: "01", title: "EPCRA Tier II Inventory Report", meta: "EPCRA Tier II · All Sites" },
];

/** Month abbreviation + zero-padded day from an ISO date, timezone-safe. */
function dateBox(iso: string): { month: string; day: string } {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return { month: "—", day: "--" };
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return { month, day: String(d).padStart(2, "0") };
}

const CHIP_BY_EVENT: { test: RegExp; chip: string; av: string }[] = [
  { test: /capa/i, chip: "capa", av: "cy" },
  { test: /audit|inspection/i, chip: "audit", av: "pu" },
  { test: /escal|incident|alert/i, chip: "escal", av: "rd" },
  { test: /observ|exposure/i, chip: "obs", av: "gn" },
  { test: /user|member|invite|role/i, chip: "user", av: "am" },
];

function classifyEvent(eventType: string): { chip: string; av: string } {
  for (const c of CHIP_BY_EVENT) {
    if (c.test.test(eventType)) return { chip: c.chip, av: c.av };
  }
  return { chip: "audit", av: "pu" };
}

const ESCALATION_DOT: Record<EscalationSeverity, string> = {
  critical: "var(--red)",
  warning: "var(--amber)",
  info: "var(--cyan)",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CommandCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const auth = await getAuthSummary();
  if (!isSuperAdmin(auth)) redirect("/workbench");

  const params = await searchParams;
  const orgFilter = typeof params.org === "string" && params.org ? params.org : undefined;

  // ── Per-tenant filtered view ──────────────────────────────────────────────
  if (orgFilter) {
    const [orgData, orgEscalations, orgDeadlines] = await Promise.all([
      getOrgDashboardData(orgFilter),
      getPlatformEscalations({ organizationId: orgFilter }),
      getUpcomingRegulatoryDeadlines(5, orgFilter),
    ]);

    if (!orgData) redirect("/admin/dashboard");

    const segs = [
      { key: "Assessments", value: orgData.assessments, color: "var(--cyan)" },
      { key: "Documents", value: orgData.documents, color: "var(--orange)" },
      { key: "CAPAs", value: orgData.capa, color: "var(--purple)" },
      { key: "Inspections", value: orgData.inspections, color: "var(--green)" },
    ];
    const segTotal = segs.reduce((s, x) => s + x.value, 0);
    let segAcc = 0;
    const segStops = segs
      .map((f) => {
        const start = segTotal ? (segAcc / segTotal) * 100 : 0;
        segAcc += f.value;
        const end = segTotal ? (segAcc / segTotal) * 100 : 0;
        return `${f.color} ${start}% ${end}%`;
      })
      .join(", ");
    const orgDonutBg = segTotal ? `conic-gradient(${segStops})` : "conic-gradient(var(--line2) 0 100%)";

    const orgDeadlineRows: DeadlineRow[] = orgDeadlines.map((d) => ({
      ...dateBox(d.dueDate),
      title: d.title,
      meta: [d.siteLabel, d.regulationRef].filter(Boolean).join(" · "),
    }));

    return (
      <AppShell>
        <div className="page-stack">
          {/* Filter banner */}
          <div
            className="psb-alert"
            style={{ borderLeftColor: "var(--cyan)", background: "rgba(34,211,238,.06)", borderColor: "rgba(34,211,238,.35)" }}
          >
            <span className="tag" style={{ color: "var(--cyan)" }}>Filtered:</span>
            <span style={{ flex: 1 }}>
              Viewing <strong>{orgData.name}</strong> only
              {orgData.status && orgData.status !== "active" ? ` · ${orgData.status}` : ""}
            </span>
            <Link href={`/admin/org/${orgData.orgId}`} className="button-secondary compact" style={{ marginRight: 8 }}>
              Manage org →
            </Link>
            <Link href="/admin/dashboard" className="button-secondary compact">Clear filter ✕</Link>
          </div>

          <div className="psb-topbar" style={{ marginBottom: 8 }}>
            <div>
              <h1 className="psb-h1">{orgData.name}</h1>
              <div className="psb-crumb psb-mono">Single-tenant view · live counts</div>
            </div>
          </div>

          {/* Org KPIs */}
          <div className="psb-kpis">
            <div className="psb-kpi c-cyan">
              <div className="k-label">Members</div>
              <div className="k-val">{orgData.members.toLocaleString()}</div>
              <div className="k-foot">users in this org</div>
            </div>
            <Link href="/admin/escalations" className="psb-kpi c-red" style={{ textDecoration: "none" }}>
              <div className="k-label">Open Escalations</div>
              <div className="k-val">{orgEscalations.length}</div>
              <div className="k-foot">for this org</div>
            </Link>
            <div className="psb-kpi c-purple">
              <div className="k-label">Assessments</div>
              <div className="k-val">{orgData.assessments.toLocaleString()}</div>
              <div className="k-foot">BioRisk assessments</div>
            </div>
            <div className="psb-kpi c-orange">
              <div className="k-label">Documents</div>
              <div className="k-val">{orgData.documents.toLocaleString()}</div>
              <div className="k-foot">registered documents</div>
            </div>
            <div className="psb-kpi c-green">
              <div className="k-label">Inspections</div>
              <div className="k-val">{orgData.inspections.toLocaleString()}</div>
              <div className="k-foot">{orgData.capa.toLocaleString()} CAPA records</div>
            </div>
          </div>

          {/* Quick controls */}
          <div className="psb-panel">
            <div className="psb-panel-h"><h2>Quick controls</h2></div>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
              {orgData.status === "suspended" ? (
                <form action={setOrgStatusAction}>
                  <input type="hidden" name="orgId" value={orgData.orgId} />
                  <input type="hidden" name="status" value="active" />
                  <button className="button-primary compact" type="submit">Reinstate org</button>
                </form>
              ) : (
                <form action={setOrgStatusAction}>
                  <input type="hidden" name="orgId" value={orgData.orgId} />
                  <input type="hidden" name="status" value="suspended" />
                  <button className="button-secondary compact" type="submit" style={{ color: "var(--red)", borderColor: "var(--red)" }}>
                    Suspend org
                  </button>
                </form>
              )}
              <Link href={`/admin/org/${orgData.orgId}?tab=users`} className="button-secondary compact">Manage users →</Link>
              <Link href={`/admin/org/${orgData.orgId}?tab=controls`} className="button-secondary compact">Plan &amp; limits →</Link>
              <span className="muted" style={{ fontSize: 12 }}>Suspending blocks all member logins (data is preserved).</span>
            </div>
          </div>

          {/* Row: activity + records + escalations */}
          <div className="psb-row r2">
            <div className="psb-panel">
              <div className="psb-panel-h">
                <h2>Activity</h2>
                <Link href={`/admin/org/${orgData.orgId}`}>Open org →</Link>
              </div>
              {orgData.recentActivity.length === 0 ? (
                <p className="muted">No recent activity recorded for this org.</p>
              ) : (
                orgData.recentActivity.map((e, i) => {
                  const { chip, av } = classifyEvent(e.eventType);
                  return (
                    <div className="psb-act" key={`${e.createdAt}-${i}`}>
                      <div className={`psb-av ${av}`}>{initials(e.summary || e.eventType)}</div>
                      <div>
                        <div className="psb-act-txt">
                          {e.summary || e.eventType}
                          <span className={`psb-chip ${chip}`}>{e.eventType}</span>
                        </div>
                        <div className="psb-act-meta psb-mono">{relativeTime(e.createdAt)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="psb-panel">
              <div className="psb-panel-h"><h2>Records by Type</h2></div>
              <div className="psb-donut-wrap">
                <div className="psb-donut" style={{ background: orgDonutBg }}>
                  <div className="ctr">
                    <b>{segTotal.toLocaleString()}</b>
                    <span>records</span>
                  </div>
                </div>
                <div className="psb-legend" style={{ flex: 1 }}>
                  {segs.map((f) => (
                    <div key={f.key}>
                      <i style={{ background: f.color }} /> {f.key}
                      <b>{f.value.toLocaleString()}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="psb-panel">
              <div className="psb-panel-h">
                <h2>Needs Attention</h2>
                <Link href="/admin/escalations">Inbox →</Link>
              </div>
              {orgEscalations.length === 0 ? (
                <p className="muted">All clear for this org.</p>
              ) : (
                orgEscalations.map((e) => (
                  <div className="psb-act" key={e.id}>
                    <span
                      aria-hidden="true"
                      style={{ width: 9, height: 9, borderRadius: "50%", background: ESCALATION_DOT[e.severity], flexShrink: 0, marginTop: 6 }}
                    />
                    <div>
                      <div className="psb-act-txt">{e.title}</div>
                      <div className="psb-act-meta psb-mono">{e.source}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Deadlines for this org + platform-wide */}
          <div className="psb-panel">
            <div className="psb-panel-h">
              <h2>Regulatory Deadlines</h2>
              <Link href="/admin/deadlines">Manage →</Link>
            </div>
            {orgDeadlineRows.length === 0 ? (
              <p className="muted">No upcoming deadlines.</p>
            ) : (
              orgDeadlineRows.map((d) => (
                <div className="psb-deadline" key={`${d.month}-${d.day}-${d.title}`}>
                  <div className="psb-datebox">
                    <span className="m">{d.month}</span>
                    <span className="d">{d.day}</span>
                  </div>
                  <div>
                    <div className="psb-dl-title">{d.title}</div>
                    <div className="psb-dl-meta psb-mono">{d.meta}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Cross-tenant view (default) ───────────────────────────────────────────
  const [{ metrics, security, orgs, recentAuditEvents, checklist }, aiEngine, liveDeadlines] =
    await Promise.all([
      getPlatformData(),
      getAiEngineStatus(),
      getUpcomingRegulatoryDeadlines(5),
    ]);

  // Escalations inbox (reuses the already-fetched checklist to avoid re-querying).
  const escalations = await getPlatformEscalations({ checklist });
  const criticalEscalations = escalations.filter((e) => e.severity === "critical").length;

  // Live deadlines when present; otherwise a small labelled fallback list.
  const deadlines: DeadlineRow[] =
    liveDeadlines.length > 0
      ? liveDeadlines.map((d) => ({
          ...dateBox(d.dueDate),
          title: d.title,
          meta: [d.siteLabel, d.regulationRef].filter(Boolean).join(" · "),
        }))
      : FALLBACK_DEADLINES;
  const deadlinesAreLive = liveDeadlines.length > 0;

  // Resolve org names (service role) so the table shows real labels.
  const orgNames = new Map<string, string>();
  if (isSupabaseServiceConfigured()) {
    try {
      const admin = getSupabaseAdminClient();
      const { data } = await admin.from("organizations").select("id, name");
      for (const row of data ?? []) orgNames.set(row.id, row.name);
    } catch {
      /* names are best-effort */
    }
  }

  // ── KPIs (live) ──
  const passCount = checklist.filter((c) => c.status === "pass").length;
  const platformCompliance = checklist.length
    ? Math.round((passCount / checklist.length) * 100)
    : 0;

  // ── Critical alert: worst open escalation ──
  const criticalItem = escalations.find((e) => e.severity === "critical");

  // ── Org overview rows (top by member count) ──
  const orgRows = [...orgs]
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 7)
    .map((o) => {
      const score = orgScore(o);
      const band = scoreBand(score);
      return {
        id: o.organizationId,
        name: orgNames.get(o.organizationId) ?? `${o.organizationId.slice(0, 8)}…`,
        members: o.memberCount,
        score,
        ...band,
      };
    });

  // ── Open findings distribution (live counts) ──
  const findingSegments = [
    { key: "CAPA", value: metrics.totalCapaRecords, color: "var(--cyan)" },
    { key: "Inspection", value: metrics.totalInspections, color: "var(--orange)" },
    { key: "Assessment", value: metrics.totalAssessments, color: "var(--green)" },
    { key: "Tasks", value: metrics.totalTasks, color: "var(--purple)" },
    { key: "Training", value: metrics.totalTrainingRecords, color: "var(--c-dim)" },
  ];
  const findingsTotal = findingSegments.reduce((s, f) => s + f.value, 0);
  // Build the conic-gradient stops proportionally.
  let acc = 0;
  const stops = findingSegments
    .map((f) => {
      const start = findingsTotal ? (acc / findingsTotal) * 100 : 0;
      acc += f.value;
      const end = findingsTotal ? (acc / findingsTotal) * 100 : 0;
      return `${f.color} ${start}% ${end}%`;
    })
    .join(", ");
  const donutBg = findingsTotal
    ? `conic-gradient(${stops})`
    : "conic-gradient(var(--line2) 0 100%)";

  // ── System health (live from security + AI smoke test) ──
  const aiHealthy = aiEngine.smokeTestResult === "pass";
  const health: { title: string; meta: string; dot: HealthDot }[] = [
    {
      title: "Database",
      meta: security.supabaseConfigured ? "Connected" : "Not configured",
      dot: security.supabaseConfigured ? "ok" : "err",
    },
    {
      title: "Auth Service",
      meta: security.supabaseConfigured ? "Operational" : "Unavailable",
      dot: security.supabaseConfigured ? "ok" : "err",
    },
    {
      title: "Service Role",
      meta: security.serviceRolePresent ? "Key present" : "Key missing",
      dot: security.serviceRolePresent ? "ok" : "warn",
    },
    {
      title: "Email / SMTP",
      meta: security.smtpConfigured ? "Configured" : "Not configured",
      dot: security.smtpConfigured ? "ok" : "warn",
    },
    {
      title: "AI Engine",
      meta: aiHealthy
        ? `Smoke test pass · ${aiEngine.engineVersion.split("—")[0].trim()}`
        : "Smoke test failed",
      dot: aiHealthy ? "ok" : "err",
    },
    {
      title: "Leaked-password",
      meta:
        security.leakedPasswordProtection === "enabled"
          ? "Enabled"
          : "Verify in Supabase Auth",
      dot: security.leakedPasswordProtection === "enabled" ? "ok" : "warn",
    },
  ];

  const now = new Date();
  const dateLine = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AppShell>
      <div className="page-stack">
        {/* Header */}
        <div className="psb-topbar" style={{ marginBottom: 8 }}>
          <div>
            <h1 className="psb-h1">
              Command <span>Center</span>
            </h1>
            <div className="psb-crumb psb-mono">
              {dateLine} · All Organizations
            </div>
          </div>
        </div>

        {/* Critical alert */}
        {criticalItem && (
          <Link href="/admin/escalations" className="psb-alert" role="alert" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="tag">🔺 Critical:</span>
            <span>
              <strong>{criticalItem.title}</strong> — {criticalItem.detail}
            </span>
          </Link>
        )}

        {/* KPIs */}
        <div className="psb-kpis">
          <div className="psb-kpi c-cyan">
            <div className="k-label">Platform Readiness</div>
            <div className="k-val">{platformCompliance}%</div>
            <div className="k-foot">
              <span className="flat">{passCount}/{checklist.length}</span> checks passing
            </div>
          </div>
          <Link href="/admin/escalations" className="psb-kpi c-red" style={{ textDecoration: "none" }}>
            <div className="k-label">Open Escalations</div>
            <div className="k-val">{escalations.length}</div>
            <div className="k-foot">
              {criticalEscalations > 0 ? (
                <><span className="down">{criticalEscalations} critical</span> · view inbox →</>
              ) : (
                "all clear · view inbox →"
              )}
            </div>
          </Link>
          <div className="psb-kpi c-orange">
            <div className="k-label">Active Users</div>
            <div className="k-val">{metrics.onboardedUsers.toLocaleString()}</div>
            <div className="k-foot">
              of {metrics.totalUsers.toLocaleString()} total accounts
            </div>
          </div>
          <div className="psb-kpi c-purple">
            <div className="k-label">Total Organizations</div>
            <div className="k-val">{metrics.totalOrgs.toLocaleString()}</div>
            <div className="k-foot">tenants on the platform</div>
          </div>
          <div className="psb-kpi c-green">
            <div className="k-label">Inspections</div>
            <div className="k-val">{metrics.totalInspections.toLocaleString()}</div>
            <div className="k-foot">records across all tenants</div>
          </div>
        </div>

        {/* Row 1: Org overview + Reg deadlines */}
        <div className="psb-row r1">
          <div className="psb-panel">
            <div className="psb-panel-h">
              <h2>Organization Overview</h2>
              <Link href="/admin/organizations">View All Orgs →</Link>
            </div>
            {orgRows.length === 0 ? (
              <p className="muted">No organizations on the platform yet.</p>
            ) : (
              <table className="psb-table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Engagement</th>
                    <th>Status</th>
                    <th>Members</th>
                  </tr>
                </thead>
                <tbody>
                  {orgRows.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/org/${o.id}`} className="psb-site-name" style={{ color: "var(--c-text)" }}>
                          {o.name}
                        </Link>
                        <div className="psb-site-meta psb-mono">{o.id.slice(0, 8)}…</div>
                      </td>
                      <td>
                        <div className="psb-statline">
                          <div className={`psb-bar ${o.bar}`}>
                            <i style={{ width: `${o.score}%` }} />
                          </div>
                          <span>{o.score}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`psb-stat ${o.stat}`}>{o.label}</span>
                      </td>
                      <td>{o.members}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="psb-panel">
            <div className="psb-panel-h">
              <h2>Regulatory Deadlines</h2>
              <Link href="/admin/deadlines">Manage →</Link>
            </div>
            {deadlines.map((d) => (
              <div className="psb-deadline" key={`${d.month}-${d.day}-${d.title}`}>
                <div className="psb-datebox">
                  <span className="m">{d.month}</span>
                  <span className="d">{d.day}</span>
                </div>
                <div>
                  <div className="psb-dl-title">{d.title}</div>
                  <div className="psb-dl-meta psb-mono">{d.meta}</div>
                </div>
              </div>
            ))}
            {!deadlinesAreLive && (
              <div className="psb-sublabel">Reference list — no deadlines recorded yet</div>
            )}
          </div>
        </div>

        {/* Row 2: Activity + Findings + Health */}
        <div className="psb-row r2">
          <div className="psb-panel">
            <div className="psb-panel-h">
              <h2>Platform Activity</h2>
              <Link href="/admin/audit">Audit Log →</Link>
            </div>
            {recentAuditEvents.length === 0 ? (
              <p className="muted">No recent activity recorded.</p>
            ) : (
              recentAuditEvents.slice(0, 6).map((e, i) => {
                const { chip, av } = classifyEvent(e.eventType);
                return (
                  <div className="psb-act" key={`${e.createdAt}-${i}`}>
                    <div className={`psb-av ${av}`}>{initials(e.summary || e.eventType)}</div>
                    <div>
                      <div className="psb-act-txt">
                        {e.summary || e.eventType}
                        <span className={`psb-chip ${chip}`}>{e.eventType}</span>
                      </div>
                      <div className="psb-act-meta psb-mono">{relativeTime(e.createdAt)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="psb-panel">
            <div className="psb-panel-h">
              <h2>Records by Type</h2>
              <Link href="/admin/superadmin?tab=db">Breakdown →</Link>
            </div>
            <div className="psb-donut-wrap">
              <div className="psb-donut" style={{ background: donutBg }}>
                <div className="ctr">
                  <b>{findingsTotal.toLocaleString()}</b>
                  <span>records</span>
                </div>
              </div>
              <div className="psb-legend" style={{ flex: 1 }}>
                {findingSegments.map((f) => (
                  <div key={f.key}>
                    <i style={{ background: f.color }} /> {f.key}
                    <b>{f.value.toLocaleString()}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="psb-panel">
            <div className="psb-panel-h">
              <h2>System Health</h2>
            </div>
            <div className="psb-health">
              {health.map((h) => (
                <div className="psb-hc" key={h.title}>
                  <span className={`hdot ${h.dot}`} aria-hidden="true" />
                  <div>
                    <div className="ht">{h.title}</div>
                    <div className="hm">{h.meta}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="psb-sublabel">Engine</div>
            <div className="psb-integ">
              <div className="ix">⬡</div>
              <div>
                <div style={{ fontWeight: 600 }}>BioRisk Engine</div>
                <div className="hm" style={{ fontSize: 11, color: "var(--c-dim)" }}>
                  {aiEngine.riskFamiliesLoaded} risk families · {aiEngine.guardrailsActive} guardrails
                </div>
              </div>
              <span style={{ marginLeft: "auto", color: aiHealthy ? "var(--green)" : "var(--red)", fontSize: 11 }}>
                ● {aiHealthy ? "Live" : "Down"}
              </span>
            </div>
            <div className="psb-integ">
              <div className="ix">⬡</div>
              <div>
                <div style={{ fontWeight: 600 }}>Audit Logging</div>
                <div className="hm" style={{ fontSize: 11, color: "var(--c-dim)" }}>
                  {metrics.totalAuditEvents.toLocaleString()} events captured
                </div>
              </div>
              <span style={{ marginLeft: "auto", color: "var(--green)", fontSize: 11 }}>● Live</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
