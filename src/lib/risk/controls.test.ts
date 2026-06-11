import { describe, expect, it } from "vitest";
import {
  HIERARCHY_OF_CONTROLS,
  hierarchyForControlType,
  hierarchyRank,
  nextReassessmentDate,
  reassessmentCadenceDays,
  strongestControl,
  suggestControlEffectiveness
} from "./controls";

describe("hierarchy of controls", () => {
  it("ranks elimination strongest and PPE weakest", () => {
    expect(HIERARCHY_OF_CONTROLS.map((h) => h.level)).toEqual([
      "elimination",
      "substitution",
      "engineering",
      "administrative",
      "ppe"
    ]);
    expect(hierarchyRank("elimination")).toBeLessThan(hierarchyRank("ppe"));
  });

  it("strongestControl returns the lowest-rank level present", () => {
    expect(strongestControl(["ppe", "engineering", "administrative"])).toBe("engineering");
    expect(strongestControl([])).toBeNull();
  });

  it("maps register control types onto hierarchy levels", () => {
    expect(hierarchyForControlType("engineering")).toBe("engineering");
    expect(hierarchyForControlType("ppe")).toBe("ppe");
    expect(hierarchyForControlType("training")).toBe("administrative");
    expect(hierarchyForControlType("permit")).toBe("administrative");
  });
});

describe("suggestControlEffectiveness", () => {
  it("suggests strongest tier for redundant engineering controls", () => {
    expect(suggestControlEffectiveness(["engineering", "elimination"])).toBe("engineering_plus_backups");
    expect(suggestControlEffectiveness(["engineering", "administrative", "ppe"])).toBe("engineering_plus_backups");
  });

  it("suggests engineering+admin for a single engineering control", () => {
    expect(suggestControlEffectiveness(["engineering"])).toBe("engineering_plus_admin");
  });

  it("suggests admin-only and none appropriately", () => {
    expect(suggestControlEffectiveness(["administrative"])).toBe("admin_only");
    expect(suggestControlEffectiveness(["ppe"])).toBe("none");
    expect(suggestControlEffectiveness([])).toBe("none");
  });
});

describe("reassessment cadence", () => {
  it("reassesses higher risk sooner", () => {
    expect(reassessmentCadenceDays("extreme")).toBe(30);
    expect(reassessmentCadenceDays("high")).toBe(90);
    expect(reassessmentCadenceDays("medium")).toBe(180);
    expect(reassessmentCadenceDays("low")).toBe(365);
  });

  it("computes the next reassessment date from a reference date", () => {
    expect(nextReassessmentDate("extreme", "2026-06-11")).toBe("2026-07-11");
    expect(nextReassessmentDate("low", "2026-01-01")).toBe("2027-01-01");
  });
});
