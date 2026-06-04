export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, PlusCircle, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateProviderProfileAction, withdrawProviderProfileAction } from "./actions";

/**
 * /account/provider — Provider's own profile status page.
 * Shows review status, current details, and allows editing while pending.
 */

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const SPECIALTIES = [
  "Biosafety Officer","Environmental Health & Safety","Occupational Medicine",
  "Infection Control","Laboratory Safety","Radiation Safety","Chemical Safety",
  "Industrial Hygiene","Emergency Management","Public Health","Other",
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

const STATUS_CONFIG = {
  pending:  { label: "Under Review",  icon: Clock,          chipClass: "status-needs-review", color: "#d97706", message: "Your profile has been submitted and is awaiting review by our moderation team. This typically takes 1–2 business days." },
  approved: { label: "Approved",      icon: CheckCircle2,   chipClass: "status-current",      color: "#16a34a", message: "Your profile is live in the provider directory. Organizations and administrators can view it." },
  rejected: { label: "Changes Needed",icon: XCircle,        chipClass: "status-critical",     color: "#dc2626", message: "Your profile requires changes before it can be approved. Please review the notes below and resubmit." },
  draft:    { label: "Draft",         icon: Clock,          chipClass: "status-unknown",      color: "#6b7280", message: "Your profile has not been submitted yet." },
};

export default async function ProviderAccountPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/provider");

  const sp = await searchParams;
  const admin = getSupabaseAdminClient();

   
  const { data } = await (admin as any)
    .from("provider_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

   
  const profile = data as any | null;
  const statusKey = (profile?.review_status ?? "draft") as keyof typeof STATUS_CONFIG;
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.draft;
  const StatusIcon = status.icon;
  const canEdit = !profile || profile.review_status === "pending" || profile.review_status === "rejected";
  const isApproved = profile?.review_status === "approved";

  return (
    <AppShell>
      <div className="page-stack" style={{ maxWidth: 680 }}>
        <Link href="/account" className="text-link"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
          <ArrowLeft size={14} /> Account
        </Link>

        <header className="page-header">
          <p className="section-label">Account</p>
          <h1>Your provider profile</h1>
          <p className="muted">Manage your professional listing in the PredictSafeBIO provider directory.</p>
        </header>

        {sp.success && (
          <div className="verification-pass-box"><CheckCircle2 size={15} /><span>{decodeURIComponent(sp.success)}</span></div>
        )}
        {sp.error && (
          <div className="verification-fail-box"><ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span></div>
        )}

        {/* Status banner */}
        {profile && (
          <div className="verification-pending-box" style={{
            borderLeft: `4px solid ${status.color}`,
            background: isApproved ? "#f0fdf4" : undefined,
          }}>
            <StatusIcon size={15} style={{ color: status.color, flexShrink: 0 }} />
            <div>
              <strong style={{ color: status.color }}>{status.label}</strong>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>{status.message}</p>
              {profile.review_notes && (
                <blockquote style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", borderLeft: "2px solid #dc2626", paddingLeft: 8, color: "#dc2626" }}>
                  {profile.review_notes}
                </blockquote>
              )}
              {isApproved && profile.npi_verified && (
                <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} /> NPI verified
                  {profile.npi_verified_at ? ` · ${new Date(profile.npi_verified_at).toLocaleDateString()}` : ""}
                </p>
              )}
              {isApproved && (
                <Link href={`/providers/${profile.id}`} className="text-link" style={{ fontSize: "0.78rem", marginTop: 4, display: "inline-block" }}>
                  View public profile →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* No profile yet */}
        {!profile && (
          <section className="panel" style={{ textAlign: "center", padding: "2rem" }}>
            <ShieldCheck size={32} style={{ color: "var(--muted)", margin: "0 auto 1rem" }} />
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No profile yet</p>
            <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              Create your provider profile to appear in the PredictSafeBIO directory.
            </p>
            <Link href="/providers/new" className="button-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <PlusCircle size={14} /> Create provider profile
            </Link>
          </section>
        )}

        {/* Edit / view form */}
        {profile && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Profile details</p>
                <h2>{canEdit ? "Edit profile" : "Current profile"}</h2>
              </div>
              <span className={`status-chip ${status.chipClass}`} style={{ fontSize: "0.72rem" }}>
                {status.label}
              </span>
            </div>

            {canEdit ? (
              <form action={updateProviderProfileAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1.5rem" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem", gridColumn: "1 / -1" }}>
                    Specialty <span style={{ color: "#dc2626" }}>*</span>
                    <select name="specialty" required defaultValue={profile.specialty ?? ""}>
                      <option value="">Select…</option>
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                    NPI Number <span className="muted" style={{ fontSize: "0.72rem" }}>(if applicable)</span>
                    <input name="npi_number" defaultValue={profile.npi_number ?? ""}
                      placeholder="Optional — for clinical/occupational-health providers" style={{ fontFamily: "monospace" }} />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                    License number
                    <input name="license_number" defaultValue={profile.license_number ?? ""} />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
                    License state
                    <select name="license_state" defaultValue={profile.license_state ?? ""}>
                      <option value="">Select state…</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>

                <div>
                  <p className="section-label" style={{ marginBottom: "0.5rem" }}>Credentials</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                    {CREDENTIALS.map(c => (
                      <label key={c.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.83rem", cursor: "pointer" }}>
                        <input type="checkbox" name="credentials" value={c.value}
                          defaultChecked={(profile.credentials ?? []).includes(c.value)} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", cursor: "pointer" }}>
                  <input type="checkbox" name="accepting_patients" value="true"
                    defaultChecked={profile.accepting_patients ?? true} />
                  Currently available for new consultations
                </label>

                {statusKey === "rejected" && (
                  <div className="verification-pending-box" style={{ fontSize: "0.82rem" }}>
                    <ShieldAlert size={14} />
                    <span>Saving will resubmit your profile for review. Address all feedback above before resubmitting.</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button className="button-primary" type="submit">Save &amp; resubmit</button>
                  <form action={withdrawProviderProfileAction}>
                    <button className="button-secondary" type="submit"
                      style={{ color: "#dc2626" }}>
                      Withdraw profile
                    </button>
                  </form>
                </div>
              </form>
            ) : (
              /* Read-only view for approved profiles */
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[
                  ["Specialty",       profile.specialty],
                  ["NPI Number",      profile.npi_number],
                  ["License Number",  profile.license_number],
                  ["License State",   profile.license_state],
                  ["Credentials",     (profile.credentials ?? []).join(", ") || "None"],
                  ["Available for consultation", profile.accepting_patients ? "Yes" : "No"],
                ].map(([label, value]) => value ? (
                  <div key={label as string} style={{ display: "flex", gap: "1rem" }}>
                    <span className="muted" style={{ fontSize: "0.83rem", minWidth: 140 }}>{label}</span>
                    <strong style={{ fontSize: "0.83rem" }}>{value}</strong>
                  </div>
                ) : null)}

                <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.5rem" }}>
                  To request changes to an approved profile, contact{" "}
                  <a href="mailto:support@predictsafe-bio.com" className="text-link">support@predictsafe-bio.com</a>.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
