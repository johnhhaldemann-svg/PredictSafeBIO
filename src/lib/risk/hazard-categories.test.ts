import { describe, expect, it } from "vitest";
import {
  buildEmptyRegister,
  categoriesNeedingControlPlan,
  HAZARD_CATEGORIES,
  IMPACT_CRITERIA,
  scoreRegister,
  unknownProgramLinks
} from "./hazard-categories";

describe("hazard category library", () => {
  it("defines the full canonical category set with unique ids", () => {
    expect(HAZARD_CATEGORIES.length).toBe(22);
    const ids = HAZARD_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(HAZARD_CATEGORIES.every((c) => c.label && c.standardReference)).toBe(true);
  });

  it("defines the ten impact criteria", () => {
    expect(IMPACT_CRITERIA.length).toBe(10);
    expect(IMPACT_CRITERIA.map((c) => c.id)).toContain("health_safety");
  });

  it("only links to real program ids", () => {
    expect(unknownProgramLinks()).toEqual([]);
  });
});

describe("buildEmptyRegister", () => {
  it("scaffolds every category as unknown/unscored", () => {
    const register = buildEmptyRegister();
    expect(register.length).toBe(HAZARD_CATEGORIES.length);
    expect(register.every((e) => e.applicability === "unknown" && e.assessment === null)).toBe(true);
  });
});

describe("scoreRegister", () => {
  it("scores supplied applicable categories and leaves others unscored", () => {
    const register = scoreRegister([
      {
        categoryId: "fall_prevention_protection",
        applicability: "applicable",
        impacts: [{ criterion: "Health and Safety", severity: 5, likelihood: 3 }],
        controlTier: "admin_only"
      }
    ]);
    const fall = register.find((e) => e.category.id === "fall_prevention_protection")!;
    expect(fall.assessment).not.toBeNull();
    expect(fall.assessment!.inherentScore).toBe(15);
    expect(fall.assessment!.inherentBand).toBe("high");
    expect(fall.assessment!.residualScore).toBeCloseTo(11.25);

    const other = register.find((e) => e.category.id === "office_safety")!;
    expect(other.assessment).toBeNull();
  });

  it("does not score categories marked not applicable", () => {
    const register = scoreRegister([
      {
        categoryId: "laboratory_hazards",
        applicability: "not_applicable",
        impacts: [{ criterion: "Health and Safety", severity: 5, likelihood: 5 }]
      }
    ]);
    const lab = register.find((e) => e.category.id === "laboratory_hazards")!;
    expect(lab.applicability).toBe("not_applicable");
    expect(lab.assessment).toBeNull();
  });
});

describe("categoriesNeedingControlPlan", () => {
  it("returns plan-required categories sorted by residual score", () => {
    const register = scoreRegister([
      { categoryId: "laboratory_hazards", applicability: "applicable", impacts: [{ criterion: "Health and Safety", severity: 5, likelihood: 5 }], controlTier: "admin_only" },
      { categoryId: "office_safety", applicability: "applicable", impacts: [{ criterion: "Health and Safety", severity: 1, likelihood: 1 }], controlTier: "none" },
      { categoryId: "exposure_ergonomic_stressors", applicability: "applicable", impacts: [], controlTier: "none" }
    ]);
    const needing = categoriesNeedingControlPlan(register);
    expect(needing[0].category.id).toBe("laboratory_hazards");
    expect(needing.every((e) => e.assessment?.riskControlPlanRequired)).toBe(true);
    expect(needing.find((e) => e.category.id === "office_safety")).toBeUndefined();
  });
});
