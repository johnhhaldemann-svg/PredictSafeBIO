export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FoundationReviewActionsPanel } from "@/components/FoundationReviewActionsPanel";
import { getAuthSummary, getFoundationAdminAccessSummary, getFoundationAssigneeOptions, getFoundationReviewActionsSummary, listAuditEvents } from "@/lib/supabase/data";
import { getAuditEventTarget } from "@/lib/review-workflow";
import { canViewPlatform } from "@/lib/role-permissions";

const foundationAuditEventTypes = [
  "all",
  "foundation_biotype_selection_updated",
  "foundation_intake_response_updated",
  "foundation_evidence_readiness_updated",
  "foundation_audit_readiness_note_added",
  "foundation_review_actions_generated",
  "foundation_review_task_status_updated",
  "foundation_review_task_note_added",
  "foundation_source_resolution_refreshed"
];
const auditEventTypeLabels: Record<string, string> = {
  all: "All event types",
  foundation_biotype_selection_updated: "BioType selection updated",
  foundation_intake_response_updated: "Intake response updated",
  foundation_evidence_readiness_updated: "Evidence readiness updated",
  foundation_audit_readiness_note_added: "Audit readiness note added",
  foundation_review_actions_generated: "Review actions generated",
  foundation_review_task_status_updated: "Review task status updated",
  foundation_review_task_note_added: "Review task note added",
  foundation_source_resolution_refreshed: "Source resolution refreshed"
};
const foundationSourceModules = ["all", "foundation", "evidence_map", "training_assignment", "equipment", "incident", "biotype_selection", "audit_readiness"];
const sourceModuleLabels: Record<string, string> = {
  all: "All source modules",
  foundation: "Foundation",
  evidence_map: "Evidence Map",
  training_assignment: "Training",
  equipment: "Equipment",
  incident: "Incident",
  biotype_selection: "BioType Selection",
  audit_readiness: "Audit Readiness"
};

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{ eventType?: string; sourceModule?: string }>;
}) {
  const auth = await getAuthSummary();
  if (!canViewPlatform(auth)) redirect("/");

  const params = await searchParams;
  const eventType = params.eventType ?? "all";
  const sourceModule = params.sourceModule ?? "all";
  const [auditEvents, foundationActions, adminAccess, assignees] = await Promise.all([
    listAuditEvents({ eventType, sourceModule }),
    getFoundationReviewActionsSummary(),
    getFoundationAdminAccessSummary(),
    getFoundationAssigneeOptions()
  ]);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">System Reliance</p>
            <h1>Immutable Audit Log</h1>
            <p className="muted">Source-traced foundation events — every AI-driven action is logged here.</p>
          </div>
          <Link className="button-secondary" href="/admin/dashboard">← Command Center</Link>
        </header>
        <FoundationReviewActionsPanel
          actions={foundationActions.slice(0, 6)}
          assignees={assignees}
          canManage={adminAccess.signedIn}
          canEditAssignment={adminAccess.isOwner}
          canEditDueDate={adminAccess.isOwner}
          canEditPriority={adminAccess.isOwner}
          emptyMessage="No open Foundation review actions are waiting for human review."
          returnTo="/admin/audit"
          title="Open source-traced actions"
        />
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Audit filters</p>
              <h2>Foundation event trace</h2>
            </div>
          </div>
          <form className="audit-filter-form">
            <label>
              Event type
              <select name="eventType" defaultValue={eventType}>
                {foundationAuditEventTypes.map((type) => (
                  <option key={type} value={type}>
                    {auditEventTypeLabels[type] ?? type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source module
              <select name="sourceModule" defaultValue={sourceModule}>
                {foundationSourceModules.map((module) => (
                  <option key={module} value={module}>
                    {sourceModuleLabels[module] ?? module.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-secondary" type="submit">
              Apply filters
            </button>
            <Link className="button-secondary" href="/admin/audit">
              Clear
            </Link>
          </form>
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
