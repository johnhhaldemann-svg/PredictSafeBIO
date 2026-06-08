export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AlertTriangle, ClipboardCheck, Lock, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Permits – PredictSafeBIO" };
import { AppShell } from "@/components/AppShell";
import {
  listPermits,
  permitTypeLabels,
  closeoutStatusLabels,
  type CloseoutStatus
} from "@/lib/supabase/permits-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createPermitAction, updatePermitStatusAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

const STATUS_CLASS: Record<CloseoutStatus, string> = {
  draft: "",
  pending_approval: "status-needs-review",
  approved: "status-needs-review",
  active: "status-needs-review",
  closed: "status-current",
  voided: ""
};

type Props = {
  searchParams: Promise<{ message?: string; success?: string; filter?: string }>;
};

export default async function PermitsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const [allPermitsResult, adminAccess] = await Promise.all([
    listPermits().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: ""
    }))
  ]);

  const loadFailed = allPermitsResult === null;
  const allPermits = allPermitsResult ?? [];
  const permits = allPermits.filter((p) => {
    if (filter === "active")  return p.closeoutStatus === "active" || p.closeoutStatus === "approved";
    if (filter === "overdue") return p.isOverdue;
    if (filter === "draft")   return p.closeoutStatus === "draft";
    return true;
  });

  const activeCount  = allPermits.filter((p) => p.closeoutStatus === "active" || p.closeoutStatus === "approved").length;
  const overdueCount = allPermits.filter((p) => p.isOverdue).length;
  const draftCount   = allPermits.filter((p) => p.closeoutStatus === "draft").length;
  const filterCounts = {
    all: allPermits.length,
    active: activeCount,
    overdue: overdueCount,
    draft: draftCount,
  };

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · Permit to Work</p>
            <h1>Controlled Work Permits</h1>
            <p className="muted">
              LOTO, hot work, confined space, contractor, and chemical transfer permits.
              No work may begin without an Approved permit on file.
            </p>
          </div>
          <Link className="button-secondary" href="/inspections">Inspections →</Link>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Permit summary">
          <article className="command-card platform-blue">
            <div><span><Lock size={16} /></span><strong>Active permits</strong></div>
            <small>{activeCount}</small>
            <em>Approved or in-progress work.</em>
          </article>
          <article className={`command-card ${overdueCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Overdue (&gt;24 hrs)</strong></div>
            <small>{overdueCount}</small>
            <em>{overdueCount > 0 ? "Active permits open beyond 24 hours — close or escalate." : "No overdue permits."}</em>
          </article>
          <article className={`command-card ${draftCount > 0 ? "platform-blue" : "platform-green"}`}>
            <div><span><ClipboardCheck size={16} /></span><strong>Drafts</strong></div>
            <small>{draftCount}</small>
            <em>{draftCount > 0 ? "Permits awaiting submission for approval." : "No drafts pending."}</em>
          </article>
        </section>

        {overdueCount > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{overdueCount} permit{overdueCount !== 1 ? "s" : ""} open beyond 24 hours.</strong>{" "}
              Permits left open past their stop time must be closed or escalated immediately.
            </span>
            <Link className="ai-fill-btn ai-fill-btn--danger" href="/permits?filter=overdue">View overdue</Link>
          </div>
        )}

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Permit filter">
          {(["all", "active", "overdue", "draft"] as const).map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/permits" : `/permits?filter=${f}`}
              className={`button-secondary compact ${filter === f ? "active-filter" : ""}`}
            >
              {f === "all" ? "All permits" : f === "active" ? "Active" : f === "overdue" ? "Overdue" : "Drafts"}
              <span className="filter-count-badge">{filterCounts[f] ?? 0}</span>
            </Link>
          ))}
        </nav>

        {/* Permit register */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Permit register</p>
              <h2>
                {permits.length === allPermits.length
                  ? `${allPermits.length} permit${allPermits.length !== 1 ? "s" : ""}`
                  : `${permits.length} of ${allPermits.length} shown`}
              </h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="work permits" />
          ) : permits.length === 0 ? (
            <p className="muted">No permits found. Create one below.</p>
          ) : (
            <div className="action-list">
              {permits.map((permit) => (
                <article className="action-row" key={permit.id}>
                  <div>
                    <strong>{permitTypeLabels[permit.permitType]}</strong>
                    <span className={STATUS_CLASS[permit.closeoutStatus]}>
                      {closeoutStatusLabels[permit.closeoutStatus]}
                    </span>
                    {permit.isCritical && (
                      <span className="status-overdue">⚠ Open &gt;24 hrs</span>
                    )}
                  </div>
                  <p>
                    {permit.location ?? "No location set"}
                    {permit.taskDescription ? ` · ${permit.taskDescription}` : ""}
                    {permit.startTime
                      ? ` · Started ${new Date(permit.startTime).toLocaleString()}`
                      : ""}
                    {permit.stopTime
                      ? ` · Ends ${new Date(permit.stopTime).toLocaleString()}`
                      : ""}
                  </p>
                  {permit.hazards && permit.hazards.length > 0 && (
                    <p className="muted" style={{ fontSize: "0.82em" }}>
                      Hazards: {permit.hazards.join(", ")}
                    </p>
                  )}

                  {adminAccess.signedIn &&
                    permit.closeoutStatus !== "closed" &&
                    permit.closeoutStatus !== "voided" && (
                    <form action={updatePermitStatusAction} className="form-action-row">
                      <input type="hidden" name="id" value={permit.id} />
                      <select name="closeoutStatus" defaultValue={permit.closeoutStatus}>
                        <option value="draft">Draft</option>
                        <option value="pending_approval">Submit for approval</option>
                        <option value="approved">Approve</option>
                        <option value="active">Activate (work starting)</option>
                        <option value="closed">Close (work complete)</option>
                        <option value="voided">Void</option>
                      </select>
                      <input name="notes" type="text" placeholder="Closeout notes (optional)" />
                      <button className="button-secondary compact" type="submit">Update status</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Create permit form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">New permit</p>
                <h2>Create a controlled work permit</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createPermitAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Permit type <span aria-hidden="true">*</span>
                  <select name="permitType" defaultValue="contractor" required>
                    <option value="loto">Lockout / Tagout (LOTO)</option>
                    <option value="hot_work">Hot Work</option>
                    <option value="line_break">Line Break</option>
                    <option value="confined_space">Confined Space Entry</option>
                    <option value="contractor">Contractor Work</option>
                    <option value="cleanroom">Cleanroom Access</option>
                    <option value="utility_shutdown">Utility Shutdown</option>
                    <option value="chemical_transfer">Chemical Transfer</option>
                  </select>
                </label>
                <label>
                  Location
                  <input name="location" type="text" placeholder="e.g. Lab 201, Mechanical Room" />
                </label>
              </div>
              <label>
                Task description
                <textarea name="taskDescription" rows={2} placeholder="e.g. Welding repair on exhaust flange — BSC room 201" />
              </label>
              <div className="form-grid">
                <label>
                  Planned start
                  <input name="startTime" type="datetime-local" />
                </label>
                <label>
                  Planned end
                  <input name="stopTime" type="datetime-local" />
                </label>
              </div>
              <label>
                Hazards identified (comma-separated)
                <input name="hazards" type="text" placeholder="e.g. fire, fumes, electrical, biological" />
              </label>
              <p className="muted">
                Permit starts in Draft status. Submit for approval, then activate when work begins. Close when complete.
              </p>
              <button className="button-primary" type="submit">Create permit</button>
            </form>
          </section>
        )}

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Permit authorization requires qualified human sign-off</h2>
            <p className="muted">
              AI may flag overdue permits and missing controls, but permit approval,
              isolation verification, and closeout authorization must be performed by
              a qualified EHS professional or authorized approver. No work may begin
              without an <strong>Approved</strong> permit on file.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
