export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Map as MapIcon, Plus, Brain, Wind, Building2 } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
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
import { listHazards } from "@/lib/supabase/hazard-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createExposureAction, updateExposureStatusAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

export const metadata: Metadata = { title: "Exposure Map – PredictSafeBIO" };

const STATUS_CLASS: Record<ExposureStatus, string> = {
  active: "status-overdue",
  mitigated: "status-needs-review",
  retired: "",
};

type Props = {
  searchParams: Promise<{ message?: string; success?: string; filter?: string }>;
};

export default async function ExposureMapPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const [exposuresResult, labs, hazards, adminAccess] = await Promise.all([
    listExposures(filter === "high-route" ? { highRouteOnly: true } : undefined).catch(() => null),
    listLabsForExposure().catch(() => []),
    listHazards().catch(() => []),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false,
      signedIn: false,
      isOwner: false,
      message: "",
    })),
  ]);

  const loadFailed = exposuresResult === null;
  const exposures = exposuresResult ?? [];
  const labName = new Map(labs.map((l) => [l.id, l.name]));
  const hazardName = new Map(hazards.map((h) => [h.id, h.name]));

  const totalCount = exposures.length;
  const highRouteCount = exposures.filter((e) => e.highRoute && e.status !== "retired").length;
  const earlyWarnings = exposures.filter(
    (e) => e.highRoute && e.frequency === "routine" && e.status === "active"
  ).length;

  // Group exposures by lab for the map view.
  const byLab = new Map<string, typeof exposures>();
  for (const e of exposures) {
    const key = e.labId ?? "unassigned";
    if (!byLab.has(key)) byLab.set(key, []);
    byLab.get(key)!.push(e);
  }

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Monitor · <Link href="/monitoring/exposure">Exposure Monitoring</Link></p>
            <h1>Exposure Map</h1>
            <p className="muted">
              Map who works with what, where, and by which exposure route. The engine flags labs where
              high-route, routine exposures accumulate.
            </p>
          </div>
          <Link className="button-secondary" href="/monitoring/exposure">← Exposure Monitoring</Link>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Exposure map summary">
          <article className="command-card platform-blue">
            <div><span><MapIcon size={16} /></span><strong>Exposure pathways</strong></div>
            <small>{totalCount}</small>
            <em>Mapped people ↔ materials ↔ routes.</em>
          </article>
          <article className={`command-card ${highRouteCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><Wind size={16} /></span><strong>High-route exposures</strong></div>
            <small>{highRouteCount}</small>
            <em>{highRouteCount > 0 ? "Injection / inhalation pathways." : "No high-route pathways."}</em>
          </article>
          <article className={`command-card ${earlyWarnings > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><Brain size={16} /></span><strong>Early warnings</strong></div>
            <small>{earlyWarnings}</small>
            <em>{earlyWarnings > 0 ? "Routine high-route exposure — engine flagged." : "No early warnings."}</em>
          </article>
        </section>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Exposure filter">
          {(["all", "high-route"] as const).map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/exposure-map" : `/exposure-map?filter=${f}`}
              className={`button-secondary compact ${filter === f ? "active-filter" : ""}`}
            >
              {f === "all" ? "All pathways" : "High-route only"}
            </Link>
          ))}
        </nav>

        {/* Exposure map, grouped by lab */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Exposure map</p>
              <h2>{totalCount} pathway{totalCount !== 1 ? "s" : ""}</h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="exposure map" />
          ) : exposures.length === 0 ? (
            <p className="muted">No exposure pathways mapped yet. Add the first one below.</p>
          ) : (
            [...byLab.entries()].map(([labId, group]) => (
              <div key={labId} className="tier-group">
                <p className="section-label">
                  <Building2 size={13} aria-hidden="true" />{" "}
                  {labId === "unassigned" ? "Unassigned location" : labName.get(labId) ?? "Unknown lab"}
                  <span className="muted"> · {group.length} pathway{group.length !== 1 ? "s" : ""}</span>
                </p>
                <div className="action-list">
                  {group.map((exp) => (
                    <article className="action-row" key={exp.id}>
                      <div>
                        <strong>
                          {(exp.personRole ?? "Personnel")} — {(exp.material ?? "material")}
                        </strong>
                        <span className={exp.highRoute ? "status-overdue" : "status-pill"}>
                          {exposureRouteLabels[exp.exposureRoute]}
                        </span>
                        <span className={STATUS_CLASS[exp.status]}>{exposureStatusLabels[exp.status]}</span>
                        <small className="muted">
                          {exposureFrequencyLabels[exp.frequency]} exposure
                          {exp.hazardId && hazardName.get(exp.hazardId)
                            ? ` · hazard: ${hazardName.get(exp.hazardId)}`
                            : ""}
                          {exp.notes ? ` · ${exp.notes}` : ""}
                        </small>
                      </div>
                      {adminAccess.signedIn && exp.status === "active" && (
                        <form action={updateExposureStatusAction}>
                          <input type="hidden" name="id" value={exp.id} />
                          <input type="hidden" name="status" value="mitigated" />
                          <button className="button-secondary compact" type="submit">Mark mitigated</button>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Add exposure form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Map exposure</p>
                <h2>Add an exposure pathway</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createExposureAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Person / role
                  <input name="personRole" type="text" placeholder="e.g. Research associate" />
                </label>
                <label>
                  Material / agent
                  <input name="material" type="text" placeholder="e.g. Lentiviral vector" />
                </label>
                <label>
                  Lab / location
                  <select name="labId" defaultValue="">
                    <option value="">— Select a lab —</option>
                    {labs.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}{l.biosafetyLevel ? ` (${l.biosafetyLevel})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Linked hazard
                  <select name="hazardId" defaultValue="">
                    <option value="">— Select a hazard —</option>
                    {hazards
                      .filter((h) => h.status !== "retired")
                      .map((h) => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                  </select>
                </label>
                <label>
                  Exposure route
                  <select name="exposureRoute" defaultValue="inhalation">
                    {(Object.keys(exposureRouteLabels) as ExposureRoute[]).map((r) => (
                      <option key={r} value={r}>{exposureRouteLabels[r]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Frequency
                  <select name="frequency" defaultValue="occasional">
                    {(Object.keys(exposureFrequencyLabels) as ExposureFrequency[]).map((f) => (
                      <option key={f} value={f}>{exposureFrequencyLabels[f]}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Notes
                <textarea name="notes" rows={2} placeholder="How does the exposure occur? Existing precautions?" />
              </label>
              <button className="button-primary" type="submit">Add exposure pathway</button>
            </form>
          </section>
        )}

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Exposure early warnings are indicators, not verdicts</h2>
            <p className="muted">
              Exposure assessment, route determination, and control adequacy must be confirmed by a
              qualified biosafety or industrial-hygiene professional. All pathways are{" "}
              <strong>Draft — Human Review Required</strong>.
            </p>
          </div>
          <Brain size={24} />
        </section>
      </div>
    </AppShell>
  );
}
