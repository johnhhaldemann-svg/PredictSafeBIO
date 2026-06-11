import { describe, expect, it } from "vitest";
import {
  classifySif,
  classifySifFromText,
  detectEnergySources,
  ENERGY_SOURCE_LABELS
} from "./sif";

describe("detectEnergySources", () => {
  it("detects gravity and motion energy from a description", () => {
    expect(detectEnergySources("Working at height on a ladder near a forklift aisle")).toEqual(
      expect.arrayContaining(["gravity", "motion"])
    );
  });

  it("detects biological and temperature energy", () => {
    const sources = detectEnergySources("Autoclave handling of infectious sharps");
    expect(sources).toContain("temperature");
    expect(sources).toContain("biological");
  });

  it("returns nothing for a low-energy task", () => {
    expect(detectEnergySources("Reviewing a spreadsheet at a desk")).toEqual([]);
  });

  it("has a label for every energy source", () => {
    for (const source of detectEnergySources("electrical pressure chemical radiation explosion")) {
      expect(ENERGY_SOURCE_LABELS[source]).toBeTruthy();
    }
  });
});

describe("classifySif", () => {
  it("flags SIF potential when high energy has no direct control", () => {
    const result = classifySif({ energySources: ["electrical"], directControlInPlace: false });
    expect(result.sifPotential).toBe(true);
    expect(result.isPrecursor).toBe(true);
    expect(result.isActualSif).toBe(false);
  });

  it("does not flag SIF potential when a direct control is in place", () => {
    const result = classifySif({ energySources: ["electrical"], directControlInPlace: true });
    expect(result.sifPotential).toBe(false);
    expect(result.isPrecursor).toBe(false);
    expect(result.rationale).toContain("mitigated");
  });

  it("classifies an actual SIF when high energy causes serious harm", () => {
    const result = classifySif({ energySources: ["gravity"], directControlInPlace: false, actualOutcome: "fatality" });
    expect(result.isActualSif).toBe(true);
    expect(result.isPrecursor).toBe(false);
  });

  it("treats a high-energy near miss as a precursor, not an actual SIF", () => {
    const result = classifySif({ energySources: ["motion"], directControlInPlace: false, actualOutcome: "near_miss" });
    expect(result.isPrecursor).toBe(true);
    expect(result.isActualSif).toBe(false);
  });

  it("does not flag SIF for a low-energy hazard regardless of control", () => {
    const result = classifySif({ energySources: [], directControlInPlace: false, actualOutcome: "first_aid" });
    expect(result.sifPotential).toBe(false);
    expect(result.isPrecursor).toBe(false);
    expect(result.isActualSif).toBe(false);
    expect(result.rationale).toContain("No high-energy source");
  });
});

describe("classifySifFromText", () => {
  it("flags an uncontrolled fall-from-height as a SIF precursor", () => {
    const result = classifySifFromText("Employee on elevated mezzanine with no guardrail", false);
    expect(result.energySources).toContain("gravity");
    expect(result.isPrecursor).toBe(true);
  });
});
