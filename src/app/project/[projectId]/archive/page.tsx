export const dynamic = "force-dynamic";

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
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Archive</h1>
        <p className="text-sm text-gray-500 mb-6">
          Read-only closed records and compliance history. No edits or deletes permitted.
        </p>

        {!records?.length ? (
          <p className="text-sm text-gray-400">No archived records for this project.</p>
        ) : (
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Archived</th>
                <th className="px-4 py-3">Retain Until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 capitalize">{r.record_type}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(r.archived_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {r.retention_until ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
