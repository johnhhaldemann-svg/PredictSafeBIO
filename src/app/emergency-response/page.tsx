export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AlertTriangle, ClipboardList, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  listPlans,
  listDrills,
  planTypeLabels,
  planStatusLabels,
  drillOutcomeLabels,
  type PlanStatus,
} from "@/lib/supabase/emergency-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createPlanAction, createDrillAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

export const metadata: Metadata = { title: "Emergency Response – PredictSafe" };

const PLAN_STATUS_CLASS: Record<PlanStatus, string> = {
  draft:        "status-needs-review",
  current:      "status-current",
  needs_review: "status-overdue",
};

type Props = {
  searchParams: Promise<{ message?: string; success?: string }>;
};

export default async function EmergencyResponsePage({ searchParams }: Props) {
  const params = await searchParams;

  const [plansResult, drillsResult, adminAccess] = await Promise.all([
    listPlans().catch(() => null),
    listDrills().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  const loadFailed   = plansResult === null;
  const plans        = plansResult ?? [];
  const drills       = drillsResult ?? [];

  const currentCount      = plans.filter((p) => p.status === "current").length;
  const needsReviewCount  = plans.filter((p) => p.needsReview).length;
  const thisYear          = new Date().getFullYear();
  const drillsThisYear    = drills.filter((d) => new Date(d.drillDate).getFullYear() === thisYear).length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Plan · Emergency Response</p>
            <h1>Emergency Response Plans</h1>
            <p className="muted">
              Documented, drilled, accessible response plans for every foreseeable emergency.
              Required under OSHA 29 CFR 1910.38 and NFPA 45.
            </p>
          </div>
          <Link className="button-secondary" href="/documents">Documents →</Link>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Emergency response summary">
          <article className={`command-card ${currentCount > 0 ? "platform-green" : "platform-blue"}`}>
            <div><span><ShieldCheck size={16} /></span><strong>Plans on file</strong></div>
            <small>{plans.length}</small>
            <em>{currentCount} current · {plans.length - currentCount} draft</em>
          </article>
          <article className={`command-card ${drillsThisYear > 0 ? "platform-green" : "platform-blue"}`}>
            <div><span><ClipboardList size={16} /></span><strong>Drills this year</strong></div>
            <small>{drillsThisYear}</small>
            <em>{drillsThisYear > 0 ? "Drills on record for this year." : "No drills logged this year."}</em>
          </article>
          <article className={`command-card ${needsReviewCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Needs review</strong></div>
            <small>{needsReviewCount}</small>
            <em>
              {needsReviewCount > 0
                ? `${needsReviewCount} plan${needsReviewCount !== 1 ? "s" : ""} not reviewed in the past year.`
                : "All plans reviewed within 12 months."}
            </em>
          </article>
        </section>

        {needsReviewCount > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{needsReviewCount} plan{needsReviewCount !== 1 ? "s" : ""} overdue for review.</strong>{" "}
              OSHA 1910.38 requires plans to be reviewed when facility layout changes or after any emergency event.
            </span>
          </div>
        )}

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Plans list */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">ERP registry</p>
              <h2>{plans.length} plan{plans.length !== 1 ? "s" : ""} on file</h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="emergency response plans" />
          ) : plans.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No emergency response plans yet</p>
              <p className="muted">Add your first plan below to begin tracking review and drill status.</p>
            </div>
          ) : (
            <div className="action-list">
              {plans.map((plan) => (
                <article className="action-row" key={plan.id}>
                  <div>
                    <strong>{plan.title}</strong>
                    <span className={PLAN_STATUS_CLASS[plan.status]}>{planStatusLabels[plan.status]}</span>
                    <span>{planTypeLabels[plan.planType]}</span>
                    {plan.needsReview && <span className="status-overdue">Review overdue</span>}
                  </div>
                  <p className="muted">
                    {plan.lastReviewed
                      ? `Last reviewed: ${new Date(plan.lastReviewed).toLocaleDateString()}`
                      : "Never reviewed"}
                    {plan.nextDrillDate
                      ? ` · Next drill: ${new Date(plan.nextDrillDate).toLocaleDateString()}`
                      : ""}
                  </p>
                  {plan.description && <p className="muted">{plan.description}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Add plan form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Add plan</p>
                <h2>Register an emergency response plan</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createPlanAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Plan type <span aria-hidden="true">*</span>
                  <select name="planType" defaultValue="other" required>
                    <option value="chemical_spill">Chemical Spill Response</option>
                    <option value="biological_release">Biological Material Release</option>
                    <option value="fire">Fire &amp; Evacuation</option>
                    <option value="medical">Medical Emergency</option>
                    <option value="power_failure">Power Failure</option>
                    <option value="severe_weather">Severe Weather</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Plan title <span aria-hidden="true">*</span>
                  <input name="title" type="text" placeholder="e.g. Chemical Spill Response Plan" required />
                </label>
                <label>
                  Last reviewed
                  <input name="lastReviewed" type="date" />
                </label>
                <label>
                  Next drill date
                  <input name="nextDrillDate" type="date" />
                </label>
              </div>
              <label>
                Description / scope
                <textarea name="description" rows={2} placeholder="Brief description of the plan's scope and key steps" />
              </label>
              <button className="button-primary" type="submit">Add plan</button>
            </form>
          </section>
        )}

        {/* Drill log */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Drill log</p>
              <h2>{drills.length} drill{drills.length !== 1 ? "s" : ""} on record</h2>
            </div>
          </div>
          {drills.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No drills logged yet</p>
              <p className="muted">Document your first drill below to build a drill history.</p>
            </div>
          ) : (
            <div className="action-list">
              {drills.map((drill) => (
                <article className="action-row" key={drill.id}>
                  <div>
                    <strong>{new Date(drill.drillDate).toLocaleDateString()}</strong>
                    <span
                      className={
                        drill.outcome === "satisfactory"
                          ? "status-current"
                          : drill.outcome === "needs_improvement"
                          ? "status-needs-review"
                          : "status-overdue"
                      }
                    >
                      {drillOutcomeLabels[drill.outcome]}
                    </span>
                    {drill.drillType && <span>{drill.drillType}</span>}
                  </div>
                  <p className="muted">
                    {drill.participantsCount != null ? `${drill.participantsCount} participants` : "Participants not recorded"}
                    {drill.conductedBy ? ` · Conducted by: ${drill.conductedBy}` : ""}
                  </p>
                  {drill.notes && <p className="muted">{drill.notes}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Log drill form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Log a drill</p>
                <h2>Record drill or exercise</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createDrillAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Date <span aria-hidden="true">*</span>
                  <input name="drillDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </label>
                <label>
                  Drill type
                  <input name="drillType" type="text" placeholder="e.g. tabletop, full evacuation, partial" />
                </label>
                <label>
                  Participants
                  <input name="participantsCount" type="number" min={1} placeholder="e.g. 12" />
                </label>
                <label>
                  Outcome <span aria-hidden="true">*</span>
                  <select name="outcome" defaultValue="satisfactory" required>
                    <option value="satisfactory">Satisfactory</option>
                    <option value="needs_improvement">Needs Improvement</option>
                    <option value="unsatisfactory">Unsatisfactory</option>
                  </select>
                </label>
                <label>
                  Conducted by
                  <input name="conductedBy" type="text" placeholder="e.g. EHS Manager" />
                </label>
                <label>
                  Linked plan (optional)
                  <select name="planId" defaultValue="">
                    <option value="">— Not linked —</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Notes / observations
                <textarea name="notes" rows={2} placeholder="Key observations, gaps found, actions needed" />
              </label>
              <button className="button-primary" type="submit">Log drill</button>
            </form>
          </section>
        )}

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Emergency plans require human authorship and regular drills</h2>
            <p className="muted">
              AI may surface overdue review alerts and drill gaps, but emergency response plans must be
              authored, approved, and signed off by a qualified EHS professional. All plans are
              <strong> Draft — Human Review Required</strong> until formally approved.
              OSHA 1910.38 requires written plans for facilities with 10+ employees.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
