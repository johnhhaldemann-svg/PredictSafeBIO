import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { generateDocumentGapRecommendations } from "@/lib/documents/recommendations";
import { listDocuments } from "@/lib/supabase/data";

export default async function DocumentsPage() {
  const documents = await listDocuments();

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Document intelligence</p>
          <h1>Metadata and gap recommendations</h1>
        </header>
        <section className="document-grid">
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
