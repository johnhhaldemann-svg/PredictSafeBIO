import type { FoundationNotificationSummary, FoundationReviewActionSummary } from "@/lib/supabase/data";
import { getFieldReportDueState, type FieldReportDueState } from "./timing";

export type FoundationWorkKpis = {
  overdue: number;
  blocked: number;
  completedThisWeek: number;
  unassigned: number;
  readyForClosure: number;
  highPriority: number;
  unreadNotifications: number;
};

export type FoundationDueBucket = FieldReportDueState;

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
  return getFieldReportDueState(action.dueDate, now);
}

export function isFoundationReadyForClosure(action: FoundationReviewActionSummary) {
  return action.status !== "complete" && action.sourceResolutionState === "Source appears resolved";
}
