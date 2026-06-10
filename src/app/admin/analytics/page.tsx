export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity, BarChart2, Download, Eye, Flag,
  ShieldCheck, TrendingUp, Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import {
  getSignupGrowth,
  getTopViewedProfiles,
  getModerationStats,
} from "@/lib/supabase/analytics-service";
import { canViewPlatform, getDbRoleLabel } from "@/lib/role-permissions";

/**
 * /admin/analytics — Analytics & Metrics Dashboard
 *
 * Phase 3: Signup growth, profile views, moderation stats, CSV exports.
 * Gated: admin tier and above.
 * HIPAA: All data is aggregate counts. No PHI displayed on this page.
 */

const REPORT_REASON_LABELS: Record<string, string> = {
  inaccurate_credentials: "Inaccurate credentials",
  inappropriate_content: "Inappropriate content",
  suspected_fraud: "Suspected fraud",
  privacy_concern: "Privacy concern",
  outdated_information: "Outdated information",
  other: "Other",
};

// ── SVG sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ values, color = "#2563eb" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 200;
  const h = 40;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, variant }: {
  label: string; value: string | number; sub?: string; variant?: string;
}) {
  return (
    <article className={`command-card ${variant ?? "platform-blue"}`}>
      <div><strong>{label}</strong></div>
      <small>{value}</small>
      {sub && <em>{sub}</em>}
    </article>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const access = {
    signedIn: true,
    userId: user.id,
    organizationId: profile?.organization_id,
    role: profile?.role,
  };
  if (!canViewPlatform(access)) redirect("/");

  const [growth, topProfiles, modStats] = await Promise.all([
    getSignupGrowth(),
    getTopViewedProfiles(10),
    getModerationStats(),
  ]);

  const dailyValues = growth.daily.map(d => d.total);
  const topRole = Object.entries(growth.totals.by_role).sort(([, a], [, b]) => b - a)[0];

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Platform Admin</p>
            <h1>Analytics &amp; Metrics</h1>
            <p className="muted">Aggregate counts only — no PHI on this page. For compliance audit exports, see below.</p>
          </div>
          <Link className="button-secondary" href="/admin/dashboard">← Command Center</Link>
        </header>

        {/* ── 1. Signup & Growth ─────────────────────────────────────────── */}
        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Growth</p><h2>Signup &amp; User Growth</h2></div>
            <TrendingUp size={20} />
          </div>

          {/* KPI row */}
          <div className="command-card-grid">
            <KpiCard label="All time" value={growth.totals.all_time} sub="total users" variant="platform-blue" />
            <KpiCard label="Last 7 days" value={growth.totals.last_7d} sub="new signups" variant="platform-green" />
            <KpiCard label="Last 30 days" value={growth.totals.last_30d} sub="new signups" variant="platform-amber" />
            <KpiCard label="Most common role" value={topRole ? getDbRoleLabel(topRole[0]) : "—"} sub={topRole ? `${topRole[1]} users` : ""} variant="platform-navy" />
          </div>

          {/* Sparkline */}
          {dailyValues.length > 1 && (
            <div style={{ marginBottom: "1rem" }}>
              <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 4 }}>Daily signups — last 30 days</p>
              <Sparkline values={dailyValues} />
            </div>
          )}

          {/* Role breakdown table */}
          <p className="section-label" style={{ marginBottom: "0.4rem" }}>Breakdown by role</p>
          <div className="table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th style={{ textAlign: "right" }}>Count</th>
                    <th style={{ textAlign: "right" }}>% of total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(growth.totals.by_role)
                    .sort(([, a], [, b]) => b - a)
                    .map(([role, count]) => (
                      <tr key={role}>
                        <td>{getDbRoleLabel(role)}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{count}</td>
                        <td style={{ textAlign: "right", color: "var(--muted)" }}>
                          {growth.totals.all_time > 0 ? Math.round(count / growth.totals.all_time * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly trend mini-table */}
          {growth.monthly.length > 0 && (
            <>
              <p className="section-label" style={{ marginTop: "1rem", marginBottom: "0.4rem" }}>Monthly trend</p>
              <div className="table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th style={{ textAlign: "right" }}>Signups</th>
                      </tr>
                    </thead>
                    <tbody>
                      {growth.monthly.slice(-6).reverse().map(m => (
                        <tr key={m.period}>
                          <td style={{ color: "var(--muted)" }}>{m.period.slice(0, 7)}</td>
                          <td style={{ textAlign: "right" }}>{m.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ── 2. Profile Views ───────────────────────────────────────────── */}
        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Engagement</p><h2>Provider Bio Views</h2></div>
            <Eye size={20} />
          </div>
          <p className="muted" style={{ fontSize: "0.83rem", marginBottom: "1rem" }}>
            View counts only — no individual visitor tracking. PHI-free by design.
          </p>
          {topProfiles.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No profile views recorded yet</p>
              <p className="muted">Views are logged when a patient or provider accesses a bio.</p>
            </div>
          ) : (
            <div className="table-panel">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {["Provider", "Specialty", "NPI", "Organization", "Views", "Last viewed"].map(h => (
                        <th key={h} style={{ textAlign: h === "Views" ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topProfiles.map(p => (
                      <tr key={p.profile_id}>
                        <td style={{ fontWeight: 500 }}>
                          <Link href={`/admin/moderation/${p.profile_id}`} className="text-link">
                            {p.provider_name ?? "—"}
                          </Link>
                        </td>
                        <td style={{ color: "var(--muted)" }}>{p.specialty ?? "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{p.npi_number ?? "—"}</td>
                        <td style={{ color: "var(--muted)" }}>{p.organization_name ?? "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{p.view_count}</td>
                        <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {p.last_viewed_at ? new Date(p.last_viewed_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── 3. Moderation Stats ────────────────────────────────────────── */}
        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Moderation</p><h2>Review &amp; Flag Metrics</h2></div>
            <ShieldCheck size={20} />
          </div>

          <div className="command-card-grid">
            <KpiCard label="Total submitted" value={modStats.total_submitted} sub="provider bios" variant="platform-blue" />
            <KpiCard label="Approved" value={modStats.total_approved} sub={`${modStats.approval_rate_pct}% approval rate`} variant="platform-green" />
            <KpiCard label="Pending" value={modStats.total_pending} sub="awaiting review" variant="platform-amber" />
            <KpiCard label="Avg review time" value={modStats.avg_review_hours !== null ? `${modStats.avg_review_hours}h` : "—"} sub="submitted → decision" variant="platform-navy" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Bio status breakdown */}
            <div>
              <p className="section-label" style={{ marginBottom: "0.4rem" }}>Bio status breakdown</p>
              <div className="action-list">
                {[
                  ["Approved",           modStats.total_approved,           "status-current"],
                  ["Pending",            modStats.total_pending,            "status-needs-review"],
                  ["Changes requested",  modStats.total_changes_requested,  "status-needs-review"],
                  ["Rejected",           modStats.total_rejected,           "status-missing"],
                  ["Taken down",         modStats.total_taken_down,         "status-critical"],
                  ["NPI verified",       modStats.npi_verified_count,       "status-current"],
                ].map(([label, count, cls]) => (
                  <article key={String(label)} className="action-row" style={{ padding: "0.4rem 0" }}>
                    <div>
                      <span className={`status-chip ${cls}`} style={{ fontSize: "0.72rem" }}>{label}</span>
                    </div>
                    <strong style={{ marginLeft: "auto" }}>{count}</strong>
                  </article>
                ))}
              </div>
            </div>

            {/* Flag breakdown */}
            <div>
              <p className="section-label" style={{ marginBottom: "0.4rem" }}>
                Flags — {modStats.flags.total} total
              </p>
              <div className="action-list">
                {[
                  ["Pending",   modStats.flags.pending,   "status-needs-review"],
                  ["Actioned",  modStats.flags.actioned,  "status-current"],
                  ["Dismissed", modStats.flags.dismissed, "status-unknown"],
                ].map(([label, count, cls]) => (
                  <article key={String(label)} className="action-row" style={{ padding: "0.4rem 0" }}>
                    <div>
                      <Flag size={12} />
                      <span className={`status-chip ${cls}`} style={{ fontSize: "0.72rem" }}>{label}</span>
                    </div>
                    <strong style={{ marginLeft: "auto" }}>{count}</strong>
                  </article>
                ))}
                {Object.entries(modStats.flags.by_reason).length > 0 && (
                  <>
                    <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.5rem" }}>By reason:</p>
                    {Object.entries(modStats.flags.by_reason)
                      .sort(([, a], [, b]) => b - a)
                      .map(([reason, count]) => (
                        <article key={reason} className="action-row" style={{ padding: "0.25rem 0" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                            {REPORT_REASON_LABELS[reason] ?? reason}
                          </span>
                          <strong style={{ marginLeft: "auto", fontSize: "0.85rem" }}>{count}</strong>
                        </article>
                      ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Export Reports ──────────────────────────────────────────── */}
        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Compliance</p><h2>Export Reports</h2></div>
            <Download size={20} />
          </div>
          <div className="verification-pending-box" style={{ marginBottom: "1rem" }}>
            <ShieldCheck size={14} />
            <span>
              All exports are PHI-free — no names, emails, clinical data, or encrypted fields.
              Suitable for compliance audits. Each download is logged server-side.
            </span>
          </div>
          <div className="command-card-grid">
            {[
              {
                type: "users",
                icon: Users,
                label: "User list",
                desc: "ID, role, status, org, joined date",
                variant: "platform-blue",
              },
              {
                type: "bios",
                icon: Activity,
                label: "Provider bios",
                desc: "Profile ID, specialty, credentials, review status, NPI verified",
                variant: "platform-navy",
              },
              {
                type: "flags",
                icon: Flag,
                label: "Flags & reports",
                desc: "Report ID, reason, status, timestamps",
                variant: "platform-red",
              },
            ].map(({ type, icon: Icon, label, desc, variant }) => (
              <Link
                key={type}
                href={`/api/admin/export/${type}`}
                download
                className="provider-card-link"
              >
                <article className={`command-card ${variant}`}>
                  <div>
                    <span><Icon size={16} /></span>
                    <strong>{label}</strong>
                    <Download size={13} style={{ marginLeft: "auto" }} />
                  </div>
                  <p className="muted">{desc}</p>
                  <em>Download CSV</em>
                </article>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <section className="panel">
          <p className="muted" style={{ fontSize: "0.75rem" }}>
            Analytics data is aggregated at query time from live database records.
            No analytics data is cached or stored separately.
            View counts track impressions per profile — individual visitors are never recorded.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
