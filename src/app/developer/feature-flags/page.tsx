export const dynamic = "force-dynamic";

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
    { name: "LLM Draft Assist",  envVar: "NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST", value: featureFlags.llmDraftAssist },
    { name: "Risk Cells (AMAYA)", envVar: "NEXT_PUBLIC_FEATURE_RISK_CELLS",      value: featureFlags.riskCells },
    { name: "Demo Mode",          envVar: "NEXT_PUBLIC_FEATURE_DEMO_MODE",        value: featureFlags.demoMode },
    { name: "Audit Log",          envVar: "AUDIT_LOG_ENABLED",                    value: isAuditLogEnabled() },
  ];

  const appEnv = process.env.APP_ENV ?? "not set";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Feature Flags</h1>
        <p className="text-sm text-gray-500 mb-1">
          Live flag state for this deployment. Set env vars to change.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          APP_ENV: <span className="font-mono font-medium">{appEnv}</span>
        </p>

        <div className="space-y-2">
          {flags.map((f) => (
            <div
              key={f.envVar}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div>
                <p className="font-medium text-sm">{f.name}</p>
                <p className="text-xs text-gray-400 font-mono">{f.envVar}</p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  f.value
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {f.value ? "ON" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
