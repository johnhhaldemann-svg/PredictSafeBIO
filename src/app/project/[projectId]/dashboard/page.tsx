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
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-gray-400 capitalize">
            {project.environment} · {project.status}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROJECT_MODULES.map((m) => (
            <a
              key={m.href}
              href={`/project/${projectId}/${m.href}`}
              className="rounded-lg border px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-sm mb-1">{m.label}</p>
              <p className="text-xs text-gray-400">{m.description}</p>
            </a>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
