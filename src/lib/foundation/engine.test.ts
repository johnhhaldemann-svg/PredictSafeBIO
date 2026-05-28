import { describe, expect, it } from "vitest";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import {
  applyFoundationContext,
  buildEvidenceMap,
  buildFoundationAiContext,
  calculateAuditReadiness,
  detectChangeImpacts,
  evaluateApplicability,
  northStarFoundationDemo
} from "./engine";

describe("PredictSafeBIO Intelligence Foundation engine", () => {
  it("triggers chemical hygiene controls from hazardous chemical intake", () => {
    const applicability = evaluateApplicability({ hazardousChemicals: true });

    expect(applicability.requiredPrograms).toEqual(expect.arrayContaining(["Chemical Hygiene"]));
    expect(applicability.requiredDocuments).toEqual(expect.arrayContaining(["Chemical Hygiene Plan", "SDS Index", "Spill Response SOP"]));
    expect(applicability.requiredRecords).toEqual(expect.arrayContaining(["Chemical Inventory"]));
    expect(applicability.requiredTraining).toEqual(expect.arrayContaining(["Chemical Hygiene Training"]));
  });

  it("triggers biosafety and BBP controls from human samples and sharps", () => {
    const applicability = evaluateApplicability({
      biologicalMaterials: true,
      humanDerivedSamples: true,
      sharpsUsed: true,
      bsl2Work: true
    });

    expect(applicability.requiredPrograms).toEqual(expect.arrayContaining(["Biosafety", "Bloodborne Pathogens"]));
    expect(applicability.requiredDocuments).toEqual(
      expect.arrayContaining(["Biosafety Risk Assessment", "Exposure Control Plan", "Sharps Safety SOP"])
    );
    expect(applicability.requiredTraining).toEqual(expect.arrayContaining(["Biosafety Training", "BBP Training", "Sharps Safety Training"]));
  });

  it("maps BSC and autoclave controls to equipment evidence", () => {
    const applicability = evaluateApplicability({ bscUsed: true, autoclaveUsed: true });
    const evidence = buildEvidenceMap(applicability);

    expect(applicability.requiredDocuments).toEqual(expect.arrayContaining(["BSC Use SOP", "Autoclave Use SOP"]));
    expect(evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requirementName: "BSC Certification Record", sourceTable: "equipment_events" }),
        expect.objectContaining({ requirementName: "Autoclave Verification Log", sourceTable: "equipment_events" })
      ])
    );
  });

  it("creates change impact drafts for incidents, audit findings, equipment events, materials, and SOP changes", () => {
    const changes = detectChangeImpacts([
      { changeType: "incident", sourceTable: "incidents", label: "Needlestick exposure", severity: "high" },
      { changeType: "audit_finding", sourceTable: "audit_findings", label: "Repeat evidence gap" },
      { changeType: "equipment_event", sourceTable: "equipment_events", label: "Freezer excursion", severity: "high" },
      { changeType: "new_material", sourceTable: "biological_materials", label: "Human-derived samples" },
      { changeType: "sop_change", sourceTable: "document_metadata", label: "Exposure SOP update" }
    ]);

    expect(changes).toHaveLength(5);
    expect(changes.flatMap((change) => change.recommendedActions)).toEqual(
      expect.arrayContaining(["Screen for CAPA", "Confirm equipment impact", "Draft training impact"])
    );
    expect(changes.every((change) => change.humanReviewRequired)).toBe(true);
  });

  it("lowers audit readiness when evidence is missing, expired, or out of tolerance", () => {
    const applicability = evaluateApplicability({ hazardousChemicals: true, bscUsed: true, autoclaveUsed: true });
    const evidence = buildEvidenceMap(applicability, {
      "Chemical Hygiene Plan": "missing",
      "Chemical Hygiene Training": "expired",
      "BSC Certification Record": "out_of_tolerance"
    });
    const readiness = calculateAuditReadiness(evidence, [{ type: "equipment_event", label: "BSC certification overdue", severity: "high" }]);

    expect(readiness.overallScore).toBeLessThan(70);
    expect(readiness.topGaps.join(" ")).toContain("Chemical Hygiene Plan");
    expect(readiness.equipmentScore).toBeLessThan(50);
  });

  it("feeds source-backed foundation context into the deterministic AI Engine", () => {
    const applicability = evaluateApplicability({ humanDerivedSamples: true, sharpsUsed: true, bscUsed: true });
    const evidence = buildEvidenceMap(applicability);
    const changes = detectChangeImpacts([{ changeType: "incident", sourceTable: "incidents", label: "Needlestick exposure", severity: "high" }]);
    const readiness = calculateAuditReadiness(evidence, [{ type: "biosafety_event", label: "Needlestick exposure", severity: "high" }]);
    const context = buildFoundationAiContext(applicability, evidence, changes, readiness);
    const input = applyFoundationContext(
      {
        siteName: "NorthStar BioLabs",
        area: "BSL-2 Cell Culture Lab",
        workflow: "Human-derived sample processing",
        controlEffectiveness: "partial"
      },
      context
    );
    const assessment = assessBioRisk(input);

    expect(assessment.sourceTrace.sourceRecords.map((record) => record.module)).toContain("applicability_rule");
    expect(assessment.sourceTrace.referenceRuleIds).toEqual(expect.arrayContaining(context.referenceRuleIds));
    expect(assessment.recommendedActions).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Review Intelligence Foundation evidence gaps" })]));
    expect(assessment.humanReviewRequired).toBe(true);
  });

  it("keeps the NorthStar demo draft-only and guarded", () => {
    const demo = northStarFoundationDemo();
    const assessment = assessBioRisk(demo.aiInput);
    const generatedText = [
      assessment.explanation,
      ...assessment.recommendedActions.flatMap((action) => [action.title, action.reason])
    ].join(" ");

    expect(demo.readiness.overallScore).toBeLessThan(70);
    expect(assessment.level).toMatch(/high|critical/);
    expect(assessment.humanReviewRequired).toBe(true);
    expect(generatedText).not.toMatch(/certified|approved|validated|CAPA is closed|compliance is guaranteed/i);
  });
});
