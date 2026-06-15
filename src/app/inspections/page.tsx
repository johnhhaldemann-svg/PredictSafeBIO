export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Inspections – PredictSafe" };
import {
  AlertTriangle,
  BellRing,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardList,
  HeartPulse,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getErgonomicLevel1Summary, getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import {
  getAiInspectionRecommendations,
  inspectionStatusLabels,
  inspectionTypeLabels,
  listInspections,
  type AiInspectionRecommendation,
  type InspectionStatus,
} from "@/lib/supabase/inspection-service";
import { createInspectionAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

const STATUS_CLASS: Record<InspectionStatus, string> = {
  planned: "status-needs-review",
  in_progress: "status-needs-review",
  completed: "status-current",
  cancelled: ""
};

function PriorityBadge({ rec }: { rec: AiInspectionRecommendation }) {
  if (rec.priority === "overdue") {
    return (
      <span className="status-overdue risk-cell-flag">
        <AlertTriangle size={12} />
        Overdue {Math.abs(rec.daysUntilDue)} day{Math.abs(rec.daysUntilDue) !== 1 ? "s" : ""}
      </span>
    );
  }
  if (rec.priority === "due_soon") {
    return (
      <span className="status-needs-review risk-cell-flag">
        <BellRing size={12} />
        Due in {rec.daysUntilDue} day{rec.daysUntilDue !== 1 ? "s" : ""}
      </span>
    );
  }
  return (
    <span className="status-current risk-cell-flag">
      <Clock size={12} />
      Due in {rec.daysUntilDue} days
    </span>
  );
}

type Props = {
  searchParams: Promise<{ message?: string; success?: string; filter?: string }>;
};

export default async function InspectionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = (params.filter as InspectionStatus | "all") ?? "all";

  const [inspectionsResult, aiRecommendations, ergonomic, adminAccess] = await Promise.all([
    listInspections().catch(() => null),
    getAiInspectionRecommendations().catch(() => []),
    getErgonomicLevel1Summary().catch(() => ({
      counts: [], recentScreenings: [], aiInsight: "",
      inspectionType: { title: "Hazard Screening", description: "", href: "/ergonomics/self-assessment" },
      level2InspectionType: { title: "Level 2 Evaluation", description: "", href: "/ergonomics/advanced-evaluation", gatedLabel: "" }
    })),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  const loadFailed = inspectionsResult === null;
  const allInspections = inspectionsResult ?? [];
  const inspections = filterStatus !== "all"
    ? allInspections.filter((i) => i.status === filterStatus)
    : allInspections;

  const upcomingCount = allInspections.filter((i) => i.status === "planned").length;
  const activeCount   = allInspections.filter((i) => i.status === "in_progress").length;
  const openFindingsTotal = allInspections.reduce((n, i) => n + (i.openFindingCount ?? 0), 0);
  const overdueCount = aiRecommendations.filter((r) => r.priority === "overdue").length;

  const statusCounts = {
    all: allInspections.length,
    planned: upcomingCount,
    in_progress: activeCount,
    completed: allInspections.filter((i) => i.status === "completed").length,
    cancelled: allInspections.filter((i) => i.status === "cancelled").length,
  };

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · Inspections &amp; Audits</p>
            <h1>Inspection Management</h1>
            <p className="muted">
              AI-scheduled inspections, manual scheduling, and findings tracking. Overdue inspections
              raise predicted risk.
            </p>
          </div>
          <Link className="button-secondary" href="/permits">Work Permits →</Link>
        </header>

        <section className="kpi-grid" aria-label="Inspection summary">
          <div className={`kpi-card ${overdueCount > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
            <div className="kpi-label">Overdue</div>
            <div className="kpi-value">{overdueCount}</div>
            <div className="kpi-sub">{overdueCount > 0 ? "Past required date" : "All on schedule"}</div>
          </div>
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-label">Scheduled</div>
            <div className="kpi-value">{upcomingCount}</div>
            <div className="kpi-sub">Awaiting execution</div>
          </div>
          <div className="kpi-card kpi-card--amber">
            <div className="kpi-label">In Progress</div>
            <div className="kpi-value">{activeCount}</div>
            <div className="kpi-sub">Currently active</div>
          </div>
          <div className={`kpi-card ${openFindingsTotal > 0 ? "kpi-card--amber" : "kpi-card--green"}`}>
            <div className="kpi-label">Open Findings</div>
            <div className="kpi-value">{openFindingsTotal}</div>
            <div className="kpi-sub">{openFindingsTotal > 0 ? "Requiring resolution" : "No open findings"}</div>
          </div>
        </section>

        {overdueCount > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{overdueCount} inspection{overdueCount !== 1 ? "s" : ""} past due date.</strong>{" "}
              Overdue required inspections raise predicted risk and may block audit readiness.
            </span>
          </div>
        )}

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {aiRecommendations.length > 0 && (
          <section className="panel" aria-label="AI-required inspections">
            <div className="panel-heading">
              <div>
                <p className="section-label section-label-icon">
                  <Sparkles size={13} /> AI Inspection Scheduler
                </p>
                <h2>
                  Required inspections
                  {overdueCount > 0 && (
                    <span className="overdue-count">{overdueCount} overdue</span>
                  )}
                </h2>
                <p className="muted">
                  Based on regulatory requirements and your inspection history. Overdue and upcoming
                  inspections are flagged as required tasks with due dates.
                </p>
              </div>
              <BellRing size={22} />
            </div>

            <div className="action-list">
              {aiRecommendations.map((rec) => {
                const dueDateFmt = new Date(rec.dueDate).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric"
                });
                const lastFmt = rec.lastCompletedDate
                  ? new Date(rec.lastCompletedDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                  : null;
                return (
                  <article
                    key={rec.inspectionType}
                    className={`action-row ${rec.priority === "overdue" ? "insp-rec--overdue" : rec.priority === "due_soon" ? "insp-rec--soon" : "insp-rec--ok"}`}
                  >
                    <div className="rec-card-body">
                      <strong className="rec-card-title">
                        {rec.label}
                        <PriorityBadge rec={rec} />
                      </strong>
                      <span className="rec-card-meta">
                        {rec.category} &middot; {rec.frequencyLabel}
                        {lastFmt ? ` · Last completed ${lastFmt}` : " · Never completed"}
                      </span>
                      <p className="rec-card-rationale">{rec.rationale}</p>
                    </div>
                    <div className="rec-card-actions">
                      <span className="rec-card-due">Due {dueDateFmt}</span>
                      {adminAccess.signedIn && (
                        <Link
                          href={`/inspections#schedule-form`}
                          className={`${rec.priority === "overdue" ? "button-primary" : "button-secondary"} compact`}
                        >
                          Schedule now
                        </Link>
                      )}
                      <span className="ai-badge">
                        <Sparkles size={9} /> Auto-assigns daily
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Status filter + calendar / refresh actions */}
        <div className="filter-action-bar">
          <nav className="command-center-link-strip" aria-label="Inspection status filter">
            {(["all", "planned", "in_progress", "completed", "cancelled"] as const).map((s) => (
              <Link
                key={s}
                href={s === "all" ? "/inspections" : `/inspections?filter=${s}`}
                className={`button-secondary compact ${filterStatus === s ? "active-filter" : ""}`}
              >
                {s === "all" ? "All" : inspectionStatusLabels[s as InspectionStatus]}
                <span className="filter-count-badge">{statusCounts[s] ?? 0}</span>
              </Link>
            ))}
          </nav>
          <div className="btn-group">
            <Link href="/inspections/calendar" className="button-secondary compact btn-with-icon">
              <Calendar size={13} /> Compliance Calendar
            </Link>
            {adminAccess.isOwner && (
              <form action="/api/inspections/auto-schedule" method="POST">
                <button type="submit" className="button-secondary compact btn-with-icon">
                  <RefreshCw size={13} /> Refresh AI Schedule
                </button>
              </form>
            )}
          </div>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Inspection register</p>
              <h2>
                {inspections.length === allInspections.length
                  ? `${allInspections.length} inspection${allInspections.length !== 1 ? "s" : ""}`
                  : `${inspections.length} of ${allInspections.length} shown`}
              </h2>
            </div>
          </div>
          {loadFailed ? (
            <DataLoadError resource="inspections" />
          ) : inspections.length === 0 ? (
            <p className="muted">No inspections found. Schedule one below.</p>
          ) : (
            <div className="action-list">
              {inspections.map((insp) => {
                const isOverdue = insp.status === "planned" && insp.scheduledFor && new Date(insp.scheduledFor) < new Date();
                return (
                  <article
                    className={`action-row ${isOverdue ? "insp-row--overdue" : ""}`}
                    key={insp.id}
                  >
                    <div className="insp-main">
                      <strong className="insp-title-row">
                        <Link href={`/inspections/${insp.id}`}>{insp.title}</Link>
                        {insp.autoGenerated && (
                          <span className="ai-badge"><Sparkles size={9} /> AI-scheduled</span>
                        )}
                      </strong>
                      <span className={STATUS_CLASS[insp.status]}>
                        {inspectionStatusLabels[insp.status]} &middot; {inspectionTypeLabels[insp.auditType] ?? insp.auditType}
                      </span>
                      <p className="insp-meta">
                        {insp.scheduledFor
                          ? `Due ${new Date(insp.scheduledFor).toLocaleDateString()}`
                          : "No date set"}
                        {insp.completedAt
                          ? ` · Completed ${new Date(insp.completedAt).toLocaleDateString()}`
                          : ""}
                        {" · "}
                        {insp.findingCount ?? 0} finding{(insp.findingCount ?? 0) !== 1 ? "s" : ""}
                        {(insp.openFindingCount ?? 0) > 0
                          ? ` (${insp.openFindingCount} open)`
                          : ""}
                        {insp.assigneeName && (
                          <span className="insp-assignee">
                            <User size={11} /> {insp.assigneeName}
                          </span>
                        )}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {adminAccess.signedIn && (
          <section className="panel" id="schedule-form">
            <div className="panel-heading">
              <div>
                <p className="section-label">Schedule inspection</p>
                <h2>Add a new inspection or audit</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createInspectionAction} className="stacked-form">
              <label>
                Title
                <input name="title" type="text" placeholder="e.g. Monthly fire extinguisher check" required />
              </label>
              <div className="form-grid">
                <label>
                  Inspection type
                  <select name="auditType" defaultValue="lab_safety">
                    <optgroup label="Audit / Program Reviews">
                      <option value="internal">Internal Audit</option>
                      <option value="external">External Audit</option>
                      <option value="regulatory">Regulatory Inspection</option>
                      <option value="supplier">Supplier / Vendor Audit</option>
                      <option value="self">Self-Inspection</option>
                      <option value="pre_regulatory">Pre-Regulatory Mock Inspection</option>
                    </optgroup>
                    <optgroup label="Lab and Biosafety">
                      <option value="lab_safety">Laboratory Safety Walkthrough</option>
                      <option value="biosafety">Biosafety Cabinet and BSL Verification</option>
                      <option value="bloodborne_pathogens">Bloodborne Pathogens Program Review</option>
                      <option value="chemical_hygiene">Chemical Hygiene and Storage</option>
                    </optgroup>
                    <optgroup label="Physical Safety - Frequent">
                      <option value="eyewash">Eyewash Station and Safety Shower Test</option>
                      <option value="waste_management">Hazardous Waste Satellite Area</option>
                      <option value="fire_safety">Fire Safety and Extinguisher Check</option>
                      <option value="emergency_equipment">Emergency Response Equipment Check</option>
                      <option value="first_aid">First Aid Kit and AED Inventory</option>
                      <option value="spill_kit">Chemical Spill Kit Readiness</option>
                    </optgroup>
                    <optgroup label="Physical Safety - Periodic">
                      <option value="ppe">PPE Condition and Availability</option>
                      <option value="loto">Lockout / Tagout Program Review</option>
                      <option value="ergonomics">Ergonomics Walkthrough</option>
                    </optgroup>
                    <optgroup label="Environmental">
                      <option value="waste_disposal">Hazardous Waste Disposal Review</option>
                      <option value="stormwater">Stormwater / SWPPP Inspection</option>
                    </optgroup>
                    <optgroup label="Equipment and Facility">
                      <option value="equipment">Equipment and Calibration Review</option>
                      <option value="facility">Facility and Infrastructure Inspection</option>
                    </optgroup>
                    <optgroup label="Compliance / Admin">
                      <option value="training_records">Training Records and Compliance Audit</option>
                      <option value="incident_followup">Post-Incident Follow-up Inspection</option>
                    </optgroup>
                  </select>
                </label>
                <label>
                  Scheduled date
                  <input name="scheduledFor" type="date" />
                </label>
              </div>
              <button className="button-primary" type="submit">Schedule inspection</button>
            </form>
          </section>
        )}

        <section className="split-list wide">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Hazard and Exposure Tracking</p>
                <h2>{ergonomic.inspectionType.title}</h2>
                <p className="muted">{ergonomic.inspectionType.description}</p>
              </div>
              <HeartPulse size={24} />
            </div>
            <div className="inspection-type-row">
              <div className="inspection-icon"><ClipboardList size={24} /></div>
              <div>
                <strong>Level 1 hazard screening</strong>
                <p>Capture task type, discomfort, body strain, frequency, and optional context.</p>
              </div>
              <Link className="button-primary large-action" href={ergonomic.inspectionType.href}>
                Start screening
              </Link>
            </div>
          </article>
   <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Advanced evaluation</p>
                <h2>{ergonomic.level2InspectionType.title}</h2>
                <p className="muted">{ergonomic.level2InspectionType.description}</p>
              </div>
              <ClipboardList size={24} />
            </div>
            <div className="inspection-type-row">
              <div className="inspection-icon"><ClipboardList size={24} /></div>
              <div>
                <strong>Level 2 audit evaluation</strong>
                <p>Measurements, evidence, specialist notes, and recommendations.</p>
              </div>
              <Link className="button-secondary large-action" href={ergonomic.level2InspectionType.href}>
                Open evaluation
              </Link>
            </div>
            {ergonomic.level2InspectionType.gatedLabel && (
              <p className="auth-note">{ergonomic.level2InspectionType.gatedLabel}</p>
            )}
          </article>
        </section>

        {ergonomic.recentScreenings.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Hazard screening history</p>
                <h2>Recent Level 1 signals</h2>
              </div>
            </div>
            <div className="action-list compact-list">
              {ergonomic.recentScreenings.slice(0, 5).map((s) => (
                <article className="action-row" key={s.id}>
                  <div>
                    <strong>{s.taskTypeLabel}</strong>
                    <span>{s.riskLevel} risk &middot; score {s.riskScore}/9</span>
                  </div>
                  <p>{s.location ?? "No location"} / {s.departmentTrade ?? "No department"}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Inspection findings require human judgment</h2>
            <p className="muted">
              AI surfaces risk signals and schedules required inspections based on regulatory frequency
              rules, but finding classification, severity determination, and closure decisions are the
              sole responsibility of qualified EHS personnel. All records are{" "}
              <strong>Draft - Human Review Required</strong> until closed.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
