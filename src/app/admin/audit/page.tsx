import { AppShell } from "@/components/AppShell";
import { listAuditEvents } from "@/lib/supabase/data";

export default async function AuditPage() {
  const auditEvents = await listAuditEvents();

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Audit log</p>
          <h1>Human-review trace</h1>
        </header>
        <section className="timeline">
          {auditEvents.map((event, index) => (
            <article className="timeline-row" key={`${event.eventType}-${index}`}>
              <span>{event.createdAt}</span>
              <strong>{event.eventType}</strong>
              <p>{event.summary}</p>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
