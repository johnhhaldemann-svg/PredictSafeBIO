export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldAlert, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { listManualOverrides } from "@/lib/supabase/billing-service";
import { isAdminOrAbove } from "@/lib/role-permissions";
import { createOverrideAction, revokeOverrideAction } from "../actions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * /admin/billing/overrides — Grant free trials, discounts, extensions.
 */

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

const OVERRIDE_LABELS: Record<string, string> = {
  free_trial:     "Free Trial (days)",
  discount_pct:   "Discount (%)",
  extension_days: "Extension (days)",
  plan_upgrade:   "Force Plan Upgrade",
  plan_downgrade: "Force Plan Downgrade",
};

export default async function BillingOverridesPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, organization_id").eq("id", user.id).single();

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!isAdminOrAbove(access)) redirect("/");

  const sp = await searchParams;

  const [overrides, orgsRaw] = await Promise.all([
    listManualOverrides(),
     
    (getSupabaseAdminClient() as any).from("organizations").select("id, name").order("name"),
  ]);

   
  const orgs = ((orgsRaw.data ?? []) as any[]).map((o: any) => ({ id: o.id as string, name: o.name as string }));

  return (
    <AppShell>
      <div className="page-stack">
        <Link href="/admin/billing" className="text-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
          <ArrowLeft size={14} /> Back to Billing
        </Link>

        <header className="page-header">
          <p className="section-label">Admin › Billing</p>
          <h1>Manual Overrides</h1>
          <p className="muted">Grant free trials, apply discounts, extend subscriptions, or force plan changes.</p>
        </header>

        {sp.success && (
          <div className="verification-pass-box"><CheckCircle2 size={15} /><span>{decodeURIComponent(sp.success)}</span></div>
        )}
        {sp.error && (
          <div className="verification-fail-box"><ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span></div>
        )}

        {/* Create override form */}
        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">New override</p><h2>Grant a billing override</h2></div>
            <Zap size={20} />
          </div>
          <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
            Overrides are logged to the audit trail. All changes are reversible.
          </p>
          <form action={createOverrideAction} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1.5rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
              Organization
              <select name="organization_id" required>
                <option value="">Select organization…</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
              Override type
              <select name="override_type" required>
                {Object.entries(OVERRIDE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
              Value
              <input
                name="value"
                required
                placeholder="e.g. 30 for 30 days, or 'pro' for plan upgrade"
                style={{ width: "100%" }}
              />
              <span className="muted" style={{ fontSize: "0.75rem" }}>
                free_trial/extension_days = number · discount_pct = 0-100 · plan_upgrade/downgrade = tier name
              </span>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
              Expires at (optional)
              <input name="expires_at" type="datetime-local" style={{ width: "100%" }} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem", gridColumn: "1 / -1" }}>
              Reason <span style={{ color: "var(--error, #dc2626)" }}>*</span>
              <textarea name="reason" required rows={2} placeholder="e.g. Customer success team approved 30-day free trial for enterprise prospect." style={{ width: "100%" }} />
            </label>

            <div style={{ gridColumn: "1 / -1" }}>
              <button className="button-primary" type="submit">Create override</button>
            </div>
          </form>
        </section>

        {/* Active overrides */}
        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Active overrides</p><h2>{overrides.filter(o => o.is_active).length} active</h2></div>
          </div>
          {overrides.length === 0 ? (
            <p className="muted">No overrides yet.</p>
          ) : (
            <div className="action-list">
              {overrides.map(o => (
                <article className="action-row" key={o.id}>
                  <div>
                    <span className={`status-chip ${o.is_active ? "status-current" : "status-unknown"}`} style={{ fontSize: "0.72rem" }}>
                      {o.is_active ? "Active" : "Revoked"}
                    </span>
                    <strong>{OVERRIDE_LABELS[o.override_type] ?? o.override_type}</strong>
                    <span className="muted" style={{ fontSize: "0.82rem" }}>= {o.value}</span>
                  </div>
                  <p style={{ fontSize: "0.83rem" }}>
                    <strong>{o.organization_name ?? "—"}</strong>
                    {" · by "}{o.creator_name ?? "Unknown"}
                    {" · "}{new Date(o.created_at).toLocaleDateString()}
                    {o.expires_at ? " · expires " + new Date(o.expires_at).toLocaleDateString() : ""}
                  </p>
                  <p className="muted" style={{ fontSize: "0.82rem", fontStyle: "italic" }}>{o.reason}</p>
                  {o.is_active && (
                    <form action={revokeOverrideAction} style={{ marginTop: 6 }}>
                      <input type="hidden" name="overrideId" value={o.id} />
                      <button className="button-secondary" type="submit" style={{ fontSize: "0.8rem", padding: "0.25rem 0.75rem", color: "var(--error, #dc2626)" }}>
                        Revoke
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
