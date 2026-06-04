export const dynamic = "force-dynamic";

import Link from "next/link";
import { CheckCircle2, GitBranch, History, ListChecks, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { generateDocumentGapRecommendations, generateDocumentUpdateRecommendations } from "@/lib/documents/recommendations";
import { formatDocumentStatus } from "@/lib/display-labels";
import { getFoundationAdminAccessSummary, listDocuments } from "@/lib/supabase/data";
import { getVersionHistories } from "@/lib/supabase/version-service";
import { approvalDecisionAction, logVersionAction, requestApprovalAction } from "./actions";

const APPROVAL_CLASS: Record<string, string> = {
  approved: "status-current",
  pending: "status-needs-review",
  rejected: "status-missing",
  withdrawn: ""
};

function reviewSignal(nextReviewDate?: string | null) {
  if (!nextReviewDate) return { label: "Review date missing", urgent: false };
  const reviewAt = new Date(`${nextReviewDate}T00:00:00`);
  if (Number.isNaN(reviewAt.getTime())) return { label: "Review date missing", urgent: false };
  const days = Math.ceil((reviewAt.getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Review overdue", urgent: true };
  if (days <= 60) return { label: `Due in ${days}d`, urgent: true };
  return { label: new Date(nextReviewDate).toLocaleDateString(), urgent: false };
}

function versionSignal(revision?: string | null) {
  if (!revision || revision.toLowerCase() === "unknown") return { label: "Revision missing", urgent: true };
  return { label: `Rev ${revision}`, urgent: false };
}

type Props = {
  searchParams: Promise<{ message?: string }>;
};

export default async function VersionControlPage({ searchParams }: Props) {
  const params = await searchParams;

  const [documents, versionHistories, adminAccess] = await Promise.all([
    listDocuments().catch(() => []),
    getVersionHistories().catch(() => new Map()),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  const inReviewCount = documents.filter((d) => d.status === "in_review").length;
  const approvedCount = documents.filter((d) => d.status === "approved").length;
  const missingRevisionCount = documents.filter((d) => !d.revision || d.revision.toLowerCase() === "unknown").length;
  const overdueOrDue = documents.filter((d) => reviewSignal(d.nextReviewDate).urgent).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Document Control</p>
          <h1>Version Control</h1>
        </header>

        <section className="command-card-grid" aria-label="Version control summary">
          {([
            ["Controlled documents", documents.length, "SOP metadata, forms, templates, and records."],
            ["In review", inReviewCount, "Waiting on controlled review or revision."],
            ["Approved", approvedCount, "Marked approved in current metadata."],
            ["Needs attention", missingRevisionCount + overdueOrDue, "Missing revisions or overdue / near-term review dates."]
          ] as const).map(([label, value, detail]) => (
            <article className="command-card platform-blue" key={label}>
              <div><span><GitBranch size={16} /></span><strong>{label}</strong></div>
              <small>{value}</small>
              <em>{detail}</em>
            </article>
          ))}
        </section>

        {params.message && <p className="form-message">{params.message}</p>}

        <section className={`panel access-banner ${adminAccess.isOwner ? "access-enabled" : "access-readonly"}`}>
          <strong>{adminAccess.isOwner ? "Owner access" : "Read-only"}</strong>
          <span>{adminAccess.message}</span>
        </section>

        {/* Document table with inline version history */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Document register</p>
              <h2>{documents.length} document{documents.length !== 1 ? "s" : ""}</h2>
            </div>
            <History size={22} />
          </div>

          {documents.length === 0 ? (
            <p className="muted">
              No document metadata saved yet.{" "}
              <Link href="/documents">Add SOP metadata</Link> before building version history.
            </p>
          ) : (
            <div className="action-list">
              {documents.map((doc) => {
                const vs = versionSignal(doc.revision);
                const rs = reviewSignal(doc.nextReviewDate);
                const history = doc.id ? versionHistories.get(doc.id) : null;
                const gaps = generateDocumentGapRecommendations(doc);
                const updates = generateDocumentUpdateRecommendations(doc);
                const latestApproval = history?.latestApproval;
                const versionList = history?.versions ?? [];

                return (
                  <article className="action-row" key={doc.id ?? doc.title} style={{ gap: 12 }}>
                    {/* Header row */}
                    <div>
                      <strong>
                        {doc.id
                          ? <Link href={`/documents/${doc.id}`}>{doc.title}</Link>
                          : doc.title}
                      </strong>
                      <span>
                        <span className={vs.urgent ? "status-missing" : ""}>{vs.label}</span>
                        {" · "}
                        <span className={rs.urgent ? "status-expired" : ""}>{rs.label}</span>
                        {" · "}
                        <span className={doc.status === "approved" ? "status-current" : "status-needs-review"}>
                          {formatDocumentStatus(doc.status)}
                        </span>
                        {latestApproval && (
                          <>
                            {" · "}
                            <span className={APPROVAL_CLASS[latestApproval.approvalStatus]}>
                              {latestApproval.approvalStatus}
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Draft recommendation counts */}
                    {(gaps.length > 0 || updates.length > 0) && (
                      <p className="muted" style={{ fontSize: 12 }}>
                        {gaps.length > 0 && `${gaps.length} draft gap${gaps.length !== 1 ? "s" : ""}`}
                        {gaps.length > 0 && updates.length > 0 && " · "}
                        {updates.length > 0 && `${updates.length} draft update${updates.length !== 1 ? "s" : ""}`}
                        {" — Draft, Human Review Required"}
                      </p>
                    )}

                    {/* Version history */}
                    {versionList.length > 0 && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ fontSize: 12, cursor: "pointer", color: "var(--muted)" }}>
                          {versionList.length} version{versionList.length !== 1 ? "s" : ""} — click to expand
                        </summary>
                        <div className="action-list compact-list" style={{ marginTop: 8 }}>
                          {versionList.map((v: import('@/lib/supabase/version-service').DocumentVersion) => (
                            <article className="action-row" key={v.id} style={{ padding: "6px 0" }}>
                              <div>
                                <strong>{v.versionLabel}</strong>
                                <span style={{ fontSize: 11 }}>
                                  {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}
                                </span>
                              </div>
                              <p style={{ fontSize: 12 }}>{v.changeSummary ?? "No change summary recorded."}</p>
                            </article>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Owner actions */}
                    {adminAccess.signedIn && doc.id && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {/* Log version */}
                        <details>
                          <summary className="button-secondary compact" style={{ cursor: "pointer" }}>
                            <Plus size={13} style={{ display: "inline", marginRight: 3 }} />
                            Log version
                          </summary>
                          <form action={logVersionAction} className="stacked-form" style={{ marginTop: 8 }}>
                            <input type="hidden" name="documentId" value={doc.id} />
                            <div className="form-grid">
                              <label style={{ fontSize: 12 }}>
                                Version label
                                <input name="versionLabel" type="text" placeholder={doc.revision ? `e.g. ${doc.revision}.1` : "e.g. v1.0"} required style={{ fontSize: 12 }} />
                              </label>
                              <label style={{ fontSize: 12 }}>
                                Change summary
                                <input name="changeSummary" type="text" placeholder="What changed in this revision?" style={{ fontSize: 12 }} />
                              </label>
                            </div>
                            <button className="button-secondary compact" type="submit">Save version</button>
                          </form>
                        </details>

                        {/* Request approval */}
                        {(!latestApproval || latestApproval.approvalStatus !== "pending") && (
                          <details>
                            <summary className="button-secondary compact" style={{ cursor: "pointer" }}>
                              Request approval
                            </summary>
                            <form action={requestApprovalAction} className="stacked-form" style={{ marginTop: 8 }}>
                              <input type="hidden" name="documentId" value={doc.id} />
                              {versionList[0]?.id && (
                                <input type="hidden" name="documentVersionId" value={versionList[0].id} />
                              )}
                              <div className="form-grid">
                                <label style={{ fontSize: 12 }}>
                                  Reviewer role
                                  <select name="reviewerRole" defaultValue="quality_unit" style={{ fontSize: 12 }}>
                                    <option value="quality_unit">Quality Unit</option>
                                    <option value="qa">QA</option>
                                    <option value="biosafety_officer">Biosafety Officer</option>
                                    <option value="regulatory_affairs">Regulatory Affairs</option>
                                  </select>
                                </label>
                                <label style={{ fontSize: 12 }}>
                                  Notes
                                  <input name="notes" type="text" placeholder="e.g. Annual review cycle" style={{ fontSize: 12 }} />
                                </label>
                              </div>
                              <button className="button-secondary compact" type="submit">Send request</button>
                            </form>
                          </details>
                        )}

                        {/* Approve / reject pending */}
                        {adminAccess.isOwner && latestApproval?.approvalStatus === "pending" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <form action={approvalDecisionAction}>
                              <input type="hidden" name="approvalId" value={latestApproval.id} />
                              <input type="hidden" name="documentId" value={doc.id} />
                              <input type="hidden" name="decision" value="approved" />
                              <button className="button-primary compact" type="submit">
                                <CheckCircle2 size={13} /> Approve
                              </button>
                            </form>
                            <form action={approvalDecisionAction}>
                              <input type="hidden" name="approvalId" value={latestApproval.id} />
                              <input type="hidden" name="documentId" value={doc.id} />
                              <input type="hidden" name="decision" value="rejected" />
                              <button className="button-secondary compact" type="submit">Reject</button>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div><p className="section-label">Workflow</p><h2>Controlled version workflow</h2></div>
              <ListChecks size={22} />
            </div>
            <div className="workflow-steps">
              <span>Capture metadata</span>
              <span>Log revision</span>
              <span>Request approval</span>
              <span>Owner approves</span>
              <span>Record closed</span>
            </div>
            <p className="muted">
              This page uses the existing document metadata surface. It does not approve, retire,
              or replace controlled documents — that remains a human QA decision.
            </p>
          </div>
          <div className="panel">
            <div className="panel-heading">
              <div><p className="section-label">AI Guardrail</p><h2>Human validation boundary</h2></div>
              <ShieldCheck size={22} />
            </div>
            <ul>
              <li>AI may identify missing revision metadata and draft update recommendations.</li>
              <li>AI may not approve, retire, certify, or replace controlled document review.</li>
              <li>All version logs and approvals are <strong>Draft — Human Review Required</strong> until owner-closed.</li>
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
