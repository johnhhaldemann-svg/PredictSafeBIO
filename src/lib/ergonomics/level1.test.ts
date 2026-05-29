import { describe, expect, it } from "vitest";
import {
  buildErgonomicRiskSignal,
  classifyErgonomicRisk,
  normalizeBodyParts,
  scoreErgonomicLevel1,
  validateErgonomicLevel1,
  type ErgonomicBodyPart
} from "./level1";

describe("ergonomic Level 1 screening engine", () => {
  it("classifies the requested Level 1 score bands", () => {
    expect(classifyErgonomicRisk(0)).toBe("low");
    expect(classifyErgonomicRisk(2)).toBe("low");
    expect(classifyErgonomicRisk(3)).toBe("moderate");
    expect(classifyErgonomicRisk(5)).toBe("moderate");
    expect(classifyErgonomicRisk(6)).toBe("high");
    expect(classifyErgonomicRisk(7)).toBe("high");
    expect(classifyErgonomicRisk(8)).toBe("severe");
    expect(classifyErgonomicRisk(9)).toBe("severe");
  });

  it("scores discomfort, frequency, and body strain without measurements", () => {
    const result = scoreErgonomicLevel1({
      taskType: "repetitive_work",
      discomfortLevel: "very_tiring",
      bodyParts: ["shoulders", "hands_wrists"],
      frequency: "often"
    });

    expect(result.riskScore).toBe(6);
    expect(result.riskLevel).toBe("high");
    expect(result.mainRiskDrivers.join(" ")).toContain("Shoulders");
    expect(result.recommendedNextSteps).toContain("Supervisor review recommended.");
  });

  it("handles None as zero body strain and removes other body parts", () => {
    expect(normalizeBodyParts(["none", "back", "neck"])).toEqual(["none"]);
    const result = scoreErgonomicLevel1({
      taskType: "lifting",
      discomfortLevel: "easy",
      bodyParts: ["none"],
      frequency: "rarely"
    });

    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("low");
  });

  it("validates required worker-facing fields", () => {
    expect(validateErgonomicLevel1({ bodyParts: [] })).toEqual(
      expect.arrayContaining([
        "Select a task type.",
        "Select how the task feels on your body.",
        "Select how often you do this task.",
        "Select at least one body part, or None."
      ])
    );
  });

  it("builds the structured AI risk signal payload", () => {
    const input = {
      taskType: "pushing_pulling" as const,
      discomfortLevel: "extremely_tiring" as const,
      bodyParts: ["back", "legs"] as ErgonomicBodyPart[],
      frequency: "all_day" as const,
      comments: "Cart is difficult to move.",
      location: "Dock",
      departmentTrade: "Warehouse"
    };
    const result = scoreErgonomicLevel1(input);
    const signal = buildErgonomicRiskSignal(input, result, {
      id: "ergo-1",
      organizationId: "org-1",
      submitterId: "user-1",
      dateTime: "2026-05-28T12:00:00.000Z",
      repeatedModerateFlag: true
    });

    expect(signal).toMatchObject({
      task_type: "pushing_pulling",
      discomfort_level: "extremely_tiring",
      body_parts_selected: ["back", "legs"],
      frequency: "all_day",
      location: "Dock",
      submitter: "user-1",
      department_trade: "Warehouse",
      risk_score: 8,
      risk_level: "severe",
      escalation_status: "advanced_evaluation_requested",
      repeated_moderate_flag: true,
      source_record_id: "ergo-1"
    });
  });
});
