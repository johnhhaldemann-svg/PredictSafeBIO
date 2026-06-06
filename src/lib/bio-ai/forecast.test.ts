import { describe, expect, it } from "vitest";
import {
  computeForecast,
  computeTrend,
  signalContribution,
  type ForecastSignal,
} from "./forecast";

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

describe("signalContribution", () => {
  it("weights failure cells above precursors", () => {
    const failure: ForecastSignal = { cellType: "failure_cell", severity: "high" };
    const precursor: ForecastSignal = { cellType: "precursor_cell", severity: "high" };
    expect(signalContribution(failure)).toBeGreaterThan(signalContribution(precursor));
  });

  it("adds bumps for early warning and overdue verification", () => {
    const base: ForecastSignal = { cellType: "precursor_cell", severity: "medium" };
    const bumped: ForecastSignal = { ...base, earlyWarning: true, overdueVerification: true };
    expect(signalContribution(bumped)).toBe(signalContribution(base) + 5);
  });
});

describe("computeForecast", () => {
  it("returns zero pressure and low confidence with no signals", () => {
    const f = computeForecast([]);
    expect(f.predictedPressure).toBe(0);
    expect(f.band).toBe("low");
    expect(f.confidence).toBe("low");
    expect(f.calibrated).toBe(false);
  });

  it("ignores improvement cells in pressure", () => {
    const f = computeForecast([
      { cellType: "improvement_cell", severity: "critical" },
      { cellType: "improvement_cell", severity: "high" },
    ]);
    expect(f.predictedPressure).toBe(0);
  });

  it("raises pressure as critical leading indicators accumulate", () => {
    const signals: ForecastSignal[] = Array.from({ length: 6 }, (_, i) => ({
      label: `Hazard ${i}`,
      cellType: "failure_cell",
      severity: "critical",
      leadingIndicator: true,
      earlyWarning: true,
    }));
    const f = computeForecast(signals);
    expect(f.predictedPressure).toBeGreaterThan(75);
    expect(f.band).toBe("critical");
    expect(f.horizonDays).toBe(3);
    expect(f.earlyWarningCount).toBe(6);
    expect(f.topDrivers.length).toBe(5);
  });

  it("never claims high confidence while uncalibrated", () => {
    const many: ForecastSignal[] = Array.from({ length: 20 }, () => ({
      cellType: "precursor_cell",
      severity: "high",
    }));
    expect(computeForecast(many, { calibrated: false }).confidence).toBe("moderate");
    expect(computeForecast(many, { calibrated: true }).confidence).toBe("high");
  });
});

describe("computeTrend", () => {
  it("is not_enough_data without a populated prior window", () => {
    const signals: ForecastSignal[] = [
      { cellType: "precursor_cell", severity: "high", scoredAt: iso(1) },
    ];
    expect(computeTrend(signals)).toBe("not_enough_data");
  });

  it("detects a rising trend when recent activity outweighs prior", () => {
    const signals: ForecastSignal[] = [
      { cellType: "failure_cell", severity: "critical", scoredAt: iso(1) },
      { cellType: "failure_cell", severity: "critical", scoredAt: iso(2) },
      { cellType: "failure_cell", severity: "critical", scoredAt: iso(3) },
      { cellType: "precursor_cell", severity: "low", scoredAt: iso(20) },
      { cellType: "precursor_cell", severity: "low", scoredAt: iso(22) },
    ];
    expect(computeTrend(signals)).toBe("rising");
  });
});
