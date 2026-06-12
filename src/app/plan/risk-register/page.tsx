export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ShieldCheck, Plus, AlertTriangle, Activity, Clock } from "lucide-react";
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

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

type Props = { searchParams: Promise<{ message?: string; success?: string; status?: string; risk?: string }> };

export default async function RiskRegisterPage({ searchParams }: Props) {
  const params = await searchParams;
  const statusFilter = (params.status as RiskStatus) || undefined;
  const riskFilter = (params.risk as RiskLevel) || undefined;

  // Fetch all entries so we can show per-status counts on filter badges
  const allEntries = await listRiskRegisterEntries({}).catch(() => []);
  const entries = allEntries.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false;
    if (riskFilter && e.residualRisk !== riskFilter) return false;
    return true;
  });

  const total = allEntries.length;
  const overdue = allEntries.filter((e) => e.overdue || e.status === "overdue").length;
  const active = allEntries.filter((e) => e.status === "active").length;

  // Per-status counts for filter badges
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
              Every requirement, control, frequency, qualified reviewer, and evidence need — feeds the
              Compliance Calendar and the Predictive Engine.
            </p>
          </div>
          <Link className="button-secondary" href="/plan/compliance-calendar">Compliance Calendar →</Link>
        </header>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        <section className="command-card-grid" aria-label="Risk register summary">
          <article className="command-card platform-blue">
            <div><span><ShieldCheck size={16} /></span><strong>Total entries</strong></div>
            <small>{total}</small><em>Requirements in the register.</em>
          </article>
          <article className={`command-card ${overdue > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Overdue</strong></div>
            <small>{overdue}</small><em>{overdue > 0 ? "Past due — raises predicted pressure." : "Nothing overdue."}</em>
          </article>
          <article className="command-card platform-green">
            <div><span><Activity size={16} /></span><strong>Active</strong></div>
            <small>{active}</small><em>Approved &amp; in the calendar.</em>
          </article>
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
            All
            <span className="filter-count-badge">{total}</span>
          </Link>
          {(Object.keys(RISK_STATUS_LABELS) as RiskStatus[]).map((s) => (
            <Link key={s} href={`/plan/risk-register?status=${s}`} className={`button-secondary compact ${statusFilter === s ? "active-filter" : ""}`}>
              {RISK_STATUS_LABELS[s]}
              <span className="filter-count-badge">{statusCounts[s] ?? 0}</span>
            </Link>
          ))}
        </nav>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Register</p>
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
              <p className="muted">Run the Setup Questionnaire to auto-seed entries, or add one below.</p>
              <Link href="/assess/setup-questionnaire" className="button-secondary compact">Go to Setup Questionnaire</Link>
            </div>
          ) : entries.length === 0 ? (
            <p className="empty-table-note">No entries match the selected filter. <Link href="/plan/risk-register">Clear filter</Link></p>
          ) : (
            <div className="action-list">
              {entries.map((e) => (
                <article className="action-row" key={e.id}>
                  <div>
                    <strong>{e.riskItem}</strong>
                    {e.residualRisk && <span className={RISK_LEVEL_CLASS[e.residualRisk]}>{e.residualRisk}</span>}
                    <span className={RISK_STATUS_CLASS[e.status]}>{RISK_STATUS_LABELS[e.status]}</span>
                    <small className="muted">
                      {e.programName ? `${e.programName} · ` : ""}
                      {e.controlType ? `${CONTROL_TYPE_LABELS[e.controlType as ControlType] ?? e.controlType} · ` : ""}
                      {e.frequency ? `${FREQUENCY_LABELS[e.frequency as typeof FREQUENCIES[number]] ?? e.frequency} · ` : ""}
                      {e.qualifiedReviewerName ? `Reviewer: ${e.qualifiedReviewerName} · ` : ""}
                      {e.evidenceRequired.length ? `Evidence: ${e.evidenceRequired.join(", ")} · ` : ""}
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
          Changing an entry to Active, Restricted, or Closed with Evidence is a restricted decision — it
          requires a Qualified Reviewer in the registry. AI cannot set an entry to Active.
        </AiDraftBanner>

        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Add entry</p><h2>New risk register entry</h2></div>
            <Plus size={22} />
          </div>
          <form action={createRiskRegisterEntryAction} className="stacked-form">
            <label>Risk item <span aria-hidden="true">*</span>
              <input name="riskItem" type="text" placeholder="e.g. BSC annual certification" required />
            </label>
            <div className="form-grid">
              <label>Area<input name="area" type="text" placeholder="e.g. Lab 101" /></label>
              <label>Process<input name="process" type="text" placeholder="e.g. Cell culture" /></label>
              <label>Program<input name="programName" type="text" placeholder="e.g. Biosafety" /></label>
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
              <label>Inherent risk
                <select name="inherentRisk" defaultValue="medium">
                  {RISK_LEVELS.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
                </select>
              </label>
              <label>Residual risk
                <select name="residualRisk" defaultValue="medium">
                  {RISK_LEVELS.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
                </select>
              </label>
            </div>
            <label>Source basis<input name="sourceBasis" type="text" placeholder="e.g. BMBL / manufacturer instruction" /></label>
            <label>Control description<textarea name="controlDescription" rows={2} placeholder="What control is required?" /></label>
            <button className="button-primary" type="submit">Add entry</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
