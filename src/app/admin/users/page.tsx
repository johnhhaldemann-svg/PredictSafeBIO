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
  { value: "patient", label: "Patient" },
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
          <p className="section-label">Admin</p>
          <h1>User Management</h1>
          <p className="muted">
            {total} user{total !== 1 ? "s" : ""} on the platform. Click any row to view or edit.
          </p>
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
        <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div className="panel-heading" style={{ padding: "1rem 1.25rem 0.75rem" }}>
            <div>
              <p className="section-label">Users</p>
              <h2>
                <Users size={16} style={{ display: "inline", marginRight: 6 }} />
                {total} total
              </h2>
            </div>
            <ShieldCheck size={20} />
          </div>

          {users.length === 0 ? (
            <p className="muted" style={{ padding: "1.5rem" }}>No users match your filters.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "0.6rem 1rem", fontWeight: 600, color: "var(--muted)" }}>Name</th>
                    <th style={{ padding: "0.6rem 1rem", fontWeight: 600, color: "var(--muted)" }}>Email</th>
                    <th style={{ padding: "0.6rem 1rem", fontWeight: 600, color: "var(--muted)" }}>Role</th>
                    <th style={{ padding: "0.6rem 1rem", fontWeight: 600, color: "var(--muted)" }}>Status</th>
                    <th style={{ padding: "0.6rem 1rem", fontWeight: 600, color: "var(--muted)" }}>Organization</th>
                    <th style={{ padding: "0.6rem 1rem", fontWeight: 600, color: "var(--muted)" }}>Joined</th>
                    <th style={{ padding: "0.6rem 1rem", fontWeight: 600, color: "var(--muted)" }}>Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-link"
                          style={{ fontWeight: 500 }}
                        >
                          {u.full_name ?? "—"}
                        </Link>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "var(--muted)" }}>{u.email ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span className={`role-chip ${getRoleBadgeClass(u.role)}`} style={{ fontSize: "0.75rem" }}>
                          {getDbRoleLabel(u.role)}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span className={`status-chip ${statusBadgeClass(u.account_status)}`} style={{ fontSize: "0.75rem" }}>
                          {u.account_status}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "var(--muted)" }}>
                        {u.organization_name ?? <em>No org</em>}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleDateString()
                          : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
              {page > 1 && (
                <Link
                  className="button-secondary"
                  href={`/admin/users?search=${encodeURIComponent(search)}&role=${role}&status=${status}&page=${page - 1}`}
                >
                  ← Previous
                </Link>
              )}
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  className="button-secondary"
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
