export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/role-permissions";

/**
 * Company Dashboard — /company/[organizationId]
 * Organization-scoped view: users, projects, and settings for a specific company.
 * Accessible to company_admin and above for that organization.
 */
type Props = { params: Promise<{ organizationId: string }> };

export default async function CompanyDashboardPage({ params }: Props) {
  const { organizationId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  // Must belong to this org or be a platform owner
  const isOwner = profile?.role === "owner";
  const isOrgMember = profile?.organization_id === organizationId;
  if (!isOwner && !isOrgMember) redirect("/");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, status, environment")
    .eq("id", organizationId)
    .single();

  if (!org) redirect("/");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, environment, created_at")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Organization</p>
            <h1>{org.name}</h1>
            <p className="muted">
              {org.environment[0].toUpperCase() + org.environment.slice(1)} · {org.status}
            </p>
          </div>
          <Building2 size={20} className="muted" />
        </header>

        <section className="table-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Projects</p>
              <h2>{projects?.length ?? 0} project{projects?.length !== 1 ? "s" : ""}</h2>
            </div>
          </div>
          {!projects?.length ? (
            <p className="muted">No active projects. Create one to get started.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Environment</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <a href={`/project/${p.id}/dashboard`} className="text-link">{p.name}</a>
                    </td>
                    <td className="muted">{p.status}</td>
                    <td className="muted">{p.environment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {isAdminRole(profile?.role) && (
          <div className="command-center-link-strip">
            <a href={`/company/${organizationId}/users`} className="button-secondary">Manage Users</a>
            <a href={`/company/${organizationId}/settings`} className="button-secondary">Settings</a>
          </div>
        )}
      </div>
    </AppShell>
  );
}
