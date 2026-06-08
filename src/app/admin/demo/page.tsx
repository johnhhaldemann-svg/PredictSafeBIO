export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { seedDemoWorkspaceAction } from "@/app/admin/demo/actions";
import { getAuthSummary } from "@/lib/supabase/data";
import { canViewPlatform } from "@/lib/role-permissions";

export default async function AdminDemoPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const auth = await getAuthSummary();
  if (!canViewPlatform(auth)) redirect("/");
  const canSeedDemo = true;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Platform Admin</p>
            <h1>Admin Utilities</h1>
            <p className="muted">Developer tools — demo seeding and internal test utilities.</p>
          </div>
          <Link className="button-secondary" href="/admin/dashboard">← Command Center</Link>
        </header>
        {params.message ? <p className="form-message">{params.message}</p> : null}
        <section className="panel">
          <h2>Controlled demo seed</h2>
          <p className="muted">
            Creates one assessment, one document metadata record, draft recommendations, and audit events in the signed-in organization.
            This page does not expose destructive reset controls.
          </p>
          <p className="muted">
            Each run receives a short demo seed label so records can be traced across assessments, documents, and audit events.
          </p>
          {canSeedDemo ? (
            <form action={seedDemoWorkspaceAction} className="save-actions">
              <button className="button-primary" type="submit">
                Seed demo records
              </button>
            </form>
          ) : (
            <p className="form-message">
              Sign in as an organization owner to seed demo records.{" "}
              <Link href="/login?next=/admin/demo">Go to sign in</Link>
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Boundary</h2>
          <p className="muted">
            Seeded records are for demonstration purposes only. They do not establish validation, approval, release, or regulatory acceptance.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
