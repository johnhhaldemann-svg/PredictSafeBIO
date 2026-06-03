export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "My Work – PredictSafeBIO" };
import { ClipboardList, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FoundationNotificationCenter } from "@/components/FoundationNotificationCenter";
import { FoundationReviewActionsPanel } from "@/components/FoundationReviewActionsPanel";
import { getFoundationWorkKpis } from "@/lib/foundation/work-kpis";
import {
  getFoundationAdminAccessSummary,
  getFoundationAssigneeOptions,
  getFoundationNotificationSummary,
  getFoundationReviewActionsSummary
} from "@/lib/supabase/data";

const savedViews = ["all", "my_open", "blocked", "due_soon", "ready", "unassigned", "overdue", "high_priority"] as const;

function normalizeSavedView(value?: string) {
  return savedViews.includes(value as (typeof savedViews)[number]) ? value : undefined;
}

export default async function MyWorkPage({
  searchParams
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const requestedView = normalizeSavedView(params?.view);
  const [allActions, adminAccess, assignees, notificationSummary] = await Promise.all([
    getFoundationReviewActionsSummary(),
    getFoundationAdminAccessSummary(),
    getFoundationAssigneeOptions(),
    getFoundationNotificationSummary()
  ]);
  const visibleActions = adminAccess.isOwner ? allActions : allActions.filter((action) => action.canUpdate && Boolean(action.assignedTo));
  const kpis = getFoundationWorkKpis(visibleActions, notificationSummary);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Assigned operating work</p>
          <h1>My Work</h1>
          <p className="muted">
            Foundation-generated review tasks, source traces, notes, due dates, and closeout activity are gathered here without scrolling through
            the full Workbench.
          </p>
        </header>

        <nav className="command-center-link-strip" aria-label="Connected command center navigation">
          <Link className="button-primary compact" href="/my-work">
            Assigned Work
          </Link>
          <Link className="button-secondary compact" href="/workbench">
            Command Summary
          </Link>
          <Link className="button-secondary compact" href="/foundation">
            Source Intelligence
          </Link>
        </nav>

        <section className={`panel access-banner ${adminAccess.isOwner ? "access-enabled" : "access-readonly"}`}>
          <strong>{adminAccess.isOwner ? "Owner task controls enabled" : "Assigned-member task controls"}</strong>
          <span>
            {adminAccess.isOwner
              ? "Owners can assign, schedule, update, block, and close Foundation review tasks."
              : "Members can update status, add notes, refresh sources, and close only tasks assigned to them."}
          </span>
        </section>

        <section className="panel my-work-command-panel" aria-label="My Work command links">
          <div>
            <p className="section-label">Assigned Work</p>
            <h2>{visibleActions.length} source-traced task(s) in this view</h2>
            <p className="muted">Use this page for daily follow-through, then jump back to the source map or BioRisk workspace when needed.</p>
          </div>
          <div className="quick-filter-row">
            <Link className="button-secondary compact" href="/foundation">
              Open Foundation
            </Link>
            <Link className="button-secondary compact" href="/workbench">
              Open Workbench
            </Link>
            <Link className="button-secondary compact" href="/admin/audit">
              Open Audit
            </Link>
          </div>
        </section>

        <section className="panel command-center-lane" aria-labelledby="my-work-priority-title">
          <div className="command-center-lane-header">
            <div>
              <p className="section-label">Priority/Blocked/Overdue</p>
              <h2 id="my-work-priority-title">Work lanes that need attention</h2>
              <p className="muted">Jump into overdue, blocked, ready-for-closure, and high-priority Foundation work from the same card pattern.</p>
            </div>
            <Link className="button-secondary compact" href="#my-work-actions">
              Open task cards
            </Link>
          </div>
          <div className="assigned-work-filter-grid" aria-label="My Work task KPIs">
            <Link href="/my-work?view=overdue#my-work-actions">
              <strong>{kpis.overdue}</strong>
              <span>Overdue</span>
            </Link>
            <Link href="/my-work?view=blocked#my-work-actions">
              <strong>{kpis.blocked}</strong>
              <span>Blocked</span>
            </Link>
            <Link href="#my-work-actions">
              <strong>{kpis.completedThisWeek}</strong>
              <span>Completed this week</span>
            </Link>
            <Link href="/my-work?view=unassigned#my-work-actions">
              <strong>{kpis.unassigned}</strong>
              <span>Unassigned</span>
            </Link>
            <Link href="/my-work?view=ready#my-work-actions">
              <strong>{kpis.readyForClosure}</strong>
              <span>Ready for closure</span>
            </Link>
            <Link href="/my-work?view=high_priority#my-work-actions">
              <strong>{kpis.highPriority}</strong>
              <span>High-priority work</span>
            </Link>
          </div>
        </section>

        <FoundationNotificationCenter notifications={notificationSummary} returnTo="/my-work" title="Assigned, blocked, due-soon, overdue, and ready-for-closure alerts route here." />

        {!adminAccess.signedIn ? (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Secure access</p>
                <h2>Sign in to view assigned work</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <p className="muted">Task updates are limited to organization owners and assigned members.</p>
            <Link className="button-primary" href="/login?next=/my-work">
              Sign in
            </Link>
          </section>
        ) : (
          <div id="my-work-actions">
            {allActions.length === 0 && adminAccess.signedIn && (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-label">Getting started</p>
                    <h2>Your workspace is ready — here is what to do first</h2>
                  </div>
                  <ShieldCheck size={22} />
                </div>
                <div className="action-list">
                  <article className="action-row">
                    <div><strong>1. Run a BioRisk assessment</strong></div>
                    <p>Go to the <Link href="/workbench" className="text-link">Workbench</Link>, enter your site details and signals, then save the result to your risk register.</p>
                  </article>
                  <article className="action-row">
                    <div><strong>2. Open the Compliance Map</strong></div>
                    <p>The <Link href="/foundation" className="text-link">Compliance Map</Link> reads your assessment and generates source-traced review tasks. Assign them to your team here in My Work.</p>
                  </article>
                  <article className="action-row">
                    <div><strong>3. Add controlled documents</strong></div>
                    <p>Go to <Link href="/documents" className="text-link">SOPs &amp; Templates</Link> to register your controlled documents. The system will surface gaps and draft update recommendations.</p>
                  </article>
                  <article className="action-row">
                    <div><strong>4. Invite your team</strong></div>
                    <p>Go to <Link href="/account/team" className="text-link">Team &amp; Invites</Link> to send invite links so team members can see assigned work in their own My Work view.</p>
                  </article>
                </div>
              </section>
            )}
            <FoundationReviewActionsPanel
              actions={visibleActions}
              assignees={assignees}
              canManage={adminAccess.signedIn}
              canEditAssignment={adminAccess.isOwner}
              canEditDueDate={adminAccess.isOwner}
              canEditPriority={adminAccess.isOwner}
              emptyMessage={
                adminAccess.isOwner
                  ? "No review tasks yet. Run a BioRisk assessment on the Workbench, then open the Compliance Map to generate source-traced tasks."
                  : "No tasks assigned to you yet. Your owner will assign Foundation review tasks when they are generated from the compliance map."
              }
              initialSavedView={requestedView ?? (adminAccess.isOwner ? "all" : "my_open")}
              returnTo="/my-work"
              laneLabel="Assigned Work"
              laneDescription="Use this lane for daily task updates, closeout notes, source refreshes, and traceable human-review activity."
              primaryActionHref="/workbench"
              primaryActionLabel="Open Workbench"
              title={adminAccess.isOwner ? "All generated Foundation work" : "Assigned to me"}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
