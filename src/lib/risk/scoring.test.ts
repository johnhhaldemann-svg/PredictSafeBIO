import { describe, expect, it } from "vitest";
import {
  assessRisk,
  BAND_MATRIX,
  bandFor,
  bandFromScore,
  bandToLevel,
  controlFactor,
  LIKELIHOOD_SCALE,
  rawScore,
  residualScore,
  riskControlPlanRequired,
  SEVERITY_SCALE,
  type RiskScaleValue
} from "./scoring";

const SCALE: RiskScaleValue[] = [1, 2, 3, 4, 5];

describe("scales", () => {
  it("define all five severity and likelihood levels", () => {
    expect(SEVERITY_SCALE.map((s) => s.value)).toEqual([1, 2, 3, 4, 5]);
    expect(LIKELIHOOD_SCALE.map((s) => s.value)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("bandFromScore / bandFor", () => {
  it("reproduces the reference 5×5 matrix exactly for every cell", () => {
    for (const severity of SCALE) {
      for (const likelihood of SCALE) {
        expect(bandFor(severity, likelihood)).toBe(BAND_MATRIX[severity][likelihood]);
      }
    }
  });

  it("bands by the documented thresholds", () => {
    expect(bandFromScore(4)).toBe("low");
    expect(bandFromScore(5)).toBe("medium");
    expect(bandFromScore(10)).toBe("medium");
    expect(bandFromScore(11)).toBe("high");
    expect(bandFromScore(16)).toBe("high");
    expect(bandFromScore(17)).toBe("extreme");
    expect(bandFromScore(25)).toBe("extreme");
  });

  it("handles fractional residual scores", () => {
    expect(bandFromScore(3)).toBe("low");
    expect(bandFromScore(7.5)).toBe("medium");
  });
});

describe("bandToLevel", () => {
  it("maps extreme to critical and passes the rest through", () => {
    expect(bandToLevel("low")).toBe("low");
    expect(bandToLevel("medium")).toBe("medium");
    expect(bandToLevel("high")).toBe("high");
    expect(bandToLevel("extreme")).toBe("critical");
  });
});

describe("rawScore", () => {
  it("multiplies severity by likelihood", () => {
    expect(rawScore(5, 5)).toBe(25);
    expect(rawScore(3, 4)).toBe(12);
  });
});

describe("control effectiveness", () => {
  it("uses the documented multipliers", () => {
    expect(controlFactor("engineering_plus_backups")).toBe(0.25);
    expect(controlFactor("engineering_plus_admin")).toBe(0.5);
    expect(controlFactor("admin_only")).toBe(0.75);
    expect(controlFactor("none")).toBe(1);
  });

  it("reduces the residual score by the multiplier", () => {
    expect(residualScore(16, "engineering_plus_backups")).toBe(4);
    expect(residualScore(16, "engineering_plus_admin")).toBe(8);
  });
});

describe("riskControlPlanRequired", () => {
  it("is required at Medium and above, not at Low", () => {
    expect(riskControlPlanRequired("low")).toBe(false);
    expect(riskControlPlanRequired("medium")).toBe(true);
    expect(riskControlPlanRequired("high")).toBe(true);
    expect(riskControlPlanRequired("extreme")).toBe(true);
  });
});

describe("assessRisk", () => {
  it("takes the highest impact as the inherent risk and names the driver", () => {
    const result = assessRisk(
      [
        { criterion: "Health and Safety", severity: 4, likelihood: 3 },
        { criterion: "Environment", severity: 2, likelihood: 2 }
      ],
      "none"
    );
    expect(result.inherentScore).toBe(12);
    expect(result.inherentBand).toBe("high");
    expect(result.inherentLevel).toBe("high");
    expect(result.drivingCriterion).toBe("Health and Safety");
  });

  it("derives residual risk and control-plan requirement from controls", () => {
    const result = assessRisk(
      [{ criterion: "Health and Safety", severity: 4, likelihood: 4 }],
      "engineering_plus_backups"
    );
    expect(result.inherentScore).toBe(16);
    expect(result.inherentBand).toBe("high");
    expect(result.residualScore).toBe(4);
    expect(result.residualBand).toBe("low");
    expect(result.residualLevel).toBe("low");
    expect(result.riskControlPlanRequired).toBe(false);
  });

  it("keeps a control plan when strong controls still leave medium residual risk", () => {
    const result = assessRisk(
      [{ criterion: "Process Safety", severity: 5, likelihood: 5 }],
      "engineering_plus_admin"
    );
    expect(result.inherentBand).toBe("extreme");
    expect(result.residualScore).toBe(12.5);
    expect(result.residualBand).toBe("high");
    expect(result.riskControlPlanRequired).toBe(true);
  });

  it("returns a zeroed low result for no impacts", () => {
    const result = assessRisk([], "none");
    expect(result.inherentScore).toBe(0);
    expect(result.inherentBand).toBe("low");
    expect(result.drivingCriterion).toBeNull();
    expect(result.riskControlPlanRequired).toBe(false);
  });
});
