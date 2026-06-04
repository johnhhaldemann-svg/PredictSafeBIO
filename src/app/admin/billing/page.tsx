export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, CreditCard, DollarSign, Settings, TrendingUp, Users, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import {
  getRevenueSummary,
  listSubscriptions,
  listBillingEvents,
} from "@/lib/supabase/billing-service";
import { isAdminOrAbove } from "@/lib/role-permissions";

const STATUS_CLASS: Record<string, string> = {
  active:     "status-current",
  trialing:   "status-needs-review",
  past_due:   "status-critical",
  canceled:   "status-missing",
  unpaid:     "status-critical",
  paused:     "status-unknown",
  incomplete: "status-unknown",
};

function formatCents(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export default async function BillingPage() {
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
  if (!isAdminOrAbove(access)) redirect("/");

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  const [summary, subscriptions, events] = await Promise.all([
    getRevenueSummary(),
    listSubscriptions(),
    listBillingEvents(undefined, 20),
  ]);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Admin</p>
          <h1>Billing &amp; Subscriptions</h1>
          <p className="muted">Revenue overview, subscription management, and manual overrides.</p>
        </header>

        {!stripeConfigured && (
          <div className="verification-pending-box">
            <Zap size={15} />
            <span>
              <strong>Stripe not connected.</strong> Add <code>STRIPE_SECRET_KEY</code>,{" "}
              <code>STRIPE_WEBHOOK_SECRET</code>, and{" "}
              <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to your Vercel environment
              variables, then add Stripe Price IDs to each plan. Payments go live automatically.
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href="/admin/billing/plans" className="button-secondary" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
            <Settings size={14} /> Manage Plans
          </Link>
          <Link href="/admin/billing/overrides" className="button-secondary" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
            <Zap size={14} /> Manual Overrides
          </Link>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Revenue</p><h2>Monthly overview</h2></div>
            <TrendingUp size={20} />
          </div>
          <div className="command-card-grid">
            {[
              { label: "MRR",           value: formatCents(summary.mrr_cents),         sub: "Monthly recurring revenue",    color: "#16a34a", Icon: DollarSign },
              { label: "ARR",           value: formatCents(summary.arr_cents),         sub: "Annual run rate (MRR x 12)",   color: "#2563eb", Icon: TrendingUp },
              { label: "Revenue (30d)", value: formatCents(summary.revenue_30d_cents), sub: "Actual payments last 30 days", color: "#7c3aed", Icon: Activity },
              { label: "Churn rate",    value: summary.churn_rate_pct + "%",           sub: "Canceled this month",          color: "#dc2626", Icon: Users },
            ].map(({ label, value, sub, color, Icon }) => (
              <article key={label} className="command-card" style={{ borderTop: "3px solid " + color }}>
                <div><Icon size={14} style={{ color }} /><strong>{label}</strong></div>
                <small style={{ fontSize: "1.4rem", fontWeight: 700 }}>{value}</small>
                <em style={{ fontSize: "0.78rem" }}>{sub}</em>
              </article>
            ))}
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <p className="section-label" style={{ marginBottom: "0.4rem" }}>Active subscriptions by tier</p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {(["small_lab", "growth", "enterprise", "strategic"] as const).map(tier => {
                const d = summary.by_tier[tier];
                return (
                  <div key={tier} style={{ padding: "0.75rem 1.25rem", borderRadius: 8, border: "1px solid var(--border)", minWidth: 110 }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>{{ small_lab: "Small Lab", growth: "Growth", enterprise: "Enterprise", strategic: "Strategic" }[tier]}</p>
                    <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0.25rem 0" }}>{d?.count ?? 0}</p>
                    <p className="muted" style={{ fontSize: "0.78rem", margin: 0 }}>{formatCents(d?.mrr_cents ?? 0)}/mo</p>
                  </div>
                );
              })}
              <div style={{ padding: "0.75rem 1.25rem", borderRadius: 8, border: "1px solid var(--border)", minWidth: 110 }}>
                <p style={{ fontWeight: 600, margin: 0 }}>Trialing</p>
                <p style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0.25rem 0" }}>{summary.trialing_subscriptions}</p>
                <p className="muted" style={{ fontSize: "0.78rem", margin: 0 }}>active trials</p>
              </div>
            </div>
          </div>
        </section>

        <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div className="panel-heading" style={{ padding: "1rem 1.25rem 0.75rem" }}>
            <div><p className="section-label">Subscriptions</p><h2>{subscriptions.length} total</h2></div>
            <CreditCard size={20} />
          </div>
          {subscriptions.length === 0 ? (
            <p className="muted" style={{ padding: "1.5rem" }}>No subscriptions yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Organization", "Plan", "Status", "MRR", "Period ends", "Last payment", "Stripe ID"].map(h => (
                      <th key={h} style={{ padding: "0.55rem 1rem", textAlign: "left", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(s => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.6rem 1rem", fontWeight: 500 }}>{s.organization_name ?? "—"}</td>
                      <td style={{ padding: "0.6rem 1rem", textTransform: "capitalize", fontWeight: 500 }}>{s.plan_tier}</td>
                      <td style={{ padding: "0.6rem 1rem" }}>
                        <span className={"status-chip " + (STATUS_CLASS[s.status] ?? "status-unknown")} style={{ fontSize: "0.72rem" }}>
                          {s.status}
                        </span>
                        {s.cancel_at_period_end && (
                          <span className="status-chip status-critical" style={{ fontSize: "0.68rem", marginLeft: 4 }}>cancels</span>
                        )}
                      </td>
                      <td style={{ padding: "0.6rem 1rem", fontWeight: 600 }}>{formatCents(s.price_cents)}</td>
                      <td style={{ padding: "0.6rem 1rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "0.6rem 1rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {s.last_payment_at ? new Date(s.last_payment_at).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--muted)" }}>
                        {s.stripe_subscription_id ? s.stripe_subscription_id.slice(0, 14) + "..." : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {events.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div><p className="section-label">Payment log</p><h2>Recent events</h2></div>
              <Activity size={20} />
            </div>
            <div className="timeline">
              {events.map(e => (
                <article className="timeline-row" key={e.id}>
                  <span>{new Date(e.created_at).toLocaleString()}</span>
                  <strong>{e.event_type.replace(/_/g, " ")}</strong>
                  <p>
                    {e.organization_name ?? "—"}
                    {e.amount_cents ? " · " + formatCents(e.amount_cents) + " " + (e.currency ?? "usd").toUpperCase() : ""}
                    {e.invoice_id ? " · " + e.invoice_id : ""}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
