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

  it("keeps missingInformation as strings even if a readiness gap object leaks into missingData", () => {
    // Regression: audit_readiness_scores.top_gaps can be { gap, severity } objects.
    // If one reaches missingData, missingInformation must still be all strings —
    // it is rendered directly as a React child and an object there crashes the page.
    const assessment = assessBioRisk({
      workflow: "Foundation readiness review",
      dataCompleteness: 0.6,
      signals: [],
      missingData: [
        "complete source data",
        { gap: "LN2 cryogenic training overdue for active lab staff", severity: "high" } as unknown as string
      ]
    });

    expect(assessment.missingInformation.every((item) => typeof item === "string")).toBe(true);
  });

  it("escalates suspected contamination to critical", () => {
    const assessment = assessBioRisk({
      siteName: "Demo Biotech Site",
      area: "QC Microbiology Lab",
      workflow: "Sterility assay review",
      batchOrLot: "LOT-0001",
      controlEffectiveness: "partial",
      contaminationSuspected: true,
      signals: [
        {
          type: "contamination_event",
          label: "Unexpected microbial growth in assay control",
          severity: "high",
          controls: ["Initial lab notification completed"],
          evidence: "Assay control showed unexpected growth; investigation not complete."
        }
      ]
    });

    expect(assessment.level).toBe("critical");
    expect(assessment.humanReviewRequired).toBe(true);
    expect(assessment.holdOrQuarantineReviewRecommended).toBe(true);
    expect(assessment.missingInformation).toEqual(
      expect.arrayContaining(["EHS assessment", "exposure and area impact assessment", "investigation status", "final disposition"])
    );
  });

  it("matches the local biotech blueprint starter contamination scenario", () => {
    const assessment = assessBioRisk({
      siteName: "Demo Biotech Site",
      area: "QC Microbiology Lab",
      workflow: "Sterility assay review",
      program: "Demo Program",
      productCandidate: "BIO-001",
      batchOrLot: "LOT-0001",
      controlEffectiveness: "partial",
      contaminationSuspected: true,
      signals: [
        {
          type: "contamination_event",
          label: "Unexpected microbial growth in assay control",
          severity: "high",
          status: "open",
          controls: ["Initial lab notification completed"],
          evidence: "Assay control showed unexpected growth; investigation not complete."
        },
        {
          type: "data_integrity",
          label: "Missing second-person review signature",
          severity: "medium",
          status: "open",
          dataIntegrityConcern: 4,
          evidence: "Review signature missing from assay worksheet."
        }
      ]
    });

    expect(assessment.level).toBe("critical");
    expect(assessment.humanReviewRequired).toBe(true);
    expect(assessment.holdOrQuarantineReviewRecommended).toBe(true);
    expect(assessment.topDrivers.map((driver) => driver.category)).toEqual(
      expect.arrayContaining(["quality", "data_integrity", "controls"])
    );
    expect(assessment.missingInformation).toEqual(
      expect.arrayContaining(["investigation status", "EHS assessment", "exposure and area impact assessment", "final disposition"])
    );
    expect(assessment.recommendedActions.map((action) => action.ownerRole)).toEqual(expect.arrayContaining(["ehs"]));
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

  it("makes serious worker-injury / environmental-release potential at least high", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      patientImpactPotential: true
    });

    expect(["high", "critical"]).toContain(assessment.level);
  });

  it("escalates data integrity concerns affecting release or submission", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      regulatoryImpactPotential: true,
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
      biosafetyImpactPotential: true
    });

    expect(assessment.level).toBe("critical");
    expect(assessment.missingInformation).toContain("chain-of-custody reconstruction");
  });

  it("escalates out-of-tolerance equipment affecting active work", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      outOfToleranceEquipment: true,
      biosafetyImpactPotential: true,
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
      signals: [{ type: "deviation", label: "Repeat inspection finding discrepancy", repeatFinding: true, severity: "medium" }]
    });

    expect(["moderate", "high"]).toContain(assessment.level);
    expect(assessment.topDrivers.some((driver) => driver.category === "pattern")).toBe(true);
  });

  it("turns map-derived source context into traceable recommendations", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      labId: "lab-1",
      siteId: "site-1",
      referenceRuleIds: ["rule-bbp-training", "rule-sop-review"],
      trainingStatus: "expired",
      documentReadiness: "gaps",
      auditReadinessStatus: "missing",
      incidentContext: {
        incidentId: "incident-1",
        status: "investigating",
        capaRequired: true,
        repeatPattern: true
      },
      sampleMaterialContext: {
        sampleId: "sample-1",
        chainOfCustodyStatus: "gap"
      },
      sourceRecords: [
        { module: "document", recordId: "doc-1", label: "BBP SOP" },
        { module: "training", recordId: "training-1", label: "BBP annual training" }
      ]
    });

    expect(assessment.sourceTrace.referenceRuleIds).toEqual(expect.arrayContaining(["rule-bbp-training", "rule-sop-review"]));
    expect(assessment.sourceTrace.sourceRecords.map((record) => record.module)).toEqual(
      expect.arrayContaining(["document", "training", "lab", "site", "incident", "sample"])
    );
    expect(assessment.topDrivers.map((driver) => driver.category)).toEqual(
      expect.arrayContaining(["training", "controls", "regulatory", "quality", "sample"])
    );
    expect(assessment.recommendedActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Review mapped document gaps",
          referenceRuleIds: expect.arrayContaining(["rule-bbp-training"]),
          sourceRecords: expect.arrayContaining([expect.objectContaining({ module: "document", recordId: "doc-1" })])
        }),
        expect.objectContaining({ title: "Review training impact" }),
        expect.objectContaining({ title: "Screen for corrective action" }),
        expect.objectContaining({ title: "Review sample/material traceability" })
      ])
    );
  });

  it("keeps scores normalized between 0 and 100", () => {
    const assessment = assessBioRisk({
      ...baseLowRiskInput,
      signals: [
        {
          type: "equipment_event",
          label: "Extreme numeric input regression",
          severity: 999,
          likelihood: 999,
          scope: 999,
          controlGap: 999,
          dataIntegrityConcern: 999
        }
      ]
    });

    expect(assessment.score).toBeGreaterThanOrEqual(0);
    expect(assessment.score).toBeLessThanOrEqual(100);
  });

  it("keeps explanations guarded", () => {
    const assessment = assessBioRisk(baseLowRiskInput);
    const generatedText = [
      assessment.explanation,
      ...assessment.recommendedActions.flatMap((action) => [action.title, action.reason])
    ].join(" ");

    expect(assessment.explanation).toContain("Based on available data");
    expect(assessment.explanation).toContain("potential");
    expect(assessment.explanation).toContain("does not replace");
    expect(generatedText).not.toMatch(/batch is released|product is safe|study is compliant|deviation is closed|CAPA is adequate|SOP is approved|change is approved|valid for submission|clinical decision is appropriate|compliance is guaranteed/i);
  });
});
