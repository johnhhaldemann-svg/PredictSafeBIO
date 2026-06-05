export const dynamic = "force-dynamic";

/**
 * /admin/security — Security & Audits
 *
 * Role-gated (superadmin / platform_staff) security posture page: an overall
 * score ring, the live readiness checklist, RLS coverage, and platform-wide CSV
 * exports. Distinct from /admin/platform, which stays a key-gated internal tool.
 *
 * Visual source of truth: docs/mockup-superadmin-platform-tools.html
 */

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { getPlatformData } from "@/lib/supabase/platform-service";

const CHECK_META = {
  pass: { dot: "var(--green)", label: "Pass", stat: "s-active" },
  warn: { dot: "var(--amber)", label: "Warn", stat: "s-review" },
  fail: { dot: "var(--red)", label: "Fail", stat: "s-critical" },
  unknown: { dot: "var(--c-dim)", label: "—", stat: "s-review" },
} as const;

const EXPORTS = [
  { type: "orgs", title: "Organization roster", note: "CSV · all tenants" },
  { type: "users", title: "User roster", note: "CSV · PHI-free" },
  { type: "deadlines", title: "Regulatory deadlines", note: "CSV · all sites" },
  { type: "flags", title: "Moderation flags", note: "CSV · reports" },
];

export default async function SecurityPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin" && profile?.role !== "platform_staff") redirect("/workbench");

  const { metrics, checklist } = await getPlatformData();

  const total = checklist.length;
  const passCount = checklist.filter((c) => c.status === "pass").length;
  const warnCount = checklist.filter((c) => c.status === "warn").length;
  const failCount = checklist.filter((c) => c.status === "fail").length;
  const score = total ? Math.round((passCount / total) * 100) : 0;

  const ringColor = failCount > 0 ? "var(--red)" : warnCount > 0 ? "var(--amber)" : "var(--green)";
  const ringBg = `conic-gradient(${ringColor} 0 ${score}%, var(--line2) ${score}% 100%)`;

  const rlsTotal = metrics.tablesWithRls + metrics.tablesWithoutRls;
  const rlsCoverage = rlsTotal ? Math.round((metrics.tablesWithRls / rlsTotal) * 100) : 100;

  return (
    <AppShell>
      <div className="page-stack">
        <div className="psb-topbar" style={{ marginBottom: 8 }}>
          <div>
            <h1 className="psb-h1">
              Security &amp; <span>Audits</span>
            </h1>
            <div className="psb-crumb">Platform posture · live server-side checks across all tenants</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="psb-kpis" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className={`psb-kpi ${failCount > 0 ? "c-red" : warnCount > 0 ? "c-orange" : "c-green"}`}>
            <div className="k-label">Security Score</div>
            <div className="k-val">{score}</div>
            <div className="k-foot">of 100</div>
          </div>
          <div className="psb-kpi c-cyan">
            <div className="k-label">Checks Passing</div>
            <div className="k-val">{passCount}/{total}</div>
            <div className="k-foot">{warnCount} warn · {failCount} fail</div>
          </div>
          <div className="psb-kpi c-purple">
            <div className="k-label">RLS Coverage</div>
            <div className="k-val">{rlsCoverage}%</div>
            <div className="k-foot">
              {metrics.tablesWithoutRls === 0 ? "all tables protected" : `${metrics.tablesWithoutRls} missing`}
            </div>
          </div>
          <div className="psb-kpi c-green">
            <div className="k-label">Audit Events</div>
            <div className="k-val">{metrics.totalAuditEvents.toLocaleString()}</div>
            <div className="k-foot">captured across tenants</div>
          </div>
        </div>

        {/* Checklist + posture ring */}
        <div className="psb-row r1">
          <div className="psb-panel">
            <div className="psb-panel-h">
              <h2>Security Checklist</h2>
              <span className="muted" style={{ fontSize: 12 }}>server-side · live</span>
            </div>
            {checklist.map((c) => {
              const meta = CHECK_META[c.status];
              return (
                <div className="psb-deadline" key={c.id} style={{ alignItems: "flex-start" }}>
                  <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: meta.dot, flexShrink: 0, marginTop: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div className="psb-dl-title">{c.label}</div>
                    <div className="psb-dl-meta">{c.detail}</div>
                  </div>
                  <span className={`psb-stat ${meta.stat}`} style={{ flexShrink: 0 }}>{meta.label}</span>
                </div>
              );
            })}
          </div>

          <div className="psb-panel">
            <div className="psb-panel-h"><h2>Overall Posture</h2></div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 14px" }}>
              <div style={{ width: 140, height: 140, borderRadius: "50%", position: "relative", background: ringBg }}>
                <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: "var(--panel)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <b style={{ fontSize: 34, fontWeight: 800, color: ringColor }}>{score}</b>
                  <span style={{ fontSize: 11, color: "var(--c-dim)", letterSpacing: 1, textTransform: "uppercase" }}>secure</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 14, textAlign: "center" }}>
                <b style={{ color: "var(--c-text)" }}>{passCount} passing</b> · {warnCount} warnings ·{" "}
                <span style={{ color: failCount > 0 ? "var(--red)" : "var(--c-muted)" }}>{failCount} failure{failCount === 1 ? "" : "s"}</span>
                <br />
                {failCount > 0
                  ? `${failCount} blocker${failCount === 1 ? "" : "s"} before customer launch`
                  : warnCount > 0
                  ? "No blockers — clear the warnings when you can"
                  : "All checks green"}
              </div>
            </div>
          </div>
        </div>

        {/* Exports */}
        <div className="psb-panel">
          <div className="psb-panel-h">
            <div>
              <h2>Export &amp; Reports</h2>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>downloads as CSV</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {EXPORTS.map((e) => (
              <a
                key={e.type}
                href={`/api/admin/export/${e.type}`}
                className="psb-integ"
                style={{ borderTop: "none", textDecoration: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 13px" }}
              >
                <div className="ix">▤</div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--c-text)" }}>{e.title}</div>
                  <div className="hm" style={{ fontSize: 11, color: "var(--c-dim)" }}>{e.note}</div>
                </div>
                <span style={{ marginLeft: "auto", color: "var(--cyan)", fontSize: 12 }}>Download ↓</span>
              </a>
            ))}
          </div>
        </div>

        <p className="muted" style={{ fontSize: 12 }}>
          Checks run live against production state on each load. Exports are PHI-free and
          restricted to platform operators. For low-level internal diagnostics, the key-gated
          /admin/platform tool remains available.
        </p>
      </div>
    </AppShell>
  );
}
