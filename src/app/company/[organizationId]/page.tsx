export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
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
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          <p className="text-sm text-gray-400 capitalize">
            {org.environment} · {org.status}
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Projects</h2>
          {!projects?.length ? (
            <p className="text-sm text-gray-400">No active projects. Create one to get started.</p>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <a
                  key={p.id}
                  href={`/project/${p.id}/dashboard`}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-gray-50"
                >
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className="text-xs text-gray-400 capitalize">{p.status}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {isAdminRole(profile?.role) && (
          <div className="flex gap-3">
            <a href={`/company/${organizationId}/users`} className="text-sm text-blue-600 hover:underline">
              Manage Users
            </a>
            <a href={`/company/${organizationId}/settings`} className="text-sm text-blue-600 hover:underline">
              Settings
            </a>
          </div>
        )}
      </div>
    </AppShell>
  );
}
