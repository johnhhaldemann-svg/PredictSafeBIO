export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Project → Documents — /project/[projectId]/documents
 * Project-scoped document list. Delegates to the existing document_metadata table
 * filtered by project_id once project_id is wired to document_metadata.
 *
 * TODO: Add project_id column to document_metadata and filter here.
 */
type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectDocumentsPage({ params }: Props) {
  const { projectId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, organization_id")
    .eq("id", projectId)
    .single();

  if (!project) redirect("/");

  // Org-scoped documents for now; narrow to project_id when column is added.
  const { data: docs } = await supabase
    .from("document_metadata")
    .select("id, title, document_type, status, revision, updated_at")
    .eq("organization_id", project.organization_id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Documents</h1>
        <p className="text-sm text-gray-500 mb-6">
          Compliance documents for <span className="font-medium">{project.name}</span>.
        </p>

        {!docs?.length ? (
          <p className="text-sm text-gray-400">No documents yet. Upload or create one from the Documents module.</p>
        ) : (
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rev</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <a href={`/documents/${d.id}`} className="hover:underline">{d.title}</a>
                  </td>
                  <td className="px-4 py-3 capitalize">{d.document_type}</td>
                  <td className="px-4 py-3 capitalize">{d.status}</td>
                  <td className="px-4 py-3">{d.revision ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : "—"}
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
