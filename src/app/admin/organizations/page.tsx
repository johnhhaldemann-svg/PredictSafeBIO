export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/role-permissions";

/**
 * Admin → Organizations
 * Platform-owner view of all client organizations.
 * Accessible only to users with role = "owner" or "company_admin".
 */
export default async function AdminOrganizationsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) redirect("/");

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, status, environment, created_at")
    .order("created_at", { ascending: false });

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Organizations</h1>
        <p className="text-sm text-gray-500 mb-6">
          All client organizations on the platform. Visible to platform owners only.
        </p>

        {!organizations?.length ? (
          <p className="text-sm text-gray-400">No organizations found.</p>
        ) : (
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Environment</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{org.name}</td>
                  <td className="px-4 py-3 capitalize">{org.status ?? "active"}</td>
                  <td className="px-4 py-3 capitalize">{org.environment ?? "production"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(org.created_at).toLocaleDateString()}
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
