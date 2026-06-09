export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Developer → Logs
 * Recent audit_events across all orgs. Developer role only.
 * This page is for internal technical use — not for client-facing work.
 */
export default async function DeveloperLogsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["owner", "developer"].includes(profile?.role ?? "")) redirect("/");

  const { data: events } = await supabase
    .from("audit_events")
    .select("id, event_type, summary, actor_id, environment, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Developer Tools</p>
            <h1>Audit Log</h1>
            <p className="muted">Last 100 platform events. Developer / owner access only.</p>
          </div>
          <Link className="button-secondary" href="/workbench">← Workbench</Link>
        </header>

        <section className="table-panel">
          {!events?.length ? (
            <p className="muted">No events logged yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Summary</th>
                  <th>Env</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="muted"><code>{new Date(e.created_at).toISOString()}</code></td>
                    <td><code>{e.event_type}</code></td>
                    <td>{e.summary}</td>
                    <td className="muted">{e.environment ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
