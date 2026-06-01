import { describe, expect, it } from "vitest";
import { getFoundationDueBucket, getFoundationWorkKpis, isFoundationReadyForClosure } from "./work-kpis";
import type { FoundationReviewActionSummary } from "@/lib/supabase/data";

describe("foundation work KPIs", () => {
  const now = new Date("2026-05-31T12:00:00Z");

  it("counts overdue, blocked, completed, unassigned, ready-for-closure, and high-priority work", () => {
    const actions = [
      action({ id: "overdue", dueDate: "2026-05-30", priority: "medium" }),
      action({ id: "blocked", status: "blocked" }),
      action({
        id: "complete",
        status: "complete",
        activityHistory: [{ eventType: "foundation_review_task_status_updated", summary: "Completed", status: "complete", createdAt: "2026-05-29T12:00:00Z" }]
      }),
      action({ id: "unassigned", assignedTo: null, taskId: "task-unassigned" }),
      action({ id: "ready", sourceResolutionState: "Source appears resolved" }),
      action({ id: "high", priority: "high" }),
      action({ id: "urgent", priority: "urgent" })
    ];

    expect(getFoundationWorkKpis(actions, { unreadCount: 2, notifications: [] }, now)).toEqual({
      overdue: 1,
      blocked: 1,
      completedThisWeek: 1,
      unassigned: 1,
      readyForClosure: 1,
      highPriority: 2,
      unreadNotifications: 2
    });
  });

  it("uses a 3-day due-soon window and ignores completed tasks for ready-for-closure", () => {
    expect(getFoundationDueBucket(action({ id: "soon", dueDate: "2026-06-03" }), now)).toBe("due_soon");
    expect(getFoundationDueBucket(action({ id: "scheduled", dueDate: "2026-06-04" }), now)).toBe("scheduled");
    expect(isFoundationReadyForClosure(action({ id: "done", status: "complete", sourceResolutionState: "Source appears resolved" }))).toBe(false);
  });
});

function action(input: Partial<FoundationReviewActionSummary>): FoundationReviewActionSummary {
  return {
    id: input.id ?? "action",
    taskId: input.taskId ?? "task",
    title: input.title ?? "Review Foundation action",
    priority: input.priority ?? "medium",
    status: input.status ?? "open",
    operatingState: input.operatingState ?? "Open",
    canUpdate: input.canUpdate ?? true,
    assignedTo: input.assignedTo === undefined ? "user-1" : input.assignedTo,
    assigneeName: input.assigneeName ?? "Owner",
    sourceModule: input.sourceModule ?? "evidence_map",
    sourceRecordId: input.sourceRecordId ?? "source-1",
    sourceLabel: input.sourceLabel ?? "Evidence",
    sourceHref: input.sourceHref ?? "/foundation#evidence-drilldown",
    sourceDetailHref: input.sourceDetailHref ?? "/foundation#source-1",
    sourceResolutionState: input.sourceResolutionState ?? "Source still needs evidence/training/equipment/incident review",
    sourceResolutionDetail: input.sourceResolutionDetail ?? "Review still needed.",
    dueDate: input.dueDate ?? "2026-06-10",
    recommendationId: input.recommendationId,
    reason: input.reason,
    nextStep: input.nextStep ?? "Review source.",
    closeoutNote: input.closeoutNote,
    createdAt: input.createdAt,
    statusHistory: input.statusHistory ?? [],
    activityHistory: input.activityHistory ?? []
  };
}
