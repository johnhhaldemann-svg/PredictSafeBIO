export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AlertTriangle, Plus, ShieldCheck, Activity, Brain } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  listHazards,
  hazardTypeLabels,
  hazardStatusLabels,
  riskFamilyOptions,
  bslLevels,
  type HazardType,
  type HazardStatus,
} from "@/lib/supabase/hazard-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createHazardAction, archiveHazardAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

export const metadata: Metadata = { title: "Hazard Register – PredictSafeBIO" };

const STATUS_CLASS: Record<HazardStatus, string> = {
  identified: "status-overdue",
  assessed: "status-needs-review",
  controlled: "status-ok",
  retired: "",
};

type Props = {
  searchParams: Promise<{ message?: string; filter?: string }>;
};

export default async function HazardRegisterPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const statusFilter: HazardStatus | undefined =
    filter === "identified" ? "identified" : filter === "controlled" ? "controlled" : undefined;

  const [hazardsResult, adminAccess] = await Promise.all([
    listHazards(statusFilter ? { status: statusFilter } : undefined).catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false,
      signedIn: false,
      isOwner: false,
      message: "",
    })),
  ]);

  const loadFailed = hazardsResult === null;
  const hazards = hazardsResult ?? [];
  const totalCount = hazards.length;
  const identifiedCount = hazards.filter((h) => h.status === "identified").length;
  const controlledCount = hazards.filter((h) => h.status === "controlled").length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Assess · Stage 3</p>
          <h1>Hazard Register</h1>
          <p className="muted">
            Identify and track the biological, chemical, physical, and ergonomic hazards in your
            operation. Each hazard you add feeds the <strong>Predictive AI Safety Engine</strong> as a
            leading indicator — uncontrolled hazards raise predicted risk before an incident occurs.
          </p>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Hazard register summary">
          <article className="command-card platform-blue">
            <div><span><AlertTriangle size={16} /></span><strong>Total hazards</strong></div>
            <small>{totalCount}</small>
            <em>Active hazards in the register.</em>
          </article>
          <article className={`command-card ${identifiedCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><Activity size={16} /></span><strong>Identified, uncontrolled</strong></div>
            <small>{identifiedCount}</small>
            <em>{identifiedCount > 0 ? "Leading indicators raising predicted risk." : "No uncontrolled hazards."}</em>
          </article>
          <article className="command-card platform-green">
            <div><span><ShieldCheck size={16} /></span><strong>Controlled</strong></div>
            <small>{controlledCount}</small>
            <em>Hazards with controls in place.</em>
          </article>
        </section>

        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Hazard filter">
          {(["all", "identified", "controlled"] as const).map((f) => (
            <a
              key={f}
              href={f === "all" ? "/hazards" : `/hazards?filter=${f}`}
              className={`button-secondary compact ${filter === f ? "active-filter" : ""}`}
            >
              {f === "all" ? "All hazards" : f === "identified" ? "Identified (uncontrolled)" : "Controlled"}
            </a>
          ))}
        </nav>

        {/* Hazard register */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Hazard register</p>
              <h2>{totalCount} hazard{totalCount !== 1 ? "s" : ""}</h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="hazard register" />
          ) : hazards.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No hazards registered yet</p>
              <p className="muted">Add your first hazard below to begin tracking risk controls.</p>
            </div>
          ) : (
            <div className="action-list">
              {hazards.map((hz) => (
                <article className="action-row" key={hz.id}>
                  <div>
                    <strong>{hz.name}</strong>
                    <span className="status-pill">{hazardTypeLabels[hz.hazardType]}</span>
                    <span className={STATUS_CLASS[hz.status]}>{hazardStatusLabels[hz.status]}</span>
                    <small className="muted">
                      {hz.bslLevel ? `${hz.bslLevel} · ` : ""}
                      {hz.location ? `${hz.location} · ` : ""}
                      {hz.containment ? `Containment: ${hz.containment}` : "No containment recorded"}
                    </small>
                  </div>
                  {adminAccess.signedIn && hz.status !== "retired" && (
                    <form action={archiveHazardAction}>
                      <input type="hidden" name="id" value={hz.id} />
                      <button className="button-secondary compact" type="submit">Retire</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Add hazard form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Identify hazard</p>
                <h2>Add a hazard to the register</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createHazardAction} className="stacked-form">
              <label>
                Hazard name <span aria-hidden="true">*</span>
                <input name="name" type="text" placeholder="e.g. Aerosol generation during centrifugation" required />
              </label>
              <div className="form-grid">
                <label>
                  Hazard type
                  <select name="hazardType" defaultValue="biological">
                    {(Object.keys(hazardTypeLabels) as HazardType[]).map((t) => (
                      <option key={t} value={t}>{hazardTypeLabels[t]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Risk family (predictive linkage)
                  <select name="riskFamily" defaultValue="">
                    <option value="">— Select —</option>
                    {riskFamilyOptions.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  BSL level
                  <select name="bslLevel" defaultValue="n/a">
                    {bslLevels.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select name="status" defaultValue="identified">
                    {(Object.keys(hazardStatusLabels) as HazardStatus[])
                      .filter((s) => s !== "retired")
                      .map((s) => (
                        <option key={s} value={s}>{hazardStatusLabels[s]}</option>
                      ))}
                  </select>
                </label>
                <label>
                  Location
                  <input name="location" type="text" placeholder="e.g. Lab 101" />
                </label>
                <label>
                  Associated material
                  <input name="associatedMaterial" type="text" placeholder="e.g. Lentiviral vector" />
                </label>
                <label>
                  Containment / control
                  <input name="containment" type="text" placeholder="e.g. BSC Class II + sealed rotor" />
                </label>
              </div>
              <label>
                Description
                <textarea name="description" rows={2} placeholder="What is the hazard and how could it cause harm?" />
              </label>
              <button className="button-primary" type="submit">Add hazard</button>
            </form>
          </section>
        )}

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Hazard identification supports — it does not replace — the safety officer</h2>
            <p className="muted">
              The Predictive Engine treats uncontrolled hazards as leading indicators and raises
              predicted risk, but containment level, BSL assignment, and control adequacy must be
              verified by a qualified biosafety professional. New hazards are{" "}
              <strong>Draft — Human Review Required</strong>.
            </p>
          </div>
          <Brain size={24} />
        </section>
      </div>
    </AppShell>
  );
}
