import type { FoundationNotificationSummary, FoundationReviewActionSummary } from "@/lib/supabase/data";

export type FoundationWorkKpis = {
  overdue: number;
  blocked: number;
  completedThisWeek: number;
  unassigned: number;
  readyForClosure: number;
  highPriority: number;
  unreadNotifications: number;
};

export type FoundationDueBucket = "overdue" | "due_soon" | "scheduled" | "unscheduled";

export function getFoundationWorkKpis(
  actions: FoundationReviewActionSummary[],
  notifications?: FoundationNotificationSummary,
  now = new Date()
): FoundationWorkKpis {
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  return {
    overdue: actions.filter((action) => getFoundationDueBucket(action, now) === "overdue" && action.status !== "complete").length,
    blocked: actions.filter((action) => action.status === "blocked").length,
    completedThisWeek: actions.filter(
      (action) =>
        action.status === "complete" &&
        action.activityHistory.some((event) => event.status === "complete" && event.createdAt && new Date(event.createdAt) >= weekStart)
    ).length,
    unassigned: actions.filter((action) => !action.assignedTo && action.taskId).length,
    readyForClosure: actions.filter(isFoundationReadyForClosure).length,
    highPriority: actions.filter((action) => action.status !== "complete" && ["high", "urgent"].includes(action.priority.toLowerCase())).length,
    unreadNotifications: notifications?.unreadCount ?? 0
  };
}

export function getFoundationDueBucket(action: FoundationReviewActionSummary, now = new Date()): FoundationDueBucket {
  if (!action.dueDate) return "unscheduled";
  const due = new Date(`${action.dueDate}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 3) return "due_soon";
  return "scheduled";
}

export function isFoundationReadyForClosure(action: FoundationReviewActionSummary) {
  return action.status !== "complete" && action.sourceResolutionState === "Source appears resolved";
}
