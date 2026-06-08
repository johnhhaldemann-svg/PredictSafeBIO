export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getOrgUsage, usagePct, usageStatus } from "@/lib/supabase/plan-limits-service";
import { submitPersonnelRecordAction } from "./actions";

/**
 * /bios/new — Personnel record submission.
 * Privacy-first: display_name is a chosen pseudonym. No legal name, contact
 * details, or health information is collected.
 */

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function BioNewPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bios/new");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/onboarding");

  const sp = await searchParams;
  const usage = await getOrgUsage(profile.organization_id);
  const pct = usagePct(usage.patient_count, usage.max_patients);
  const atLimit = usageStatus(pct) === "critical";

  if (sp.success) {
    return (
      <AppShell>
        <div className="page-stack" style={{ maxWidth: 580 }}>
          <section className="panel">
            <div className="empty-state-card">
              <CheckCircle2 size={32} className="status-current" />
              <p className="empty-state-title">Personnel record created</p>
              <p className="muted">The personnel record has been saved securely and is visible to your team.</p>
              <div className="form-action-row">
                <Link href="/bios/new" className="button-primary">Add another</Link>
                <Link href="/workbench" className="button-secondary">Dashboard</Link>
              </div>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-stack" style={{ maxWidth: 680 }}>
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Personnel Records</p>
            <h1>New personnel record</h1>
            <p className="muted">
              Create a privacy-safe personnel record. Use a display name; no legal name required.
              No full date of birth or contact information is collected.
            </p>
          </div>
          <Link className="button-secondary" href="/bios">← Personnel Records</Link>
        </header>

        {sp.error && (
          <div className="verification-fail-box">
            <ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span>
          </div>
        )}

        {atLimit && (
          <div className="verification-fail-box">
            <ShieldAlert size={15} />
            <span>
              Your plan limit for personnel records has been reached.{" "}
              <Link href="/account/billing" className="text-link">Upgrade →</Link>
            </span>
          </div>
        )}

        <div className="verification-pending-box">
          <ShieldCheck size={14} />
          <span>
            Privacy-first: use a display name or initials only. Do not enter legal names, SSNs,
            contact details, or any health information. Records are encrypted at rest.
          </span>
        </div>

        <section className="panel">
          <form action={submitPersonnelRecordAction} className="stacked-form">
            <label>
              Display name <span style={{ color: "var(--red)" }}>*</span>
              <span className="muted">A chosen pseudonym, e.g. Person A or initials only.</span>
              <input name="display_name" required placeholder="e.g. Person A, J.D., Lab 4B" />
            </label>

            <div className="form-action-row">
              <button className="button-primary" type="submit" disabled={atLimit}
                style={{ opacity: atLimit ? 0.5 : 1 }}>
                Save personnel record
              </button>
              <Link href="/workbench" className="button-secondary">Cancel</Link>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
