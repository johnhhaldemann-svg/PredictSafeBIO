export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { CalendarClock, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { listCalendarItems } from "@/lib/supabase/compliance-calendar-service";
import { completeCalendarItemAction } from "./actions";
import ComplianceCalendarGrid from "./ComplianceCalendarGrid";

export const metadata: Metadata = { title: "Compliance Calendar – PredictSafeBIO" };

const TASK_TYPES = ["inspection", "training", "certification", "committee_meeting", "permit", "capa", "equipment_check", "waste_pickup", "event_triggered"];

const TASK_TYPE_OVERRIDES: Record<string, string> = { capa: "CAPA" };

function prettyTaskType(t: string) {
  return TASK_TYPE_OVERRIDES[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type Props = { searchParams: Promise<{ message?: string; success?: string; taskType?: string }> };

export default async function ComplianceCalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const taskType = params.taskType || undefined;

  // Fetch all items to compute global counts for filter badges
  const allItems = await listCalendarItems({}).catch(() => []);
  const items = taskType ? allItems.filter((i) => i.taskType === taskType) : allItems;

  const overdue = allItems.filter((i) => i.urgency === "overdue").length;
  const dueWeek = allItems.filter((i) => i.urgency === "due_this_week").length;
  const done = allItems.filter((i) => i.urgency === "completed").length;

  // Per-type counts for filter badges
  const typeCounts = TASK_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = allItems.filter((i) => i.taskType === t).length;
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Plan · Stage 2</p>
            <h1>Compliance Calendar</h1>
            <p className="muted">
              Dated work generated from your Risk Register frequencies.
            </p>
          </div>
          <Link className="button-secondary" href="/plan/risk-register">Risk Register →</Link>
        </header>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        <section className="command-card-grid" aria-label="Calendar summary">
          <article className={`command-card ${overdue > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Overdue</strong></div>
            <small>{overdue}</small>
            <em>{overdue > 0 ? "Past due — complete ASAP." : "Nothing overdue."}</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><CalendarClock size={16} /></span><strong>Due this week</strong></div>
            <small>{dueWeek}</small><em>Next 7 days.</em>
          </article>
          <article className="command-card platform-green">
            <div><span><CheckCircle2 size={16} /></span><strong>Completed</strong></div>
            <small>{done}</small><em>Closed tasks.</em>
          </article>
        </section>

        {overdue > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <Clock size={15} />
            <span>
              <strong>{overdue} overdue task{overdue !== 1 ? "s" : ""}.</strong>{" "}
              Overdue compliance items raise predicted risk and may block audit readiness.
            </span>
            <Link className="ai-fill-btn ai-fill-btn--danger" href="/plan/compliance-calendar">
              View all
            </Link>
          </div>
        )}
        {dueWeek > 0 && overdue === 0 && (
          <div className="ai-context-bar ai-context-bar--warning">
            <CalendarClock size={15} />
            <span>
              <strong>{dueWeek} task{dueWeek !== 1 ? "s" : ""} due this week.</strong>{" "}
              Complete on time to avoid overdue status.
            </span>
          </div>
        )}

        <nav className="command-center-link-strip" aria-label="Task type filter">
          <Link href="/plan/compliance-calendar" className={`button-secondary compact ${!taskType ? "active-filter" : ""}`}>
            All
            <span className="filter-count-badge">{allItems.length}</span>
          </Link>
          {TASK_TYPES.map((t) => (
            <Link key={t} href={`/plan/compliance-calendar?taskType=${t}`} className={`button-secondary compact ${taskType === t ? "active-filter" : ""}`}>
              {prettyTaskType(t)}
              {typeCounts[t] > 0 && <span className="filter-count-badge">{typeCounts[t]}</span>}
            </Link>
          ))}
        </nav>

        <section className="panel">
          {items.length === 0 && allItems.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No calendar tasks yet</p>
              <p className="muted">Run the Setup Questionnaire &amp; applicability engine to generate tasks from your Risk Register.</p>
              <Link href="/assess/setup-questionnaire" className="button-secondary compact">Go to Setup Questionnaire</Link>
            </div>
          ) : items.length === 0 ? (
            <p className="empty-table-note">No tasks of this type. <Link href="/plan/compliance-calendar">Clear filter</Link></p>
          ) : (
            <ComplianceCalendarGrid items={items} completeAction={completeCalendarItemAction} />
          )}
        </section>
      </div>
    </AppShell>
  );
}
