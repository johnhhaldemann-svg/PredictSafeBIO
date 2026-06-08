export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { listAdminUsers } from "@/lib/supabase/user-admin-service";
import { canViewPlatform, getDbRoleLabel, getRoleBadgeClass } from "@/lib/role-permissions";

/**
 * /admin/users — User Management
 *
 * Searchable, filterable table of every user on the platform.
 * Gated: admin tier and above only.
 * Superadmins see all orgs; admins see their own org only.
 */

type Props = {
  searchParams: Promise<{
    search?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
};

const ROLES = [
  { value: "", label: "All roles" },
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
  { value: "provider", label: "Provider" },
  { value: "member", label: "Member" },
];

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending" },
];

function statusBadgeClass(status: string) {
  if (status === "active") return "status-current";
  if (status === "suspended") return "status-critical";
  return "status-unknown";
}

export default async function AdminUsersPage({ searchParams }: Props) {
  // Auth gate
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const access = {
    signedIn: true,
    userId: user.id,
    organizationId: profile?.organization_id,
    role: profile?.role,
  };

  if (!canViewPlatform(access)) redirect("/");

  const params = await searchParams;
  const search = params.search ?? "";
  const role = params.role ?? "";
  const status = params.status ?? "";
  const page = Number(params.page ?? "1");

  const { users, total } = await listAdminUsers({ search, role, status, page, pageSize: 50 });
  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Platform Admin</p>
            <h1>User Management</h1>
            <p className="muted">
              {total} user{total !== 1 ? "s" : ""} on the platform. Click any row to view or edit.
            </p>
          </div>
          <ShieldCheck size={20} className="muted" />
        </header>

        {/* Search + filter form */}
        <section className="panel">
          <form className="audit-filter-form" method="GET">
            <label>
              <Search size={14} />
              Search
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Name or email…"
                autoComplete="off"
              />
            </label>
            <label>
              Role
              <select name="role" defaultValue={role}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" defaultValue={status}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            <button className="button-secondary" type="submit">Apply</button>
            <Link className="button-secondary" href="/admin/users">Clear</Link>
          </form>
        </section>

        {/* User table */}
        <section className="table-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Users</p>
              <h2>
                <Users size={16} className="icon-mr" />
                {total} total
              </h2>
            </div>
          </div>

          {users.length === 0 ? (
            <p className="muted">No users match your filters.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Organization</th>
                  <th>Joined</th>
                  <th>Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/admin/users/${u.id}`} className="text-link">
                        {u.full_name ?? "—"}
                      </Link>
                    </td>
                    <td className="muted">{u.email ?? "—"}</td>
                    <td>
                      <span className={`role-chip ${getRoleBadgeClass(u.role)}`}>
                        {getDbRoleLabel(u.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-chip ${statusBadgeClass(u.account_status)}`}>
                        {u.account_status}
                      </span>
                    </td>
                    <td className="muted">{u.organization_name ?? <em>No org</em>}</td>
                    <td className="muted">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="muted">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleDateString()
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="command-center-link-strip">
              {page > 1 && (
                <Link
                  className="button-secondary compact"
                  href={`/admin/users?search=${encodeURIComponent(search)}&role=${role}&status=${status}&page=${page - 1}`}
                >
                  ← Previous
                </Link>
              )}
              <span className="muted">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link
                  className="button-secondary compact"
                  href={`/admin/users?search=${encodeURIComponent(search)}&role=${role}&status=${status}&page=${page + 1}`}
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
