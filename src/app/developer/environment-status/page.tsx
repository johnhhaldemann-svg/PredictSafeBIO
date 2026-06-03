export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Developer → Environment Status
 * Quick health check: which environment tier is active, and are all required
 * env vars present. Developer / owner access only.
 */
export default async function DeveloperEnvironmentStatusPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["owner", "developer"].includes(profile?.role ?? "")) redirect("/");

  const checks = [
    { label: "APP_ENV",                      value: process.env.APP_ENV,                          required: true },
    { label: "NEXT_PUBLIC_APP_URL",           value: process.env.NEXT_PUBLIC_APP_URL,              required: true },
    { label: "NEXT_PUBLIC_SUPABASE_URL",      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "", required: true },
    { label: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "set" : "", required: true },
    { label: "SUPABASE_SERVICE_ROLE_KEY",     value: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set (hidden)" : "", required: true },
    { label: "STORAGE_BUCKET_DOCUMENTS",      value: process.env.STORAGE_BUCKET_DOCUMENTS,         required: false },
    { label: "AUDIT_LOG_ENABLED",             value: process.env.AUDIT_LOG_ENABLED ?? "(default: true)", required: false },
    { label: "NEXT_PUBLIC_FEATURE_DEMO_MODE", value: process.env.NEXT_PUBLIC_FEATURE_DEMO_MODE ?? "false", required: false },
    { label: "NEXT_PUBLIC_FEATURE_RISK_CELLS",value: process.env.NEXT_PUBLIC_FEATURE_RISK_CELLS ?? "false", required: false },
    { label: "PLATFORM_ADMIN_KEY",            value: process.env.PLATFORM_ADMIN_KEY ? "set (hidden)" : "not set", required: false },
  ];

  const supabaseOk = isSupabaseConfigured();

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Environment Status</h1>
        <p className="text-sm text-gray-500 mb-6">
          Deployment tier and required configuration. Developer / owner access only.
        </p>

        <div className={`rounded-lg border px-4 py-3 mb-6 ${supabaseOk ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <p className="text-sm font-medium">
            Supabase connection: {supabaseOk ? "✅ configured" : "❌ missing NEXT_PUBLIC_SUPABASE_URL or key"}
          </p>
        </div>

        <div className="space-y-2">
          {checks.map((c) => {
            const missing = c.required && !c.value;
            return (
              <div
                key={c.label}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${missing ? "border-red-200 bg-red-50" : ""}`}
              >
                <p className="font-mono text-xs text-gray-600">{c.label}</p>
                <p className="font-mono text-xs font-medium">{c.value || <span className="text-red-500">not set</span>}</p>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
