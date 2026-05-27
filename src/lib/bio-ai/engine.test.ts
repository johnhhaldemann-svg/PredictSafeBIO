import { describe, expect, it } from "vitest";
import { assessBioRisk } from "./engine";
import type { BioAiInput } from "./types";

const baseLowRiskInput: BioAiInput = {
  siteName: "Demo Biotech Site",
  area: "QC Microbiology Lab",
  workflow: "Routine buffer preparation",
  controlEffectiveness: "effective",
  dataCompleteness: 0.95,
  signals: [
    {
      type: "sop_gap",
      label: "Routine SOP review reminder",
      severity: "low",
      likelihood: "low",
      controls: ["Current SOP checked", "Training verification complete"]
    },
    {
      type: "training_gap",
      label: "Training current",
      severity: "low",
      controls: ["Training verification complete"]
    }
  ]
};

describe("biotech deterministic AI Engine", () => {
  it("keeps complete low-risk scenarios low", () => {
    const assessment = assessBioRisk(baseLowRiskInput);

    expect(assessment.level).toBe("low");
    expect(assessment.score).toBeLessThanOrEqual(40);
    expect(assessment.confidence).toBe("high");
  });

  it("lowers confidence when data is missing", () => {
    const assessment = assessBioRisk({
      workflow: "Unknown assay review",
      dataCompleteness: 0.35,
      signals: []
    });

    expect(assessment.confidence).toBe("low");
    expect(assessment.missingInformation).toContain("site or facility");
    expect(assessment.missingInformation).toContain("risk signals or evidence");
  });

  it("escalates suspected contamination to critical", () => {
    const assessment = assessBioRisk({
      siteName: "Demo Biotech Site",
      area: "QC Microbiology Lab",
      workflow: "Sterility assay review",
      batchOrLot: "LOT-0001",
      controlEffectiveness: "partial",
      contaminationSuspected: true,
      productQualityImpactPotential: true,
      gxpImpact: true,
      signals: [
        {
          type: "contamination_event",
          label: "Unexpected microbial growth in assay control",
          severity: "high",
          productQualityImpactPotential: true,
          gxpImpact: true,
          controls: ["Initial lab notification completed"],
          evidence: "Assay control showed unexpected growth; investigation not complete."
        }
      ]
    });

    expect(assessment.level).toBe("critical");
    expect(assessment.humanReviewRequired).toBe(true);
    expect(assessment.holdOrQuarantineReviewRecommended).toBe(true);
    expect(assessment.missingInformation).toEqual(
      expect.arrayContaining(["QA assessment", "batch/sample impact assessment", "investigation status", "final disposition"])
    );
  });

  it("escalates biosafety events to high or critical", () => {
    const assessment = assessBioRisk({
      siteName: "Site",
      area: "BSL-2 lab",
      workflow: "Aerosol-generating procedure",
      controlEffectiveness: "partial",
      biosafetyImpactPotential: true,
      signals: [
        {
          type: "biosafety_event",
          label: "Potential aerosol event",
          severity: "medium",
          evidence: "Aerosol event with possible containment breach."
        }
      ]
    });

    expect(["high", "critical"]).toContain(assessment.level);
    expect(assessment.escalationRequired).toBe(true);
  });

  it("makes patient-impacting quality issues at least high", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      patientImpactPotential: true,
      productQualityImpactPotential: true
    });

    expect(["high", "critical"]).toContain(assessment.level);
  });

  it("escalates data integrity concerns affecting release or submission", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      regulatoryImpactPotential: true,
      productQualityImpactPotential: true,
      signals: [
        {
          type: "data_integrity",
          label: "Missing second-person review signature",
          severity: "medium",
          dataIntegrityConcern: 4
        }
      ]
    });

    expect(assessment.level).toBe("critical");
  });

  it("escalates sample chain-of-custody gaps", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      sampleId: "S-001",
      chainOfCustodyGap: true,
      gxpImpact: true
    });

    expect(assessment.level).toBe("critical");
    expect(assessment.missingInformation).toContain("chain-of-custody reconstruction");
  });

  it("escalates out-of-tolerance equipment affecting active work", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      outOfToleranceEquipment: true,
      gxpImpact: true,
      equipment: ["Incubator INC-04"]
    });

    expect(assessment.level).toBe("critical");
    expect(assessment.criticalControlGaps.join(" ")).toContain("Equipment");
  });

  it("escalates unapproved validated-process changes", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      unapprovedChange: true,
      signals: [{ type: "change_control", label: "Unapproved method parameter change", severity: "medium" }]
    });

    expect(["high", "critical"]).toContain(assessment.level);
  });

  it("raises risk one band for expired critical training", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      missingRequiredTraining: true
    });

    expect(assessment.level).toBe("moderate");
  });

  it("raises likelihood for repeat deviation patterns", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      signals: [{ type: "deviation", label: "Repeat batch record discrepancy", repeatFinding: true, severity: "medium" }]
    });

    expect(["moderate", "high"]).toContain(assessment.level);
    expect(assessment.topDrivers.some((driver) => driver.category === "pattern")).toBe(true);
  });

  it("keeps explanations guarded", () => {
    const assessment = assessBioRisk(baseLowRiskInput);

    expect(assessment.explanation).toContain("Based on available data");
    expect(assessment.explanation).toContain("potential");
    expect(assessment.explanation).toContain("does not replace");
    expect(assessment.explanation).not.toMatch(/released|compliant|safe to use|approved/i);
  });
});
