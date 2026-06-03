export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, PlusCircle, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminOrAbove } from "@/lib/role-permissions";
import { getOrgUsage, usagePct } from "@/lib/supabase/plan-limits-service";
import { deactivateBioAction } from "./actions";

/**
 * /bios — Organization's patient bio list.
 * Visible to admins/owners. Shows all active bios with deactivate controls.
 */

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function BiosListPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bios");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!isAdminOrAbove(access)) redirect("/bios/new");

  const orgId = profile?.organization_id;
  if (!orgId) redirect("/onboarding");

  const sp = await searchParams;
  const admin = getSupabaseAdminClient();

  const [biosResult, usage] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("patient_bios")
      .select("id, display_name, date_of_birth_year, biological_sex, conditions, allergies, is_active, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    getOrgUsage(orgId),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allBios = ((biosResult.data ?? []) as any[]).map((b: any) => ({
    id:                b.id as string,
    display_name:      b.display_name as string,
    date_of_birth_year: b.date_of_birth_year as number | null,
    biological_sex:    b.biological_sex as string | null,
    conditions:        (b.conditions as string[]) ?? [],
    allergies:         (b.allergies as string[]) ?? [],
    is_active:         b.is_active as boolean,
    created_at:        b.created_at as string,
  }));

  const activeBios = allBios.filter(b => b.is_active);
  const pct = usagePct(usage.patient_count, usage.max_patients);
  const atLimit = pct >= 100;
  const nearLimit = pct >= 80 && !atLimit;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Patient Bios</p>
          <h1>Patient records</h1>
          <p className="muted">
            HIPAA-safe patient bios for your organization. All records use display names only.
          </p>
        </header>

        {sp.success && (
          <div className="verification-pass-box"><CheckCircle2 size={15} /><span>{decodeURIComponent(sp.success)}</span></div>
        )}
        {sp.error && (
          <div className="verification-fail-box"><ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span></div>
        )}

        {/* Usage + add button */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/bios/new" className={atLimit ? "button-secondary" : "button-primary"}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", opacity: atLimit ? 0.5 : 1, pointerEvents: atLimit ? "none" : "auto" }}>
            <PlusCircle size={14} /> Add patient bio
          </Link>

          {/* Usage meter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={14} style={{ color: atLimit ? "#dc2626" : nearLimit ? "#d97706" : "#6b7280" }} />
            <span style={{ fontSize: "0.82rem", color: atLimit ? "#dc2626" : "var(--muted)" }}>
              {usage.patient_count}{usage.max_patients !== null ? ` / ${usage.max_patients}` : ""} bios
              {atLimit && " — limit reached"}
              {nearLimit && " — nearing limit"}
            </span>
            {usage.max_patients !== null && (
              <div style={{ width: 80, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: atLimit ? "#dc2626" : nearLimit ? "#d97706" : "#16a34a", borderRadius: 2 }} />
              </div>
            )}
            {atLimit && (
              <Link href="/account/billing" className="text-link" style={{ fontSize: "0.78rem" }}>Upgrade →</Link>
            )}
          </div>
        </div>

        <div className="verification-pending-box">
          <ShieldCheck size={14} />
          <span style={{ fontSize: "0.78rem" }}>
            HIPAA: Display names only — no legal names, SSNs, or contact information stored.
            Records are encrypted at rest. Deactivated bios are soft-deleted and retained for audit purposes.
          </span>
        </div>

        {activeBios.length === 0 ? (
          <section className="panel" style={{ textAlign: "center", padding: "2.5rem" }}>
            <Users size={32} style={{ color: "var(--muted)", margin: "0 auto 1rem" }} />
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No patient bios yet</p>
            <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              Create your first patient record to get started.
            </p>
            <Link href="/bios/new" className="button-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <PlusCircle size={14} /> Add first bio
            </Link>
          </section>
        ) : (
          <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div className="panel-heading" style={{ padding: "1rem 1.25rem 0.75rem" }}>
              <div>
                <p className="section-label">Active bios</p>
                <h2>{activeBios.length} record{activeBios.length !== 1 ? "s" : ""}</h2>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Display name", "Birth year", "Sex", "Conditions", "Allergies", "Added", ""].map(h => (
                      <th key={h} style={{ padding: "0.5rem 1rem", textAlign: "left", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeBios.map(bio => (
                    <tr key={bio.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.6rem 1rem", fontWeight: 500 }}>{bio.display_name}</td>
                      <td style={{ padding: "0.6rem 1rem", color: "var(--muted)" }}>{bio.date_of_birth_year ?? "—"}</td>
                      <td style={{ padding: "0.6rem 1rem", color: "var(--muted)", textTransform: "capitalize" }}>{bio.biological_sex ?? "—"}</td>
                      <td style={{ padding: "0.6rem 1rem", maxWidth: 200 }}>
                        {bio.conditions.length > 0 ? (
                          <span style={{ fontSize: "0.75rem" }}>{bio.conditions.slice(0, 2).join(", ")}{bio.conditions.length > 2 ? ` +${bio.conditions.length - 2}` : ""}</span>
                        ) : <span className="muted">None</span>}
                      </td>
                      <td style={{ padding: "0.6rem 1rem", maxWidth: 180 }}>
                        {bio.allergies.length > 0 ? (
                          <span style={{ fontSize: "0.75rem" }}>{bio.allergies.slice(0, 2).join(", ")}{bio.allergies.length > 2 ? ` +${bio.allergies.length - 2}` : ""}</span>
                        ) : <span className="muted">None</span>}
                      </td>
                      <td style={{ padding: "0.6rem 1rem", color: "var(--muted)", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                        {new Date(bio.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.6rem 1rem" }}>
                        <form action={deactivateBioAction}>
                          <input type="hidden" name="bioId" value={bio.id} />
                          <button className="button-secondary" type="submit"
                            style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", color: "#dc2626" }}>
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {allBios.filter(b => !b.is_active).length > 0 && (
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            {allBios.filter(b => !b.is_active).length} deactivated record{allBios.filter(b => !b.is_active).length !== 1 ? "s" : ""} retained for audit trail.
          </p>
        )}
      </div>
    </AppShell>
  );
}
