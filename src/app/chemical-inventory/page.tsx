export const dynamic = "force-dynamic";

import { AlertTriangle, FlaskConical, Plus, ShieldCheck, FileWarning, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { listChemicals, hazardClassLabels, type HazardClass } from "@/lib/supabase/chemical-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createChemicalAction, archiveChemicalAction } from "./actions";

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
  searchParams: Promise<{ message?: string; filter?: string }>;
};

export default async function ChemicalInventoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const [chemicals, adminAccess] = await Promise.all([
    listChemicals(
      filter === "expiring" ? { expiringSoon: true } :
      filter === "no-sds"   ? { missingSds: true } :
      undefined
    ).catch(() => []),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  const totalCount     = chemicals.length;
  const missingSds     = chemicals.filter((c) => !c.sdsPresent).length;
  const expiringSoon   = chemicals.filter((c) => c.expiringSoon).length;
  const expiredCount   = chemicals.filter((c) => c.expired).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">HSE Management Systems</p>
          <h1>Chemical &amp; SDS Management</h1>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Chemical inventory summary">
          <article className="command-card platform-blue">
            <div><span><FlaskConical size={16} /></span><strong>Total chemicals</strong></div>
            <small>{totalCount}</small>
            <em>Active chemicals in inventory.</em>
          </article>
          <article className={`command-card ${missingSds > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><FileWarning size={16} /></span><strong>Missing SDS</strong></div>
            <small>{missingSds}</small>
            <em>{missingSds > 0 ? "SDS required for all hazardous chemicals." : "All SDS documents on file."}</em>
          </article>
          <article className={`command-card ${expiringSoon > 0 || expiredCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><Clock size={16} /></span><strong>Expiring / Expired</strong></div>
            <small>{expiringSoon + expiredCount}</small>
            <em>
              {expiredCount > 0 ? `${expiredCount} expired. ` : ""}
              {expiringSoon > 0 ? `${expiringSoon} expiring within 30 days.` : ""}
              {expiringSoon === 0 && expiredCount === 0 ? "No expiry issues." : ""}
            </em>
          </article>
        </section>

        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Chemical filter">
          {(["all", "expiring", "no-sds"] as const).map((f) => (
            <a
              key={f}
              href={f === "all" ? "/chemical-inventory" : `/chemical-inventory?filter=${f}`}
              className={`button-secondary compact ${filter === f ? "active-filter" : ""}`}
            >
              {f === "all" ? "All chemicals" : f === "expiring" ? "Expiring soon" : "Missing SDS"}
            </a>
          ))}
        </nav>

        {/* Chemical register */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Chemical register</p>
              <h2>{totalCount} chemical{totalCount !== 1 ? "s" : ""}</h2>
            </div>
          </div>

          {chemicals.length === 0 ? (
            <p className="muted">No chemicals found. Add your first chemical below.</p>
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
                    <form action={archiveChemicalAction} style={{ display: "inline" }}>
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
              <p className="muted" style={{ fontSize: "0.82em" }}>
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
