import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getFoundationReviewActionsSummary, listAuditEvents } from "@/lib/supabase/data";
import { getAuditEventTarget } from "@/lib/review-workflow";

export default async function AuditPage() {
  const [auditEvents, foundationActions] = await Promise.all([listAuditEvents(), getFoundationReviewActionsSummary()]);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Audit log</p>
          <h1>Human-review trace</h1>
        </header>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Foundation follow-through</p>
              <h2>Open source-traced actions</h2>
            </div>
          </div>
          <div className="action-list">
            {foundationActions.length > 0 ? (
              foundationActions.slice(0, 6).map((action) => (
                <article className="action-row" key={`${action.id}-${action.sourceModule}`}>
                  <div>
                    <strong>{action.title}</strong>
                    <span>
                      {action.priority} / {action.status}
                    </span>
                  </div>
                  <p>
                    Source: <Link href={action.sourceHref}>{action.sourceLabel}</Link>
                    {action.recommendationId ? " / draft recommendation linked" : ""}
                  </p>
                </article>
              ))
            ) : (
              <p className="muted">No open Foundation review actions are waiting for human review.</p>
            )}
          </div>
        </section>
        <section className="timeline">
          {auditEvents.map((event, index) => {
            const target = getAuditEventTarget(event);
            return (
              <article className="timeline-row" key={`${event.eventType}-${index}`}>
                <span>{event.createdAt}</span>
                <strong>{event.eventType}</strong>
                <p>{event.summary}</p>
                {target ? (
                  <Link className="text-link" href={target.href}>
                    {target.label}
                  </Link>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
