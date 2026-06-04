export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldAlert, ShieldCheck, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getOrgUsage, usagePct, usageStatus } from "@/lib/supabase/plan-limits-service";
import { submitProviderProfileAction } from "./actions";

/**
 * /providers/new — Provider self-onboarding form.
 * Submits a new provider_profiles row with review_status = 'pending'.
 * Moderation team reviews via /admin/moderation.
 */

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const SPECIALTIES = [
  "Biosafety Officer",
  "Environmental Health & Safety",
  "Occupational Medicine",
  "Infection Control",
  "Laboratory Safety",
  "Radiation Safety",
  "Chemical Safety",
  "Industrial Hygiene",
  "Emergency Management",
  "Public Health",
  "Other",
];

const CREDENTIALS = [
  { value: "CBS",  label: "CBS — Certified Biosafety Professional" },
  { value: "CIH",  label: "CIH — Certified Industrial Hygienist" },
  { value: "CSP",  label: "CSP — Certified Safety Professional" },
  { value: "CBSP", label: "CBSP — Certified Biological Safety Professional" },
  { value: "MD",   label: "MD — Medical Doctor" },
  { value: "PhD",  label: "PhD — Doctor of Philosophy" },
  { value: "MPH",  label: "MPH — Master of Public Health" },
  { value: "RN",   label: "RN — Registered Nurse" },
];

export default async function ProviderNewPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/providers/new");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/onboarding");

  const sp = await searchParams;
  const usage = await getOrgUsage(profile.organization_id);
  const pct = usagePct(usage.provider_count, usage.max_providers);
  const status = usageStatus(pct);
  const atLimit = status === "critical";

  if (sp.success) {
    return (
      <AppShell>
        <div className="page-stack" style={{ maxWidth: 600 }}>
          <div className="verification-pass-box" style={{ padding: "2rem", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
            <CheckCircle2 size={32} style={{ color: "#16a34a" }} />
            <div>
              <h2 style={{ margin: "0 0 0.5rem" }}>Profile submitted for review</h2>
              <p style={{ margin: 0 }}>
                Your provider profile is now in our moderation queue. We typically review profiles within 1–2 business days.
                You will receive an email once it is approved or if we need additional information.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/workbench" className="button-primary">Go to dashboard</Link>
              <Link href="/account" className="button-secondary">Account settings</Link>
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
          <p className="section-label">Providers</p>
          <h1>Create your provider profile</h1>
          <p className="muted">
            Submit your professional details for review. Once approved, your profile will appear in the
            PredictSafeBIO provider directory.
          </p>
        </header>

        {sp.error && (
          <div className="verification-fail-box">
            <ShieldAlert size={15} />
            <span>{decodeURIComponent(sp.error)}</span>
          </div>
        )}

        {atLimit && (
          <div className="verification-fail-box">
            <ShieldAlert size={15} />
            <span>
              Your organization has reached its plan limit for provider profiles.{" "}
              <Link href="/account/billing" className="text-link">Upgrade your plan →</Link>
            </span>
          </div>
        )}

        {!atLimit && usage.max_providers !== null && (
          <div className="verification-pending-box">
            <Stethoscope size={14} />
            <span>
              Your plan allows {usage.max_providers} provider profile{usage.max_providers === 1 ? "" : "s"}.
              You currently have {usage.provider_count}.
              {status === "warning" && " You're nearing your limit — consider upgrading."}
            </span>
          </div>
        )}

        <form action={submitProviderProfileAction}>
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            <div>
              <p className="section-label" style={{ marginBottom: "0.75rem" }}>Professional details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1.5rem" }}>

                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem", gridColumn: "1 / -1" }}>
                  Specialty <span style={{ color: "#dc2626" }}>*</span>
                  <select name="specialty" required>
                    <option value="">Select your specialty…</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                  NPI Number <span style={{ color: "#dc2626" }}>*</span>
                  <span className="muted" style={{ fontSize: "0.72rem" }}>10-digit National Provider Identifier</span>
                  <input name="npi_number" required placeholder="1234567890" maxLength={10}
                    pattern="\d{10}" title="Must be a 10-digit number" style={{ fontFamily: "monospace" }} />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                  License number
                  <input name="license_number" placeholder="Optional" />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                  License state
                  <select name="license_state">
                    <option value="">Select state…</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div>
              <p className="section-label" style={{ marginBottom: "0.5rem" }}>Credentials</p>
              <p className="muted" style={{ fontSize: "0.78rem", marginBottom: "0.75rem" }}>Select all that apply.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                {CREDENTIALS.map(c => (
                  <label key={c.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.83rem", cursor: "pointer" }}>
                    <input type="checkbox" name="credentials" value={c.value} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="checkbox" name="accepting_patients" value="true" defaultChecked />
              Currently accepting patients / clients
            </label>

            <div className="guardrail-box">
              <ShieldCheck size={16} />
              <span>
                Your NPI will be verified against the NPPES registry during review.
                Do not include any patient health information in this form.
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="button-primary"
                type="submit"
                disabled={atLimit}
                style={{ opacity: atLimit ? 0.5 : 1 }}
              >
                Submit for review
              </button>
              <Link href="/workbench" className="button-secondary">Cancel</Link>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
