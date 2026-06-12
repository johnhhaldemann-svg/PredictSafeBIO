import { describe, expect, it } from "vitest";
import {
  coursesTriggeredBy,
  DEFAULT_COMPETENCY_PASS_THRESHOLD,
  FREQUENCY_MONTHS,
  meetsCompetency,
  TRAINING_BY_ID,
  TRAINING_CATALOG,
  trainerCoversTopic,
  trainingDueStatus,
  type TrainerRecord,
  type TrainingCourse
} from "./requirements";

describe("training catalog", () => {
  it("has unique ids and at least one reason + frequency per course", () => {
    const ids = TRAINING_CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TRAINING_CATALOG.every((c) => c.reasons.length > 0 && c.frequencies.length > 0)).toBe(true);
  });

  it("pairs awareness and authorized levels for tiered courses", () => {
    expect(TRAINING_BY_ID.get("loto_awareness")?.competencyLevel).toBe("awareness");
    expect(TRAINING_BY_ID.get("loto_authorized")?.competencyLevel).toBe("authorized");
  });
});

describe("coursesTriggeredBy", () => {
  it("returns incident-triggered courses", () => {
    const ids = coursesTriggeredBy("incident").map((c) => c.id);
    expect(ids).toContain("ergonomics");
    expect(ids).toContain("pit_authorized");
    expect(ids).not.toContain("hazard_communication");
  });

  it("returns risk-triggered courses", () => {
    const ids = coursesTriggeredBy("risk").map((c) => c.id);
    expect(ids).toContain("sop_equipment_specific");
  });

  it("re-verifies authorized-level courses on return-to-work", () => {
    const courses = coursesTriggeredBy("return_to_work");
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.every((c) => c.competencyLevel === "authorized")).toBe(true);
    expect(courses.map((c) => c.id)).toContain("loto_authorized");
  });
});

describe("meetsCompetency", () => {
  it("passes at or above the threshold", () => {
    expect(meetsCompetency(DEFAULT_COMPETENCY_PASS_THRESHOLD)).toBe(true);
    expect(meetsCompetency(95)).toBe(true);
    expect(meetsCompetency(79)).toBe(false);
  });

  it("respects a custom threshold", () => {
    expect(meetsCompetency(70, 70)).toBe(true);
    expect(meetsCompetency(69, 70)).toBe(false);
  });
});

describe("trainingDueStatus", () => {
  const annual = TRAINING_BY_ID.get("hazard_communication") as TrainingCourse;

  it("reports current when within the interval", () => {
    expect(trainingDueStatus(annual, "2026-01-01", "2026-06-11")).toBe("current");
  });

  it("reports due when exactly on the renewal date", () => {
    // 2025-06-11 + 12 months = 2026-06-11 exactly
    expect(trainingDueStatus(annual, "2025-06-11", "2026-06-11")).toBe("due");
  });

  it("reports overdue when past the interval", () => {
    expect(trainingDueStatus(annual, "2025-01-01", "2026-06-11")).toBe("overdue");
  });

  it("reports never_completed when no completion date exists", () => {
    expect(trainingDueStatus(annual, null, "2026-06-11")).toBe("never_completed");
  });

  it("reports event_driven for triggered-only courses", () => {
    const hireOnly = TRAINING_BY_ID.get("ehs_orientation") as TrainingCourse;
    expect(trainingDueStatus(hireOnly, "2020-01-01", "2026-06-11")).toBe("event_driven");
  });

  it("uses the shortest interval when a course has several", () => {
    // hot_work_authorized is annual + incident_triggered → annual interval applies.
    const hotWork = TRAINING_BY_ID.get("hot_work_authorized") as TrainingCourse;
    expect(FREQUENCY_MONTHS.annual).toBe(12);
    expect(trainingDueStatus(hotWork, "2025-01-01", "2026-06-11")).toBe("overdue");
  });
});

describe("trainerCoversTopic", () => {
  const trainer: TrainerRecord = {
    type: "internal",
    name: "EHS Lead",
    topics: ["LOTO Authorized", "Machine Guarding"],
    qualificationBasis: "certification",
    evidence: "cert-123"
  };

  it("is true for a listed topic with evidence", () => {
    expect(trainerCoversTopic(trainer, "LOTO Authorized")).toBe(true);
  });

  it("is false for an unlisted topic", () => {
    expect(trainerCoversTopic(trainer, "Confined Space Entry")).toBe(false);
  });

  it("is false when no evidence is on file", () => {
    expect(trainerCoversTopic({ ...trainer, evidence: null }, "LOTO Authorized")).toBe(false);
  });
});
