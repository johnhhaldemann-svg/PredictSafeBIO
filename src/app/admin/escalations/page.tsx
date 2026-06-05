export const dynamic = "force-dynamic";

/**
 * /admin/escalations — cross-tenant "needs attention" inbox.
 *
 * Surfaces real platform signals (suspended orgs, pending moderation, failing
 * readiness checks) so an operator has one place to triage. Gated to platform
 * staff / superadmin.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getPlatformEscalations, type EscalationSeverity } from "@/lib/supabase/escalations-service";

const SEVERITY_META: Record<EscalationSeverity, { label: string; dot: string; stat: string }> = {
  critical: { label: "Critical", dot: "var(--red)", stat: "s-critical" },
  warning: { label: "Warning", dot: "var(--amber)", stat: "s-review" },
  info: { label: "Info", dot: "var(--cyan)", stat: "s-active" },
};

export default async function EscalationsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin" && profile?.role !== "platform_staff") redirect("/workbench");

  const escalations = await getPlatformEscalations();
  const criticalCount = escalations.filter((e) => e.severity === "critical").length;
  const warningCount = escalations.filter((e) => e.severity === "warning").length;

  return (
    <AppShell>
      <div className="page-stack">
        <div className="psb-topbar" style={{ marginBottom: 8 }}>
          <div>
            <h1 className="psb-h1">
              Escalations <span>Inbox</span>
            </h1>
            <div className="psb-crumb">
              Items across all tenants that need your attention
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="psb-kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="psb-kpi c-red">
            <div className="k-label">Critical</div>
            <div className="k-val">{criticalCount}</div>
            <div className="k-foot">need action now</div>
          </div>
          <div className="psb-kpi c-orange">
            <div className="k-label">Warnings</div>
            <div className="k-val">{warningCount}</div>
            <div className="k-foot">review soon</div>
          </div>
          <div className="psb-kpi c-green">
            <div className="k-label">Total Open</div>
            <div className="k-val">{escalations.length}</div>
            <div className="k-foot">across all tenants</div>
          </div>
        </div>

        <div className="psb-panel">
          <div className="psb-panel-h">
            <h2>Open items</h2>
          </div>

          {escalations.length === 0 ? (
            <div style={{ padding: "1.5rem 0", textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>✓</div>
              <p className="muted">All clear — nothing needs your attention right now.</p>
            </div>
          ) : (
            escalations.map((e) => {
              const meta = SEVERITY_META[e.severity];
              return (
                <div className="psb-deadline" key={e.id} style={{ alignItems: "flex-start" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 9, height: 9, borderRadius: "50%",
                      background: meta.dot, flexShrink: 0, marginTop: 6,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="psb-dl-title">{e.title}</div>
                    <div className="psb-dl-meta">{e.detail}</div>
                    <div className="psb-act-meta psb-mono" style={{ marginTop: 4 }}>
                      <span className={`psb-stat ${meta.stat}`}>{meta.label}</span>
                      {"  ·  "}{e.source}
                    </div>
                  </div>
                  <Link href={e.href} className="button-secondary compact" style={{ flexShrink: 0 }}>
                    Resolve →
                  </Link>
                </div>
              );
            })
          )}
        </div>

        <p className="muted" style={{ fontSize: 12 }}>
          Escalations are derived live from platform state — suspended organizations,
          content awaiting moderation, and failing readiness checks. Resolving the
          underlying item clears it from this inbox automatically.
        </p>
      </div>
    </AppShell>
  );
}
