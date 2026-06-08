export const dynamic = "force-dynamic";

/**
 * Superadmin Operations Console — /admin/superadmin
 *
 * Interactive platform control panel for superadmin operators:
 *   1. Platform ops & security checks — run on demand
 *   2. AI Engine diagnostics — smoke test, risk families, ad-hoc assessment
 *   3. Database visual — live record distribution map
 *   4. Engine memory explorer — risk model, families, guardrails, core rules
 *
 * Access: signed-in superadmin (session role). PLATFORM_ADMIN_KEY remains a
 * break-glass fallback (?key=…) for use before a superadmin profile exists.
 * Every check is gated server-side and recorded in the audit log.
 */

import { AppShell } from "@/components/AppShell";
import { SuperadminConsole } from "@/components/SuperadminConsole";
import { getAuthSummary } from "@/lib/supabase/account-service";
import { isSuperAdmin } from "@/lib/role-permissions";
import { getSuperadminData } from "@/lib/supabase/superadmin-service";

type Props = {
  searchParams: Promise<{ key?: string }>;
};

export default async function SuperadminPage({ searchParams }: Props) {
  const params = await searchParams;
  const auth = await getAuthSummary();

  const adminKey = process.env.PLATFORM_ADMIN_KEY;
  const keyMatches = Boolean(adminKey && params.key === adminKey);
  const authorized = isSuperAdmin(auth) || keyMatches;

  if (!authorized) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <div className="page-header-left">
              <p className="section-label">Superadmin</p>
              <h1>Access restricted</h1>
            </div>
          </header>
          <section className="panel">
            <p className="muted">
              This console is restricted to PredictSafeBIO superadmin operators. Sign in with a
              superadmin account to continue.
            </p>
            <p className="muted">
              Break-glass access (before a superadmin profile exists) requires the{" "}
              <code>PLATFORM_ADMIN_KEY</code> environment variable passed as{" "}
              <code>/admin/superadmin?key=…</code>.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  const data = await getSuperadminData();

  return (
    <AppShell>
      <SuperadminConsole
        initialPlatform={data.platform}
        initialAiEngine={data.aiEngine}
        initialDbStats={data.dbStats}
        fetchedAt={data.fetchedAt}
      />
    </AppShell>
  );
}
