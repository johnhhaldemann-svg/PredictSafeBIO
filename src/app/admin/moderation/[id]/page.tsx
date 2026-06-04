export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity, ArrowLeft, CheckCircle2, EyeOff, Flag,
  ShieldAlert, ShieldCheck, XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { getBioForReview, NPI_CHECKLIST_LABELS } from "@/lib/supabase/moderation-service";
import type { NpiChecklistKey, ReviewStatus } from "@/lib/supabase/moderation-service";
import { canViewPlatform } from "@/lib/role-permissions";
import {
  approveProfileAction,
  requestChangesAction,
  rejectProfileAction,
  takedownProfileAction,
  restoreProfileAction,
  updateNpiChecklistAction,
  triageReportAction,
} from "../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending:           "Pending Review",
  approved:          "Approved — Live",
  changes_requested: "Changes Requested",
  rejected:          "Rejected",
  taken_down:        "Taken Down",
};

const STATUS_CLASS: Record<ReviewStatus, string> = {
  pending:           "status-needs-review",
  approved:          "status-current",
  changes_requested: "status-needs-review",
  rejected:          "status-missing",
  taken_down:        "status-critical",
};

const REPORT_REASON_LABELS: Record<string, string> = {
  inaccurate_credentials: "Inaccurate credentials",
  inappropriate_content:  "Inappropriate content",
  suspected_fraud:        "Suspected fraud",
  privacy_concern:        "Privacy concern",
  outdated_information:   "Outdated information",
  other:                  "Other",
};

const NPI_CHECKLIST_KEYS: NpiChecklistKey[] = [
  "format_valid", "nppes_match", "license_provided",
  "license_state_valid", "credentials_match", "specialty_match", "no_disciplinary",
];

