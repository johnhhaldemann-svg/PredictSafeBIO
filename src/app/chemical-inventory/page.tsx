export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AlertTriangle, FlaskConical, Plus, ShieldCheck, FileWarning, Clock } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Chemical & SDS – PredictSafe" };
import { AppShell } from "@/components/AppShell";
import { listChemicals, hazardClassLabels, type HazardClass } from "@/lib/supabase/chemical-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createChemicalAction, archiveChemicalAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

const HAZARD_CLASS: Record<HazardClass, string> = {
  flammable: "status-needs-review",
  corrosive: "status-needs-review",
  toxic: "status-overdue",
  oxidizer: "status-needs-review",
  compressed_gas: "",
  environmental: "",
  health_hazard: "status-needs-review",
  irritant: "",
  explosive: "status-overdue",
  other: ""
};

type Props = {
  searchParams: Promise<{ message?: string; success?: string; filter?: string }>;
};

export default async function ChemicalInventoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const [allChemicalsResult, adminAccess] = await Promise.all([
    listChemicals().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  const loadFailed  = allChemicalsResult === null;
  const allChemicals = allChemicalsResult ?? [];
  const chemicals = allChemicals.filter((c) => {
    if (filter === "expiring")  return c.expiringSoon || c.expired;
    if (filter === "no-sds")    return !c.sdsPresent;
    return true;
  });

  const totalCount   = allChemicals.length;
  const missingSds   = allChemicals.filter((c) => !c.sdsPresent).length;
  const expiringSoon = allChemicals.filter((c) => c.expiringSoon && !c.expired).length;
  const expiredCount = allChemicals.filter((c) => c.expired).length;
  const filterCounts = {
    all: totalCount,
    expiring: allChemicals.filter((c) => c.expiringSoon || c.expired).length,
    "no-sds": missingSds,
  };

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · Chemical Hygiene</p>
            <h1>Chemical &amp; SDS Management</h1>
            <p className="muted">
              GHS inventory, SDS tracking, expiry alerts, and storage compatibility.
              All classification and storage decisions require a qualified chemical hygiene officer.
            </p>
          </div>
          <Link className="button-secondary" href="/waste-management">Waste Management →</Link>
        </header>

        {/* KPI strip */}
        <section className="kpi-grid" aria-label="Chemical inventory summary">
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-label">Total Chemicals</div>
            <div className="kpi-value">{totalCount}</div>
            <div className="kpi-sub">Active in inventory</div>
          </div>
          <div className={`kpi-card ${missingSds > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
            <div className="kpi-label">Missing SDS</div>
            <div className="kpi-value">{missingSds}</div>
            <div className="kpi-sub">{missingSds > 0 ? "SDS required — compliance risk" : "All SDS on file"}</div>
          </div>
          <div className={`kpi-card ${expiringSoon + expiredCount > 0 ? "kpi-card--amber" : "kpi-card--green"}`}>
            <div className="kpi-label">Expiring / Expired</div>
            <div className="kpi-value">{expiringSoon + expiredCount}</div>
            <div className="kpi-sub">
              {expiredCount > 0 ? `${expiredCount} expired` : expiringSoon > 0 ? `${expiringSoon} within 30 days` : "No expiry issues"}
            </div>
          </div>
          <div className="kpi-card kpi-card--purple">
            <div className="kpi-label">Restricted</div>
            <div className="kpi-value">{allChemicals.filter(c => c.restricted).length}</div>
            <div className="kpi-sub">Require special handling</div>
          </div>
        </section>

        {missingSds > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{missingSds} chemical{missingSds !== 1 ? "s" : ""} missing SDS.</strong>{" "}
              SDS is required for all hazardous chemicals. Resolve before next inspection.
            </span>
            <Link className="ai-fill-btn ai-fill-btn--danger" href="/chemical-inventory?filter=no-sds">View</Link>
          </div>
        )}

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Chemical filter">
          {(["all", "expiring", "no-sds"] as const).map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/chemical-inventory" : `/chemical-inventory?filter=${f}`}
              className={`button-secondary compact ${filter === f ? "active-filter" : ""}`}
            >
              {f === "all" ? "All chemicals" : f === "expiring" ? "Expiring soon" : "Missing SDS"}
              <span className="filter-count-badge">{filterCounts[f] ?? 0}</span>
            </Link>
          ))}
        </nav>

        {/* Chemical register */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Chemical register</p>
              <h2>
                {chemicals.length === allChemicals.length
                  ? `${totalCount} chemical${totalCount !== 1 ? "s" : ""}`
                  : `${chemicals.length} of ${totalCount} shown`}
              </h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="chemical inventory" />
          ) : chemicals.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No chemicals found</p>
              <p className="muted">Add your first chemical below to begin tracking SDS and expiry.</p>
            </div>
          ) : (
            <div className="action-list">
              {chemicals.map((chem) => (
                <article className="action-row" key={chem.id}>
                  <div>
                    <strong>{chem.chemicalName}</strong>
                    {chem.hazardClass && (
                      <span className={HAZARD_CLASS[chem.hazardClass]}>
                        {hazardClassLabels[chem.hazardClass]}
                      </span>
                    )}
                    {chem.restricted && (
                      <span className="status-overdue">Restricted</span>
                    )}
                    {!chem.sdsPresent && (
                      <span className="status-overdue">⚠ SDS missing</span>
                    )}
                    {chem.expired && (
                      <span className="status-overdue">Expired</span>
                    )}
                    {chem.expiringSoon && !chem.expired && (
                      <span className="status-needs-review">Expiring soon</span>
                    )}
                  </div>
                  <p>
                    {chem.casNumber ? `CAS ${chem.casNumber} · ` : ""}
                    {chem.storageLocation ?? "No location"}
                    {chem.quantity ? ` · ${chem.quantity}` : ""}
                    {chem.expirationDate
                      ? ` · Expires ${new Date(chem.expirationDate).toLocaleDateString()}`
                      : ""}
                  </p>
                  {adminAccess.signedIn && (
                    <form action={archiveChemicalAction}>
                      <input type="hidden" name="id" value={chem.id} />
                      <button
                        className="button-secondary compact"
                        type="submit"
                        title="Archive this chemical"
                      >
                        Archive
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Add chemical form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Add chemical</p>
                <h2>Register a new chemical</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createChemicalAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Chemical name <span aria-hidden="true">*</span>
                  <input name="chemicalName" type="text" placeholder="e.g. Ethanol 200 proof" required />
                </label>
                <label>
                  CAS number
                  <input name="casNumber" type="text" placeholder="e.g. 64-17-5" />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Hazard class
                  <select name="hazardClass" defaultValue="">
                    <option value="">— Select —</option>
                    <option value="flammable">Flammable</option>
                    <option value="corrosive">Corrosive</option>
                    <option value="toxic">Toxic</option>
                    <option value="oxidizer">Oxidizer</option>
                    <option value="compressed_gas">Compressed Gas</option>
                    <option value="environmental">Environmental Hazard</option>
                    <option value="health_hazard">Health Hazard</option>
                    <option value="irritant">Irritant</option>
                    <option value="explosive">Explosive</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Storage group
                  <input name="storageGroup" type="text" placeholder="e.g. Flammable Cabinet A" />
                </label>
                <label>
                  Storage location
                  <input name="storageLocation" type="text" placeholder="e.g. Lab 101" />
                </label>
                <label>
                  Quantity
                  <input name="quantity" type="text" placeholder="e.g. 4L" />
                </label>
                <label>
                  Expiration date
                  <input name="expirationDate" type="date" />
                </label>
                <label>
                  Waste disposal route
                  <input name="wasteRoute" type="text" placeholder="e.g. Flammable Waste" />
                </label>
              </div>
              <label>
                Spill response notes
                <textarea name="spillResponseNotes" rows={2} placeholder="e.g. Absorb with dry sand. Avoid ignition sources." />
              </label>
              <label className="checkbox-label">
                <input name="restricted" type="checkbox" />
                Restricted / controlled substance — requires additional authorization
              </label>
              <p className="muted">
                After adding, upload the SDS document through your document library to resolve the open risk cell.
              </p>
              <button className="button-primary" type="submit">Add chemical</button>
            </form>
          </section>
        )}

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Chemical hazard classification requires human verification</h2>
            <p className="muted">
              AI may surface expiry alerts and SDS gaps, but GHS classification, storage compatibility,
              and exposure limit determinations must be verified by a qualified chemical hygiene officer.
              All records are <strong>Draft — Human Review Required</strong> until an SDS is on file.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
