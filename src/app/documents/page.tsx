export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Document Control – PredictSafeBIO" };
import { Bot, FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createDocumentMetadataAction } from "@/app/documents/actions";
import { generateDocumentGapRecommendations } from "@/lib/documents/recommendations";
import { formatDocumentStatus, formatDocumentType } from "@/lib/display-labels";
import { getAuthSummary, listDocuments } from "@/lib/supabase/data";
import { canCreateWorkspaceRecord } from "@/lib/role-permissions";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const [documents, auth] = await Promise.all([listDocuments(), getAuthSummary()]);
  const canCreateDocuments = canCreateWorkspaceRecord(auth);
  const totalDocumentGaps = documents.reduce((sum, doc) => sum + generateDocumentGapRecommendations(doc).length, 0);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Document Control</p>
            <h1>SOPs, Forms &amp; Templates</h1>
          </div>
          <Link className="button-primary" href="/documents">
            <FileText size={14} />
            Register document
          </Link>
        </header>

        {documents.length > 0 && totalDocumentGaps > 0 ? (
          <div className="ai-context-bar">
            <Bot size={15} />
            <span>
              <strong>AI identified {totalDocumentGaps} document gap{totalDocumentGaps !== 1 ? "s" : ""}.</strong>{" "}
              Review recommended updates and missing evidence across your controlled records.
            </span>
            <Link className="ai-fill-btn" href="/documents">
              View gaps
            </Link>
          </div>
        ) : null}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Controlled Records Linkage</p>
              <h2>Create controlled document metadata</h2>
            </div>
          </div>
          {params.message ? <p className="form-message">{params.message}</p> : null}
          {canCreateDocuments ? (
            <form action={createDocumentMetadataAction} className="document-form" encType="multipart/form-data">
              <div className="form-grid">
                <label>
                  Title
                  <input name="title" placeholder="e.g. Sterility Assay Review SOP" required />
                </label>
                <label>
                  Document type
                  <select name="documentType" defaultValue="sop">
                    <option value="sop">SOP</option>
                    <option value="batch_record">Batch Record</option>
                    <option value="protocol">Protocol</option>
                    <option value="training">Training</option>
                    <option value="validation">Validation</option>
                    <option value="policy">Policy</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Status
                  <select name="status" defaultValue="draft">
                    <option value="draft">Draft</option>
                    <option value="in_review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="obsolete">Obsolete</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>
                <label>
                  Owner role
                  <select name="ownerRole" defaultValue="qa">
                    <option value="responsible_scientist">Responsible Scientist</option>
                    <option value="principal_investigator">Principal Investigator</option>
                    <option value="qa">QA</option>
                    <option value="quality_unit">Quality Unit</option>
                    <option value="biosafety_officer">Biosafety Officer</option>
                    <option value="ehs">EHS</option>
                    <option value="manufacturing_lead">Manufacturing Lead</option>
                    <option value="validation_lead">Validation Lead</option>
                    <option value="regulatory_affairs">Regulatory Affairs</option>
                    <option value="clinical_operations">Clinical Operations</option>
                  </select>
                </label>
                <label>
                  Area
                  <input name="area" placeholder="e.g. QC Microbiology Lab" />
                </label>
                <label>
                  Related process
                  <input name="relatedProcess" placeholder="e.g. Sterility assay review" />
                </label>
                <label>
                  Revision
                  <input name="revision" placeholder="e.g. 1.0" />
                </label>
                <label>
                  Next review date
                  <input name="nextReviewDate" type="date" />
                </label>
              </div>
              <label>
                Source file
                <input name="documentFile" type="file" />
              </label>
              <label>
                Known gaps
                <textarea
                  name="gaps"
                  placeholder={"e.g. Review timing not documented\nOwner sign-off procedure unclear"}
                  rows={4}
                />
              </label>
              <button className="button-primary" type="submit">
                Save controlled metadata
              </button>
            </form>
          ) : (
            <p className="form-message">
              Sign in to create controlled document records.{" "}
              <Link href="/login?next=/documents">Go to sign in</Link>
            </p>
          )}
        </section>
        <section className="document-grid">
          {documents.length === 0 ? (
            <article className="document-card">
              <strong>No document metadata saved yet</strong>
              <p>Create a controlled metadata record above to generate draft gap and AI-assisted update recommendations.</p>
            </article>
          ) : null}
          {documents.map((document) => {
            const gaps = generateDocumentGapRecommendations(document);
            return (
              <Link href={`/documents/${document.id}`} className="document-card" key={document.id}>
                <span>{formatDocumentType(document.documentType)}</span>
                <strong>{document.title}</strong>
                <p>Status: {formatDocumentStatus(document.status)}</p>
                <p>{gaps.length} document gap recommendation{gaps.length === 1 ? "" : "s"}</p>
              </Link>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
