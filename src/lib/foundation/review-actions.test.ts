import { describe, expect, it } from "vitest";
import {
  getFoundationActionNextStep,
  getFoundationActionOperatingState,
  getFoundationExactSourceHref,
  getFoundationNotificationLabel,
  getFoundationSourceResolution,
  getFoundationTaskCloseoutNote,
  getFoundationTaskStatusHistory,
  normalizeFoundationReviewSourceModule
} from "./review-actions";

describe("foundation review action helpers", () => {
  it("maps source modules to exact source anchors when a source row is linked", () => {
    expect(getFoundationExactSourceHref("evidence_map", "ev-1")).toBe("/foundation#source-evidence_map-ev-1");
    expect(getFoundationExactSourceHref("unknown_source", "row-1")).toBe("/foundation");
    expect(normalizeFoundationReviewSourceModule("incident")).toBe("incident");
    expect(normalizeFoundationReviewSourceModule("not_found")).toBeNull();
  });

  it("derives task operating state and next step from status, assignment, and due date", () => {
    expect(getFoundationActionOperatingState("blocked")).toBe("Blocked - owner decision needed");
    expect(getFoundationActionOperatingState("open")).toBe("Open - needs schedule");
    expect(getFoundationActionNextStep("open")).toContain("Assign an owner");
    expect(getFoundationActionNextStep("in_progress", "user-1", "2026-06-10")).toContain("Complete the source review");
  });

  it("projects audit payload fields into task history and closeout notes", () => {
    const history = getFoundationTaskStatusHistory(
      [
        {
          eventType: "foundation_review_task_status_updated",
          summary: "Closed task",
          payload: {
            taskId: "task-1",
            status: "complete",
            previousStatus: "in_progress",
            closeoutNote: "Evidence linked.",
            assignedTo: "user-1",
            readyForClosureReview: true
          }
        }
      ],
      "task-1",
      undefined,
      new Map([["user-1", { full_name: "QA Owner" }]])
    );

    expect(history[0]).toMatchObject({
      status: "complete",
      previousStatus: "in_progress",
      closeoutNote: "Evidence linked.",
      assigneeName: "QA Owner",
      readyForClosureReview: true
    });
    expect(getFoundationTaskCloseoutNote(history)).toBe("Evidence linked.");
  });

  it("keeps notification labels and source-resolution fallback deterministic", () => {
    expect(getFoundationNotificationLabel("foundation_task_due_soon")).toBe("Due soon");
    expect(getFoundationNotificationLabel("other")).toBe("Task");
    expect(getFoundationSourceResolution(new Map(), "equipment", "eq-1")).toEqual({
      state: "Manual source review required",
      detail: "No automated source-resolution signal is available for this source module yet."
    });
  });
});
