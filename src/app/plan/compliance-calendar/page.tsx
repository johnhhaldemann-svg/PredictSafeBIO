export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { CalendarClock, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { listCalendarItems, type CalendarUrgency } from "@/lib/supabase/compliance-calendar-service";
import { completeCalendarItemAction } from "./actions";

export const metadata: Metadata = { title: "Compliance Calendar – PredictSafeBIO" };

const URGENCY_CLASS: Record<CalendarUrgency, string> = {
  overdue: "status-overdue",
  due_this_week: "status-needs-review",
  upcoming: "status-pill",
  completed: "status-ok",
};
const URGENCY_LABEL: Record<CalendarUrgency, string> = {
  overdue: "Overdue", due_this_week: "Due this week", upcoming: "Upcoming", completed: "Completed",
};
const TASK_TYPES = ["inspection", "training", "certification", "committee_meeting", "permit", "capa", "equipment_check", "waste_pickup", "event_triggered"];

type Props = { searchParams: Promise<{ message?: string; success?: string; taskType?: string }> };

export default async function ComplianceCalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const taskType = params.taskType || undefined;
  const items = await listCalendarItems({ taskType }).catch(() => []);

  const overdue = items.filter((i) => i.urgency === "overdue").length;
  const dueWeek = items.filter((i) => i.urgency === "due_this_week").length;
  const done = items.filter((i) => i.urgency === "completed").length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Plan · Calendar</p>
          <h1>Compliance Calendar</h1>
          <p className="muted">Dated work generated from your Risk Register frequencies. Overdue in red, due this week in amber, completed in green.</p>
        </header>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        <section className="command-card-grid" aria-label="Calendar summary">
          <article className={`command-card ${overdue > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>Overdue</strong></div><small>{overdue}</small><em>Past due tasks.</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><CalendarClock size={16} /></span><strong>Due this week</strong></div><small>{dueWeek}</small><em>Next 7 days.</em>
          </article>
          <article className="command-card platform-green">
            <div><span><CheckCircle2 size={16} /></span><strong>Completed</strong></div><small>{done}</small><em>Closed tasks.</em>
          </article>
        </section>

        <nav className="command-center-link-strip" aria-label="Task type filter">
          <Link href="/plan/compliance-calendar" className={`button-secondary compact ${!taskType ? "active-filter" : ""}`}>All</Link>
          {TASK_TYPES.map((t) => (
            <Link key={t} href={`/plan/compliance-calendar?taskType=${t}`} className={`button-secondary compact ${taskType === t ? "active-filter" : ""}`}>
              {t.replace("_", " ")}
            </Link>
          ))}
        </nav>

        <section className="panel">
          <div className="panel-heading"><div><p className="section-label">Scheduled work</p><h2>{items.length} task{items.length !== 1 ? "s" : ""}</h2></div></div>
          {items.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No calendar tasks yet</p>
              <p className="muted">Run the Setup Questionnaire &amp; applicability engine to generate tasks from your Risk Register.</p>
              <Link href="/assess/setup-questionnaire" className="button-secondary compact" style={{ marginTop: 8 }}>Go to Setup Questionnaire</Link>
            </div>
          ) : (
            <div className="action-list">
              {items.map((i) => (
                <article className="action-row" key={i.id}>
                  <div>
                    <strong>{i.taskName}</strong>
                    <span className={URGENCY_CLASS[i.urgency]}>{URGENCY_LABEL[i.urgency]}</span>
                    <small className="muted">
                      {i.taskType ? `${i.taskType.replace("_", " ")} · ` : ""}
                      {i.frequency ? `${i.frequency} · ` : ""}
                      {i.dueDate ? `Due ${i.dueDate}` : "No due date"}
                      {i.programName ? ` · ${i.programName}` : ""}
                    </small>
                  </div>
                  {i.status !== "completed" && (
                    <form action={completeCalendarItemAction}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className="button-secondary compact" type="submit">Mark complete</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
