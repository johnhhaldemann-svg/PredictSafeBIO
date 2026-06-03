export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getOrgUsage, usagePct, usageStatus } from "@/lib/supabase/plan-limits-service";
import { submitPatientBioAction } from "./actions";

/**
 * /bios/new — Patient bio submission.
 * HIPAA: display_name is a chosen pseudonym — no legal name required.
 *        date_of_birth_year only (no full DOB).
 *        Encrypted notes field is optional.
 */

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

const COMMON_CONDITIONS = [
  "Hypertension", "Type 2 Diabetes", "Asthma", "COPD", "Heart Disease",
  "Anxiety", "Depression", "Arthritis", "Chronic Pain", "Sleep Apnea",
];

const COMMON_ALLERGIES = [
  "Penicillin", "Sulfa drugs", "Aspirin/NSAIDs", "Latex", "Shellfish",
  "Tree nuts", "Peanuts", "Eggs", "Milk", "Wheat/Gluten",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i - 18);

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
              <h2 style={{ margin: "0 0 0.5rem" }}>Patient bio created</h2>
              <p style={{ margin: 0 }}>The patient bio has been saved securely and is visible to your care team.</p>
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
          <p className="section-label">Patient Bios</p>
          <h1>New patient bio</h1>
          <p className="muted">
            Create a privacy-safe patient record. Use a display name — no legal name required.
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
              You've reached your plan limit for patient bios.{" "}
              <Link href="/account/billing" className="text-link">Upgrade →</Link>
            </span>
          </div>
        )}

        <div className="verification-pending-box">
          <ShieldCheck size={14} />
          <span>
            HIPAA notice: Do not enter full names, SSNs, addresses, or detailed clinical notes.
            Use display names only. This record is encrypted at rest.
          </span>
        </div>

        <form action={submitPatientBioAction}>
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1.5rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                Display name <span style={{ color: "#dc2626" }}>*</span>
                <span className="muted" style={{ fontSize: "0.72rem" }}>A chosen pseudonym, e.g. "Patient A" or initials only.</span>
                <input name="display_name" required placeholder="e.g. Patient A, J.D., Room 4B" style={{ width: "100%" }} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                Birth year
                <span className="muted" style={{ fontSize: "0.72rem" }}>Year only — no full date of birth.</span>
                <select name="dob_year" style={{ width: "100%" }}>
                  <option value="">Not specified</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                Biological sex
                <select name="biological_sex" style={{ width: "100%" }}>
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="intersex">Intersex</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
            </div>

            <div>
              <p className="section-label" style={{ marginBottom: "0.4rem" }}>Known conditions</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", marginBottom: "0.5rem" }}>
                {COMMON_CONDITIONS.map(c => (
                  <label key={c} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.82rem", cursor: "pointer" }}>
                    <input type="checkbox" name="conditions" value={c} />
                    {c}
                  </label>
                ))}
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem" }}>
                Other conditions (comma-separated)
                <input name="custom_conditions" placeholder="e.g. Atrial fibrillation, Hypothyroidism" />
              </label>
            </div>

            <div>
              <p className="section-label" style={{ marginBottom: "0.4rem" }}>Known allergies</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", marginBottom: "0.5rem" }}>
                {COMMON_ALLERGIES.map(a => (
                  <label key={a} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.82rem", cursor: "pointer" }}>
                    <input type="checkbox" name="allergies" value={a} />
                    {a}
                  </label>
                ))}
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem" }}>
                Other allergies (comma-separated)
                <input name="custom_allergies" placeholder="e.g. Codeine, Iodine contrast" />
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="button-primary" type="submit" disabled={atLimit}
                style={{ opacity: atLimit ? 0.5 : 1 }}>
                Save patient bio
              </button>
              <Link href="/workbench" className="button-secondary">Cancel</Link>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
