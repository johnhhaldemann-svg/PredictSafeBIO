export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity, CheckCircle2, EyeOff, Flag,
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
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Admin · <Link href="/admin/moderation">Moderation Queue</Link> / Review</p>
            <h1>{bio.provider_name ?? "Unnamed Provider"}</h1>
            <div className="form-action-row">
              <span className={`status-chip ${STATUS_CLASS[bio.review_status]}`}>
                {STATUS_LABEL[bio.review_status]}
              </span>
              {bio.npi_verified
                ? <span className="status-chip status-current">NPI Verified ✓</span>
                : <span className="status-chip status-needs-review">NPI Unverified</span>}
              {bio.report_count > 0 && (
                <span className="status-chip status-missing">
                  🚩 {bio.report_count} open report{bio.report_count !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <Link href="/admin/moderation" className="button-secondary">← Queue</Link>
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
                <em className="muted">{bio.review_notes}</em>
              </article>
            )}
          </div>
          {bio.npi_number && (
            <a
              href={`https://npiregistry.cms.hhs.gov/search?number=${bio.npi_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Look up NPI {bio.npi_number} on NPPES registry →
            </a>
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
              ? <CheckCircle2 size={20} style={{ color: "var(--green)" }} />
              : <ShieldAlert size={20} style={{ color: "var(--amber)" }} />}
          </div>
          {npiComplete && (
            <div className="verification-pass-box">
              <CheckCircle2 size={14} />
              <span>All 7 items verified — NPI checklist complete.</span>
            </div>
          )}
          <div className="action-list">
            {NPI_CHECKLIST_KEYS.map((key) => {
              const item = bio.npi_checklist[key];
              const checked = item?.checked ?? false;
              return (
                <article className="action-row" key={key}>
                  <div>
                    {checked
                      ? <CheckCircle2 size={15} style={{ color: "var(--green)" }} />
                      : <XCircle size={15} className="muted" />}
                    <strong>{NPI_CHECKLIST_LABELS[key]}</strong>
                  </div>
                  <form action={updateNpiChecklistAction} className="form-action-row">
                    <input type="hidden" name="profileId" value={bio.id} />
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="checked" value={String(!checked)} />
                    <button className="button-secondary compact" type="submit">
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
            <p className="muted">
              All decisions are logged to the immutable audit trail and cannot be undone silently.
              Notes are shared back to the provider when requesting changes or rejecting.
            </p>

            {/* Approve */}
            {!isApproved && (
              <details className="stacked-form">
                <summary className="details-summary">✅ Approve bio</summary>
                <form action={approveProfileAction} className="stacked-form">
                  <input type="hidden" name="profileId" value={bio.id} />
                  <label>
                    Optional notes to provider
                    <textarea name="notes" rows={2} placeholder="Great — bio looks accurate and complete." />
                  </label>
                  <button className="button-primary" type="submit">Approve &amp; make live</button>
                </form>
              </details>
            )}

            {/* Request changes */}
            {isPending && (
              <details className="stacked-form">
                <summary className="details-summary">✏️ Request changes</summary>
                <form action={requestChangesAction} className="stacked-form">
                  <input type="hidden" name="profileId" value={bio.id} />
                  <label>
                    Notes for provider <span aria-hidden="true">*</span>
                    <textarea name="notes" required rows={3} placeholder="Please update your NPI number — the one on file doesn't match the NPPES registry." />
                  </label>
                  <button className="button-secondary" type="submit">Send back for revision</button>
                </form>
              </details>
            )}

            {/* Reject */}
            {!isApproved && (
              <details className="stacked-form">
                <summary className="details-summary">❌ Reject bio</summary>
                <form action={rejectProfileAction} className="stacked-form">
                  <input type="hidden" name="profileId" value={bio.id} />
                  <label>
                    Rejection reason <span aria-hidden="true">*</span>
                    <textarea name="notes" required rows={3} placeholder="Credentials could not be verified in NPPES. Suspected fraudulent NPI." />
                  </label>
                  <button className="button-secondary" type="submit">Reject permanently</button>
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
          <div className="ai-context-bar ai-context-bar--warning">
            <EyeOff size={14} />
            <span>Takedown hides a profile immediately without deleting data. Fully reversible and audit-safe.</span>
          </div>
          {isTakenDown ? (
            <form action={restoreProfileAction}>
              <input type="hidden" name="profileId" value={bio.id} />
              <button className="button-primary" type="submit">Restore to public view</button>
            </form>
          ) : (
            <details className="stacked-form">
              <summary className="details-summary">🔻 Take down this bio</summary>
              <form action={takedownProfileAction} className="stacked-form">
                <input type="hidden" name="profileId" value={bio.id} />
                <label>
                  Reason for takedown <span aria-hidden="true">*</span>
                  <textarea name="notes" required rows={2} placeholder="Taken down pending investigation of fraud report." />
                </label>
                <button className="button-secondary" type="submit">Take down now</button>
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
                    <Flag size={13} className={report.status === "pending" ? "status-missing" : "muted"} />
                    <strong>{REPORT_REASON_LABELS[report.reason] ?? report.reason}</strong>
                    <span className={`status-chip ${report.status === "pending" ? "status-needs-review" : "status-unknown"}`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="muted">
                    By {report.reporter_name ?? "Unknown"} · {new Date(report.created_at).toLocaleString()}
                  </p>
                  {report.details && <p>{report.details}</p>}
                  {report.status === "pending" && (
                    <div className="form-action-row">
                      {(["reviewed", "actioned", "dismissed"] as const).map((action) => (
                        <form action={triageReportAction} key={action}>
                          <input type="hidden" name="reportId" value={report.id} />
                          <input type="hidden" name="profileId" value={bio.id} />
                          <input type="hidden" name="status" value={action} />
                          <button className="button-secondary compact" type="submit">
                            {action[0].toUpperCase() + action.slice(1)}
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
