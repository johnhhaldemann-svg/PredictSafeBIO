import Link from "next/link";
import { CheckCircle2, ClipboardList, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import {
  findingLevelLabels,
  getInspectionDetail,
  inspectionStatusLabels,
  inspectionTypeLabels,
  type FindingLevel,
  type InspectionStatus
} from "@/lib/supabase/inspection-service";
import { addFindingAction, closeFindingAction, updateInspectionStatusAction } from "../actions";

const FINDING_CLASS: Record<FindingLevel, string> = {
  observation: "",
  minor: "status-needs-review",
  major: "status-expired",
  critical: "status-missing"
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
};

export default async function InspectionDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const [inspection, adminAccess] = await Promise.all([
    getInspectionDetail(id).catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  if (!inspection) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <p className="section-label">HSE Management</p>
            <h1>Inspection not found</h1>
          </header>
          <Link href="/inspections" className="button-secondary">Back to register</Link>
        </div>
      </AppShell>
    );
  }

  const isActive = inspection.status !== "completed" && inspection.status !== "cancelled";
  const allFindingsClosed = inspection.findings.length > 0 &&
    inspection.findings.every((f) => f.status === "closed");

  const nextStatuses: Array<{ value: InspectionStatus; label: string }> = inspection.status === "planned"
    ? [{ value: "in_progress", label: "Start inspection" }, { value: "cancelled", label: "Cancel" }]
    : inspection.status === "in_progress"
      ? [{ value: "completed", label: "Mark complete" }, { value: "cancelled", label: "Cancel" }]
      : [];

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">
            <Link href="/inspections">Inspection register</Link> / Detail
          </p>
          <h1>{inspection.title}</h1>
        </header>

        {sp.message && <p className="form-message">{sp.message}</p>}

        {/* Status banner */}
        <section className={`panel access-banner ${inspection.status === "completed" ? "access-enabled" : inspection.status === "planned" ? "access-readonly" : ""}`}>
          <strong>{inspectionStatusLabels[inspection.status]}</strong>
          <span>
            {inspectionTypeLabels[inspection.auditType]}
            {inspection.scheduledFor ? ` · Scheduled ${new Date(inspection.scheduledFor).toLocaleDateString()}` : ""}
            {inspection.completedAt ? ` · Completed ${new Date(inspection.completedAt).toLocaleDateString()}` : ""}
          </span>
        </section>

        {/* Metadata */}
        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Inspection details</p><h2>Record information</h2></div>
            <ClipboardList size={22} />
          </div>
          <div className="verification-status-grid">
            <article><span>Status</span><strong>{inspectionStatusLabels[inspection.status]}</strong></article>
            <article><span>Type</span><strong>{inspectionTypeLabels[inspection.auditType]}</strong></article>
            <article>
              <span>Scheduled</span>
              <strong>{inspection.scheduledFor ? new Date(inspection.scheduledFor).toLocaleDateString() : "Not set"}</strong>
            </article>
            <article>
              <span>Findings</span>
              <strong>
                {inspection.findingCount ?? 0} total
                {(inspection.openFindingCount ?? 0) > 0 ? ` · ${inspection.openFindingCount} open` : " · all closed"}
              </strong>
            </article>
          </div>
        </section>

        {/* Status controls */}
        {adminAccess.signedIn && nextStatuses.length > 0 && (
          <section className="panel command-center-lane">
            <div>
              <p className="section-label">Move inspection forward</p>
              <h2>Update status</h2>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {nextStatuses.map((ns) => (
                <form key={ns.value} action={updateInspectionStatusAction}>
                  <input type="hidden" name="inspectionId" value={inspection.id} />
                  <input type="hidden" name="status" value={ns.value} />
                  <input type="hidden" name="returnTo" value={`/inspections/${inspection.id}`} />
                  <button
                    className={ns.value === "cancelled" ? "button-secondary" : "button-primary"}
                    type="submit"
                  >
                    {ns.label}
                  </button>
                </form>
              ))}
            </div>
          </section>
        )}

        {/* Findings */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Findings</p>
              <h2>
                {inspection.findings.length === 0
                  ? "No findings recorded"
                  : `${inspection.findings.length} finding${inspection.findings.length !== 1 ? "s" : ""}${(inspection.openFindingCount ?? 0) > 0 ? ` · ${inspection.openFindingCount} open` : " · all closed"}`}
              </h2>
            </div>
          </div>

          {inspection.findings.length === 0 ? (
            <p className="muted">No findings yet. Add one below during the inspection.</p>
          ) : (
            <div className="action-list">
              {inspection.findings.map((finding) => (
                <article className="action-row" key={finding.id}>
                  <div>
                    <strong>{finding.title}</strong>
                    <span className={FINDING_CLASS[finding.findingLevel]}>
                      {findingLevelLabels[finding.findingLevel]} · {finding.status}
                    </span>
                  </div>
                  <p>{finding.createdAt ? new Date(finding.createdAt).toLocaleDateString() : "—"}</p>
                  {adminAccess.signedIn && finding.status !== "closed" && (
                    <form action={closeFindingAction} style={{ marginTop: 6 }}>
                      <input type="hidden" name="findingId" value={finding.id} />
                      <input type="hidden" name="inspectionId" value={inspection.id} />
                      <button className="button-secondary compact" type="submit">
                        <CheckCircle2 size={13} /> Close finding
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* Add finding */}
          {adminAccess.signedIn && isActive && (
            <details className="stacked-form" style={{ marginTop: 18 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 12 }}>
                <Plus size={14} style={{ display: "inline", marginRight: 4 }} />
                Record a finding
              </summary>
              <form action={addFindingAction} className="stacked-form">
                <input type="hidden" name="inspectionId" value={inspection.id} />
                <div className="form-grid">
                  <label>
                    Finding
                    <input name="title" type="text" placeholder="e.g. Training evidence missing for 2 staff" required />
                  </label>
                  <label>
                    Level
                    <select name="findingLevel" defaultValue="observation">
                      <option value="observation">Observation</option>
                      <option value="minor">Minor</option>
                      <option value="major">Major</option>
                      <option value="critical">Critical</option>
                    </select>
                  </label>
                </div>
                <button className="button-secondary" type="submit">Add finding</button>
              </form>
            </details>
          )}
        </section>

        {/* Complete prompt when all findings closed */}
        {adminAccess.isOwner && inspection.status === "in_progress" && allFindingsClosed && (
          <section className="panel access-banner access-enabled">
            <div>
              <strong>Ready to complete</strong>
              <span>All findings are closed. Mark the inspection complete to close it out.</span>
            </div>
            <form action={updateInspectionStatusAction}>
              <input type="hidden" name="inspectionId" value={inspection.id} />
              <input type="hidden" name="status" value="completed" />
              <input type="hidden" name="returnTo" value={`/inspections/${inspection.id}`} />
              <button className="button-primary" type="submit">
                <CheckCircle2 size={15} /> Complete inspection
              </button>
            </form>
          </section>
        )}

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Human review required</h2>
            <p className="muted">
              Finding classification, severity, and closure decisions are the sole responsibility
              of qualified inspection personnel. Draft — Human Review Required.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
