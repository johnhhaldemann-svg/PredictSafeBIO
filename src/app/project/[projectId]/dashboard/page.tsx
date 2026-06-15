export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Project Dashboard — /project/[projectId]/dashboard
 * Module hub for a single project/jobsite.
 * Accessible to any project member or org admin.
 */
type Props = { params: Promise<{ projectId: string }> };

const PROJECT_MODULES = [
  { label: "Documents",         href: "documents",       description: "SOPs, forms, compliance docs" },
  { label: "Risk Cells",        href: "risk-cells",      description: "AMAYA precursor intelligence" },
  { label: "Archive",           href: "archive",         description: "Closed records & retention" },
];

export default async function ProjectDashboardPage({ params }: Props) {
  const { projectId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  // Verify the user is a member of this project's org (or a direct project member)
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status, environment, organization_id")
    .eq("id", projectId)
    .single();

  if (!project) redirect("/");

  const isOrgMember = profile?.organization_id === project.organization_id;
  const isPlatformOwner = profile?.role === "owner";
  if (!isOrgMember && !isPlatformOwner) redirect("/");

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Project · <span className="capitalize">{project.environment}</span></p>
            <h1>{project.name}</h1>
            <p className="muted capitalize">{project.status}</p>
          </div>
        </header>

        <div className="plan-grid" aria-label="Project modules">
          {PROJECT_MODULES.map((m, i) => (
            <a key={m.href} href={`/project/${projectId}/${m.href}`} className="plan-card">
              <div style={{ fontSize: 20, marginBottom: 6 }}>
                {i === 0 ? "📄" : i === 1 ? "⚡" : "📁"}
              </div>
              <strong>{m.label}</strong>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{m.description}</p>
            </a>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
