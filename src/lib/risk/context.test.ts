import { describe, expect, it } from "vitest";
import {
  assessTeamReadiness,
  hasTeamLeader,
  isElevatedTaskCategory,
  RESOURCE_AT_RISK_LABELS,
  TASK_CATEGORY_LABELS,
  type AssessmentTeamMember
} from "./context";

describe("task category", () => {
  it("labels all three categories", () => {
    expect(Object.keys(TASK_CATEGORY_LABELS)).toEqual(["routine", "non_routine", "emergency"]);
  });

  it("treats non-routine and emergency as elevated", () => {
    expect(isElevatedTaskCategory("routine")).toBe(false);
    expect(isElevatedTaskCategory("non_routine")).toBe(true);
    expect(isElevatedTaskCategory("emergency")).toBe(true);
  });
});

describe("resources at risk", () => {
  it("labels people, assets, and environment", () => {
    expect(Object.keys(RESOURCE_AT_RISK_LABELS)).toEqual(["people", "assets", "environment"]);
  });
});

describe("assessment team", () => {
  const member = (over: Partial<AssessmentTeamMember>): AssessmentTeamMember => ({
    name: "A. Person",
    role: "EHS",
    expertise: "10 years EHS",
    ...over
  });

  it("detects a designated leader", () => {
    expect(hasTeamLeader([member({}), member({ isLeader: true })])).toBe(true);
    expect(hasTeamLeader([member({})])).toBe(false);
  });

  it("is ready only with members, a leader, and recorded expertise", () => {
    const ready = assessTeamReadiness([
      member({ isLeader: true }),
      member({ name: "B. Helper", role: "Maintenance", expertise: "6 years" })
    ]);
    expect(ready.ready).toBe(true);
    expect(ready.memberCount).toBe(2);
    expect(ready.reasons).toEqual([]);
  });

  it("flags missing leader and missing expertise", () => {
    const result = assessTeamReadiness([member({ expertise: "  " })]);
    expect(result.ready).toBe(false);
    expect(result.reasons).toContain("No designated team leader.");
    expect(result.reasons).toContain("One or more members have no recorded expertise.");
  });

  it("flags an empty team", () => {
    const result = assessTeamReadiness([]);
    expect(result.ready).toBe(false);
    expect(result.reasons).toContain("No team members assigned.");
  });
});
