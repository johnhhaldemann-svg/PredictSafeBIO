export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AlertTriangle, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Waste Management – PredictSafe" };
import { AppShell } from "@/components/AppShell";
import {
  listWasteRecords,
  wasteTypeLabels,
  wasteStatusLabels,
  labelStatusLabels,
  type WasteStatus
} from "@/lib/supabase/waste-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createWasteAction, updateFillLevelAction, markPickedUpAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

const STATUS_CLASS: Record<WasteStatus, string> = {
  accumulating: "status-needs-review",
  ready_for_pickup: "status-needs-review",
  picked_up: "status-current",
  disposed: "status-current",
  on_hold: "status-overdue"
};

type Props = {
  searchParams: Promise<{ message?: string; success?: string; filter?: string }>;
};

export default async function WasteManagementPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const [allRecordsResult, adminAccess] = await Promise.all([
    listWasteRecords().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  const loadFailed = allRecordsResult === null;
  const allRecords = allRecordsResult ?? [];
  const records = allRecords.filter((r) => {
    if (filter === "at-risk") return r.isAtRisk || r.isCritical;
    if (filter === "ready")   return r.status === "ready_for_pickup";
    return true;
  });

  const totalCount    = allRecords.length;
  const criticalCount = allRecords.filter((r) => r.isCritical).length;
  const atRiskCount   = allRecords.filter((r) => r.isAtRisk && !r.isCritical).length;
  const readyCount    = allRecords.filter((r) => r.status === "ready_for_pickup").length;
  const filterCounts  = {
    all: totalCount,
    "at-risk": criticalCount + atRiskCount,
    ready: readyCount,
  };

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · Waste Tracking</p>
            <h1>Waste Management</h1>
            <p className="muted">
              Container fill levels, pickup scheduling, manifest tracking, and critical waste alerts.
              Classification and disposal authorization must be performed by a qualified EHS professional.
            </p>
          </div>
          <Link className="button-secondary" href="/chemical-inventory">Chemical &amp; SDS →</Link>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Waste management summary">
          <article className="command-card platform-blue">
            <div><span><Trash2 size={16} /></span><strong>Active containers</strong></div>
            <small>{totalCount}</small>
            <em>Containers currently tracked.</em>
          </article>
          <article className={`command-card ${criticalCount > 0 ? "platform-red" : atRiskCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Critical / At risk</strong></div>
            <small>{criticalCount + atRiskCount}</small>
            <em>
              {criticalCount > 0 ? `${criticalCount} critical (full or incident). ` : ""}
              {atRiskCount > 0 ? `${atRiskCount} at risk (≥80% or label issues).` : ""}
              {criticalCount === 0 && atRiskCount === 0 ? "No containers at risk." : ""}
            </em>
          </article>
          <article className={`command-card ${readyCount > 0 ? "platform-blue" : "platform-green"}`}>
            <div><span><Truck size={16} /></span><strong>Ready for pickup</strong></div>
            <small>{readyCount}</small>
            <em>{readyCount > 0 ? "Containers awaiting collection." : "No containers pending pickup."}</em>
          </article>
        </section>

        {criticalCount > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{criticalCount} critical container{criticalCount !== 1 ? "s" : ""}.</strong>{" "}
              Full or incident-related waste containers require immediate attention.
            </span>
            <Link className="ai-fill-btn ai-fill-btn--danger" href="/waste-management?filter=at-risk">View</Link>
          </div>
        )}

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Waste filter">
          {(["all", "at-risk", "ready"] as const).map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/waste-management" : `/waste-management?filter=${f}`}
              className={`button-secondary compact ${filter === f ? "active-filter" : ""}`}
            >
              {f === "all" ? "All containers" : f === "at-risk" ? "At risk (≥80%)" : "Ready for pickup"}
              <span className="filter-count-badge">{filterCounts[f] ?? 0}</span>
            </Link>
          ))}
        </nav>

        {/* Waste register */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Waste container register</p>
              <h2>
                {records.length === allRecords.length
                  ? `${totalCount} container${totalCount !== 1 ? "s" : ""}`
                  : `${records.length} of ${totalCount} shown`}
              </h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="waste records" />
          ) : records.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No waste containers found</p>
              <p className="muted">No containers match this filter. Register a container below to begin tracking.</p>
            </div>
          ) : (
            <div className="action-list">
              {records.map((rec) => (
                <article className="action-row" key={rec.id}>
                  <div>
                    <strong>{rec.containerLabel ?? rec.containerId ?? `${wasteTypeLabels[rec.wasteType]} container`}</strong>
                    <span className={STATUS_CLASS[rec.status]}>
                      {wasteStatusLabels[rec.status]}
                    </span>
                    <span>{wasteTypeLabels[rec.wasteType]}</span>
                    {rec.isCritical && <span className="status-overdue">⚠ Critical</span>}
                    {rec.isAtRisk && !rec.isCritical && <span className="status-needs-review">At risk</span>}
                    {rec.labelStatus !== "labeled" && (
                      <span className="status-overdue">{labelStatusLabels[rec.labelStatus]}</span>
                    )}
                  </div>
                  <p>
                    {rec.fillLevel != null ? `${rec.fillLevel}% full · ` : ""}
                    {rec.disposalVendor ?? "No vendor set"}
                    {rec.pickupScheduledDate
                      ? ` · Pickup ${new Date(rec.pickupScheduledDate).toLocaleDateString()}`
                      : ""}
                    {rec.manifestNumber ? ` · Manifest ${rec.manifestNumber}` : ""}
                  </p>

                  {adminAccess.signedIn && rec.status !== "picked_up" && rec.status !== "disposed" && (
                    <div className="waste-actions-row">
                      {/* Update fill level */}
                      <form action={updateFillLevelAction} className="inline-form">
                        <input type="hidden" name="id" value={rec.id} />
                        <input
                          name="fillLevel"
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={rec.fillLevel ?? 0}
                          className="input-narrow"
                          aria-label="Fill level %"
                        />
                        <button className="button-secondary compact" type="submit">Update fill</button>
                      </form>

                      {/* Mark picked up */}
                      <form action={markPickedUpAction} className="inline-form">
                        <input type="hidden" name="id" value={rec.id} />
                        <input
                          name="manifestNumber"
                          type="text"
                          placeholder="Manifest # (optional)"
                          className="input-medium"
                        />
                        <button className="button-secondary compact" type="submit">Mark picked up</button>
                      </form>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Add container form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Add container</p>
                <h2>Register a new waste container</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createWasteAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Waste type <span aria-hidden="true">*</span>
                  <select name="wasteType" defaultValue="chemical" required>
                    <option value="chemical">Chemical</option>
                    <option value="biological">Biological</option>
                    <option value="radioactive">Radioactive</option>
                    <option value="sharps">Sharps</option>
                    <option value="pharmaceutical">Pharmaceutical</option>
                    <option value="universal">Universal</option>
                    <option value="solid">Solid</option>
                    <option value="liquid">Liquid</option>
                    <option value="mixed">Mixed</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Container label / ID
                  <input name="containerLabel" type="text" placeholder="e.g. CHW-2024-001" />
                </label>
                <label>
                  Container physical ID
                  <input name="containerId" type="text" placeholder="e.g. CTR-A1" />
                </label>
                <label>
                  Current fill level (%)
                  <input name="fillLevel" type="number" min={0} max={100} defaultValue={0} />
                </label>
                <label>
                  Disposal vendor
                  <input name="disposalVendor" type="text" placeholder="e.g. Clean Harbors" />
                </label>
                <label>
                  Scheduled pickup date
                  <input name="pickupScheduledDate" type="date" />
                </label>
              </div>
              <button className="button-primary" type="submit">Add container</button>
            </form>
          </section>
        )}

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Waste classification and disposal require human authorization</h2>
            <p className="muted">
              AI may surface fill level alerts and overdue pickups, but waste stream classification,
              manifest preparation, and disposal authorization must be performed by a qualified
              EHS professional. All containers are <strong>Draft — Human Review Required</strong> until
              properly labeled and a pickup is confirmed.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
