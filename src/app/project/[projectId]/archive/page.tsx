export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Project → Archive — /project/[projectId]/archive
 * Read-only view of closed records and retained compliance history for this project.
 * Write access is blocked at the RLS level (no DELETE policy on archive_records).
 */
type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectArchivePage({ params }: Props) {
  const { projectId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: records } = await supabase
    .from("archive_records")
    .select("id, record_type, title, archived_at, retention_until")
    .eq("project_id", projectId)
    .order("archived_at", { ascending: false });

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Project · Archive</p>
            <h1>Archive</h1>
            <p className="muted">Read-only closed records and compliance history. No edits or deletes permitted.</p>
          </div>
          <Link className="button-secondary" href={`/project/${projectId}/dashboard`}>← Dashboard</Link>
        </header>

        {!records?.length ? (
          <section className="panel">
            <p className="muted">No archived records for this project.</p>
          </section>
        ) : (
          <section className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Archived</th>
                  <th>Retain Until</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td className="capitalize">{r.record_type}</td>
                    <td className="muted">{new Date(r.archived_at).toLocaleDateString()}</td>
                    <td className="muted">{r.retention_until ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </AppShell>
  );
}
