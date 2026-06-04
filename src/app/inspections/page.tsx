export const dynamic = "force-dynamic";

import Link from "next/link";
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

const STATUS_CLASS: Record<InspectionStatus, string> = {
  planned: "status-needs-review",
  in_progress: "status-needs-review",
  completed: "status-current",
  cancelled: ""
};

function PriorityBadge({ rec }: { rec: AiInspectionRecommendation }) {
  if (rec.priority === "overdue") {
    return (
      <span className="status-overdue" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
        <AlertTriangle size={12} />
        Overdue {Math.abs(rec.daysUntilDue)} day{Math.abs(rec.daysUntilDue) !== 1 ? "s" : ""}
      </span>
    );
  }
  if (rec.priority === "due_soon") {
    return (
      <span className="status-needs-review" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
        <BellRing size={12} />
        Due in {rec.daysUntilDue} day{rec.daysUntilDue !== 1 ? "s" : ""}
      </span>
    );
  }
  return (
    <span className="status-current" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <Clock size={12} />
      Due in {rec.daysUntilDue} days
    </span>
  );
}

type Props = {
  searchParams: Promise<{ message?: string; filter?: string }>;
};

export default async function InspectionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = (params.filter as InspectionStatus | "all") ?? "all";

  const [inspections, aiRecommendations, ergonomic, adminAccess] = await Promise.all([
    listInspections(filterStatus !== "all" ? { status: filterStatus } : undefined).catch(() => []),
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

  const upcomingCount = inspections.filter((i) => i.status === "planned").length;
  const activeCount = inspections.filter((i) => i.status === "in_progress").length;
  const openFindingsTotal = inspections.reduce((n, i) => n + (i.openFindingCount ?? 0), 0);
  const overdueCount = aiRecommendations.filter((r) => r.priority === "overdue").length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">HSE Management Systems</p>
          <h1>Inspection / Audit Management</h1>
        </header>

        <section className="command-card-grid" aria-label="Inspection summary">
          <article className={`command-card ${overdueCount > 0 ? "platform-red" : "platform-blue"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Overdue</strong></div>
            <small>{overdueCount}</small>
            <em>{overdueCount > 0 ? "Inspections past their required date." : "No overdue inspections."}</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><ClipboardList size={16} /></span><strong>Scheduled</strong></div>
            <small>{upcomingCount}</small>
            <em>Planned inspections awaiting execution.</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><ClipboardList size={16} /></span><strong>Active</strong></div>
            <small>{activeCount}</small>
            <em>Inspections currently in progress.</em>
          </article>
          <article className={`command-card ${openFindingsTotal > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><CheckCircle2 size={16} /></span><strong>Open findings</strong></div>
            <small>{openFindingsTotal}</small>
            <em>{openFindingsTotal > 0 ? "Findings requiring resolution." : "No open findings."}</em>
          </article>
        </section>

        {params.message && <p className="form-message">{params.message}</p>}

        {aiRecommendations.length > 0 && (
          <section className="panel" aria-label="AI-required inspections">
            <div className="panel-heading">
              <div>
                <p className="section-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Sparkles size={13} /> AI Inspection Scheduler
                </p>
                <h2>
                  Required inspections
                  {overdueCount > 0 && (
                    <span style={{ marginLeft: "10px", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-red, #c0392b)" }}>
                      {overdueCount} overdue
                    </span>
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
                const borderColor = rec.priority === "overdue"
                  ? "var(--color-red, #c0392b)"
                  : rec.priority === "due_soon"
                    ? "var(--color-warning, #e67e22)"
                    : "var(--color-green, #27ae60)";

                return (
                  <article
                    key={rec.inspectionType}
                    className="action-row"
                    style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: "12px" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {rec.label}
                        <PriorityBadge rec={rec} />
                      </strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
                        {rec.category} &middot; {rec.frequencyLabel}
                        {lastFmt ? ` · Last completed ${lastFmt}` : " · Never completed"}
                      </span>
                      <p style={{ fontSize: "0.78rem", marginTop: "4px", color: "var(--color-muted)" }}>
                        {rec.rationale}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Due {dueDateFmt}</span>
                      {adminAccess.signedIn && (
                        <Link
                          href={`/inspections#schedule-form`}
                          className={rec.priority === "overdue" ? "button-primary" : "button-secondary"}
                          style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                        >
                          Schedule now
                        </Link>
                      )}
                      <span style={{ fontSize: "10px", color: "#7c3aed", display: "inline-flex", alignItems: "center", gap: "3px" }}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <nav className="command-center-link-strip" aria-label="Inspection status filter">
            {(["all", "planned", "in_progress", "completed", "cancelled"] as const).map((s) => (
              <Link
                key={s}
                href={s === "all" ? "/inspections" : `/inspections?filter=${s}`}
                className={`button-secondary compact ${filterStatus === s ? "active-filter" : ""}`}
              >
                {s === "all" ? "All" : inspectionStatusLabels[s as InspectionStatus]}
              </Link>
            ))}
          </nav>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Link
              href="/inspections/calendar"
              className="button-secondary compact"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Calendar size={13} /> Compliance Calendar
            </Link>
            {adminAccess.isOwner && (
              <form action="/api/inspections/auto-schedule" method="POST">
                <button
                  type="submit"
                  className="button-secondary compact"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                >
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
              <h2>{inspections.length} inspection{inspections.length !== 1 ? "s" : ""}</h2>
            </div>
          </div>
          {inspections.length === 0 ? (
            <p className="muted">No inspections found. Schedule one below.</p>
          ) : (
            <div className="action-list">
              {inspections.map((insp) => {
                const isOverdue = insp.status === "planned" && insp.scheduledFor && new Date(insp.scheduledFor) < new Date();
                return (
                  <article
                    className="action-row"
                    key={insp.id}
                    style={isOverdue ? { borderLeft: "3px solid var(--color-red, #c0392b)", paddingLeft: "10px" } : undefined}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <Link href={`/inspections/${insp.id}`}>{insp.title}</Link>
                        {insp.autoGenerated && (
                          <span style={{ fontSize: "10px", color: "#7c3aed", background: "#f5f3ff", borderRadius: "4px", padding: "2px 6px", border: "1px solid #ddd6fe", display: "inline-flex", alignItems: "center", gap: "3px", fontWeight: 500 }}>
                            <Sparkles size={9} /> AI-scheduled
                          </span>
                        )}
                      </strong>
                      <span className={STATUS_CLASS[insp.status]}>
                        {inspectionStatusLabels[insp.status]} &middot; {inspectionTypeLabels[insp.auditType] ?? insp.auditType}
                      </span>
                      <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--color-muted)" }}>
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
                          <span style={{ marginLeft: "8px", display: "inline-flex", alignItems: "center", gap: "4px", color: "#1d4ed8" }}>
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
