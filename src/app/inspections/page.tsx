import Link from "next/link";
import { CheckCircle2, ClipboardList, HeartPulse, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getErgonomicLevel1Summary, getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import {
  inspectionStatusLabels,
  inspectionTypeLabels,
  listInspections,
  type InspectionStatus
} from "@/lib/supabase/inspection-service";
import { createInspectionAction } from "./actions";

const STATUS_CLASS: Record<InspectionStatus, string> = {
  planned: "status-needs-review",
  in_progress: "status-needs-review",
  completed: "status-current",
  cancelled: ""
};

type Props = {
  searchParams: Promise<{ message?: string; filter?: string }>;
};

export default async function InspectionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = (params.filter as InspectionStatus | "all") ?? "all";

  const [inspections, ergonomic, adminAccess] = await Promise.all([
    listInspections(filterStatus !== "all" ? { status: filterStatus } : undefined).catch(() => []),
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

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">HSE Management Systems</p>
          <h1>Inspection / Audit Management</h1>
        </header>

        <section className="command-card-grid" aria-label="Inspection summary">
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

        {/* Filter strip */}
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

        {/* Inspection register */}
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
              {inspections.map((insp) => (
                <article className="action-row" key={insp.id}>
                  <div>
                    <strong>
                      <Link href={`/inspections/${insp.id}`}>{insp.title}</Link>
                    </strong>
                    <span className={STATUS_CLASS[insp.status]}>
                      {inspectionStatusLabels[insp.status]} · {inspectionTypeLabels[insp.auditType]}
                    </span>
                  </div>
                  <p>
                    {insp.scheduledFor
                      ? `Scheduled ${new Date(insp.scheduledFor).toLocaleDateString()}`
                      : "No date set"}
                    {insp.completedAt
                      ? ` · Completed ${new Date(insp.completedAt).toLocaleDateString()}`
                      : ""}
                    {" · "}
                    {insp.findingCount ?? 0} finding{(insp.findingCount ?? 0) !== 1 ? "s" : ""}
                    {(insp.openFindingCount ?? 0) > 0
                      ? ` (${insp.openFindingCount} open)`
                      : ""}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Schedule new inspection */}
        {adminAccess.signedIn && (
          <section className="panel">
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
                <input name="title" type="text" placeholder="e.g. Annual biosafety program internal audit" required />
              </label>
              <div className="form-grid">
                <label>
                  Type
                  <select name="auditType" defaultValue="internal">
                    <option value="internal">Internal</option>
                    <option value="self">Self-inspection</option>
                    <option value="external">External</option>
                    <option value="regulatory">Regulatory</option>
                    <option value="supplier">Supplier</option>
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

        {/* Ergonomic / hazard screening section (preserved) */}
        <section className="split-list wide">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Hazard &amp; Exposure Tracking</p>
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

        {/* Recent hazard screenings */}
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
                    <span>{s.riskLevel} risk · score {s.riskScore}/9</span>
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
              AI may surface risk signals and recommend inspection areas, but finding classification,
              severity determination, and closure decisions are the sole responsibility of qualified
              personnel. All records are <strong>Draft — Human Review Required</strong> until closed.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
