export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
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
    { label: "APP_ENV",                               value: process.env.APP_ENV,                                                  required: true },
    { label: "NEXT_PUBLIC_APP_URL",                   value: process.env.NEXT_PUBLIC_APP_URL,                                      required: true },
    { label: "NEXT_PUBLIC_SUPABASE_URL",              value: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "",                    required: true },
    { label: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",  value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "set" : "",        required: true },
    { label: "SUPABASE_SERVICE_ROLE_KEY",             value: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set (hidden)" : "",          required: true },
    { label: "STORAGE_BUCKET_DOCUMENTS",              value: process.env.STORAGE_BUCKET_DOCUMENTS,                                 required: false },
    { label: "AUDIT_LOG_ENABLED",                     value: process.env.AUDIT_LOG_ENABLED ?? "(default: true)",                   required: false },
    { label: "NEXT_PUBLIC_FEATURE_DEMO_MODE",         value: process.env.NEXT_PUBLIC_FEATURE_DEMO_MODE ?? "false",                 required: false },
    { label: "NEXT_PUBLIC_FEATURE_RISK_CELLS",        value: process.env.NEXT_PUBLIC_FEATURE_RISK_CELLS ?? "false",                required: false },
    { label: "PLATFORM_ADMIN_KEY",                    value: process.env.PLATFORM_ADMIN_KEY ? "set (hidden)" : "not set",          required: false },
  ];

  const supabaseOk = isSupabaseConfigured();

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Developer Tools</p>
            <h1>Environment Status</h1>
            <p className="muted">Deployment tier and required configuration. Developer / owner access only.</p>
          </div>
          <Link className="button-secondary" href="/workbench">← Workbench</Link>
        </header>

        <div className={supabaseOk ? "ai-context-bar ai-context-bar--success" : "ai-context-bar ai-context-bar--danger"}>
          {supabaseOk
            ? <><CheckCircle2 size={15} /><span><strong>Supabase:</strong> configured</span></>
            : <><AlertTriangle size={15} /><span><strong>Supabase:</strong> missing NEXT_PUBLIC_SUPABASE_URL or key</span></>}
        </div>

        <section className="table-panel">
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Value</th>
                <th>Required</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => {
                const missing = c.required && !c.value;
                return (
                  <tr key={c.label}>
                    <td><code>{c.label}</code></td>
                    <td>
                      {c.value
                        ? <span>{c.value}</span>
                        : <span className="status-chip status-critical">not set</span>}
                    </td>
                    <td>
                      {c.required
                        ? (missing
                          ? <span className="status-chip status-critical">Required</span>
                          : <span className="status-chip status-current">✓</span>)
                        : <span className="muted">Optional</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
