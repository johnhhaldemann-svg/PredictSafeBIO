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
  if (!user) redirect("/login?next=/account/billing");

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
          <div className="page-header-left">
            <p className="section-label">Account</p>
            <h1>Billing &amp; Plan</h1>
            <p className="muted">Annual billing · Billed per organization/site · All plans include onboarding</p>
          </div>
          <Link className="button-secondary" href="/account">Account Settings →</Link>
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
        <div className="command-card-grid">
          {plans.map(plan => {
            const color = TIER_HIGHLIGHT[plan.tier] ?? "#6b7280";
            const isCurrent = plan.tier === currentTier;
            const isStrategic = plan.tier === "strategic";

            return (
              <article
                key={plan.tier}
                className="panel billing-plan-card"
                style={{ borderTop: `3px solid ${color}` }}
              >
                <div className="billing-plan-header">
                  <div>
                    <p className="section-label" style={{ color }}>{plan.name}</p>
                    <p className="billing-plan-price">{formatAnnual(plan.price_cents)}</p>
                  </div>
                  {isCurrent && (
                    <span className="status-chip status-current">Current</span>
                  )}
                </div>

                <ul className="billing-features">
                  {plan.features.map((f, i) => (
                    <li key={i}>
                      <CheckCircle2 size={13} style={{ color }} className="feature-icon" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="billing-plan-action">
                  {isStrategic ? (
                    <a
                      href="mailto:sales@predictsafebio.com?subject=PredictSafeBIO Strategic Plan Inquiry"
                      className="button-primary"
                    >
                      <Mail size={14} className="icon-mr" />
                      Contact Sales
                    </a>
                  ) : isCurrent ? (
                    <button className="button-secondary" disabled style={{ opacity: 0.6 }}>
                      Current Plan
                    </button>
                  ) : (
                    <a
                      href="mailto:sales@predictsafebio.com?subject=PredictSafeBIO Plan Upgrade Request"
                      className="button-primary"
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
        <section className="panel">
          <div className="inline-icon-group">
            <Lock size={16} className="muted feature-icon" />
            <div>
              <p><strong>Annual billing · Secure invoicing</strong></p>
              <p className="muted">
                All plans are billed annually per organization or site. Invoicing is handled by PredictSafeBIO directly.
                To add sites, upgrade, or discuss a custom contract, email{" "}
                <a href="mailto:billing@predictsafebio.com" className="text-link">billing@predictsafebio.com</a>.
                Stripe self-service checkout is coming soon.
              </p>
            </div>
          </div>
        </section>

        <p className="muted" style={{ textAlign: "center" }}>
          Questions? <Link href="/account/team" className="text-link">Manage your team</Link> ·{" "}
          <a href="mailto:support@predictsafebio.com" className="text-link">Contact support</a>
        </p>
      </div>
    </AppShell>
  );
}