export default async function BioReviewPage({ params, searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!canViewPlatform(access)) redirect("/");

  const { id } = await params;
  const sp = await searchParams;

  const bio = await getBioForReview(id);
  if (!bio) notFound();

  const npiComplete = NPI_CHECKLIST_KEYS.every(
    (k) => bio.npi_checklist[k]?.checked === true
  );
  const checkedCount = NPI_CHECKLIST_KEYS.filter(
    (k) => bio.npi_checklist[k]?.checked
  ).length;

  const isTakenDown = bio.review_status === "taken_down";
  const isApproved  = bio.review_status === "approved";
  const isPending   = bio.review_status === "pending" || bio.review_status === "changes_requested";

  return (
    <AppShell>
      <div className="page-stack">
        <Link href="/admin/moderation" className="text-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
          <ArrowLeft size={14} /> Back to Moderation Queue
        </Link>

        <header className="page-header">
          <p className="section-label">Admin › Moderation › Review</p>
          <h1>{bio.provider_name ?? "Unnamed Provider"}</h1>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span className={`status-chip ${STATUS_CLASS[bio.review_status]}`}>
              {STATUS_LABEL[bio.review_status]}
            </span>
            {bio.npi_verified
              ? <span className="status-chip status-current" style={{ fontSize: "0.75rem" }}>NPI Verified ✓</span>
              : <span className="status-chip status-needs-review" style={{ fontSize: "0.75rem" }}>NPI Unverified</span>}
            {bio.report_count > 0 && (
              <span style={{ color: "var(--error, #dc2626)", fontWeight: 600, fontSize: "0.82rem" }}>
                🚩 {bio.report_count} open report{bio.report_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </header>

        {sp.success && (
          <div className="verification-pass-box">
            <ShieldCheck size={16} /><span>{decodeURIComponent(sp.success)}</span>
          </div>
        )}
        {sp.error && (
          <div className="verification-fail-box">
            <ShieldAlert size={16} /><span>{decodeURIComponent(sp.error)}</span>
          </div>
        )}

        {/* ── Provider profile overview ─────────────────────────────────── */}
        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Provider</p><h2>Profile details</h2></div>
            <ShieldCheck size={20} />
          </div>
          <div className="action-list">
            {[
              ["Specialty",       bio.specialty ?? "—"],
              ["NPI Number",      bio.npi_number ?? "Not provided"],
              ["License",         bio.license_number ? `${bio.license_number} (${bio.license_state ?? "?"})` : "—"],
              ["Credentials",     bio.credentials?.join(", ") || "—"],
              ["Available for consultation", bio.accepting_patients ? "Yes" : "No"],
              ["Organization",    bio.organization_name ?? "—"],
              ["Submitted",       bio.submitted_at ? new Date(bio.submitted_at).toLocaleString() : "Not yet submitted"],
              ["Last reviewed",   bio.reviewed_at ? new Date(bio.reviewed_at).toLocaleString() : "—"],
            ].map(([label, value]) => (
              <article className="action-row" key={label as string}>
                <div><strong>{label}</strong></div>
                <p style={{ fontFamily: label === "NPI Number" ? "monospace" : undefined }}>{value}</p>
              </article>
            ))}
            {bio.review_notes && (
              <article className="action-row">
                <div><strong>Last review notes</strong></div>
                <p style={{ fontStyle: "italic" }}>{bio.review_notes}</p>
              </article>
            )}
          </div>
          {bio.npi_number && (
            <div style={{ marginTop: "0.75rem", padding: "0 0.25rem" }}>
              <a
                href={`https://npiregistry.cms.hhs.gov/search?number=${bio.npi_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
                style={{ fontSize: "0.85rem" }}
              >
                Look up NPI {bio.npi_number} on NPPES registry →
              </a>
            </div>
          )}
        </section>

        {/* ── NPI Verification Checklist ───────────────────────────────── */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">NPI Verification</p>
              <h2>{checkedCount} / {NPI_CHECKLIST_KEYS.length} items confirmed</h2>
            </div>
            {npiComplete
              ? <CheckCircle2 size={20} style={{ color: "var(--success, #16a34a)" }} />
              : <ShieldAlert size={20} style={{ color: "var(--warn, #d97706)" }} />}
          </div>
          {npiComplete && (
            <div className="verification-pass-box" style={{ marginBottom: "0.75rem" }}>
              <CheckCircle2 size={14} />
              <span>All 7 items verified — NPI checklist complete.</span>
            </div>
          )}
          <div className="action-list">
            {NPI_CHECKLIST_KEYS.map((key) => {
              const item = bio.npi_checklist[key];
              const checked = item?.checked ?? false;
              return (
                <article className="action-row" key={key} style={{ alignItems: "flex-start" }}>
                  <div style={{ alignItems: "flex-start" }}>
                    {checked
                      ? <CheckCircle2 size={15} style={{ color: "var(--success, #16a34a)", flexShrink: 0 }} />
                      : <XCircle size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />}
                    <strong style={{ fontSize: "0.875rem" }}>{NPI_CHECKLIST_LABELS[key]}</strong>
                  </div>
                  <form action={updateNpiChecklistAction} style={{ marginTop: 6 }}>
                    <input type="hidden" name="profileId" value={bio.id} />
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="checked" value={String(!checked)} />
                    <button
                      className="button-secondary"
                      type="submit"
                      style={{ fontSize: "0.78rem", padding: "0.2rem 0.6rem" }}
                    >
                      {checked ? "Uncheck" : "Mark confirmed"}
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── Approval workflow actions ─────────────────────────────────── */}
        {!isTakenDown && (
          <section className="panel">
            <div className="panel-heading">
              <div><p className="section-label">Decision</p><h2>Review actions</h2></div>
              <ShieldCheck size={20} />
            </div>
            <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
              All decisions are logged to the immutable audit trail and cannot be undone silently.
              Notes are shared back to the provider when requesting changes or rejecting.
            </p>

            {/* Approve */}
            {!isApproved && (
              <details style={{ marginBottom: "0.75rem" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", color: "var(--success, #16a34a)" }}>
                  ✅ Approve bio
                </summary>
                <form action={approveProfileAction} style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <input type="hidden" name="profileId" value={bio.id} />
                  <label style={{ fontSize: "0.85rem" }}>
                    Optional notes to provider
                    <textarea name="notes" rows={2} placeholder="Great — bio looks accurate and complete." style={{ width: "100%", marginTop: 4 }} />
                  </label>
                  <button className="button-primary" type="submit" style={{ alignSelf: "flex-start" }}>
                    Approve &amp; make live
                  </button>
                </form>
              </details>
            )}

            {/* Request changes */}
            {isPending && (
              <details style={{ marginBottom: "0.75rem" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
                  ✏️ Request changes
                </summary>
                <form action={requestChangesAction} style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <input type="hidden" name="profileId" value={bio.id} />
                  <label style={{ fontSize: "0.85rem" }}>
                    Notes for provider <span style={{ color: "var(--error, #dc2626)" }}>*</span>
                    <textarea name="notes" required rows={3} placeholder="Please update your NPI number — the one on file doesn't match the NPPES registry." style={{ width: "100%", marginTop: 4 }} />
                  </label>
                  <button className="button-secondary" type="submit" style={{ alignSelf: "flex-start" }}>
                    Send back for revision
                  </button>
                </form>
              </details>
            )}

            {/* Reject */}
            {!isApproved && (
              <details style={{ marginBottom: "0.75rem" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", color: "var(--error, #dc2626)" }}>
                  ❌ Reject bio
                </summary>
                <form action={rejectProfileAction} style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <input type="hidden" name="profileId" value={bio.id} />
                  <label style={{ fontSize: "0.85rem" }}>
                    Rejection reason <span style={{ color: "var(--error, #dc2626)" }}>*</span>
                    <textarea name="notes" required rows={3} placeholder="Credentials could not be verified in NPPES. Suspected fraudulent NPI." style={{ width: "100%", marginTop: 4 }} />
                  </label>
                  <button className="button-secondary" type="submit" style={{ alignSelf: "flex-start", color: "var(--error, #dc2626)" }}>
                    Reject permanently
                  </button>
                </form>
              </details>
            )}
          </section>
        )}

        {/* ── Takedown / Restore ────────────────────────────────────────── */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Visibility</p>
              <h2>{isTakenDown ? "Bio is hidden from public view" : "Takedown"}</h2>
            </div>
            <EyeOff size={20} />
          </div>
          <div className="verification-pending-box" style={{ marginBottom: "1rem" }}>
            <EyeOff size={14} />
            <span>Takedown hides a profile immediately without deleting data. Fully reversible and audit-safe.</span>
          </div>
          {isTakenDown ? (
            <form action={restoreProfileAction}>
              <input type="hidden" name="profileId" value={bio.id} />
              <button className="button-primary" type="submit">Restore to public view</button>
            </form>
          ) : (
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
                🔻 Take down this bio
              </summary>
              <form action={takedownProfileAction} style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <input type="hidden" name="profileId" value={bio.id} />
                <label style={{ fontSize: "0.85rem" }}>
                  Reason for takedown <span style={{ color: "var(--error, #dc2626)" }}>*</span>
                  <textarea name="notes" required rows={2} placeholder="Taken down pending investigation of fraud report." style={{ width: "100%", marginTop: 4 }} />
                </label>
                <button className="button-secondary" type="submit" style={{ alignSelf: "flex-start", color: "var(--error, #dc2626)" }}>
                  Take down now
                </button>
              </form>
            </details>
          )}
        </section>

        {/* ── Open reports ──────────────────────────────────────────────── */}
        {bio.open_reports.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div><p className="section-label">Reports</p><h2>{bio.open_reports.length} report{bio.open_reports.length !== 1 ? "s" : ""}</h2></div>
              <Flag size={20} />
            </div>
            <div className="action-list">
              {bio.open_reports.map((report) => (
                <article className="action-row" key={report.id}>
                  <div>
                    <Flag size={13} style={{ color: report.status === "pending" ? "var(--error, #dc2626)" : "var(--muted)" }} />
                    <strong>{REPORT_REASON_LABELS[report.reason] ?? report.reason}</strong>
                    <span className={`status-chip ${report.status === "pending" ? "status-needs-review" : "status-unknown"}`} style={{ fontSize: "0.72rem" }}>
                      {report.status}
                    </span>
                  </div>
                  <p className="muted" style={{ fontSize: "0.83rem" }}>
                    By {report.reporter_name ?? "Unknown"} · {new Date(report.created_at).toLocaleString()}
                  </p>
                  {report.details && <p style={{ fontSize: "0.83rem" }}>{report.details}</p>}
                  {report.status === "pending" && (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                      {(["reviewed", "actioned", "dismissed"] as const).map((action) => (
                        <form action={triageReportAction} key={action}>
                          <input type="hidden" name="reportId" value={report.id} />
                          <input type="hidden" name="profileId" value={bio.id} />
                          <input type="hidden" name="status" value={action} />
                          <button className="button-secondary" type="submit" style={{ fontSize: "0.78rem", padding: "0.2rem 0.6rem", textTransform: "capitalize" }}>
                            {action}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── Audit trail ───────────────────────────────────────────────── */}
        {bio.recent_audit_events.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div><p className="section-label">History</p><h2>Audit trail</h2></div>
              <Activity size={20} />
            </div>
            <div className="timeline">
              {bio.recent_audit_events.map((ev) => (
                <article className="timeline-row" key={ev.id}>
                  <span>{new Date(ev.created_at).toLocaleString()}</span>
                  <strong>{ev.event_type.replace(/_/g, " ")}</strong>
                  <p>{ev.summary}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
