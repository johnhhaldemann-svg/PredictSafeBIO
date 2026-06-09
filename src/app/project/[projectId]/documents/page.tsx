export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { formatDocumentStatus, formatDocumentType } from "@/lib/display-labels";

/**
 * Project → Documents — /project/[projectId]/documents
 * Shows documents belonging to this project (project_id match) plus
 * org-level documents (project_id = NULL) that apply to all projects.
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

  // Fetch project-scoped docs AND org-level docs (project_id IS NULL)
  const { data: docs } = await supabase
    .from("document_metadata")
    .select("id, title, document_type, status, revision, updated_at, project_id")
    .eq("organization_id", project.organization_id)
    .is("deleted_at", null)
    .or(`project_id.eq.${projectId},project_id.is.null`)
    .order("updated_at", { ascending: false })
    .limit(100);

  const projectDocs = (docs ?? []).filter((d) => d.project_id === projectId);
  const orgDocs     = (docs ?? []).filter((d) => d.project_id === null);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">
              Project · <Link href={`/project/${projectId}/dashboard`}>{project.name}</Link> / Documents
            </p>
            <h1>Documents</h1>
          </div>
          <Link href="/documents" className="button-primary btn-with-icon">
            <FileText size={14} /> Manage all documents
          </Link>
        </header>

        {/* Project-scoped documents */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Project documents</p>
              <h2>{projectDocs.length} document{projectDocs.length !== 1 ? "s" : ""} for {project.name}</h2>
            </div>
          </div>
          {projectDocs.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No project-specific documents yet</p>
              <p className="muted">
                Documents linked to this project will appear here.{" "}
                <Link href="/documents" className="text-link">Create one in Documents →</Link>
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="role-matrix-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Rev</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {projectDocs.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/documents/${d.id}`} className="text-link">{d.title}</Link>
                      </td>
                      <td>{formatDocumentType(d.document_type)}</td>
                      <td>{formatDocumentStatus(d.status)}</td>
                      <td>{d.revision ?? "—"}</td>
                      <td className="muted">
                        {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Org-level documents */}
        {orgDocs.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Organization documents</p>
                <h2>{orgDocs.length} org-level document{orgDocs.length !== 1 ? "s" : ""}</h2>
                <p className="muted">These apply across all projects in your organization.</p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="role-matrix-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Rev</th>
                  </tr>
                </thead>
                <tbody>
                  {orgDocs.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/documents/${d.id}`} className="text-link">{d.title}</Link>
                      </td>
                      <td>{formatDocumentType(d.document_type)}</td>
                      <td>{formatDocumentStatus(d.status)}</td>
                      <td>{d.revision ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
