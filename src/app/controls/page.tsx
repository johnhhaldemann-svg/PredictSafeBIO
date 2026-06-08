export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { SlidersHorizontal, Plus, ShieldCheck, Brain, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  listControls,
  controlTierLabels,
  controlTierRank,
  controlStatusLabels,
  type ControlTier,
  type ControlStatus,
} from "@/lib/supabase/control-service";
import { listHazards } from "@/lib/supabase/hazard-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createControlAction, updateControlStatusAction, archiveControlAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

export const metadata: Metadata = { title: "Control Register – PredictSafeBIO" };

const STATUS_CLASS: Record<ControlStatus, string> = {
  planned: "status-needs-review",
  in_place: "status-needs-review",
  verified: "status-ok",
  retired: "",
};

// Hierarchy of controls, most to least effective (for grouped display).
const TIER_ORDER: ControlTier[] = ["elimination", "substitution", "engineering", "administrative", "ppe"];

type Props = {
  searchParams: Promise<{ message?: string; success?: string; filter?: string }>;
};

export default async function ControlRegisterPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const [controlsResult, hazards, adminAccess] = await Promise.all([
    listControls().catch(() => null),
    listHazards().catch(() => []),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false,
      signedIn: false,
      isOwner: false,
      message: "",
    })),
  ]);

  const loadFailed = controlsResult === null;
  const allControls = controlsResult ?? [];
  const controls = filter === "overdue" ? allControls.filter((c) => c.verificationOverdue) : allControls;

  const hazardName = new Map(hazards.map((h) => [h.id, h.name]));
  const totalCount = allControls.length;
  const overdueCount = allControls.filter((c) => c.verificationOverdue).length;
  const hazardsWithControls = new Set(allControls.map((c) => c.hazardId).filter(Boolean) as string[]);
  const uncoveredHazards = hazards.filter((h) => h.status !== "retired" && !hazardsWithControls.has(h.id)).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Plan · Stage 5</p>
            <h1>Control Register</h1>
            <p className="muted">
              Select controls for each hazard using the <strong>hierarchy of controls</strong> —
              elimination first, PPE last. The <strong>Predictive AI Safety Engine</strong> forecasts
              each hazard&apos;s <strong>residual risk</strong> after its controls; overdue verification
              raises that forecast back up.
            </p>
          </div>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Control register summary">
          <article className="command-card platform-blue">
            <div><span><SlidersHorizontal size={16} /></span><strong>Total controls</strong></div>
            <small>{totalCount}</small>
            <em>Active controls across all hazards.</em>
          </article>
          <article className={`command-card ${overdueCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><Clock size={16} /></span><strong>Verification overdue</strong></div>
            <small>{overdueCount}</small>
            <em>{overdueCount > 0 ? "Overdue verification raises predicted risk." : "All verifications current."}</em>
          </article>
          <article className={`command-card ${uncoveredHazards > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Hazards without controls</strong></div>
            <small>{uncoveredHazards}</small>
            <em>{uncoveredHazards > 0 ? "Uncontrolled hazards carry full predicted risk." : "Every hazard has a control."}</em>
          </article>
        </section>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Control filter">
          {(["all", "overdue"] as const).map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/controls" : `/controls?filter=${f}`}
              className={`button-secondary compact ${filter === f ? "active-filter" : ""}`}
            >
              {f === "all" ? "All controls" : "Verification overdue"}
            </Link>
          ))}
        </nav>

        {/* Control register, grouped by hierarchy tier */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Control register</p>
              <h2>{controls.length} control{controls.length !== 1 ? "s" : ""}</h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="control register" />
          ) : controls.length === 0 ? (
            <p className="muted">No controls yet. Add the first control below.</p>
          ) : (
            TIER_ORDER.filter((tier) => controls.some((c) => c.controlType === tier)).map((tier) => (
              <div key={tier} className="tier-group">
                <p className="section-label">
                  {controlTierLabels[tier]} <span className="muted">· tier {controlTierRank[tier]}</span>
                </p>
                <div className="action-list">
                  {controls
                    .filter((c) => c.controlType === tier)
                    .map((ctrl) => (
                      <article className="action-row" key={ctrl.id}>
                        <div>
                          <strong>{ctrl.name}</strong>
                          <span className={STATUS_CLASS[ctrl.status]}>{controlStatusLabels[ctrl.status]}</span>
                          {ctrl.verificationOverdue && <span className="status-overdue">Verification overdue</span>}
                          <small className="muted">
                            {ctrl.hazardId && hazardName.get(ctrl.hazardId)
                              ? `Hazard: ${hazardName.get(ctrl.hazardId)}`
                              : "Not linked to a hazard"}
                            {ctrl.ownerRole ? ` · ${ctrl.ownerRole}` : ""}
                            {ctrl.verificationDue ? ` · verify by ${ctrl.verificationDue}` : ""}
                          </small>
                        </div>
                        {adminAccess.signedIn && ctrl.status !== "retired" && (
                          <div className="action-row-buttons">
                            {ctrl.status !== "verified" && (
                              <form action={updateControlStatusAction}>
                                <input type="hidden" name="id" value={ctrl.id} />
                                <input type="hidden" name="status" value="verified" />
                                <button className="button-secondary compact" type="submit">Mark verified</button>
                              </form>
                            )}
                            <form action={archiveControlAction}>
                              <input type="hidden" name="id" value={ctrl.id} />
                              <button className="button-secondary compact" type="submit">Retire</button>
                            </form>
                          </div>
                        )}
                      </article>
                    ))}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Add control form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Add control</p>
                <h2>Plan a control for a hazard</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createControlAction} className="stacked-form">
              <label>
                Control name <span aria-hidden="true">*</span>
                <input name="name" type="text" placeholder="e.g. Class II Biosafety Cabinet" required />
              </label>
              <div className="form-grid">
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
                  Control type (hierarchy)
                  <select name="controlType" defaultValue="engineering">
                    {TIER_ORDER.map((t) => (
                      <option key={t} value={t}>
                        {controlTierLabels[t]} (tier {controlTierRank[t]})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select name="status" defaultValue="planned">
                    {(Object.keys(controlStatusLabels) as ControlStatus[])
                      .filter((s) => s !== "retired")
                      .map((s) => (
                        <option key={s} value={s}>{controlStatusLabels[s]}</option>
                      ))}
                  </select>
                </label>
                <label>
                  Owner role
                  <input name="ownerRole" type="text" placeholder="e.g. Biosafety Officer" />
                </label>
                <label>
                  Verification due
                  <input name="verificationDue" type="date" />
                </label>
              </div>
              <label>
                Description
                <textarea name="description" rows={2} placeholder="How does this control reduce the hazard?" />
              </label>
              <button className="button-primary" type="submit">Add control</button>
            </form>
          </section>
        )}

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Residual risk is a forecast, not a guarantee</h2>
            <p className="muted">
              The engine lowers a hazard&apos;s predicted risk as effective, verified controls are
              added — but control adequacy and verification must be confirmed by a qualified safety
              professional. Forecasts are <strong>early indicators</strong>, and all changes are{" "}
              <strong>Draft — Human Review Required</strong>.
            </p>
          </div>
          <Brain size={24} />
        </section>
      </div>
    </AppShell>
  );
}
