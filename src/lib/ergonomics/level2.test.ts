import { describe, expect, it } from "vitest";
import { evaluateErgonomicLevel2, validateErgonomicLevel2, type ErgonomicLevel2Input } from "./level2";

const validInput: ErgonomicLevel2Input = {
  sourceContext: "request",
  requestId: "request-1",
  taskType: "lifting",
  taskDescription: "Lift cartons from pallet to bench",
  measuredLoadLbs: 42,
  horizontalReachIn: 19,
  verticalHandHeightIn: 31,
  travelDistanceIn: 12,
  frequencyPerMinute: 5,
  taskDurationMinutes: 130,
  asymmetryDegrees: 20,
  gripQuality: "poor",
  specialistNotes: "Observed extended reach and poor handles.",
  formalRecommendations: ["Raise pallet height", "Use lift assist"],
  correctiveActionRecommended: true
};

describe("ergonomic Level 2 guided measurement inspection", () => {
  it("requires request or audit context plus measurement fields", () => {
    expect(validateErgonomicLevel2({ sourceContext: "request", taskType: "lifting" })).toEqual(
      expect.arrayContaining([
        "Describe the task being evaluated.",
        "Measured load or force is required.",
        "Horizontal reach measurement is required.",
        "Vertical hand height measurement is required.",
        "Frequency measurement is required.",
        "Task duration measurement is required.",
        "Grip quality is required.",
        "Specialist review notes are required."
      ])
    );
  });

  it("accepts complete guided measurements without calculating an equation score", () => {
    expect(validateErgonomicLevel2(validInput)).toEqual([]);
    const result = evaluateErgonomicLevel2(validInput);

    expect(result.requiredMeasurementsComplete).toBe(true);
    expect(result.measurementSummary).toContain("42 lb load/force");
    expect(result.riskSummary).toContain("not a final equation score");
  });

  it("allows audit context without a Level 1 request id", () => {
    expect(validateErgonomicLevel2({ ...validInput, sourceContext: "audit", requestId: null })).toEqual([]);
  });
});
