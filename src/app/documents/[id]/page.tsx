import { AppShell } from "@/components/AppShell";
import { generateDocumentGapRecommendations, generateDocumentUpdateRecommendations } from "@/lib/documents/recommendations";
import { getDocument } from "@/lib/supabase/data";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getDocument(id);
  const gaps = generateDocumentGapRecommendations(document);
  const updates = generateDocumentUpdateRecommendations(document);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Document detail</p>
          <h1>{document.title}</h1>
        </header>
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
      </div>
    </AppShell>
  );
}
