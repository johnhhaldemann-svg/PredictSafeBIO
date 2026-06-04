export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/role-permissions";
import { PLATFORM_FEATURES } from "@/lib/role-permissions";
import { togglePlatformPermissionAction } from "./actions";

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function StaffPermissionsPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!isSuperAdmin(access)) redirect("/");

  const sp = await searchParams;
  const admin = getSupabaseAdminClient();

  // Load all platform_staff users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staffProfiles } = await (admin as any)
    .from("profiles")
    .select("id, full_name, organization_id")
    .eq("role", "platform_staff");

  const staffIds: string[] = (staffProfiles ?? []).map((p: { id: string }) => p.id);

  // Load all platform-scope grants
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: grants } = staffIds.length > 0
    ? await (admin as any)
        .from("feature_permission_grants")
        .select("user_id, feature, allowed")
        .eq("scope", "platform")
        .in("user_id", staffIds)
    : { data: [] };

  // Build a quick lookup: grantMap[userId][feature] = allowed
  const grantMap: Record<string, Record<string, boolean>> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const g of (grants ?? []) as any[]) {
    if (!grantMap[g.user_id]) grantMap[g.user_id] = {};
    grantMap[g.user_id][g.feature] = g.allowed;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const staffList = (staffProfiles ?? []) as any[];

  return (
    <AppShell>
      <div className="page-stack">
        <Link href="/admin/platform" className="text-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
          <ArrowLeft size={14} /> Back to Platform
        </Link>

        <header className="page-header">
          <p className="section-label">Admin › Platform</p>
          <h1>Platform Staff Permissions</h1>
          <p className="muted">
            Control which platform utilities each Platform Staff member can access.
            Super Admins always have full access and are not listed here.
          </p>
        </header>

        {sp.success && (
          <div className="verification-pass-box"><CheckCircle2 size={15} /><span>{decodeURIComponent(sp.success)}</span></div>
        )}
        {sp.error && (
          <div className="verification-fail-box"><ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span></div>
        )}

        {staffList.length === 0 ? (
          <section className="panel">
            <div className="panel-heading">
              <div><p className="section-label">No Platform Staff</p><h2>No staff accounts yet</h2></div>
              <Users size={22} />
            </div>
            <p className="muted">
              To add a platform staff member, go to{" "}
              <Link href="/admin/users" className="text-link">Admin → Users</Link> and change a user&apos;s role to <strong>Platform Staff</strong>.
            </p>
          </section>
        ) : (
          staffList.map(staff => {
            const userGrants = grantMap[staff.id] ?? {};
            return (
              <section className="panel" key={staff.id}>
                <div className="panel-heading">
                  <div>
                    <p className="section-label">Platform Staff</p>
                    <h2>{staff.full_name ?? staff.id}</h2>
                  </div>
                  <span className="status-chip status-needs-review" style={{ fontSize: "0.75rem" }}>Platform Staff</span>
                </div>

                <p className="muted" style={{ marginBottom: "1rem" }}>
                  Toggle which platform utilities this person can access. Unchecked features will show as restricted.
                </p>

                <div style={{ display: "grid", gap: "0.6rem" }}>
                  {PLATFORM_FEATURES.map(feature => {
                    const isAllowed = userGrants[feature.key] ?? false;
                    return (
                      <form key={feature.key} action={togglePlatformPermissionAction}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderRadius: 8, border: "1px solid var(--border)", background: isAllowed ? "var(--success-bg, #f0fdf4)" : "var(--surface)" }}>
                        <input type="hidden" name="userId" value={staff.id} />
                        <input type="hidden" name="feature" value={feature.key} />
                        <input type="hidden" name="allowed" value={isAllowed ? "false" : "true"} />
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{feature.label}</p>
                          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>{feature.description}</p>
                        </div>
                        <button
                          type="submit"
                          className={isAllowed ? "button-secondary" : "button-primary"}
                          style={{ minWidth: 90, fontSize: "0.82rem" }}
                        >
                          {isAllowed ? "✓ Enabled" : "Enable"}
                        </button>
                      </form>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
