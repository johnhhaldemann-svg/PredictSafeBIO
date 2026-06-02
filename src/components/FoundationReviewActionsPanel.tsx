"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import {
  addFoundationReviewTaskNoteAction,
  addFoundationReviewTasksNoteAction,
  refreshFoundationSourceResolutionAction,
  updateFoundationReviewTaskStatusAction,
  updateFoundationReviewTasksStatusAction
} from "@/app/foundation/actions";
import { getFieldReportDueState } from "@/lib/foundation/timing";
import type { FoundationAssigneeOption, FoundationReviewActionSummary } from "@/lib/supabase/data";

const savedTaskViews = [
  ["all", "All generated"],
  ["my_open", "My open work"],
  ["blocked", "Blocked"],
  ["overdue", "Overdue"],
  ["due_soon", "Due soon"],
  ["high_priority", "High priority"],
  ["ready", "Ready for closure"],
  ["unassigned", "Unassigned"]
] as const;

const taskSortOptions = [
  ["priority", "Priority"],
  ["due_date", "Due date"],
  ["status", "Status"],
  ["source_module", "Source module"]
] as const;

export function FoundationReviewActionsPanel({
  actions,
  assignees = [],
  canManage = false,
  canEditAssignment = true,
  canEditDueDate = true,
  canEditPriority = true,
  emptyMessage = "No open action-planning items have been generated yet.",
  initialSavedView = "all",
  laneDescription = "Source-traced actions, owner follow-through, activity notes, source resolution, and closure controls stay in one operating card.",
  laneLabel = "Generated Actions",
  primaryActionHref,
  primaryActionLabel,
  returnTo = "/foundation",
  title = "Source-traced follow-through"
}: {
  actions: FoundationReviewActionSummary[];
  assignees?: FoundationAssigneeOption[];
  canManage?: boolean;
  canEditAssignment?: boolean;
  canEditDueDate?: boolean;
  canEditPriority?: boolean;
  emptyMessage?: string;
  initialSavedView?: string;
  laneDescription?: string;
  laneLabel?: string;
  primaryActionHref?: string;
  primaryActionLabel?: string;
  returnTo?: string;
  title?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [savedView, setSavedView] = useState(initialSavedView);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortKey, setSortKey] = useState<(typeof taskSortOptions)[number][0]>("priority");
  const sourceOptions = useMemo(
    () => Array.from(new Set(actions.map((action) => action.sourceModule))).sort(),
    [actions]
  );
  const filteredActions = useMemo(
    () => {
      const matchingActions = actions.filter((action) => {
        const searchText = [
          action.title,
          action.sourceLabel,
          action.sourceModule,
          action.assigneeName,
          action.reason,
          action.sourceResolutionState,
          ...action.activityHistory.flatMap((event) => [
            event.summary,
            event.note ?? "",
            event.closeoutNote ?? "",
            event.actorRole ?? "",
            event.status ?? "",
            event.resolutionState ?? ""
          ])
        ]
          .join(" ")
          .toLowerCase();
        const searchMatches = !searchQuery.trim() || searchText.includes(searchQuery.trim().toLowerCase());
        const statusMatches = statusFilter === "all" || action.status === statusFilter;
        const priorityMatches = priorityFilter === "all" || action.priority === priorityFilter;
        const sourceMatches = sourceFilter === "all" || action.sourceModule === sourceFilter;
        const savedViewMatches = getSavedViewMatch(savedView, action);
        return searchMatches && statusMatches && priorityMatches && sourceMatches && savedViewMatches;
      });
      return getSortedActions(matchingActions, sortKey);
    },
    [actions, priorityFilter, savedView, searchQuery, sortKey, sourceFilter, statusFilter]
  );
  const selectedAction = filteredActions.find((action) => action.id === selectedActionId) ?? filteredActions[0] ?? null;
  const readyForClosureActions = filteredActions.filter(isReadyForClosure);
  const savedViewLabel = getSavedViewLabel(savedView);
  const selectedVisibleTaskIds = selectedTaskIds.filter((taskId) => filteredActions.some((action) => action.taskId === taskId));

  function toggleSelectedTask(taskId: string) {
    setSelectedTaskIds((current) => (current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]));
  }

  return (
    <section className="panel command-center-lane task-command-lane">
      <div className="panel-heading command-center-lane-header">
        <div>
          <p className="section-label">{laneLabel}</p>
          <h2>{title}</h2>
          <p className="muted">{laneDescription}</p>
        </div>
        {primaryActionHref && primaryActionLabel ? (
          <Link className="button-primary compact" href={primaryActionHref}>
            {primaryActionLabel}
          </Link>
        ) : (
          <ClipboardList size={22} />
        )}
      </div>
      {actions.length > 0 ? (
        <>
          <div className="saved-view-bar" aria-label="Saved task views">
            {savedTaskViews.map(([value, label]) => (
              <button className={savedView === value ? "button-primary compact" : "button-secondary compact"} key={value} type="button" onClick={() => setSavedView(value)}>
                {label}
              </button>
            ))}
          </div>
          <div className="saved-view-state" aria-live="polite">
            <div>
              <span>Active saved view</span>
              <strong>{savedViewLabel}</strong>
            </div>
            <p>
              Showing {filteredActions.length} of {actions.length} tasks, sorted by {getSortLabel(sortKey).toLowerCase()}.
            </p>
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
                <option value="urgent">Urgent</option>
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
            <label>
              Sort
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as typeof sortKey)}>
                {taskSortOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
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
      {canManage && filteredActions.some((action) => action.canUpdate && action.taskId) ? (
        <div className="bulk-task-action-stack">
          <form action={updateFoundationReviewTasksStatusAction} className="bulk-task-action-bar">
            <div>
              <strong>Bulk status update</strong>
              <span>{selectedVisibleTaskIds.length} selected in this view</span>
            </div>
            {selectedVisibleTaskIds.map((taskId) => (
              <input key={taskId} name="taskIds" type="hidden" value={taskId} />
            ))}
            <input name="returnTo" type="hidden" value={returnTo} />
            <label>
              Status
              <select name="status" defaultValue="in_progress">
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="complete">Complete</option>
              </select>
            </label>
            <label className="wide-field">
              Closeout note
              <textarea name="closeoutNote" placeholder="Required only when bulk completing selected tasks." rows={2} />
            </label>
            <button className="button-secondary compact" type="submit" disabled={selectedVisibleTaskIds.length < 1}>
              Update selected
            </button>
          </form>
          <form action={addFoundationReviewTasksNoteAction} className="bulk-task-action-bar bulk-note-action-bar">
            <div>
              <strong>Bulk activity note</strong>
              <span>{selectedVisibleTaskIds.length} selected in this view</span>
            </div>
            {selectedVisibleTaskIds.map((taskId) => (
              <input key={taskId} name="taskIds" type="hidden" value={taskId} />
            ))}
            <input name="returnTo" type="hidden" value={returnTo} />
            <label className="wide-field">
              Note
              <textarea name="note" placeholder="Add the same activity note to selected tasks." rows={2} />
            </label>
            <button className="button-secondary compact" type="submit" disabled={selectedVisibleTaskIds.length < 1}>
              Add note to selected
            </button>
          </form>
          <form action={updateFoundationReviewTasksStatusAction} className="bulk-task-action-bar bulk-closeout-action-bar">
            <div>
              <strong>Bulk closeout</strong>
              <span>{selectedVisibleTaskIds.length} selected in this view</span>
            </div>
            {selectedVisibleTaskIds.map((taskId) => (
              <input key={taskId} name="taskIds" type="hidden" value={taskId} />
            ))}
            <input name="returnTo" type="hidden" value={returnTo} />
            <input name="status" type="hidden" value="complete" />
            <label className="wide-field">
              Closeout note
              <textarea name="closeoutNote" placeholder="Required to complete selected tasks." rows={2} />
            </label>
            <button className="button-secondary compact" type="submit" disabled={selectedVisibleTaskIds.length < 1}>
              Complete selected
            </button>
          </form>
        </div>
      ) : null}
      <div className="action-workspace">
        <div className="action-list">
          {filteredActions.length > 0 ? (
            filteredActions.map((action) => (
            <article className="action-row foundation-action-row" key={`${action.id}-${action.sourceModule}`}>
              <div className="foundation-action-header">
                <div>
                  <div className="task-select-heading">
                    {canManage && action.canUpdate && action.taskId ? (
                      <label className="task-select-control">
                        <input
                          aria-label={`Select ${action.title}`}
                          checked={selectedVisibleTaskIds.includes(action.taskId)}
                          onChange={() => toggleSelectedTask(action.taskId as string)}
                          type="checkbox"
                        />
                      </label>
                    ) : null}
                    <strong>{action.title}</strong>
                  </div>
                  <span>{action.operatingState}</span>
                </div>
                <div className="task-chip-row" aria-label="Task state">
                  <span className={`task-status-chip task-status-${normalizeChipClass(action.status)}`}>{formatActionLabel(action.status)}</span>
                  <span className={`task-priority-chip task-priority-${normalizeChipClass(action.priority)}`}>{formatActionLabel(action.priority)}</span>
                  <span className={`task-role-chip ${getTaskRoleClass(action, canManage, canEditAssignment)}`}>{getTaskRoleLabel(action, canManage, canEditAssignment)}</span>
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
              <CloseoutNoteCallout action={action} />
              <div className="task-action-button-row">
                <button className="button-secondary compact" type="button" onClick={() => setSelectedActionId(action.id)}>
                  Open task detail
                </button>
                <Link className="button-secondary compact" href={action.sourceDetailHref}>
                  Open source
                </Link>
              </div>
              {isReadyForClosure(action) ? (
                <div className="ready-closure-banner">
                  <strong>Ready for closure review</strong>
                  <span>Source resolution is clean. Add a closeout note before completing the task.</span>
                </div>
              ) : null}
              <details className="source-detail-expander">
                <summary>Action detail and source trace</summary>
                <div className="action-detail-grid">
                  <TaskContextBlock action={action} compact={false} />
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
                    <TaskActivityTimeline events={action.activityHistory.slice(0, 5)} />
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
                  {canEditPriority ? (
                    <label>
                      Priority
                      <select name="priority" defaultValue={action.priority}>
                        <option value="urgent">Urgent</option>
                        <option value="high">High priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="low">Low priority</option>
                      </select>
                    </label>
                  ) : null}
                  {canEditDueDate ? (
                    <label>
                      Due date
                      <input name="dueDate" type="date" defaultValue={action.dueDate ?? ""} />
                    </label>
                  ) : null}
                  {canEditAssignment ? (
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
                  ) : null}
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
            <TaskEmptyState
              title="No tasks in this saved view"
              message="Try another saved view, reset the filters, or generate/source a new Foundation review action."
            />
          ) : (
            <TaskEmptyState title="This lane is clear" message={emptyMessage} />
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
        <span className="task-role-chip task-role-detail">Source-traced task</span>
      </div>
      <TaskContextBlock action={action} compact={false} />
      {isReadyForClosure(action) ? (
        <div className="ready-closure-banner">
          <strong>Ready for closure</strong>
          <span>Add a closeout note and complete the task after human review.</span>
        </div>
      ) : null}
      <CloseoutNoteCallout action={action} />
      <div className="action-status-history">
        <strong>Activity timeline</strong>
        <TaskActivityTimeline events={action.activityHistory.slice(0, 8)} />
      </div>
    </aside>
  );
}

function TaskEmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="task-lane-empty-state">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function TaskContextBlock({ action, compact = true }: { action: FoundationReviewActionSummary; compact?: boolean }) {
  const resolution = getSourceResolutionDisplay(action.sourceResolutionState);

  return (
    <div className={compact ? "task-context-block" : "task-context-block task-context-expanded"} aria-label="Task context">
      <div>
        <span>Status</span>
        <strong>{formatActionLabel(action.status)}</strong>
      </div>
      <div>
        <span>Assignee</span>
        <strong>{action.assigneeName ?? "Unassigned"}</strong>
      </div>
      <div>
        <span>Due date</span>
        <strong>{action.dueDate ?? "No due date"}</strong>
      </div>
      <div>
        <span>Source</span>
        <strong>{formatActionLabel(action.sourceModule)}</strong>
        <Link className="text-link" href={action.sourceDetailHref}>
          {action.sourceLabel}
        </Link>
      </div>
      <div className="task-context-resolution">
        <span>Source resolution</span>
        <strong className={`source-resolution-chip source-resolution-${resolution.className}`}>{resolution.label}</strong>
        {!compact ? <p>{action.sourceResolutionDetail}</p> : null}
      </div>
    </div>
  );
}

function TaskActivityTimeline({ events }: { events: FoundationReviewActionSummary["activityHistory"] }) {
  if (events.length < 1) return <p>No activity history has been written yet.</p>;

  return (
    <ol className="compact-timeline rich-activity-timeline">
      {events.map((event) => (
        <li key={`${event.eventType}-${event.createdAt ?? event.summary}`}>
          <div className="activity-event-heading">
            <strong>{getActivityTitle(event)}</strong>
            <span>{event.createdAt ? new Date(event.createdAt).toLocaleString() : "Pending timestamp"}</span>
          </div>
          <div className="activity-event-meta">
            <span>{formatActionLabel(event.eventType)}</span>
            <span>{formatActionLabel(event.actorRole ?? "system")}</span>
          </div>
          <div className="activity-event-details">
            {getActivityDetails(event).map((detail) => (
              <p key={detail}>{detail}</p>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

function getActivityTitle(event: FoundationReviewActionSummary["activityHistory"][number]) {
  if (event.closeoutNote && event.status === "complete") return "Closed with closeout note";
  if (event.eventType === "foundation_review_task_note_added") return "Note added";
  if (event.eventType === "foundation_source_resolution_refreshed") return "Source refreshed";
  if (event.previousAssignedTo !== event.assignedTo) return "Assignment changed";
  if (event.previousDueDate !== event.dueDate) return "Due date changed";
  if (event.previousPriority !== event.priority) return "Priority changed";
  if (event.status) return "Status changed";
  return "Activity recorded";
}

function getActivityDetails(event: FoundationReviewActionSummary["activityHistory"][number]) {
  const details = [];
  if (event.previousStatus || event.status) {
    details.push(`Status: ${formatNullableValue(event.previousStatus)} -> ${formatNullableValue(event.status)}`);
  }
  if (event.previousPriority !== event.priority && (event.previousPriority || event.priority)) {
    details.push(`Priority: ${formatNullableValue(event.previousPriority)} -> ${formatNullableValue(event.priority)}`);
  }
  if (event.previousAssignedTo !== event.assignedTo && (event.previousAssignedTo || event.assignedTo)) {
    details.push(`Assignee: ${formatNullableValue(event.previousAssigneeName ?? event.previousAssignedTo)} -> ${formatNullableValue(event.assigneeName ?? event.assignedTo)}`);
  }
  if (event.previousDueDate !== event.dueDate && (event.previousDueDate || event.dueDate)) {
    details.push(`Due date: ${formatNullableValue(event.previousDueDate)} -> ${formatNullableValue(event.dueDate)}`);
  }
  if (event.resolutionState) details.push(`Source resolution: ${event.resolutionState}`);
  if (event.resolutionDetail) details.push(event.resolutionDetail);
  if (event.note) details.push(`Note: ${event.note}`);
  if (event.closeoutNote) details.push(`Closeout note: ${event.closeoutNote}`);
  if (details.length < 1) details.push(event.summary);
  return details;
}

function formatNullableValue(value?: string | null) {
  return value ? formatActionLabel(value) : "none";
}

function getSourceResolutionDisplay(state: string) {
  const normalized = state.toLowerCase();
  if (normalized.includes("appears resolved")) return { label: "Resolved", className: "resolved" };
  if (normalized.includes("no exact source")) return { label: "No exact source", className: "no-source" };
  if (normalized.includes("manual")) return { label: "Manual review", className: "manual-review" };
  return { label: "Needs review", className: "needs-review" };
}

function CloseoutNoteCallout({ action }: { action: FoundationReviewActionSummary }) {
  if (action.status !== "complete" || !action.closeoutNote?.trim()) return null;

  return (
    <div className="task-closeout-note">
      <strong>Closeout note</strong>
      <p>{action.closeoutNote}</p>
    </div>
  );
}

function getTaskAgingLabel(action: FoundationReviewActionSummary) {
  if (action.status === "complete") return "Completed";
  if (action.status === "blocked") return "Blocked";
  const dueState = getFieldReportDueState(action.dueDate);
  if (dueState === "unscheduled") return "No due date";
  if (dueState === "overdue") return "Overdue";
  if (dueState === "due_soon") return "Due soon";
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

function getSavedViewLabel(savedView: string) {
  return savedTaskViews.find(([value]) => value === savedView)?.[1] ?? "All generated";
}

function getSortLabel(sortKey: (typeof taskSortOptions)[number][0]) {
  return taskSortOptions.find(([value]) => value === sortKey)?.[1] ?? "Priority";
}

function getSortedActions(actions: FoundationReviewActionSummary[], sortKey: (typeof taskSortOptions)[number][0]) {
  return [...actions].sort((a, b) => {
    if (sortKey === "due_date") return compareDueDates(a, b) || comparePriority(a, b) || compareTitle(a, b);
    if (sortKey === "status") return compareText(a.status, b.status) || comparePriority(a, b) || compareTitle(a, b);
    if (sortKey === "source_module") return compareText(a.sourceModule, b.sourceModule) || comparePriority(a, b) || compareTitle(a, b);
    return comparePriority(a, b) || compareDueDates(a, b) || compareTitle(a, b);
  });
}

function comparePriority(a: FoundationReviewActionSummary, b: FoundationReviewActionSummary) {
  return getPriorityRank(a.priority) - getPriorityRank(b.priority);
}

function compareDueDates(a: FoundationReviewActionSummary, b: FoundationReviewActionSummary) {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

function compareTitle(a: FoundationReviewActionSummary, b: FoundationReviewActionSummary) {
  return compareText(a.title, b.title);
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function getPriorityRank(priority: string) {
  if (priority === "urgent") return 0;
  if (priority === "high") return 1;
  if (priority === "medium") return 2;
  if (priority === "low") return 3;
  return 4;
}

function isReadyForClosure(action: FoundationReviewActionSummary) {
  return action.status !== "complete" && action.sourceResolutionState === "Source appears resolved";
}

function getSavedViewMatch(savedView: string, action: FoundationReviewActionSummary) {
  if (savedView === "blocked") return action.status === "blocked";
  if (savedView === "overdue") return isOverdue(action);
  if (savedView === "high_priority") return action.status !== "complete" && ["high", "urgent"].includes(action.priority.toLowerCase());
  if (savedView === "ready") return isReadyForClosure(action);
  if (savedView === "unassigned") return !action.assignedTo;
  if (savedView === "my_open") return action.canUpdate && Boolean(action.assignedTo) && action.status !== "complete";
  if (savedView === "due_soon") return isDueSoon(action);
  return true;
}

function isDueSoon(action: FoundationReviewActionSummary) {
  if (action.status === "complete") return false;
  return getFieldReportDueState(action.dueDate) === "due_soon";
}

function isOverdue(action: FoundationReviewActionSummary) {
  if (action.status === "complete") return false;
  return getFieldReportDueState(action.dueDate) === "overdue";
}

function getTaskRoleLabel(action: FoundationReviewActionSummary, canManage: boolean, canEditAssignment: boolean) {
  if (!canManage || !action.canUpdate) return "Read-only";
  if (canEditAssignment) return "Owner controls";
  return "Assigned member";
}

function getTaskRoleClass(action: FoundationReviewActionSummary, canManage: boolean, canEditAssignment: boolean) {
  if (!canManage || !action.canUpdate) return "task-role-readonly";
  if (canEditAssignment) return "task-role-owner";
  return "task-role-member";
}
