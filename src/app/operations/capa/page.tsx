export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { formatOwnerRole } from "@/lib/display-labels";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import {
  capaStatusLabels,
  listCapaRecords,
  type CapaStatus,
  type CapaType,
} from "@/lib/supabase/capa-service";
import { createCapaAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";
import CapaRecords, {
  type ViewCapa,
  type CapaStatLocal,
  type CapaStage,
} from "@/components/CapaRecords";

export const metadata: Metadata = { title: "CAPA Records – PredictSafe" };

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const LINKED_TYPE_META: Record<string, { label: string; kind: string }> = {
  audit_findings:                { label: "Audit finding",         kind: "finding"   },
  waste_records:                 { label: "Waste record",          kind: "deviation" },
  biosafety_risk_assessments:    { label: "Biosafety assessment",  kind: "assessment"},
  assessment_signals:            { label: "Observation / signal",  kind: "finding"   },
  chemical_inventory:            { label: "Chemical inventory",    kind: "deviation" },
  controlled_work_permits:       { label: "Work permit",           kind: "finding"   },
  pesticide_disinfectant_records:{ label: "Pesticide record",      kind: "deviation" },
  incidents:                     { label: "Incident",              kind: "incident"  },
};

function deriveStage(status: CapaStatus): CapaStage {
  switch (status) {
    case "draft_human_review_required": return "root_cause";
    case "open":                        return "action_plan";
    case "in_progress":                 return "implementation";
    case "closed":                      return "closure";
    case "void":                        return "closure";
    default:                            return "identification";
  }
}

const PRIORITY_STATUSES: CapaStatus[] = [
  "draft_human_review_required", "open", "in_progress",
];

type Props = {
  searchParams: Promise<{ message?: string; filter?: string }>;
};

export default async function CapaListPage({ searchParams }: Props) {
  const params = await searchParams;

  const [allRecordsResult, adminAccess] = await Promise.all([
    listCapaRecords().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  const loadFailed  = allRecordsResult === null;
  const allRecords  = allRecordsResult ?? [];

  const openCount    = allRecords.filter((r) => PRIORITY_STATUSES.includes(r.status)).length;
  const overdueCount = allRecords.filter(
    (r) => r.dueDate && new Date(r.dueDate) < new Date() && r.status !== "closed" && r.status !== "void",
  ).length;

  const nowDate = new Date();

  const viewCapas: ViewCapa[] = allRecords.map((r) => {
    const dueDt     = r.dueDate ? new Date(r.dueDate) : null;
    const isOverdue = dueDt ? dueDt < nowDate && r.status !== "closed" && r.status !== "void" : false;
    const isDueToday = dueDt && !isOverdue
      ? dueDt.toDateString() === nowDate.toDateString()
      : false;

    let sourceLabel = "—";
    let sourceKind  = "other";
    if (r.sourceIncidentId) { sourceLabel = "Incident"; sourceKind = "incident"; }
    else if (r.sourceAssessmentId) { sourceLabel = "Assessment finding"; sourceKind = "assessment"; }
    else if (r.linkedRecordType) {
      const m = LINKED_TYPE_META[r.linkedRecordType];
      if (m) { sourceLabel = m.label; sourceKind = m.kind; }
      else    { sourceLabel = r.linkedRecordType; sourceKind = "finding"; }
    }

    return {
      id:             r.id,
      title:          r.title,
      capaType:       (r.capaType ?? "corrective") as CapaType,
      status:         r.status as CapaStatLocal,
      stage:          deriveStage(r.status),
      ownerLabel:     r.ownerRole ? formatOwnerRole(r.ownerRole) : null,
      dueDateLabel:   dueDt ? dueDt.toLocaleDateString() : null,
      isOverdue,
      isDueToday,
      actionCount:    r.actionCount ?? 0,
      openActionCount:r.openActionCount ?? 0,
      sourceLabel,
      sourceKind,
    };
  });

  // Honour URL filter param for deep-link back-compat
  const initialFilter = (params.filter as CapaStatLocal | "all") ?? "all";

  return (
    <AppShell>
      <div className="page-stack">

        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · CAPA</p>
            <h1>CAPA Records</h1>
            <p className="muted">
              Corrective and preventive action records — source-linked to incidents, findings, and
              deviations, verified for effectiveness before closure.
            </p>
          </div>
          <Link className="button-secondary" href="/incidents">Incident Register →</Link>
        </header>

        {/* KPI strip */}
        <section className="kpi-grid" aria-label="CAPA summary">
          <div className={`kpi-card ${openCount > 0 ? "kpi-card--blue" : "kpi-card--green"}`}>
            <div className="kpi-label">Open CAPAs</div>
            <div className="kpi-value">{openCount}</div>
            <div className="kpi-sub">Requiring action or review</div>
          </div>
          <div className={`kpi-card ${overdueCount > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
            <div className="kpi-label">Overdue</div>
            <div className="kpi-value">{overdueCount}</div>
            <div className="kpi-sub">{overdueCount > 0 ? "Immediate attention needed" : "None overdue"}</div>
          </div>
          <div className="kpi-card kpi-card--green">
            <div className="kpi-label">Closed</div>
            <div className="kpi-value">{allRecords.filter((r) => r.status === "closed").length}</div>
            <div className="kpi-sub">Effectiveness verified</div>
          </div>
          <div className="kpi-card kpi-card--amber">
            <div className="kpi-label">In Progress</div>
            <div className="kpi-value">{allRecords.filter((r) => r.status === "in_progress").length}</div>
            <div className="kpi-sub">Under investigation</div>
          </div>
        </section>

        {overdueCount > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{overdueCount} CAPA{overdueCount !== 1 ? "s" : ""} past due date.</strong>{" "}
              Overdue CAPAs block compliance closure and may trigger escalation.
            </span>
            <Link className="ai-fill-btn ai-fill-btn--danger" href="/operations/capa?filter=open">
              View open
            </Link>
          </div>
        )}

        {params.message && <p className="form-message">{params.message}</p>}

        {/* Interactive: lifecycle pipeline, filter tabs, CAPA list */}
        {loadFailed ? (
          <DataLoadError resource="CAPA records" />
        ) : (
          <CapaRecords capas={viewCapas} initialFilter={initialFilter} />
        )}

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
                  CAPA type *
                  <select name="capaType" defaultValue="corrective">
                    <option value="corrective">Corrective</option>
                    <option value="preventive">Preventive</option>
                    <option value="equipment">Equipment</option>
                  </select>
                </label>
                <label>
                  Owner role
                  <select name="ownerRole" defaultValue="ehs">
                    <option value="ehs">EHS</option>
                    <option value="biosafety_officer">Biosafety Officer</option>
                    <option value="qa">QA</option>
                    <option value="validation_lead">Validation Lead</option>
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
              decisions are the sole responsibility of qualified EHS reviewers.
              All records are <strong>Draft — Human Review Required</strong> until closed by
              a qualified reviewer.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>

      </div>
    </AppShell>
  );
}
