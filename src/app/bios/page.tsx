export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, PlusCircle, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import { isAdminOrAbove } from "@/lib/role-permissions";
import { DataLoadError } from "@/components/DataLoadError";
import { getOrgUsage, usagePct } from "@/lib/supabase/plan-limits-service";
import { deactivateBioAction } from "./actions";

/**
 * /bios — Organization's personnel record list.
 * Visible to admins/owners. Shows all active records with deactivate controls.
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

  // Admin client requires SUPABASE_SERVICE_ROLE_KEY — not always set on preview.
  // Degrade gracefully rather than crashing the entire page.
  if (!isSupabaseServiceConfigured()) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <div className="page-header-left">
              <p className="section-label">Operate · Personnel</p>
              <h1>Personnel Records</h1>
            </div>
            <Link className="button-secondary" href="/plan/qualified-persons">Qualified Persons →</Link>
          </header>
          <DataLoadError resource="personnel records" />
        </div>
      </AppShell>
    );
  }

  const admin = getSupabaseAdminClient();
  const [biosResult, usage] = await Promise.all([
    // NOTE: the Supabase query builder is a thenable but does NOT implement
    // `.catch()` — chaining it throws `TypeError: ...catch is not a function`.
    // The builder never rejects on query errors; it resolves to { data, error },
    // so we read `error` below instead of catching.
    (admin as any)
      .from("personnel_records")
      .select("id, display_name, is_active, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    getOrgUsage(orgId),
  ]);

  if (biosResult?.error) {
    console.error("[/bios] failed to load personnel_records:", biosResult.error.message);
  }

  const allBios = ((biosResult?.data ?? []) as any[]).map((b: any) => ({
    id:           b.id as string,
    display_name: b.display_name as string,
    is_active:    b.is_active as boolean,
    created_at:   b.created_at as string,
  }));

  const activeBios  = allBios.filter(b => b.is_active);
  const deactivated = allBios.filter(b => !b.is_active);
  const pct         = usagePct(usage.patient_count, usage.max_patients);
  const atLimit     = pct >= 100;
  const nearLimit   = pct >= 80 && !atLimit;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · <a href="/plan/qualified-persons">Qualified Persons</a> / Personnel</p>
            <h1>Personnel Records</h1>
            <p className="muted">Display-name records used in risk scoring.</p>
          </div>
          <Link className="button-secondary" href="/plan/qualified-persons">← Qualified Persons</Link>
        </header>

        {sp.success && (
          <div className="verification-pass-box"><CheckCircle2 size={15} /><span>{decodeURIComponent(sp.success)}</span></div>
        )}
        {sp.error && (
          <div className="verification-fail-box"><ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span></div>
        )}

        <div className="command-center-link-strip">
          <Link
            href="/bios/new"
            className={atLimit ? "button-secondary" : "button-primary"}
            aria-disabled={atLimit}
          >
            <PlusCircle size={14} className="icon-mr" /> Add personnel record
          </Link>
          <span className={atLimit ? "status-overdue" : "muted"}>
            <Users size={13} className="icon-mr" />
            {usage.patient_count}{usage.max_patients !== null ? ` / ${usage.max_patients}` : ""} records
            {atLimit && " — limit reached"}
            {nearLimit && " — nearing limit"}
          </span>
          {atLimit && (
            <Link href="/account/billing" className="button-secondary compact">Upgrade plan →</Link>
          )}
        </div>

        <div className="verification-pending-box">
          <ShieldCheck size={14} />
          <span>
            Display names only — no legal names, SSNs, contact information, or health data stored.
            Records are encrypted at rest. Deactivated records are soft-deleted and retained for audit purposes.
          </span>
        </div>

        {activeBios.length === 0 ? (
          <section className="panel">
            <div className="empty-state-card">
              <Users size={32} className="muted" />
              <p className="empty-state-title">No personnel records yet</p>
              <p className="muted">Create your first personnel record to get started.</p>
              <Link href="/bios/new" className="button-primary">
                <PlusCircle size={14} className="icon-mr" /> Add first record
              </Link>
            </div>
          </section>
        ) : (
          <section className="table-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Active records</p>
                <h2>{activeBios.length} record{activeBios.length !== 1 ? "s" : ""}</h2>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Display name</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activeBios.map(bio => (
                  <tr key={bio.id}>
                    <td><strong>{bio.display_name}</strong></td>
                    <td className="muted">{new Date(bio.created_at).toLocaleDateString()}</td>
                    <td>
                      <form action={deactivateBioAction}>
                        <input type="hidden" name="bioId" value={bio.id} />
                        <button className="button-secondary compact" type="submit">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {deactivated.length > 0 && (
          <p className="muted">
            {deactivated.length} deactivated record{deactivated.length !== 1 ? "s" : ""} retained for audit trail.
          </p>
        )}
      </div>
    </AppShell>
  );
}
