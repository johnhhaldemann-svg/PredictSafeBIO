import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FoundationReviewActionsPanel } from "@/components/FoundationReviewActionsPanel";
import { getFoundationAdminAccessSummary, getFoundationReviewActionsSummary, listAuditEvents } from "@/lib/supabase/data";
import { getAuditEventTarget } from "@/lib/review-workflow";

export default async function AuditPage() {
  const [auditEvents, foundationActions, adminAccess] = await Promise.all([
    listAuditEvents(),
    getFoundationReviewActionsSummary(),
    getFoundationAdminAccessSummary()
  ]);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">System Reliance</p>
          <h1>Immutable Audit Log</h1>
        </header>
        <FoundationReviewActionsPanel
          actions={foundationActions.slice(0, 6)}
          canManage={adminAccess.isOwner}
          emptyMessage="No open Foundation review actions are waiting for human review."
          title="Open source-traced actions"
        />
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
