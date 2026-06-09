export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, PlusCircle, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import { DataLoadError } from "@/components/DataLoadError";
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
  pending:  { label: "Under Review",   icon: Clock,        chipClass: "status-needs-review", color: "#d97706", message: "Your profile has been submitted and is awaiting review by our moderation team. This typically takes 1–2 business days." },
  approved: { label: "Approved",       icon: CheckCircle2, chipClass: "status-current",      color: "#16a34a", message: "Your profile is live in the provider directory. Organizations and administrators can view it." },
  rejected: { label: "Changes Needed", icon: XCircle,      chipClass: "status-critical",     color: "#dc2626", message: "Your profile requires changes before it can be approved. Please review the notes below and resubmit." },
  draft:    { label: "Draft",          icon: Clock,        chipClass: "status-unknown",      color: "#6b7280", message: "Your profile has not been submitted yet." },
};

export default async function ProviderAccountPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/provider");

  const sp = await searchParams;

  if (!isSupabaseServiceConfigured()) {
    return (
      <AppShell>
        <div className="page-stack">
          <Link href="/account" className="text-link">← Account</Link>
          <DataLoadError resource="provider profile" />
        </div>
      </AppShell>
    );
  }

  const admin = getSupabaseAdminClient();
  const { data } = await (admin as any)
    .from("provider_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()
    .catch(() => ({ data: null }));

  const profile = data as any | null;
  const statusKey = (profile?.review_status ?? "draft") as keyof typeof STATUS_CONFIG;
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.draft;
  const StatusIcon = status.icon;
  const canEdit = !profile || profile.review_status === "pending" || profile.review_status === "rejected";
  const isApproved = profile?.review_status === "approved";

  return (
    <AppShell>
      <div className="page-stack" style={{ maxWidth: 680 }}>
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Account</p>
            <h1>Your provider profile</h1>
            <p className="muted">Manage your professional listing in the PredictSafeBIO provider directory.</p>
          </div>
          <Link className="button-secondary" href="/account">← Account</Link>
        </header>

        {sp.success && (
          <div className="verification-pass-box"><CheckCircle2 size={15} /><span>{decodeURIComponent(sp.success)}</span></div>
        )}
        {sp.error && (
          <div className="verification-fail-box"><ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span></div>
        )}

        {/* Status banner */}
        {profile && (
          <div
            className="verification-pending-box"
            style={{
              borderLeft: `4px solid ${status.color}`,
              background: isApproved ? "#f0fdf4" : undefined,
            }}
          >
            <StatusIcon size={15} style={{ color: status.color, flexShrink: 0 }} />
            <div>
              <strong style={{ color: status.color }}>{status.label}</strong>
              <p className="muted">{status.message}</p>
              {profile.review_notes && (
                <blockquote style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", borderLeft: "2px solid var(--red)", paddingLeft: 8, color: "var(--red)" }}>
                  {profile.review_notes}
                </blockquote>
              )}
              {isApproved && profile.npi_verified && (
                <p className="muted" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} className="icon-mr" /> NPI verified
                  {profile.npi_verified_at ? ` · ${new Date(profile.npi_verified_at).toLocaleDateString()}` : ""}
                </p>
              )}
              {isApproved && (
                <Link href={`/providers/${profile.id}`} className="text-link" style={{ marginTop: 4, display: "inline-block" }}>
                  View public profile →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* No profile yet */}
        {!profile && (
          <section className="panel">
            <div className="empty-state-card">
              <ShieldCheck size={32} className="muted" />
              <p className="empty-state-title">No profile yet</p>
              <p className="muted">Create your provider profile to appear in the PredictSafeBIO directory.</p>
              <Link href="/providers/new" className="button-primary">
                <PlusCircle size={14} className="icon-mr" /> Create provider profile
              </Link>
            </div>
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
              <span className={`status-chip ${status.chipClass}`}>{status.label}</span>
            </div>

            {canEdit ? (
              <form action={updateProviderProfileAction} className="stacked-form">
                <div className="form-grid">
                  <label style={{ gridColumn: "1 / -1" }}>
                    Specialty <span style={{ color: "var(--red)" }}>*</span>
                    <select name="specialty" required defaultValue={profile.specialty ?? ""}>
                      <option value="">Select…</option>
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>

                  <label>
                    NPI Number <span className="muted">— if applicable</span>
                    <input name="npi_number" defaultValue={profile.npi_number ?? ""}
                      placeholder="Optional — for clinical/occupational-health providers"
                      style={{ fontFamily: "monospace" }} />
                  </label>

                  <label>
                    License number
                    <input name="license_number" defaultValue={profile.license_number ?? ""} />
                  </label>

                  <label>
                    License state
                    <select name="license_state" defaultValue={profile.license_state ?? ""}>
                      <option value="">Select state…</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>

                <div>
                  <p className="section-label">Credentials</p>
                  <div className="checkbox-group">
                    {CREDENTIALS.map(c => (
                      <label key={c.value}>
                        <input type="checkbox" name="credentials" value={c.value}
                          defaultChecked={(profile.credentials ?? []).includes(c.value)} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>

                <label>
                  <input type="checkbox" name="accepting_patients" value="true"
                    defaultChecked={profile.accepting_patients ?? true} />
                  Currently available for new consultations
                </label>

                {statusKey === "rejected" && (
                  <div className="verification-pending-box">
                    <ShieldAlert size={14} />
                    <span>Saving will resubmit your profile for review. Address all feedback above before resubmitting.</span>
                  </div>
                )}

                <div className="form-action-row">
                  <button className="button-primary" type="submit">Save &amp; resubmit</button>
                  <form action={withdrawProviderProfileAction}>
                    <button className="button-secondary" type="submit" style={{ color: "var(--red)" }}>
                      Withdraw profile
                    </button>
                  </form>
                </div>
              </form>
            ) : (
              /* Read-only view for approved profiles */
              <div className="action-list">
                {[
                  ["Specialty",                    profile.specialty],
                  ["NPI Number",                   profile.npi_number],
                  ["License Number",               profile.license_number],
                  ["License State",                profile.license_state],
                  ["Credentials",                  (profile.credentials ?? []).join(", ") || "None"],
                  ["Available for consultation",   profile.accepting_patients ? "Yes" : "No"],
                ].map(([label, value]) => value ? (
                  <article className="action-row" key={label as string}>
                    <span className="muted">{label}</span>
                    <strong>{value}</strong>
                  </article>
                ) : null)}

                <p className="muted">
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
