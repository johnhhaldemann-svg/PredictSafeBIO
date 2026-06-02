import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { seedDemoWorkspaceAction } from "@/app/admin/demo/actions";
import { getAuthSummary } from "@/lib/supabase/data";
import { canManageWorkspace } from "@/lib/role-permissions";

export default async function AdminDemoPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const auth = await getAuthSummary();
  const canSeedDemo = canManageWorkspace(auth);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">System Reliance</p>
          <h1>Admin Utilities</h1>
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
              Sign in as an organization owner and finish onboarding before seeding demo records.{" "}
              <Link href="/login?next=/admin/demo">Go to sign in</Link>
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Boundary</h2>
          <p className="muted">
            Seeded records are for MVP demo walkthroughs only. They do not establish validation, approval, release, or regulatory acceptance.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
