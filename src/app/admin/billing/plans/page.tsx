export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Settings, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { listPlans } from "@/lib/supabase/billing-service";
import { canViewPlatform } from "@/lib/role-permissions";
import { savePlanAction } from "../actions";

/**
 * /admin/billing/plans — Manage subscription plan tiers.
 * Superadmins can set prices, Stripe price IDs, and feature lists.
 */

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function BillingPlansPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, organization_id").eq("id", user.id).single();

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!canViewPlatform(access)) redirect("/");

  const sp = await searchParams;
  const plans = await listPlans(true); // include inactive

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Admin › Billing</p>
            <h1>Subscription Plans</h1>
            <p className="muted">Configure plan tiers, pricing, and Stripe Price IDs.</p>
          </div>
          <Link href="/admin/billing" className="button-secondary">← Billing</Link>
        </header>

        {sp.success && (
          <div className="verification-pass-box"><CheckCircle2 size={15} /><span>{decodeURIComponent(sp.success)}</span></div>
        )}
        {sp.error && (
          <div className="verification-fail-box"><ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span></div>
        )}

        <div className="verification-pending-box">
          <Settings size={14} />
          <span>
            To activate payments, set the <strong>Stripe Price ID</strong> for each paid plan (found in your Stripe Dashboard under Products). The Free tier never needs a Stripe Price ID.
          </span>
        </div>

        {plans.map(plan => (
          <section className="panel" key={plan.id}>
            <div className="panel-heading">
              <div>
                <p className="section-label">Plan</p>
                <h2 style={{ textTransform: "capitalize" }}>{plan.name}</h2>
              </div>
              <span className={`status-chip ${plan.is_active ? "status-current" : "status-missing"}`}>
                {plan.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <form action={savePlanAction} className="stacked-form">
              <input type="hidden" name="tier" value={plan.tier} />
              <div className="form-grid">
                <label>
                  Plan name
                  <input name="name" defaultValue={plan.name} required />
                </label>

                <label>
                  Monthly price (USD cents) — 4900 = $49.00
                  <input name="price_cents" type="number" min="0" defaultValue={plan.price_cents} required />
                </label>

                <label>
                  Stripe Price ID
                  <input
                    name="stripe_price_id"
                    defaultValue={plan.stripe_price_id ?? ""}
                    placeholder="price_xxx (leave blank for free tier)"
                    style={{ fontFamily: "monospace" }}
                  />
                </label>

                <label>
                  Max providers (blank = unlimited)
                  <input name="max_providers" type="number" min="1" defaultValue={plan.max_providers ?? ""} />
                </label>

                <label>
                  Max personnel records (blank = unlimited)
                  <input name="max_patients" type="number" min="1" defaultValue={plan.max_patients ?? ""} />
                </label>

                <div style={{ gridColumn: "1 / -1" }}>
                  <p className="muted">Current features: {plan.features.join(" · ")}</p>
                  <button className="button-primary" type="submit">Save plan</button>
                </div>
              </div>
            </form>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
