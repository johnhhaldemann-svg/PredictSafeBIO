import { describe, expect, it } from "vitest";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import { bioRiskFamilies } from "@/lib/bio-ai/risk-families";
import type { BioAiInput } from "@/lib/bio-ai/types";
import { canonicalBioTypeFoundations } from "@/lib/foundation/biotypes";
import { DEFAULT_VERTICAL, resolvePack, VERTICAL_PACKS } from "@/lib/foundation/vertical-registry";

// A representative biotech assessment input used as the regression fixture.
// vertical is intentionally omitted so it exercises the legacy default path.
const bioInput: BioAiInput = {
  siteName: "Pilot site",
  area: "BSL-2 lab suite",
  workflow: "Biosafety containment review",
  controlEffectiveness: "partial",
  documentReadiness: "gaps",
  trainingStatus: "expired",
  auditReadinessStatus: "gaps",
  biosafetyImpactPotential: true,
  signals: [
    { type: "biosafety_event", label: "Aerosol exposure near BSC", severity: "high", evidence: "aerosol containment concern" },
    { type: "equipment_event", label: "Incubator out of tolerance", severity: "moderate" }
  ]
};

describe("Vertical registry (Phase 1 abstraction)", () => {
  it("defaults to biotech_pharma", () => {
    expect(DEFAULT_VERTICAL).toBe("biotech_pharma");
  });

  it("wraps the existing bio content verbatim (same references)", () => {
    const pack = resolvePack("biotech_pharma");
    expect(pack.riskFamilies).toBe(bioRiskFamilies);
    expect(pack.industryProfiles).toBe(canonicalBioTypeFoundations);
  });

  it("falls back to the default vertical for null / undefined / unknown keys", () => {
    expect(resolvePack(undefined)).toBe(VERTICAL_PACKS.biotech_pharma);
    expect(resolvePack(null)).toBe(VERTICAL_PACKS.biotech_pharma);
    // @ts-expect-error — exercising an out-of-union value at runtime
    expect(resolvePack("does_not_exist")).toBe(VERTICAL_PACKS.biotech_pharma);
  });

  it("is transparent: omitting vertical equals explicit biotech_pharma", () => {
    const withoutVertical = assessBioRisk(bioInput);
    const withBioVertical = assessBioRisk({ ...bioInput, vertical: "biotech_pharma" });
    expect(withBioVertical).toEqual(withoutVertical);
  });

  it("isolates packs: manufacturing families never match a bio assessment", () => {
    const bioFamilyIds = new Set(resolvePack("biotech_pharma").riskFamilies.map((family) => family.id));
    const mfgFamilyIds = resolvePack("general_manufacturing").riskFamilies.map((family) => family.id);
    for (const id of mfgFamilyIds) {
      expect(bioFamilyIds.has(id)).toBe(false);
    }
  });

  it("manufacturing pack covers the core OSHA 1910 hazard families", () => {
    const ids = resolvePack("general_manufacturing").riskFamilies.map((family) => family.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "machine_safety_energy_control",
        "powered_industrial_trucks_material_handling",
        "falls_walking_working_surfaces",
        "hazard_communication_chemical_exposure",
        "ppe_and_respiratory_protection",
        "ergonomics_manual_handling",
        "confined_space_hot_work_permits"
      ])
    );
  });

  it("routes a manufacturing assessment to a manufacturing family, not a bio one", () => {
    const assessment = assessBioRisk({
      vertical: "general_manufacturing",
      siteName: "Line 3",
      area: "Assembly cell",
      workflow: "Unguarded press lockout review",
      controlEffectiveness: "missing",
      signals: [{ type: "machine_guarding_event", label: "Unguarded nip point on press", severity: "high" }]
    });
    const drivers = assessment.topDrivers.map((d) => d.label);
    expect(drivers).toContain("Machine safeguarding and energy control");
    expect(drivers).not.toContain("Biosafety and containment");
  });

  it("locks biotech engine output against drift (regression gate for existing orgs)", () => {
    // If the abstraction ever changes bio behavior, this snapshot breaks.
    expect(assessBioRisk(bioInput)).toMatchSnapshot();
  });
});
