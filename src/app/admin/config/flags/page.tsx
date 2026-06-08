export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Flag, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { canViewPlatform } from "@/lib/role-permissions";
import { listFeatureFlags } from "@/lib/supabase/feature-flag-service";
import { toggleFeatureFlagAction } from "../actions";

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  ai:      "AI & ML",
  hipaa:   "HIPAA / Compliance",
  billing: "Billing",
};

export default async function FeatureFlagsPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, organization_id").eq("id", user.id).single();

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!canViewPlatform(access)) redirect("/");

  const sp = await searchParams;
  const flags = await listFeatureFlags();

  // Group by category
  const byCategory: Record<string, typeof flags> = {};
  for (const f of flags) {
    if (!byCategory[f.category]) byCategory[f.category] = [];
    byCategory[f.category].push(f);
  }

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Admin › Config</p>
            <h1>Feature Flags</h1>
            <p className="muted">Toggle features on or off instantly — no redeploy needed. Changes are logged to the audit trail.</p>
          </div>
          <Link href="/admin/config" className="button-secondary">← Config</Link>
        </header>

        {sp.success && (
          <div className="verification-pass-box"><CheckCircle2 size={15} /><span>{decodeURIComponent(sp.success)}</span></div>
        )}
        {sp.error && (
          <div className="verification-fail-box"><ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span></div>
        )}

        {Object.entries(byCategory).map(([category, categoryFlags]) => (
          <section className="panel" key={category}>
            <div className="panel-heading">
              <div>
                <p className="section-label">Category</p>
                <h2>{CATEGORY_LABELS[category] ?? category}</h2>
              </div>
              <Flag size={18} />
            </div>

            <div className="action-list">
              {categoryFlags.map(flag => (
                <article key={flag.key} className="action-row">
                  <div className="panel-heading" style={{ padding: 0 }}>
                    <div>
                      <strong>{flag.label}</strong>
                      <p className="muted">{flag.description}</p>
                      <code className="muted">{flag.key}</code>
                    </div>

                    <div className="form-action-row">
                      <span className={`status-chip ${flag.enabled ? "status-current" : "status-unknown"}`}>
                        {flag.enabled ? "Enabled" : "Disabled"}
                      </span>

                      <form action={toggleFeatureFlagAction}>
                        <input type="hidden" name="key" value={flag.key} />
                        <input type="hidden" name="enabled" value={flag.enabled ? "false" : "true"} />
                        <button
                          className={flag.enabled ? "button-secondary" : "button-primary"}
                          type="submit"
                        >
                          {flag.enabled ? "Disable" : "Enable"}
                        </button>
                      </form>
                    </div>
                  </div>

                  {flag.updated_at && (
                    <p className="muted">
                      Last updated {new Date(flag.updated_at).toLocaleString()}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
