import { AppShell } from "@/components/AppShell";
import { persistDocumentRecommendationsAction } from "@/app/documents/actions";
import { generateDocumentGapRecommendations, generateDocumentUpdateRecommendations } from "@/lib/documents/recommendations";
import { getCompanyProfile, getDocument, getDocumentRecommendationHistory } from "@/lib/supabase/data";

export default async function DocumentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const document = await getDocument(id);
  const company = await getCompanyProfile();
  const history = await getDocumentRecommendationHistory(id);
  if (!document) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <p className="section-label">Document detail</p>
            <h1>Document not found</h1>
          </header>
          <section className="panel">
            <p>This document was not found in the current signed-in workspace.</p>
          </section>
        </div>
      </AppShell>
    );
  }

  const gaps = generateDocumentGapRecommendations(document);
  const updates = generateDocumentUpdateRecommendations(document);
  const reportText = [
    "# PredictSafeBIO Document Demo Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Company: ${company.companyName}`,
    `Document ID: ${document.id ?? "Demo document"}`,
    `Title: ${document.title}`,
    `Status: ${document.status}`,
    `Owner role: ${document.ownerRole}`,
    `Area: ${document.area ?? "Missing"}`,
    `Related process: ${document.relatedProcess ?? "Missing"}`,
    `Storage: ${document.storagePath ? `${document.storageBucket}/${document.storagePath}` : "No uploaded file linked"}`,
    "",
    "## Current Gap Recommendations",
    ...gaps.map((gap) => `- **${gap.title}**: ${gap.reason}`),
    "",
    "## Current Draft Update Recommendations",
    ...updates.map((update) => `- **${update.label}**: ${update.proposedChange}`),
    "",
    "## Persisted Recommendation History",
    ...(history.length > 0
      ? history.flatMap((run) => [
          `- Run ${run.createdAt ?? run.runKey}: ${run.recommendations.length} recommendation(s)`,
          ...(run.auditEvent ? [`  - Audit: ${run.auditEvent.summary}`] : [])
        ])
      : ["- No persisted recommendation runs found."]),
    "",
    "## MVP Boundary",
    "Draft - Human Review Required. No FDA, GxP, Part 11, approval, validation, regulatory acceptance, diagnosis, or release claim is made."
  ].join("\n");

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Document detail</p>
          <h1>{document.title}</h1>
        </header>
        {query.message ? <p className="form-message">{query.message}</p> : null}
        <section className="profile-grid">
          {[
            ["Status", document.status],
            ["Owner role", document.ownerRole],
            ["Area", document.area ?? "Missing"],
            ["Related process", document.relatedProcess ?? "Missing"],
            ["Revision", document.revision ?? "Missing"],
            ["Next review", document.nextReviewDate ?? "Missing"],
            ["Uploaded file", document.storagePath ? `${document.storageBucket}/${document.storagePath}` : "No file linked"]
          ].map(([label, value]) => (
            <article className="profile-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Demo export</p>
            <h2>Shareable document report</h2>
            <p className="muted">Downloads a draft-only text report for demo review. It is not a controlled document export.</p>
          </div>
          <a
            className="button-secondary"
            download={`${document.title.replace(/[^a-zA-Z0-9._-]/g, "-")}-demo-report.txt`}
            href={`data:text/markdown;charset=utf-8,${encodeURIComponent(reportText)}`}
          >
            Download report
          </a>
        </section>
        <form action={persistDocumentRecommendationsAction} className="panel inline-action-panel">
          <input type="hidden" name="documentId" value={document.id} />
          <div>
            <p className="section-label">Persistence</p>
            <h2>Save draft recommendations</h2>
            <p className="muted">
              Persists gap and draft update recommendations to Supabase and writes an audit event. All recommendations remain draft-only.
            </p>
          </div>
          <button className="button-primary" type="submit">
            Persist recommendations
          </button>
        </form>
        <section className="split-list wide">
          <div className="panel">
            <h2>Gap recommendations</h2>
            <ul>
              {gaps.map((gap) => (
                <li key={gap.title}>
                  <strong>{gap.title}</strong>
                  <span>{gap.reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2>Draft update recommendations</h2>
            <ul>
              {updates.map((update) => (
                <li key={update.title}>
                  <strong>{update.label}</strong>
                  <span>{update.proposedChange}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="panel">
          <h2>Persisted recommendation history</h2>
          {history.length === 0 ? (
            <p className="muted">No persisted recommendation runs found yet. Use Save draft recommendations to create immutable draft history.</p>
          ) : null}
          <div className="history-list">
            {history.map((run) => (
              <article className="history-row" key={run.runKey}>
                <span>{run.createdAt ?? run.runKey}</span>
                <strong>{run.recommendations.length} draft recommendation{run.recommendations.length === 1 ? "" : "s"}</strong>
                {run.auditEvent ? <p>{run.auditEvent.summary}</p> : <p>No linked audit event found for this run.</p>}
                <ul>
                  {run.recommendations.map((recommendation) => (
                    <li key={recommendation.id}>
                      <strong>{recommendation.label}</strong>
                      <span>{recommendation.title}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
