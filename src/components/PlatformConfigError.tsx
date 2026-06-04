import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";

/**
 * Rendered by /admin/* pages when the Supabase service-role environment is not
 * configured for the current deployment (e.g. SUPABASE_SERVICE_ROLE_KEY missing
 * on a Preview environment). Replaces an unhandled 500 / blank page with a clean,
 * actionable panel inside the normal app chrome.
 */
export function PlatformConfigError({ feature }: { feature: string }) {
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Platform Admin</p>
            <h1>{feature}</h1>
          </div>
        </header>
        <section className="panel access-banner access-readonly">
          <strong>
            <AlertTriangle size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Platform configuration error
          </strong>
          <span>
            This page needs the Supabase service-role environment to be configured. Set{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> for this
            deployment&rsquo;s environment (Production <em>and</em> Preview) in the Vercel project
            settings, then redeploy.
          </span>
        </section>
      </div>
    </AppShell>
  );
}
