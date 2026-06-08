export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, Brain, Map, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { DataLoadError } from "@/components/DataLoadError";
import {
  listExposures,
  listLabsForExposure,
  exposureRouteLabels,
  exposureFrequencyLabels,
  exposureStatusLabels,
  type ExposureRoute,
  type ExposureFrequency,
  type ExposureStatus,
} from "@/lib/supabase/exposure-service";
import { logExposureAction, updateExposureStatusAction } from "./actions";

const exposureRouteOptions: ExposureRoute[] = [
  "inhalation", "skin", "injection", "ingestion", "mucosal", "other",
];
const exposureFrequencyOptions: ExposureFrequency[] = ["routine", "occasional", "rare"];

export const metadata: Metadata = { title: "Exposure Monitoring – PredictSafeBIO" };

const STATUS_CLASS: Record<ExposureStatus, string> = {
  active: "status-needs-review",
  mitigated: "status-ok",
  retired: "",
};

function urgencyLabel(highRoute: boolean, frequency: string): string {
  if (highRoute && frequency === "routine") return "High";
  if (highRoute) return "Elevated";
  return "Standard";
}

function urgencyClass(highRoute: boolean, frequency: string): string {
  if (highRoute && frequency === "routine") return "status-missing";
  if (highRoute) return "status-needs-review";
  return "status-current";
}

type Props = {
  searchParams: Promise<{ message?: string; success?: string; filter?: string }>;
};

