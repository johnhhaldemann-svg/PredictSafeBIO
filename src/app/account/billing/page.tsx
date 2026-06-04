export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Lock, Mail, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminOrAbove } from "@/lib/role-permissions";
import { listPlans } from "@/lib/supabase/billing-service";

const TIER_HIGHLIGHT: Record<string, string> = {
  small_lab:  "#2563eb",
  growth:     "#16a34a",
  enterprise: "#7c3aed",
  strategic:  "#d97706",
};

function formatAnnual(cents: number): string {
  if (cents === 0) return "Contact Sales";
  const monthly = cents / 100;
  const annual = monthly * 12;
  return `$${monthly.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo · $${(annual).toLocaleString("en-US", { maximumFractionDigits: 0 })}/yr`;
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

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!isAdminOrAbove(access)) redirect("/");

  const plans = await listPlans();

  // Check if org has an active subscription
   
  const { data: sub } = await (supabase as any)
    .from("subscriptions")
    .select("plan_id, status, trial_end_at, subscription_plans(name, tier)")
    .eq("organization_id", profile?.organization_id ?? "")
    .in("status", ["active", "trialing"])
    .maybeSingle();

   
  const currentTier = (sub as any)?.subscription_plans?.tier ?? null;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Account</p>
          <h1>Billing &amp; Plan</h1>
          <p className="muted">Annual billing · Billed per organization/site · All plans include onboarding</p>
        </header>

        {/* No active subscription notice */}
        {!currentTier && (
          <div className="verification-pending-box">
            <Zap size={15} />
            <span>
              <strong>No active plan.</strong> Your workspace is running on demo access.
              Select a plan below or{" "}
              <a href="mailto:sales@predictsafebio.com" className="text-link">contact sales</a> to get started.
            </span>
          </div>
        )}

        {/* Current plan */}
        {currentTier && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Current Plan</p>
                { }
                <h2>{(sub as any)?.subscription_plans?.name}</h2>
              </div>
              <span className="status-chip status-current">Active</span>
            </div>
            <p className="muted">
              To upgrade, downgrade, or cancel, contact{" "}
              <a href="mailto:billing@predictsafebio.com" className="text-link">billing@predictsafebio.com</a>.
            </p>
          </section>
        )}

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
          {plans.map(plan => {
            const color = TIER_HIGHLIGHT[plan.tier] ?? "#6b7280";
            const isCurrent = plan.tier === currentTier;
            const isStrategic = plan.tier === "strategic";

            return (
              <article
                key={plan.tier}
                className="panel"
                style={{ borderTop: `3px solid ${color}`, display: "flex", flexDirection: "column", gap: "0.75rem" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p className="section-label" style={{ color }}>{plan.name}</p>
                    <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{formatAnnual(plan.price_cents)}</p>
                  </div>
                  {isCurrent && (
                    <span className="status-chip status-current" style={{ fontSize: "0.72rem" }}>Current</span>
                  )}
                </div>

                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.85rem" }}>
                      <CheckCircle2 size={13} style={{ color, flexShrink: 0, marginTop: 2 }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: "auto", paddingTop: "0.75rem" }}>
                  {isStrategic ? (
                    <a
                      href="mailto:sales@predictsafebio.com?subject=PredictSafeBIO Strategic Plan Inquiry"
                      className="button-primary"
                      style={{ display: "block", textAlign: "center", textDecoration: "none" }}
                    >
                      <Mail size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                      Contact Sales
                    </a>
                  ) : isCurrent ? (
                    <button className="button-secondary" disabled style={{ width: "100%", opacity: 0.6 }}>
                      Current Plan
                    </button>
                  ) : (
                    <a
                      href="mailto:sales@predictsafebio.com?subject=PredictSafeBIO Plan Upgrade Request"
                      className="button-primary"
                      style={{ display: "block", textAlign: "center", textDecoration: "none" }}
                    >
                      Get Started
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Notes */}
        <section className="panel" style={{ background: "var(--surface-alt, #f8fafc)" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <Lock size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--muted)" }} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>Annual billing · Secure invoicing</p>
              <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.83rem" }}>
                All plans are billed annually per organization or site. Invoicing is handled by PredictSafeBIO directly.
                To add sites, upgrade, or discuss a custom contract, email{" "}
                <a href="mailto:billing@predictsafebio.com" className="text-link">billing@predictsafebio.com</a>.
                Stripe self-service checkout is coming soon.
              </p>
            </div>
          </div>
        </section>

        <p className="muted" style={{ fontSize: "0.8rem", textAlign: "center" }}>
          Questions? <Link href="/account/team" className="text-link">Manage your team</Link> ·{" "}
          <a href="mailto:support@predictsafebio.com" className="text-link">Contact support</a>
        </p>
      </div>
    </AppShell>
  );
}
