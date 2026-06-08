export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Users, Activity, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlatformConfigError } from "@/components/PlatformConfigError";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import { createServerClient } from "@/lib/supabase/server";

/**
 * /admin/organizations — Superadmin org list
 * Gated to superadmin role only.
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

  if (profile?.role !== "superadmin") redirect("/workbench");

  if (!isSupabaseServiceConfigured()) return <PlatformConfigError feature="Organizations" />;

  const admin = getSupabaseAdminClient();

  const [{ data: orgs }, { data: memberCounts }] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, status, environment, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("organization_id")
      .not("organization_id", "is", null),
  ]);

  const countMap = new Map<string, number>();
  for (const row of memberCounts ?? []) {
    if (row.organization_id) {
      countMap.set(row.organization_id, (countMap.get(row.organization_id) ?? 0) + 1);
    }
  }

  const orgList = orgs ?? [];
  const activeOrgs = orgList.filter((o) => !o.status || o.status === "active").length;
  const suspendedOrgs = orgList.filter((o) => o.status === "suspended").length;
  const totalMembers = memberCounts?.length ?? 0;

  function statusClass(status: string | null) {
    if (!status || status === "active") return "status-current";
    if (status === "suspended") return "status-overdue";
    return "status-needs-review";
  }

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Platform Admin</p>
            <h1>Organizations</h1>
            <p className="muted">All tenant organizations on the platform. Click a row to manage users, plan, and settings.</p>
          </div>
          <Link className="button-primary" href="/admin/org/new">
            <Plus size={15} />
            New org
          </Link>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Organization summary">
          <article className="command-card platform-blue">
            <div><span><Building2 size={16} /></span><strong>Total orgs</strong></div>
            <small>{orgList.length}</small>
            <em>All organizations on the platform.</em>
          </article>
          <article className={`command-card ${suspendedOrgs === 0 ? "platform-green" : "platform-red"}`}>
            <div><span><Activity size={16} /></span><strong>Active</strong></div>
            <small>{activeOrgs}</small>
            <em>{suspendedOrgs > 0 ? `${suspendedOrgs} suspended` : "All organizations active."}</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><Users size={16} /></span><strong>Total members</strong></div>
            <small>{totalMembers}</small>
            <em>Users with a linked organization.</em>
          </article>
        </section>

        {/* Org table */}
        <section className="table-panel">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Status</th>
                <th>Environment</th>
                <th>Members</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orgList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty-cell">No organizations found.</td>
                </tr>
              ) : (
                orgList.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <Link href={`/admin/org/${org.id}`} className="text-link">
                        <strong>{org.name}</strong>
                      </Link>
                      <br />
                      <code className="muted">{org.id.slice(0, 8)}…</code>
                    </td>
                    <td>
                      <span className={statusClass(org.status)}>
                        {(org.status ?? "active")[0].toUpperCase() + (org.status ?? "active").slice(1)}
                      </span>
                    </td>
                    <td>{((org.environment ?? "production")[0].toUpperCase() + (org.environment ?? "production").slice(1))}</td>
                    <td>{countMap.get(org.id) ?? 0}</td>
                    <td className="muted">{new Date(org.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/admin/org/${org.id}`} className="button-secondary compact">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
