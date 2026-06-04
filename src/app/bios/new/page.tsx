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
          <div className="verification-pass-box" style={{ padding: "2rem", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
            <CheckCircle2 size={32} style={{ color: "#16a34a" }} />
            <div>
              <h2 style={{ margin: "0 0 0.5rem" }}>Personnel record created</h2>
              <p style={{ margin: 0 }}>The personnel record has been saved securely and is visible to your team.</p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Link href="/bios/new" className="button-primary">Add another</Link>
              <Link href="/workbench" className="button-secondary">Dashboard</Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-stack" style={{ maxWidth: 680 }}>
        <header className="page-header">
          <p className="section-label">Personnel Records</p>
          <h1>New personnel record</h1>
          <p className="muted">
            Create a privacy-safe personnel record. Use a display name; no legal name required.
            No full date of birth or contact information is collected.
          </p>
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

        <form action={submitPersonnelRecordAction}>
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem", maxWidth: 360 }}>
              Display name <span style={{ color: "#dc2626" }}>*</span>
              <span className="muted" style={{ fontSize: "0.72rem" }}>A chosen pseudonym, e.g. Person A or initials only.</span>
              <input name="display_name" required placeholder="e.g. Person A, J.D., Lab 4B" style={{ width: "100%" }} />
            </label>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="button-primary" type="submit" disabled={atLimit}
                style={{ opacity: atLimit ? 0.5 : 1 }}>
                Save personnel record
              </button>
              <Link href="/workbench" className="button-secondary">Cancel</Link>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
