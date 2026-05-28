import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createDocumentMetadataAction } from "@/app/documents/actions";
import { generateDocumentGapRecommendations } from "@/lib/documents/recommendations";
import { listDocuments } from "@/lib/supabase/data";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const documents = await listDocuments();

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Document intelligence</p>
          <h1>Metadata and gap recommendations</h1>
        </header>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Live metadata</p>
              <h2>Create document metadata</h2>
            </div>
          </div>
          {params.message ? <p className="form-message">{params.message}</p> : null}
          <form action={createDocumentMetadataAction} className="document-form" encType="multipart/form-data">
            <div className="form-grid">
              <label>
                Title
                <input name="title" defaultValue="Sterility Assay Review SOP" required />
              </label>
              <label>
                Document type
                <select name="documentType" defaultValue="sop">
                  <option value="sop">sop</option>
                  <option value="batch_record">batch_record</option>
                  <option value="protocol">protocol</option>
                  <option value="training">training</option>
                  <option value="validation">validation</option>
                  <option value="policy">policy</option>
                  <option value="other">other</option>
                </select>
              </label>
              <label>
                Status
                <select name="status" defaultValue="in_review">
                  <option value="draft">draft</option>
                  <option value="in_review">in_review</option>
                  <option value="approved">approved</option>
                  <option value="obsolete">obsolete</option>
                  <option value="unknown">unknown</option>
                </select>
              </label>
              <label>
                Owner role
                <select name="ownerRole" defaultValue="qa">
                  <option value="responsible_scientist">responsible_scientist</option>
                  <option value="principal_investigator">principal_investigator</option>
                  <option value="qa">qa</option>
                  <option value="quality_unit">quality_unit</option>
                  <option value="biosafety_officer">biosafety_officer</option>
                  <option value="ehs">ehs</option>
                  <option value="manufacturing_lead">manufacturing_lead</option>
                  <option value="validation_lead">validation_lead</option>
                  <option value="regulatory_affairs">regulatory_affairs</option>
                  <option value="clinical_operations">clinical_operations</option>
                </select>
              </label>
              <label>
                Area
                <input name="area" defaultValue="QC Microbiology Lab" />
              </label>
              <label>
                Related process
                <input name="relatedProcess" defaultValue="Sterility assay review" />
              </label>
              <label>
                Revision
                <input name="revision" defaultValue="0.3" />
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
                defaultValue={"QA assessment timing not explicit\nBatch impact language needs owner review"}
                rows={4}
              />
            </label>
            <button className="button-primary" type="submit">
              Save metadata
            </button>
          </form>
        </section>
        <section className="document-grid">
          {documents.length === 0 ? (
            <article className="document-card">
              <span>Live workspace</span>
              <strong>No document metadata saved yet</strong>
              <p>Create a document metadata record above to generate draft gap and update recommendations.</p>
            </article>
          ) : null}
          {documents.map((document) => {
            const gaps = generateDocumentGapRecommendations(document);
            return (
              <Link href={`/documents/${document.id}`} className="document-card" key={document.id}>
                <span>{document.documentType}</span>
                <strong>{document.title}</strong>
                <p>Status: {document.status}</p>
                <p>{gaps.length} draft gap recommendation{gaps.length === 1 ? "" : "s"}</p>
              </Link>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
