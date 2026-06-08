export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { featureFlags, isAuditLogEnabled } from "@/lib/feature-flags";

/**
 * Developer → Feature Flags
 * Shows the live state of all feature flags for this deployment.
 * Developer / owner access only.
 */
export default async function DeveloperFeatureFlagsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["owner", "developer"].includes(profile?.role ?? "")) redirect("/");

  const flags = [
    { name: "LLM Draft Assist",   envVar: "NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST", value: featureFlags.llmDraftAssist },
    { name: "Risk Cells (AMAYA)", envVar: "NEXT_PUBLIC_FEATURE_RISK_CELLS",       value: featureFlags.riskCells },
    { name: "Demo Mode",          envVar: "NEXT_PUBLIC_FEATURE_DEMO_MODE",         value: featureFlags.demoMode },
    { name: "Audit Log",          envVar: "AUDIT_LOG_ENABLED",                     value: isAuditLogEnabled() },
  ];

  const appEnv = process.env.APP_ENV ?? "not set";

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Developer Tools</p>
            <h1>Feature Flags</h1>
            <p className="muted">
              Live flag state for this deployment. Set env vars to change.{" "}
              APP_ENV: <code>{appEnv}</code>
            </p>
          </div>
          <Link className="button-secondary" href="/workbench">← Workbench</Link>
        </header>

        <section className="panel">
          <div className="action-list">
            {flags.map((f) => (
              <article className="action-row" key={f.envVar}>
                <div>
                  <strong>{f.name}</strong>
                  <code className="muted">{f.envVar}</code>
                </div>
                <span className={`status-chip ${f.value ? "status-current" : "status-unknown"}`}>
                  {f.value ? "ON" : "OFF"}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
