export const dynamic = "force-dynamic";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDot, Clock, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { formatOwnerRole } from "@/lib/display-labels";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import {
  capaStatusLabels,
  listCapaRecords,
  type CapaStatus
} from "@/lib/supabase/capa-service";
import { createCapaAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

const STATUS_ICON: Record<CapaStatus, typeof AlertTriangle> = {
  draft_human_review_required: AlertTriangle,
  open: CircleDot,
  in_progress: Clock,
  closed: CheckCircle2,
  void: ShieldCheck
};

const STATUS_CLASS: Record<CapaStatus, string> = {
  draft_human_review_required: "status-missing",
  open: "status-needs-review",
  in_progress: "status-needs-review",
  closed: "status-current",
  void: ""
};

const PRIORITY_STATUSES: CapaStatus[] = [
  "draft_human_review_required",
  "open",
  "in_progress"
];

type Props = {
  searchParams: Promise<{ message?: string; filter?: string }>;
};

export default async function CapaListPage({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = (params.filter as CapaStatus | "all") ?? "all";

  const [recordsResult, adminAccess] = await Promise.all([
    listCapaRecords(filterStatus !== "all" ? { status: filterStatus } : undefined).catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  const loadFailed = recordsResult === null;
  const records = recordsResult ?? [];
  const openCount = records.filter((r) => PRIORITY_STATUSES.includes(r.status)).length;
  const overdueCount = records.filter(
    (r) => r.dueDate && new Date(r.dueDate) < new Date() && r.status !== "closed" && r.status !== "void"
  ).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Operate</p>
          <h1>CAPA Records</h1>
        </header>

        <section className="command-card-grid" aria-label="CAPA summary">
          <article className="command-card platform-blue">
            <div><span><CircleDot size={16} /></span><strong>Open CAPAs</strong></div>
            <small>{openCount}</small>
            <em>Requiring action or review.</em>
          </article>
          <article className={`command-card ${overdueCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><Clock size={16} /></span><strong>Overdue</strong></div>
            <small>{overdueCount}</small>
            <em>{overdueCount > 0 ? "Past due date — requires immediate attention." : "No overdue CAPAs."}</em>
          </article>
          <article className="command-card platform-green">
            <div><span><CheckCircle2 size={16} /></span><strong>Closed</strong></div>
            <small>{records.filter((r) => r.status === "closed").length}</small>
            <em>Completed with effectiveness check.</em>
          </article>
        </section>

        <section className={`panel access-banner ${adminAccess.isOwner ? "access-enabled" : "access-readonly"}`}>
          <strong>{adminAccess.isOwner ? "Owner access" : "Read-only"}</strong>
          <span>{adminAccess.message}</span>
        </section>

        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="CAPA status filter">
          {(["all", "draft_human_review_required", "open", "in_progress", "closed", "void"] as const).map((s) => (
            <Link
              key={s}
              href={s === "all" ? "/operations/capa" : `/operations/capa?filter=${s}`}
              className={`button-secondary compact ${filterStatus === s ? "active-filter" : ""}`}
            >
              {s === "all" ? "All" : capaStatusLabels[s]}
            </Link>
          ))}
        </nav>

        {/* Record list */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">CAPA Register</p>
              <h2>{records.length} record{records.length !== 1 ? "s" : ""}</h2>
            </div>
          </div>
          {loadFailed ? (
            <DataLoadError resource="CAPA records" />
          ) : records.length === 0 ? (
            <p className="muted">No CAPA records found. Create one below.</p>
          ) : (
            <div className="action-list">
              {records.map((record) => {
                const Icon = STATUS_ICON[record.status];
                const overdue =
                  record.dueDate &&
                  new Date(record.dueDate) < new Date() &&
                  record.status !== "closed" &&
                  record.status !== "void";
                return (
                  <article className="action-row" key={record.id}>
                    <div>
                      <strong>
                        <Link href={`/operations/capa/${record.id}`}>{record.title}</Link>
                      </strong>
                      <span className={STATUS_CLASS[record.status]}>
                        <Icon size={13} style={{ display: "inline", marginRight: 4 }} />
                        {capaStatusLabels[record.status]}
                      </span>
                    </div>
                    <p>
                      {record.ownerRole ? `Owner: ${formatOwnerRole(record.ownerRole)} · ` : ""}
                      {record.dueDate ? (
                        <span className={overdue ? "text-danger" : ""}>
                          Due {new Date(record.dueDate).toLocaleDateString()}
                          {overdue ? " · OVERDUE" : ""}
                        </span>
                      ) : "No due date"}
                      {" · "}
                      {record.actionCount ?? 0} action{(record.actionCount ?? 0) !== 1 ? "s" : ""}
                      {(record.openActionCount ?? 0) > 0
                        ? ` (${record.openActionCount} open)`
                        : ""}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Create form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">New CAPA</p>
                <h2>Create a CAPA record</h2>
              </div>
              <Plus size={22} />
            </div>
            <p className="muted">
              Opens immediately as an active record. All outputs remain draft until the quality
              unit closes it with effectiveness verification.{" "}
              <strong>Draft — Human Review Required.</strong>
            </p>
            <form action={createCapaAction} className="stacked-form">
              <label>
                Title
                <input name="title" type="text" placeholder="e.g. Sterility assay deviation — corrective action" required />
              </label>
              <div className="form-grid">
                <label>
                  Owner role
                  <select name="ownerRole" defaultValue="quality_unit">
                    <option value="quality_unit">Quality Unit</option>
                    <option value="qa">QA</option>
                    <option value="biosafety_officer">Biosafety Officer</option>
                    <option value="validation_lead">Validation Lead</option>
                    <option value="ehs">EHS</option>
                    <option value="responsible_scientist">Responsible Scientist</option>
                    <option value="regulatory_affairs">Regulatory Affairs</option>
                  </select>
                </label>
                <label>
                  Due date
                  <input name="dueDate" type="date" />
                </label>
                <label>
                  Effectiveness check due
                  <input name="effectivenessCheckDue" type="date" />
                </label>
              </div>
              <label>
                Root cause (if known)
                <textarea
                  name="rootCause"
                  rows={2}
                  placeholder="e.g. Procedural gap — SOP did not specify hold time limits"
                />
              </label>
              <div className="form-grid">
                <label>
                  Linked record type
                  <select name="linkedRecordType" defaultValue="">
                    <option value="">— None —</option>
                    <option value="audit_findings">Audit Finding</option>
                    <option value="waste_records">Waste Record</option>
                    <option value="biosafety_risk_assessments">Biosafety Assessment</option>
                    <option value="assessment_signals">Observation / Signal</option>
                    <option value="chemical_inventory">Chemical Inventory</option>
                    <option value="controlled_work_permits">Work Permit</option>
                    <option value="pesticide_disinfectant_records">Pesticide Record</option>
                  </select>
                </label>
                <label>
                  Linked record ID
                  <input
                    name="linkedRecordId"
                    type="text"
                    placeholder="UUID of the source record (optional)"
                  />
                </label>
              </div>
              <label>
                Initial corrective action (optional)
                <input
                  name="initialAction"
                  type="text"
                  placeholder="e.g. Investigate root cause and document findings"
                />
              </label>
              <button className="button-primary" type="submit">
                Create CAPA record
              </button>
            </form>
          </section>
        )}

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>CAPA remains human-validated</h2>
            <p className="muted">
              AI may recommend CAPA screening from assessments and incidents, but root-cause
              determination, corrective action selection, effectiveness verification, and closure
              decisions are the sole responsibility of qualified quality personnel.
              All records are <strong>Draft — Human Review Required</strong> until closed by
              the quality unit.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
