export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Plus, Clock } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AiDraftBanner } from "@/components/AiDraftBanner";
import {
  listRiskRegisterEntries,
  RISK_STATUS_LABELS,
  RISK_STATUS_CLASS,
  RISK_LEVEL_CLASS,
  type RiskStatus,
  type RiskLevel,
  type ControlType,
} from "@/lib/supabase/risk-register-service";
import {
  REGULATION_FRAMEWORKS,
  COMPLIANCE_GAP_LABELS,
  CONTROL_EFFECTIVENESS,
  type RegulationFramework,
  type ComplianceGap,
  type ControlEffectivenessTier,
} from "@/lib/risk/scoring";
import { createRiskRegisterEntryAction, updateRiskRegisterStatusAction } from "./actions";

export const metadata: Metadata = { title: "Risk Register – PredictSafe" };

const CONTROL_TYPES: ControlType[] = ["engineering", "administrative", "ppe", "training", "inspection", "permit", "committee"];
const CONTROL_TYPE_LABELS: Record<ControlType, string> = {
  engineering: "Engineering",
  administrative: "Administrative",
  ppe: "PPE",
  training: "Training",
  inspection: "Inspection",
  permit: "Permit",
  committee: "Committee",
};

const FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "annual", "event_triggered", "per_change", "before_use", "per_batch"] as const;
const FREQUENCY_LABELS: Record<typeof FREQUENCIES[number], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  event_triggered: "Event-triggered",
  per_change: "Per change",
  before_use: "Before use",
  per_batch: "Per batch",
};

const COMPLIANCE_GAPS = Object.keys(COMPLIANCE_GAP_LABELS) as ComplianceGap[];
const CONTROL_TIERS = Object.keys(CONTROL_EFFECTIVENESS) as ControlEffectivenessTier[];

const CONTROL_TIER_LABELS: Record<ControlEffectivenessTier, string> = {
  engineering_plus_backups: "Engineering + backups (×0.25)",
  engineering_plus_admin: "Engineering + admin (×0.50)",
  admin_only: "Admin controls only (×0.75)",
  none: "No controls / unverified (×1.00)",
};

type Props = { searchParams: Promise<{ message?: string; success?: string; status?: string; risk?: string }> };

