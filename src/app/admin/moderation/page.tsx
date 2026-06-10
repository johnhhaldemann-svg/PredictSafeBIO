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
          <div className="page-header-left">
            <p className="section-label">Platform Admin</p>
            <h1>Content Moderation</h1>
            <p className="muted">Review provider bios, triage reports, and manage takedowns.</p>
          </div>
          <Link className="button-secondary" href="/admin/dashboard">← Command Center</Link>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Moderation queue summary">
          <article className={`command-card ${pendingBios.length > 0 ? "platform-blue" : "platform-green"}`}>
            <div><span><Clock size={16} /></span><strong>Pending review</strong></div>
            <small>{pendingBios.length}</small>
            <em>{pendingBios.length > 0 ? "Provider bios awaiting a decision." : "Review queue is clear."}</em>
          </article>
          <article className={`command-card ${pendingReports.length > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><Flag size={16} /></span><strong>Open reports</strong></div>
            <small>{pendingReports.length}</small>
            <em>{pendingReports.length > 0 ? "User flags awaiting triage." : "No pending reports."}</em>
          </article>
          <article className="command-card platform-navy">
            <div><span><EyeOff size={16} /></span><strong>Taken down</strong></div>
            <small>{takenDownBios.length}</small>
            <em>Bios hidden from public view.</em>
          </article>
        </section>

        {/* Tab bar */}
        <nav className="tab-nav" aria-label="Moderation tabs">
          {tabs.map(({ id, label, count, icon: Icon }) => (
            <Link
              key={id}
              href={`/admin/moderation?tab=${id}`}
              className={`tab-nav__item${tab === id ? " tab-nav__item--active" : ""}`}
            >
              <Icon size={14} />
              {label}
              {count > 0 && <span className="tab-nav__badge">{count}</span>}
            </Link>
          ))}
        </nav>

        {/* ── Pending Review Tab ────────────────────────────────────────── */}
        {tab === "pending" && (
          <section className="table-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Provider Bios</p>
                <h2>{pendingBios.length} awaiting review</h2>
              </div>
              <ShieldCheck size={20} />
            </div>
            {pendingBios.length === 0 ? (
              <div className="empty-state-card">
                <p className="empty-state-title">Queue is clear</p>
                <p className="muted">No bios pending review.</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {["Provider", "Specialty", "NPI", "Status", "NPI ✓", "Reports", "Submitted", ""].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBios.map((bio) => (
                      <tr key={bio.id}>
                        <td>
                          {bio.provider_name ?? <em className="muted">Unnamed</em>}
                        </td>
                        <td className="muted">{bio.specialty ?? "—"}</td>
                        <td><code>{bio.npi_number ?? <span className="muted">Not provided</span>}</code></td>
                        <td>
                          <span className={`status-chip ${REVIEW_STATUS_CLASS[bio.review_status]}`}>
                            {REVIEW_STATUS_LABELS[bio.review_status]}
                          </span>
                        </td>
                        <td>
                          {bio.npi_verified
                            ? <CheckCircle2 size={16} style={{ color: "var(--green)" }} />
                            : <AlertTriangle size={16} style={{ color: "var(--amber)" }} />}
                        </td>
                        <td>
                          {bio.report_count > 0
                            ? <strong style={{ color: "var(--red)" }}>{bio.report_count} 🚩</strong>
                            : <span className="muted">—</span>}
                        </td>
                        <td className="muted">
                          {bio.submitted_at ? new Date(bio.submitted_at).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          <Link href={`/admin/moderation/${bio.id}`} className="button-secondary compact">
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
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">User Reports</p>
                <h2>{pendingReports.length} pending</h2>
              </div>
              <Flag size={20} />
            </div>
            {pendingReports.length === 0 ? (
              <div className="empty-state-card">
                <p className="empty-state-title">No pending reports</p>
                <p className="muted">Reports raised by users will appear here for triage.</p>
              </div>
            ) : (
              <div className="action-list">
                {pendingReports.map((report) => (
                  <article className="action-row" key={report.id}>
                    <div>
                      <Flag size={14} style={{ color: "var(--red)" }} />
                      <strong>{REPORT_REASON_LABELS[report.reason] ?? report.reason}</strong>
                      <span className="status-chip status-needs-review">Pending</span>
                    </div>
                    <p>
                      Reported by <strong>{report.reporter_name ?? "Unknown"}</strong>
                      {" · "}{new Date(report.created_at).toLocaleString()}
                    </p>
                    {report.details && <p className="muted">{report.details}</p>}
                    <Link href={`/admin/moderation/${report.target_id}?tab=reports`} className="text-link">
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
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Hidden Bios</p>
                <h2>{takenDownBios.length} taken down</h2>
              </div>
              <EyeOff size={20} />
            </div>
            <div className="verification-pending-box">
              <EyeOff size={14} />
              <span>Data is preserved and audit-safe. Takedowns are reversible — click a row to restore.</span>
            </div>
            {takenDownBios.length === 0 ? (
              <div className="empty-state-card">
                <p className="empty-state-title">Nothing taken down</p>
                <p className="muted">No bios are currently hidden from public view.</p>
              </div>
            ) : (
              <div className="action-list">
                {takenDownBios.map((bio) => (
                  <article className="action-row" key={bio.id}>
                    <div>
                      <EyeOff size={14} />
                      <strong>{bio.provider_name ?? "Unnamed provider"}</strong>
                      <span className="status-chip status-critical">Taken down</span>
                    </div>
                    <p className="muted">
                      {bio.specialty ?? "No specialty"} · NPI: {bio.npi_number ?? "—"}
                      {bio.reviewed_at && ` · Taken down ${new Date(bio.reviewed_at).toLocaleDateString()}`}
                    </p>
                    <Link href={`/admin/moderation/${bio.id}`} className="text-link">
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
