import Link from "next/link";
import { GitBranch, History, ListChecks, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { generateDocumentGapRecommendations, generateDocumentUpdateRecommendations } from "@/lib/documents/recommendations";
import { listDocuments } from "@/lib/supabase/data";

function reviewSignal(nextReviewDate?: string | null) {
  if (!nextReviewDate) return "Review date missing";

  const reviewAt = new Date(`${nextReviewDate}T00:00:00`);
  if (Number.isNaN(reviewAt.getTime())) return "Review date missing";

  const daysUntilReview = Math.ceil((reviewAt.getTime() - Date.now()) / 86400000);
  if (daysUntilReview < 0) return "Review overdue";
  if (daysUntilReview <= 60) return "Review due soon";
  return "Review scheduled";
}

function versionSignal(revision?: string | null) {
  if (!revision || revision.toLowerCase() === "unknown") return "Revision missing";
  return `Revision ${revision}`;
}

export default async function VersionControlPage() {
  const documents = await listDocuments();
  const inReviewCount = documents.filter((document) => document.status === "in_review").length;
  const approvedCount = documents.filter((document) => document.status === "approved").length;
  const missingRevisionCount = documents.filter((document) => !document.revision || document.revision.toLowerCase() === "unknown").length;
  const dueSoonCount = documents.filter((document) => ["Review overdue", "Review due soon"].includes(reviewSignal(document.nextReviewDate))).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Document Control</p>
          <h1>Version Control</h1>
        </header>

        <section className="command-card-grid" aria-label="Version control summary">
          {[
            ["Controlled documents", documents.length, "SOP metadata, forms, templates, and records in this workspace."],
            ["In review", inReviewCount, "Documents still waiting on controlled review or revision decisions."],
            ["Approved", approvedCount, "Documents marked approved in the current metadata surface."],
            ["Version gaps", missingRevisionCount + dueSoonCount, "Missing revisions plus overdue or near-term review dates."]
          ].map(([label, value, detail]) => (
            <article className="command-card platform-blue" key={label}>
              <div>
                <span>
                  <GitBranch size={16} />
                </span>
                <strong>{label}</strong>
              </div>
              <small>{value}</small>
              <em>{detail}</em>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Workflow</p>
              <h2>Controlled version workflow</h2>
            </div>
            <ListChecks size={22} />
          </div>
          <div className="workflow-steps">
            <span>Capture metadata</span>
            <span>Check revision state</span>
            <span>Review gaps</span>
            <span>Draft updates</span>
            <span>Human approval</span>
          </div>
          <p className="muted">
            This page uses the existing document metadata surface. It does not approve, retire, or replace controlled documents.
          </p>
        </section>

        <section className="table-panel" aria-label="Version controlled document queue">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Version Signal</th>
                <th>Review Signal</th>
                <th>Draft Recommendations</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const gaps = generateDocumentGapRecommendations(document);
                const updates = generateDocumentUpdateRecommendations(document);
                return (
                  <tr key={document.id ?? document.title}>
                    <td>
                      {document.id ? <Link href={`/documents/${document.id}`}>{document.title}</Link> : document.title}
                    </td>
                    <td>{document.status}</td>
                    <td>{document.ownerRole}</td>
                    <td>{versionSignal(document.revision)}</td>
                    <td>{reviewSignal(document.nextReviewDate)}</td>
                    <td>
                      {gaps.length} gap / {updates.length} update
                    </td>
                  </tr>
                );
              })}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6}>No document metadata saved yet. Add SOP metadata before building version history.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Version Control</p>
                <h2>What this page does now</h2>
              </div>
              <History size={22} />
            </div>
            <ul>
              <li>Surfaces revision, status, owner, and review timing from controlled document metadata.</li>
              <li>Connects each record to draft gap and update recommendations.</li>
              <li>Provides a review queue for SOPs, forms, templates, and training-impact documents.</li>
            </ul>
          </div>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Guardrail</p>
                <h2>Human validation boundary</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <ul>
              <li>AI may identify missing revision metadata and recommend draft updates.</li>
              <li>AI may not approve, retire, certify, or replace controlled document review.</li>
              <li>Future persistence can add immutable version history without changing this workflow shape.</li>
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