export default async function RiskRegisterPage({ searchParams }: Props) {
  const params = await searchParams;
  const statusFilter = (params.status as RiskStatus) || undefined;
  const riskFilter = (params.risk as RiskLevel) || undefined;

  const allEntries = await listRiskRegisterEntries({}).catch(() => []);
  const entries = allEntries.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false;
    if (riskFilter && e.residualRisk !== riskFilter) return false;
    return true;
  });

  const total = allEntries.length;
  const overdue = allEntries.filter((e) => e.overdue || e.status === "overdue").length;
  const active = allEntries.filter((e) => e.status === "active").length;
  const highCritical = allEntries.filter((e) => e.residualRisk === "high" || e.residualRisk === "critical").length;

  const statusCounts = (Object.keys(RISK_STATUS_LABELS) as RiskStatus[]).reduce<Record<string, number>>(
    (acc, s) => { acc[s] = allEntries.filter((e) => e.status === s).length; return acc; },
    {}
  );

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Plan · Stage 1</p>
            <h1>Risk Register</h1>
            <p className="muted">
              Regulatory-requirement-driven. Risk scores are calculated from the regulation and
              your current compliance gap — no manual scoring. Feeds the Compliance Calendar and
              Predictive Engine.
            </p>
          </div>
          <Link className="button-secondary" href="/plan/compliance-calendar">Compliance Calendar →</Link>
        </header>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        <section className="kpi-grid" aria-label="Risk register summary">
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-label">Total Entries</div>
            <div className="kpi-value">{total}</div>
            <div className="kpi-sub">Regulatory requirements tracked</div>
          </div>
          <div className={`kpi-card ${highCritical > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
            <div className="kpi-label">High / Critical</div>
            <div className="kpi-value">{highCritical}</div>
            <div className="kpi-sub">Residual risk — action required</div>
          </div>
          <div className="kpi-card kpi-card--green">
            <div className="kpi-label">Active</div>
            <div className="kpi-value">{active}</div>
            <div className="kpi-sub">Approved &amp; in calendar</div>
          </div>
          <div className={`kpi-card ${overdue > 0 ? "kpi-card--red" : "kpi-card--amber"}`}>
            <div className="kpi-label">Overdue</div>
            <div className="kpi-value">{overdue}</div>
            <div className="kpi-sub">{overdue > 0 ? "Raises predicted pressure" : "Nothing overdue"}</div>
          </div>
        </section>

        {overdue > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <Clock size={15} />
            <span>
              <strong>{overdue} overdue entr{overdue !== 1 ? "ies" : "y"}.</strong>{" "}
              Overdue requirements block compliance calendar closure and raise predicted risk.
            </span>
            <Link className="ai-fill-btn ai-fill-btn--danger" href="/plan/risk-register?status=overdue">
              View overdue
            </Link>
          </div>
        )}

        <nav className="command-center-link-strip" aria-label="Status filter">
          <Link href="/plan/risk-register" className={`button-secondary compact ${!statusFilter ? "active-filter" : ""}`}>
            All <span className="filter-count-badge">{total}</span>
          </Link>
          {(Object.keys(RISK_STATUS_LABELS) as RiskStatus[]).map((s) => (
            <Link key={s} href={`/plan/risk-register?status=${s}`} className={`button-secondary compact ${statusFilter === s ? "active-filter" : ""}`}>
              {RISK_STATUS_LABELS[s]} <span className="filter-count-badge">{statusCounts[s] ?? 0}</span>
            </Link>
          ))}
        </nav>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Register — sorted by inherent risk (highest first)</p>
              <h2>
                {entries.length === allEntries.length
                  ? `${total} entr${total !== 1 ? "ies" : "y"}`
                  : `${entries.length} of ${total} shown`}
              </h2>
            </div>
          </div>
          {entries.length === 0 && allEntries.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No register entries yet</p>
              <p className="muted">Add a regulatory requirement below to get started.</p>
            </div>
          ) : entries.length === 0 ? (
            <p className="empty-table-note">No entries match the selected filter. <Link href="/plan/risk-register">Clear filter</Link></p>
          ) : (
            <div className="action-list">
              {entries.map((e) => (
                <article className="action-row" key={e.id}>
                  <div>
                    <strong>{e.regulation ?? e.riskItem}</strong>
                    {e.residualRisk && <span className={RISK_LEVEL_CLASS[e.residualRisk]}>Residual: {e.residualRisk}</span>}
                    {e.inherentRisk && e.inherentRisk !== e.residualRisk && (
                      <span className={RISK_LEVEL_CLASS[e.inherentRisk]}>Inherent: {e.inherentRisk}</span>
                    )}
                    <span className={RISK_STATUS_CLASS[e.status]}>{RISK_STATUS_LABELS[e.status]}</span>
                    <small className="muted">
                      {e.requirementDetail ? `${e.requirementDetail} · ` : ""}
                      {e.activity ? `${e.activity} · ` : ""}
                      {e.complianceGap ? `Gap: ${COMPLIANCE_GAP_LABELS[e.complianceGap]} · ` : ""}
                      {e.inherentScore != null ? `Score: ${e.inherentScore}→${e.residualScore ?? "?"} · ` : ""}
                      {e.controlType ? `${CONTROL_TYPE_LABELS[e.controlType as ControlType] ?? e.controlType} · ` : ""}
                      {e.frequency ? `${FREQUENCY_LABELS[e.frequency as typeof FREQUENCIES[number]] ?? e.frequency} · ` : ""}
                      {e.qualifiedReviewerName ? `Reviewer: ${e.qualifiedReviewerName} · ` : ""}
                      CAPA: {e.openCapaCount}
                      {e.dueDate ? ` · Due ${e.dueDate}` : ""}
                    </small>
                  </div>
                  <form action={updateRiskRegisterStatusAction} className="form-action-row">
                    <input type="hidden" name="id" value={e.id} />
                    <select name="status" defaultValue={e.status} aria-label="Change status">
                      {(Object.keys(RISK_STATUS_LABELS) as RiskStatus[]).map((s) => (
                        <option key={s} value={s}>{RISK_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <button className="button-secondary compact" type="submit">Set</button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>

        <AiDraftBanner>
          Changing an entry to Active, Restricted, or Closed with Evidence requires a Qualified Reviewer.
          AI cannot set an entry to Active.
        </AiDraftBanner>

        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Add entry</p><h2>New regulatory risk entry</h2></div>
            <Plus size={22} />
          </div>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Select the regulation and your current compliance gap — inherent and residual risk scores
            are calculated automatically.
          </p>
          <form action={createRiskRegisterEntryAction} className="stacked-form">
            {/* ── Regulatory identity ── */}
            <div className="form-grid">
              <label>Regulation <span aria-hidden="true">*</span>
                <select name="regulation" required defaultValue="">
                  <option value="" disabled>Select regulation…</option>
                  {REGULATION_FRAMEWORKS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>
              <label>Compliance gap <span aria-hidden="true">*</span>
                <select name="complianceGap" required defaultValue="">
                  <option value="" disabled>Select gap…</option>
                  {COMPLIANCE_GAPS.map((g) => (
                    <option key={g} value={g}>{COMPLIANCE_GAP_LABELS[g]}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>Specific requirement / section
              <input name="requirementDetail" type="text" placeholder='e.g. "Section III-D-3" or "29 CFR 1910.1030(d)(2)"' />
            </label>
            <label>Activity covered <span aria-hidden="true">*</span>
              <input name="activity" type="text" placeholder='e.g. "Cell culture with RG2 organism"' required />
            </label>

            {/* ── Controls ── */}
            <div className="form-grid">
              <label>Control tier (drives residual score)
                <select name="controlTier" defaultValue="none">
                  {CONTROL_TIERS.map((t) => (
                    <option key={t} value={t}>{CONTROL_TIER_LABELS[t]}</option>
                  ))}
                </select>
              </label>
              <label>Control type
                <select name="controlType" defaultValue="administrative">
                  {CONTROL_TYPES.map((c) => <option key={c} value={c}>{CONTROL_TYPE_LABELS[c]}</option>)}
                </select>
              </label>
              <label>Frequency
                <select name="frequency" defaultValue="annual">
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
                </select>
              </label>
            </div>
            <label>Control description
              <textarea name="controlDescription" rows={2} placeholder="What control is required?" />
            </label>

            {/* ── Supplemental ── */}
            <div className="form-grid">
              <label>Area<input name="area" type="text" placeholder="e.g. Lab 101" /></label>
              <label>Process<input name="process" type="text" placeholder="e.g. Cell culture" /></label>
              <label>Program<input name="programName" type="text" placeholder="e.g. Biosafety" /></label>
            </div>
            <label>Source basis
              <input name="sourceBasis" type="text" placeholder="e.g. BMBL / manufacturer instruction" />
            </label>

            <button className="button-primary" type="submit">Calculate scores &amp; add entry</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
