import { describe, expect, it } from "vitest";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import { applyBioTypeContext, buildBioTypeAiContext, canonicalBioTypeFoundations } from "./biotypes";

describe("BioType Foundation Packages", () => {
  it("defines the 9 canonical BioType branches from the reformat packet", () => {
    expect(canonicalBioTypeFoundations.map((foundation) => foundation.name)).toEqual([
      "R&D Biotech",
      "Diagnostics / Clinical Lab Support",
      "Cell & Gene Therapy",
      "Biologics / Pharma Manufacturing Support",
      "Medical Device / Diagnostics Manufacturing",
      "Cleanroom / Controlled Environment",
      "CRO / Lab Services",
      "Academic / University Research",
      "Lab Construction / Commissioning"
    ]);
  });

  it("maps each BioType to programs, documents, records, training, and risk drivers", () => {
    for (const foundation of canonicalBioTypeFoundations) {
      expect(foundation.programs.length).toBeGreaterThan(0);
      expect(foundation.documents.length).toBeGreaterThan(0);
      expect(foundation.records.length).toBeGreaterThan(0);
      expect(foundation.training.length).toBeGreaterThan(0);
      expect(foundation.riskDrivers.length).toBeGreaterThan(0);
    }
  });

  it("merges primary and secondary BioTypes without duplicates", () => {
    const context = buildBioTypeAiContext("rd_biotech", ["diagnostics_clinical_lab", "rd_biotech", "academic_university_research"]);

    expect(context.primaryBioType).toBe("rd_biotech");
    expect(context.secondaryBioTypes).toEqual(["diagnostics_clinical_lab", "academic_university_research"]);
    expect(context.biotypePrograms).toEqual(expect.arrayContaining(["Biosafety", "Sample Management", "Document Control"]));
    expect(new Set(context.biotypePrograms).size).toBe(context.biotypePrograms.length);
    expect(context.biotypeSourceRecords.map((record) => record.module)).toEqual(expect.arrayContaining(["biotype_foundation"]));
  });

  it("feeds BioType source traceability and guardrails into deterministic AI output", () => {
    const context = buildBioTypeAiContext("cell_gene_therapy", ["cleanroom_controlled_environment"]);
    const input = applyBioTypeContext(
      {
        siteName: "Pilot site",
        area: "Cleanroom suite",
        workflow: "Aseptic chain-of-identity review",
        controlEffectiveness: "partial",
        documentReadiness: "gaps",
        trainingStatus: "expired",
        auditReadinessStatus: "gaps",
        signals: [{ type: "change_control", label: "Aseptic process update", severity: "medium" }]
      },
      context
    );
    const assessment = assessBioRisk(input);

    expect(assessment.sourceTrace.sourceRecords).toEqual(
      expect.arrayContaining([expect.objectContaining({ module: "biotype_foundation", recordId: "cell_gene_therapy" })])
    );
    expect(assessment.topDrivers.map((driver) => driver.label)).toEqual(
      expect.arrayContaining(["BioType Foundation selection", "Multi-BioType overlap", "BioType risk drivers"])
    );
    expect(assessment.recommendedActions).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Review BioType Foundation requirements" })]));
    expect(assessment.explanation).toContain(draftAiRecommendationGuardrail);
    expect(assessment.doNotClaim).toContain(draftAiRecommendationGuardrail);
  });
});
