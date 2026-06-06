export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Plus, ShieldCheck, Sprout } from "lucide-react";
import Link from "next/link";
import { DataLoadError } from "@/components/DataLoadError";

export const metadata: Metadata = { title: "Pesticide & Disinfectant – PredictSafeBIO" };
import { AppShell } from "@/components/AppShell";
import {
  listPesticideRecords,
  productTypeLabels,
  type ProductType
} from "@/lib/supabase/pesticide-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createPesticideAction, resolveDeviationAction } from "./actions";

type Props = {
  searchParams: Promise<{ message?: string; success?: string; filter?: string }>;
};

export default async function PesticidePage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const [recordsResult, adminAccess] = await Promise.all([
    listPesticideRecords(
      filter === "deviations"    ? { deviationOnly: true } :
      filter === "missing-label" ? { missingLabel: true } :
      filter === "pesticide"     ? { productType: "pesticide" as ProductType } :
      filter === "disinfectant"  ? { productType: "disinfectant" as ProductType } :
      undefined
    ).catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  const loadFailed     = recordsResult === null;
  const records        = recordsResult ?? [];
  const totalCount      = records.length;
  const deviationCount  = records.filter((r) => r.deviationNoted).length;
  const missingLabel    = records.filter((r) => !r.hasLabel).length;
  const cleanCount      = records.filter((r) => !r.needsAttention).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Operate</p>
          <h1>Pesticide &amp; Disinfectant Control</h1>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Pesticide summary">
          <article className="command-card platform-blue">
            <div><span><Sprout size={16} /></span><strong>Applications logged</strong></div>
            <small>{totalCount}</small>
            <em>Total active records on file.</em>
          </article>
          <article className={`command-card ${deviationCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Deviations</strong></div>
            <small>{deviationCount}</small>
            <em>{deviationCount > 0 ? "Applications with noted deviations — requires EHS review." : "No deviations on record."}</em>
          </article>
          <article className={`command-card ${missingLabel > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><CheckCircle2 size={16} /></span><strong>Missing label</strong></div>
            <small>{missingLabel}</small>
            <em>{missingLabel > 0 ? "Label document not on file — EPA label required." : "All records have label on file."}</em>
          </article>
        </section>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Pesticide filter">
          {(["all", "deviations", "missing-label", "pesticide", "disinfectant"] as const).map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/pesticide" : `/pesticide?filter=${f}`}
              className={`button-secondary compact ${filter === f ? "active-filter" : ""}`}
            >
              {f === "all" ? "All" :
               f === "deviations" ? "Deviations" :
               f === "missing-label" ? "Missing label" :
               f === "pesticide" ? "Pesticides" : "Disinfectants"}
            </Link>
          ))}
        </nav>

        {/* Application register */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Application log</p>
              <h2>{totalCount} record{totalCount !== 1 ? "s" : ""}</h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="pesticide records" />
          ) : records.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No records found</p>
              <p className="muted">Log your first application below.</p>
            </div>
          ) : (
            <div className="action-list">
              {records.map((rec) => (
                <article className="action-row" key={rec.id}>
                  <div>
                    <strong>{rec.productName}</strong>
                    <span>{productTypeLabels[rec.productType]}</span>
                    {rec.deviationNoted && (
                      <span className="status-overdue">⚠ Deviation noted</span>
                    )}
                    {!rec.hasLabel && (
                      <span className="status-needs-review">Label missing</span>
                    )}
                    {!rec.needsAttention && (
                      <span className="status-current">Compliant</span>
                    )}
                  </div>
                  <p>
                    {rec.epaRegistrationNumber ? `EPA Reg. ${rec.epaRegistrationNumber} · ` : "No EPA # · "}
                    {rec.location ?? "No location"}
                    {rec.applicationDate
                      ? ` · Applied ${new Date(rec.applicationDate).toLocaleDateString()}`
                      : ""}
                    {rec.contactTimeMinutes != null ? ` · Contact time: ${rec.contactTimeMinutes} min` : ""}
                    {rec.reentryTimeMinutes != null ? ` · Re-entry: ${rec.reentryTimeMinutes} min` : ""}
                  </p>
                  {rec.deviationNoted && rec.deviationNotes && (
                    <p className="muted" style={{ fontSize: "0.82em" }}>
                      Deviation: {rec.deviationNotes}
                    </p>
                  )}

                  {adminAccess.signedIn && rec.deviationNoted && (
                    <form action={resolveDeviationAction} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                      <input type="hidden" name="id" value={rec.id} />
                      <input
                        name="resolutionNote"
                        type="text"
                        placeholder="Resolution note — what was corrected"
                        style={{ flex: 1, minWidth: "200px" }}
                      />
                      <button className="button-secondary compact" type="submit">Resolve deviation</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Log new application */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Log application</p>
                <h2>Record a new pesticide or disinfectant use</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createPesticideAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Product name <span aria-hidden="true">*</span>
                  <input name="productName" type="text" placeholder="e.g. Virkon S" required />
                </label>
                <label>
                  Product type
                  <select name="productType" defaultValue="disinfectant">
                    <option value="disinfectant">Disinfectant</option>
                    <option value="sanitizer">Sanitizer</option>
                    <option value="pesticide">Pesticide</option>
                    <option value="pest_control">Pest Control</option>
                  </select>
                </label>
                <label>
                  EPA registration number
                  <input name="epaRegistrationNumber" type="text" placeholder="e.g. 39967-129" />
                </label>
                <label>
                  Location
                  <input name="location" type="text" placeholder="e.g. Lab 101 — BSL-2" />
                </label>
                <label>
                  Vendor / manufacturer
                  <input name="vendorName" type="text" placeholder="e.g. Lanxess" />
                </label>
                <label>
                  Application date/time
                  <input name="applicationDate" type="datetime-local" />
                </label>
                <label>
                  Contact time (minutes)
                  <input name="contactTimeMinutes" type="number" min={0} placeholder="e.g. 10" />
                </label>
                <label>
                  Re-entry time (minutes)
                  <input name="reentryTimeMinutes" type="number" min={0} placeholder="e.g. 30" />
                </label>
              </div>
              <label>
                Approved use / purpose
                <input name="approvedUse" type="text" placeholder="e.g. Biohazardous spill decontamination" />
              </label>
              <label className="checkbox-label">
                <input name="deviationNoted" type="checkbox" />
                Deviation noted (used outside approved label, location, or procedure)
              </label>
              <label>
                Deviation details (if applicable)
                <textarea name="deviationNotes" rows={2} placeholder="Describe the deviation from the approved label or SOP" />
              </label>
              <p className="muted" style={{ fontSize: "0.82em" }}>
                All pesticide applications must follow the EPA-approved label. Use only in approved locations and at
                approved concentrations. Upload the product label to document control after logging.
              </p>
              <button className="button-primary" type="submit">Log application</button>
            </form>
          </section>
        )}

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Pesticide use must follow EPA label — no exceptions</h2>
            <p className="muted">
              AI may flag deviations and missing labels, but pesticide selection, application rate,
              and re-entry interval determinations must be made by a trained applicator following
              the EPA-registered label. The label is the law. All records are{" "}
              <strong>Draft — Human Review Required</strong> until confirmed by EHS.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
