"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { addFoundationReviewTaskNoteAction, refreshFoundationSourceResolutionAction, updateFoundationReviewTaskStatusAction } from "@/app/foundation/actions";
import type { FoundationAssigneeOption, FoundationReviewActionSummary } from "@/lib/supabase/data";

export function FoundationReviewActionsPanel({
  actions,
  assignees = [],
  canManage = false,
  emptyMessage = "No open action-planning items have been generated yet.",
  returnTo = "/foundation",
  title = "Source-traced follow-through"
}: {
  actions: FoundationReviewActionSummary[];
  assignees?: FoundationAssigneeOption[];
  canManage?: boolean;
  emptyMessage?: string;
  returnTo?: string;
  title?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [savedView, setSavedView] = useState("all");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
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
        const searchText = [
          action.title,
          action.sourceLabel,
          action.sourceModule,
          action.assigneeName,
          action.reason,
          action.sourceResolutionState,
          ...action.activityHistory.flatMap((event) => [event.summary, event.note ?? "", event.closeoutNote ?? ""])
        ]
          .join(" ")
          .toLowerCase();
        const searchMatches = !searchQuery.trim() || searchText.includes(searchQuery.trim().toLowerCase());
        const statusMatches = statusFilter === "all" || action.status === statusFilter;
        const priorityMatches = priorityFilter === "all" || action.priority === priorityFilter;
        const sourceMatches = sourceFilter === "all" || action.sourceModule === sourceFilter;
        const savedViewMatches = getSavedViewMatch(savedView, action);
        return searchMatches && statusMatches && priorityMatches && sourceMatches && savedViewMatches;
      }),
    [actions, priorityFilter, savedView, searchQuery, sourceFilter, statusFilter]
  );
  const selectedAction = filteredActions.find((action) => action.id === selectedActionId) ?? filteredActions[0] ?? null;
  const readyForClosureActions = filteredActions.filter(isReadyForClosure);

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
        <>
          <div className="saved-view-bar" aria-label="Saved task views">
            {[
              ["all", "All"],
              ["assigned", "Assigned to me"],
              ["blocked", "Blocked"],
              ["ready", "Ready for closure"],
              ["unassigned", "Unassigned"],
              ["due_week", "Due this week"]
            ].map(([value, label]) => (
              <button className={savedView === value ? "button-primary compact" : "button-secondary compact"} key={value} type="button" onClick={() => setSavedView(value)}>
                {label}
              </button>
            ))}
          </div>
          <div className="action-filter-bar" aria-label="Foundation review action filters">
            <label className="wide-field">
              Search tasks
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, source, assignee, priority, status, or note text..."
              />
            </label>
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
        </>
      ) : null}
      {readyForClosureActions.length > 0 ? (
        <div className="ready-closure-lane">
          <strong>{readyForClosureActions.length} ready for closure review</strong>
          <span>Review the source, add a closeout note, then complete the task.</span>
        </div>
      ) : null}
      <div className="action-workspace">
        <div className="action-list">
          {filteredActions.length > 0 ? (
            filteredActions.map((action) => (
            <article className="action-row foundation-action-row" key={`${action.id}-${action.sourceModule}`}>
              <div className="foundation-action-header">
                <div>
                  <strong>{action.title}</strong>
                  <span>{action.operatingState}</span>
                </div>
                <div className="task-chip-row" aria-label="Task state">
                  <span className={`task-status-chip task-status-${normalizeChipClass(action.status)}`}>{formatActionLabel(action.status)}</span>
                  <span className={`task-priority-chip task-priority-${normalizeChipClass(action.priority)}`}>{formatActionLabel(action.priority)}</span>
                </div>
              </div>
              <div className="task-card-meta" aria-label="Task summary">
                <span>
                  Owner <strong>{action.assigneeName ?? "Unassigned"}</strong>
                </span>
                <span>
                  Due <strong>{action.dueDate ?? "No due date"}</strong>
                </span>
                <span>
                  Source <Link href={action.sourceHref}>{action.sourceLabel}</Link>
                </span>
                <span className={`task-aging-badge ${getTaskAgingClass(action)}`}>{getTaskAgingLabel(action)}</span>
              </div>
              {action.reason ? <p>{action.reason}</p> : null}
              <button className="button-secondary compact" type="button" onClick={() => setSelectedActionId(action.id)}>
                Open task detail
              </button>
              {isReadyForClosure(action) ? (
                <div className="ready-closure-banner">
                  <strong>Ready for closure review</strong>
                  <span>Source resolution is clean. Add a closeout note before completing the task.</span>
                </div>
              ) : null}
              <details className="source-detail-expander">
                <summary>Action detail and source trace</summary>
                <div className="action-detail-grid">
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
                    <div>
                      <dt>Assignee</dt>
                      <dd>{action.assigneeName ?? "Unassigned"}</dd>
                    </div>
                    <div>
                      <dt>Due date</dt>
                      <dd>{action.dueDate ?? "No due date"}</dd>
                    </div>
                  </dl>
                  <div className="action-next-step">
                    <strong>Next step</strong>
                    <p>{action.nextStep}</p>
                    <Link className="text-link" href={action.sourceDetailHref}>
                      Open source section
                    </Link>
                  </div>
                  <div className="action-next-step">
                    <strong>Source resolution</strong>
                    <p>{action.sourceResolutionState}</p>
                    <p>{action.sourceResolutionDetail}</p>
                  </div>
                  {action.closeoutNote ? (
                    <div className="action-next-step">
                      <strong>Closeout note</strong>
                      <p>{action.closeoutNote}</p>
                    </div>
                  ) : null}
                  <div className="action-status-history">
                    <strong>Activity history</strong>
                    {action.activityHistory.length > 0 ? (
                      <ol className="compact-timeline">
                        {action.activityHistory.slice(0, 5).map((event) => (
                          <li key={`${event.eventType}-${event.createdAt ?? event.summary}`}>
                            <span>{event.createdAt ? new Date(event.createdAt).toLocaleString() : "Pending timestamp"}</span>
                            <p>{event.status ? `${event.status}: ${event.summary}` : event.summary}</p>
                            {event.note ? <p>{event.note}</p> : null}
                            {event.closeoutNote ? <p>Closeout: {event.closeoutNote}</p> : null}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>No activity history has been written yet.</p>
                    )}
                  </div>
                </div>
              </details>
              {canManage && action.canUpdate && action.taskId ? (
                <form action={updateFoundationReviewTaskStatusAction} className="task-status-form">
                  <input name="taskId" type="hidden" value={action.taskId} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <label>
                    Status
                    <select name="status" defaultValue={action.status === "open" ? "in_progress" : action.status}>
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="complete">Complete</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </label>
                  <label>
                    Due date
                    <input name="dueDate" type="date" defaultValue={action.dueDate ?? ""} />
                  </label>
                  <label>
                    Assignee
                    <select name="assignedTo" defaultValue={action.assignedTo ?? ""}>
                      <option value="">Unassigned</option>
                      {assignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>
                          {assignee.name}
                          {assignee.role ? ` / ${assignee.role}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="wide-field">
                    Closeout note
                    <textarea
                      name="closeoutNote"
                      placeholder="Required before marking complete; optional for other status changes."
                      rows={2}
                    />
                  </label>
                  <button className="button-secondary compact" type="submit">
                    Update task
                  </button>
                </form>
              ) : null}
              {canManage && action.canUpdate && action.taskId ? (
                <form action={addFoundationReviewTaskNoteAction} className="task-note-form">
                  <input name="taskId" type="hidden" value={action.taskId} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <label>
                    Activity note
                    <textarea name="note" placeholder="Add a human-review note without changing status." rows={2} />
                  </label>
                  <button className="button-secondary compact" type="submit">
                    Add note
                  </button>
                </form>
              ) : null}
              {canManage && action.canUpdate && action.taskId ? (
                <form action={refreshFoundationSourceResolutionAction} className="task-refresh-form">
                  <input name="taskId" type="hidden" value={action.taskId} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <button className="button-secondary compact" type="submit">
                    Refresh source resolution
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
        {selectedAction ? <TaskDetailDrawer action={selectedAction} /> : null}
      </div>
    </section>
  );
}

function TaskDetailDrawer({ action }: { action: FoundationReviewActionSummary }) {
  return (
    <aside className="task-detail-drawer" aria-label="Task detail drawer">
      <div>
        <p className="section-label">Task detail</p>
        <h3>{action.title}</h3>
      </div>
      <div className="task-chip-row">
        <span className={`task-status-chip task-status-${normalizeChipClass(action.status)}`}>{formatActionLabel(action.status)}</span>
        <span className={`task-priority-chip task-priority-${normalizeChipClass(action.priority)}`}>{formatActionLabel(action.priority)}</span>
      </div>
      <dl>
        <div>
          <dt>Owner</dt>
          <dd>{action.assigneeName ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{action.dueDate ?? "No due date"}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            <Link href={action.sourceDetailHref}>{action.sourceLabel}</Link>
          </dd>
        </div>
        <div>
          <dt>Resolution</dt>
          <dd>{action.sourceResolutionState}</dd>
        </div>
      </dl>
      {isReadyForClosure(action) ? (
        <div className="ready-closure-banner">
          <strong>Ready for closure</strong>
          <span>Add a closeout note and complete the task after human review.</span>
        </div>
      ) : null}
      <div className="action-status-history">
        <strong>Compact activity timeline</strong>
        {action.activityHistory.length > 0 ? (
          <ol className="compact-timeline">
            {action.activityHistory.slice(0, 6).map((event) => (
              <li key={`${event.eventType}-${event.createdAt ?? event.summary}`}>
                <span>{event.createdAt ? new Date(event.createdAt).toLocaleString() : "Pending timestamp"}</span>
                <p>{event.note ?? event.summary}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p>No activity history has been written yet.</p>
        )}
      </div>
    </aside>
  );
}

function getTaskAgingLabel(action: FoundationReviewActionSummary) {
  if (action.status === "complete") return "Completed";
  if (action.status === "blocked") return "Blocked";
  if (!action.dueDate) return "No due date";
  const due = new Date(`${action.dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "Overdue";
  if (days <= 3) return "Due soon";
  return "On track";
}

function getTaskAgingClass(action: FoundationReviewActionSummary) {
  const label = getTaskAgingLabel(action).toLowerCase().replace(/\s+/g, "-");
  return `task-aging-${label}`;
}

function formatActionLabel(value: string) {
  return value.replace(/_/g, " ");
}

function normalizeChipClass(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function isReadyForClosure(action: FoundationReviewActionSummary) {
  return action.status !== "complete" && action.sourceResolutionState === "Source appears resolved";
}

function getSavedViewMatch(savedView: string, action: FoundationReviewActionSummary) {
  if (savedView === "blocked") return action.status === "blocked";
  if (savedView === "ready") return isReadyForClosure(action);
  if (savedView === "unassigned") return !action.assignedTo;
  if (savedView === "assigned") return action.canUpdate && Boolean(action.assignedTo);
  if (savedView === "due_week") return isDueThisWeek(action);
  return true;
}

function isDueThisWeek(action: FoundationReviewActionSummary) {
  if (!action.dueDate) return false;
  const due = new Date(`${action.dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  return days >= 0 && days <= 7;
}
