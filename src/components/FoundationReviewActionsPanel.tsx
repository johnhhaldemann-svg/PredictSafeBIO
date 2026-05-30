"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { updateFoundationReviewTaskStatusAction } from "@/app/foundation/actions";
import type { FoundationReviewActionSummary } from "@/lib/supabase/data";

export function FoundationReviewActionsPanel({
  actions,
  canManage = false,
  emptyMessage = "No open action-planning items have been generated yet.",
  title = "Source-traced follow-through"
}: {
  actions: FoundationReviewActionSummary[];
  canManage?: boolean;
  emptyMessage?: string;
  title?: string;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const sourceOptions = useMemo(
    () => Array.from(new Set(actions.map((action) => action.sourceModule))).sort(),
    [actions]
  );
  const filteredActions = useMemo(
    () =>
      actions.filter((action) => {
        const statusMatches = statusFilter === "all" || action.status === statusFilter;
        const priorityMatches = priorityFilter === "all" || action.priority === priorityFilter;
        const sourceMatches = sourceFilter === "all" || action.sourceModule === sourceFilter;
        return statusMatches && priorityMatches && sourceMatches;
      }),
    [actions, priorityFilter, sourceFilter, statusFilter]
  );

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Action Planning</p>
          <h2>{title}</h2>
        </div>
        <ClipboardList size={22} />
      </div>
      {actions.length > 0 ? (
        <div className="action-filter-bar" aria-label="Foundation review action filters">
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="complete">Complete</option>
            </select>
          </label>
          <label>
            Priority
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="all">All priorities</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
          </label>
          <label>
            Source
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="all">All sources</option>
              {sourceOptions.map((sourceModule) => (
                <option key={sourceModule} value={sourceModule}>
                  {sourceModule.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <span>
            Showing {filteredActions.length} of {actions.length}
          </span>
        </div>
      ) : null}
      <div className="action-list">
        {filteredActions.length > 0 ? (
          filteredActions.map((action) => (
            <article className="action-row foundation-action-row" key={`${action.id}-${action.sourceModule}`}>
              <div>
                <strong>{action.title}</strong>
                <span>
                  {action.priority} / {action.status}
                </span>
              </div>
              <p>
                Source: <Link href={action.sourceHref}>{action.sourceLabel}</Link>
                {action.dueDate ? ` / Due ${action.dueDate}` : ""}
                {action.reason ? ` / ${action.reason}` : ""}
              </p>
              <details className="source-detail-expander">
                <summary>Source trace</summary>
                <dl>
                  <div>
                    <dt>Module</dt>
                    <dd>{action.sourceModule.replace(/_/g, " ")}</dd>
                  </div>
                  <div>
                    <dt>Record</dt>
                    <dd>{action.sourceRecordId ?? "not linked"}</dd>
                  </div>
                  <div>
                    <dt>Recommendation</dt>
                    <dd>{action.recommendationId ?? "task only"}</dd>
                  </div>
                </dl>
              </details>
              {canManage && action.taskId ? (
                <form action={updateFoundationReviewTaskStatusAction} className="task-status-form">
                  <input name="taskId" type="hidden" value={action.taskId} />
                  <select name="status" defaultValue={action.status === "open" ? "in_progress" : action.status}>
                    <option value="in_progress">In progress</option>
                    <option value="complete">Complete</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <button className="button-secondary compact" type="submit">
                    Update task
                  </button>
                </form>
              ) : null}
            </article>
          ))
        ) : actions.length > 0 ? (
          <p className="muted">No generated actions match the selected filters.</p>
        ) : (
          <p className="muted">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