export default async function ExposureMonitoringPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = (params.filter ?? "all") as ExposureStatus | "all";

  const [exposuresResult, adminAccess, labs] = await Promise.all([
    listExposures().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false,
      signedIn: false,
      isOwner: false,
      message: "",
    })),
    listLabsForExposure().catch(() => []),
  ]);

  const loadFailed = exposuresResult === null;
  const allExposures = exposuresResult ?? [];

  const exposures =
    filter === "all" ? allExposures : allExposures.filter((e) => e.status === filter);

  const totalCount = allExposures.length;
  const activeCount = allExposures.filter((e) => e.status === "active").length;
  const mitigatedCount = allExposures.filter((e) => e.status === "mitigated").length;
  const highUrgencyCount = allExposures.filter(
    (e) => e.highRoute && e.frequency === "routine" && e.status === "active"
  ).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Monitor · Stage 1</p>
            <h1>Exposure Monitoring</h1>
            <p className="muted">
              Log and track personnel exposure pathways — by material, route, and frequency. High-route
              routine exposures fire early-warning signals to the Predictive Engine before an incident occurs.
            </p>
          </div>
          <Link className="button-secondary" href="/exposure-map">
            <Map size={15} /> Exposure Map
          </Link>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Exposure monitoring summary">
          <article className="command-card platform-blue">
            <div><span><Activity size={16} /></span><strong>Total pathways</strong></div>
            <small>{totalCount}</small>
            <em>Exposure pathways in the register.</em>
          </article>
          <article className={`command-card ${highUrgencyCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>High urgency — active</strong></div>
            <small>{highUrgencyCount}</small>
            <em>{highUrgencyCount > 0 ? "Routine high-route exposures need review." : "No routine high-route exposures."}</em>
          </article>
          <article className="command-card platform-green">
            <div><span><ShieldCheck size={16} /></span><strong>Mitigated</strong></div>
            <small>{mitigatedCount}</small>
            <em>Pathways with controls in place.</em>
          </article>
        </section>

        {/* Urgency alert */}
        {highUrgencyCount > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{highUrgencyCount} routine high-route exposure{highUrgencyCount !== 1 ? "s" : ""} require review.</strong>{" "}
              Inhalation or injection pathways at routine frequency are leading indicators for occupational illness.
            </span>
            <Link className="ai-fill-btn ai-fill-btn--danger" href="/monitoring/exposure?filter=active">
              View active
            </Link>
          </div>
        )}

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav aria-label="Exposure filter" className="command-center-link-strip">
          <Link
            href="/monitoring/exposure"
            className={`button-secondary compact ${filter === "all" ? "active-filter" : ""}`}
          >
            All pathways
            <span className="filter-count-badge">{totalCount}</span>
          </Link>
          <Link
            href="/monitoring/exposure?filter=active"
            className={`button-secondary compact ${filter === "active" ? "active-filter" : ""}`}
          >
            Active
            <span className="filter-count-badge">{activeCount}</span>
          </Link>
          <Link
            href="/monitoring/exposure?filter=mitigated"
            className={`button-secondary compact ${filter === "mitigated" ? "active-filter" : ""}`}
          >
            Mitigated
            <span className="filter-count-badge">{mitigatedCount}</span>
          </Link>
        </nav>

        {/* Exposure table */}
        <section className="table-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Exposure register</p>
              <h2>
                {exposures.length === allExposures.length
                  ? `${totalCount} pathway${totalCount !== 1 ? "s" : ""}`
                  : `${exposures.length} of ${totalCount} shown`}
              </h2>
              <p className="muted">
                Exposure risk level is derived from route × frequency. High = routine inhalation or injection.
                Quantitative OEL sampling results can be added in the notes field.
              </p>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="exposure register" />
          ) : exposures.length === 0 ? (
            <div className="empty-action-state">
              <strong>No exposure pathways logged yet.</strong>
              <p>Use the form below to log your first exposure pathway.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Material / agent</th>
                  <th>Person / role</th>
                  <th>Route</th>
                  <th>Frequency</th>
                  <th>Exposure risk level</th>
                  <th>Status</th>
                  <th>Logged</th>
                  {adminAccess.signedIn && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {exposures.map((exp) => (
                  <tr key={exp.id}>
                    <td>
                      <strong>{exp.material ?? <span className="muted">—</span>}</strong>
                      {exp.notes && <p className="muted">{exp.notes}</p>}
                    </td>
                    <td>{exp.personRole ?? <span className="muted">—</span>}</td>
                    <td>{exposureRouteLabels[exp.exposureRoute]}</td>
                    <td>{exposureFrequencyLabels[exp.frequency]}</td>
                    <td>
                      <span className={urgencyClass(exp.highRoute, exp.frequency)}>
                        {urgencyLabel(exp.highRoute, exp.frequency)}
                      </span>
                    </td>
                    <td>
                      <span className={STATUS_CLASS[exp.status]}>
                        {exposureStatusLabels[exp.status]}
                      </span>
                    </td>
                    <td>{exp.createdAt ? new Date(exp.createdAt).toLocaleDateString() : "—"}</td>
                    {adminAccess.signedIn && (
                      <td>
                        {exp.status === "active" && (
                          <form action={updateExposureStatusAction}>
                            <input type="hidden" name="id" value={exp.id} />
                            <input type="hidden" name="status" value="mitigated" />
                            <button className="button-secondary compact" type="submit">
                              Mark mitigated
                            </button>
                          </form>
                        )}
                        {exp.status === "mitigated" && (
                          <form action={updateExposureStatusAction}>
                            <input type="hidden" name="id" value={exp.id} />
                            <input type="hidden" name="status" value="retired" />
                            <button className="button-secondary compact" type="submit">
                              Retire
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Log form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Log exposure</p>
                <h2>Add an exposure pathway</h2>
                <p className="muted">
                  High-route routine exposures trigger early-warning signals to the Predictive Engine.
                  Draft — human review required.
                </p>
              </div>
              <Plus size={22} />
            </div>
            <form action={logExposureAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Material / agent
                  <input
                    name="material"
                    type="text"
                    placeholder="e.g. Formaldehyde (10% formalin)"
                  />
                </label>
                <label>
                  Person / role exposed
                  <input
                    name="personRole"
                    type="text"
                    placeholder="e.g. Histology technician"
                  />
                </label>
                <label>
                  Exposure route <span aria-hidden="true">*</span>
                  <select name="exposureRoute" defaultValue="other">
                    {exposureRouteOptions.map((r) => (
                      <option key={r} value={r}>{exposureRouteLabels[r]}</option>
                    ))}
                  </select>
                  <span className="muted">
                    Inhalation and injection are high-route — raises predicted risk when routine.
                  </span>
                </label>
                <label>
                  Frequency <span aria-hidden="true">*</span>
                  <select name="frequency" defaultValue="occasional">
                    {exposureFrequencyOptions.map((f) => (
                      <option key={f} value={f}>{exposureFrequencyLabels[f]}</option>
                    ))}
                  </select>
                </label>
                {labs.length > 0 && (
                  <label>
                    Lab (optional)
                    <select name="labId" defaultValue="">
                      <option value="">— Select lab —</option>
                      {labs.map((lab) => (
                        <option key={lab.id} value={lab.id}>
                          {lab.name}{lab.biosafetyLevel ? ` (${lab.biosafetyLevel})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <label>
                Notes / context
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="e.g. Daily fixative prep in fume hood. Recent hood PM overdue."
                />
              </label>
              <button className="button-primary" type="submit">Log exposure pathway</button>
            </form>
          </section>
        )}

        {/* Cross-links */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Related tools</p>
            <h2>Exposure Map & Hazard Register</h2>
            <p className="muted">
              The Exposure Map visualises pathways by lab and person. The Hazard Register tracks
              the source agents and controls that underpin each exposure pathway.
            </p>
          </div>
          <div className="form-action-row">
            <Link className="button-primary" href="/exposure-map">Open Exposure Map</Link>
            <Link className="button-secondary" href="/hazards">Hazard Register</Link>
          </div>
        </section>

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Exposure logging supports — it does not replace — the industrial hygienist</h2>
            <p className="muted">
              Exposure risk level is a route × frequency indicator, not a quantitative OEL comparison.
              Actual air sampling, biological monitoring, and OEL verification must be performed
              by a qualified industrial hygienist. Logged pathways are{" "}
              <strong>Draft — Human Review Required</strong>.
            </p>
          </div>
          <Brain size={24} />
        </section>
      </div>
    </AppShell>
  );
}
