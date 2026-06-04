export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, EyeOff, Flag, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { listProviderBiosByStatus, listBioReports } from "@/lib/supabase/moderation-service";
import type { ReviewStatus } from "@/lib/supabase/moderation-service";
import { canViewPlatform } from "@/lib/role-permissions";

/**
 * /admin/moderation — Content Moderation Queue
 *
 * Three tabs: Pending | Flags & Reports | Taken Down
 * Gated: admin tier and above only.
 */

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending:           "Pending",
  approved:          "Approved",
  changes_requested: "Changes Requested",
  rejected:          "Rejected",
  taken_down:        "Taken Down",
};

const REVIEW_STATUS_CLASS: Record<ReviewStatus, string> = {
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

export default async function ModerationPage({ searchParams }: Props) {
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

  const params = await searchParams;
  const tab = params.tab ?? "pending";

  const [pendingBios, takenDownBios, pendingReports] = await Promise.all([
    listProviderBiosByStatus("pending"),
    listProviderBiosByStatus("taken_down"),
    listBioReports(profile?.organization_id ?? "", "pending"),
  ]);

  const tabs = [
    { id: "pending",  label: "Pending Review",  count: pendingBios.length,   icon: Clock },
    { id: "reports",  label: "Flags & Reports",  count: pendingReports.length, icon: Flag },
    { id: "takendown",label: "Taken Down",        count: takenDownBios.length, icon: EyeOff },
  ];

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Admin</p>
          <h1>Content Moderation</h1>
          <p className="muted">Review provider bios, triage reports, and manage takedowns.</p>
        </header>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {tabs.map(({ id, label, count, icon: Icon }) => (
            <Link
              key={id}
              href={`/admin/moderation?tab=${id}`}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0.6rem 1rem",
                borderBottom: tab === id ? "2px solid var(--primary, #2563eb)" : "2px solid transparent",
                fontWeight: tab === id ? 600 : 400,
                fontSize: "0.875rem",
                color: tab === id ? "var(--primary, #2563eb)" : "var(--muted)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span style={{
                  background: tab === id ? "var(--primary, #2563eb)" : "var(--muted)",
                  color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: "0.72rem", fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* ── Pending Review Tab ────────────────────────────────────────── */}
        {tab === "pending" && (
          <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div className="panel-heading" style={{ padding: "1rem 1.25rem 0.75rem" }}>
              <div>
                <p className="section-label">Provider Bios</p>
                <h2>{pendingBios.length} awaiting review</h2>
              </div>
              <ShieldCheck size={20} />
            </div>
            {pendingBios.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <CheckCircle2 size={28} style={{ margin: "0 auto 0.5rem", color: "var(--success, #16a34a)" }} />
                <p className="muted">Queue is clear — no bios pending review.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      {["Provider", "Specialty", "NPI", "Status", "NPI ✓", "Reports", "Submitted", ""].map((h) => (
                        <th key={h} style={{ padding: "0.6rem 1rem", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBios.map((bio) => (
                      <tr key={bio.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 500 }}>
                          {bio.provider_name ?? <em className="muted">Unnamed</em>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "var(--muted)" }}>{bio.specialty ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
                          {bio.npi_number ?? <span className="muted">Not provided</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span className={`status-chip ${REVIEW_STATUS_CLASS[bio.review_status]}`} style={{ fontSize: "0.75rem" }}>
                            {REVIEW_STATUS_LABELS[bio.review_status]}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {bio.npi_verified
                            ? <CheckCircle2 size={16} style={{ color: "var(--success, #16a34a)" }} />
                            : <AlertTriangle size={16} style={{ color: "var(--warn, #d97706)" }} />}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {bio.report_count > 0
                            ? <span style={{ color: "var(--error, #dc2626)", fontWeight: 600 }}>{bio.report_count} 🚩</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {bio.submitted_at ? new Date(bio.submitted_at).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <Link href={`/admin/moderation/${bio.id}`} className="button-secondary" style={{ fontSize: "0.8rem", padding: "0.25rem 0.75rem" }}>
                            Review →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Flags & Reports Tab ───────────────────────────────────────── */}
        {tab === "reports" && (
          <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div className="panel-heading" style={{ padding: "1rem 1.25rem 0.75rem" }}>
              <div>
                <p className="section-label">User Reports</p>
                <h2>{pendingReports.length} pending</h2>
              </div>
              <Flag size={20} />
            </div>
            {pendingReports.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <CheckCircle2 size={28} style={{ margin: "0 auto 0.5rem", color: "var(--success, #16a34a)" }} />
                <p className="muted">No pending reports.</p>
              </div>
            ) : (
              <div className="action-list" style={{ padding: "0.5rem 1rem" }}>
                {pendingReports.map((report) => (
                  <article className="action-row" key={report.id}>
                    <div>
                      <Flag size={14} style={{ color: "var(--error, #dc2626)" }} />
                      <strong>{REPORT_REASON_LABELS[report.reason] ?? report.reason}</strong>
                      <span className="status-needs-review" style={{ fontSize: "0.75rem" }}>Pending</span>
                    </div>
                    <p style={{ fontSize: "0.85rem" }}>
                      Reported by <strong>{report.reporter_name ?? "Unknown"}</strong>
                      {" · "}{new Date(report.created_at).toLocaleString()}
                    </p>
                    {report.details && <p className="muted" style={{ fontSize: "0.82rem" }}>{report.details}</p>}
                    <Link href={`/admin/moderation/${report.target_id}?tab=reports`} className="text-link" style={{ fontSize: "0.82rem" }}>
                      View bio & triage →
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Taken Down Tab ────────────────────────────────────────────── */}
        {tab === "takendown" && (
          <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div className="panel-heading" style={{ padding: "1rem 1.25rem 0.75rem" }}>
              <div>
                <p className="section-label">Hidden Bios</p>
                <h2>{takenDownBios.length} taken down</h2>
              </div>
              <EyeOff size={20} />
            </div>
            <div className="verification-pending-box" style={{ margin: "0 1.25rem 1rem" }}>
              <EyeOff size={14} />
              <span>Data is preserved and audit-safe. Takedowns are reversible — click a row to restore.</span>
            </div>
            {takenDownBios.length === 0 ? (
              <p className="muted" style={{ padding: "1.5rem" }}>No bios are currently taken down.</p>
            ) : (
              <div className="action-list" style={{ padding: "0.5rem 1rem" }}>
                {takenDownBios.map((bio) => (
                  <article className="action-row" key={bio.id}>
                    <div>
                      <EyeOff size={14} />
                      <strong>{bio.provider_name ?? "Unnamed provider"}</strong>
                      <span className="status-critical" style={{ fontSize: "0.75rem" }}>Taken down</span>
                    </div>
                    <p className="muted" style={{ fontSize: "0.85rem" }}>
                      {bio.specialty ?? "No specialty"} · NPI: {bio.npi_number ?? "—"}
                      {bio.reviewed_at && ` · Taken down ${new Date(bio.reviewed_at).toLocaleDateString()}`}
                    </p>
                    <Link href={`/admin/moderation/${bio.id}`} className="text-link" style={{ fontSize: "0.82rem" }}>
                      View & restore →
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
