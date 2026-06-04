import { describe, expect, it } from "vitest";
import {
  aiWorkflowSteps,
  coreComplianceComponents,
  demoIntelligenceFoundationSummary,
  humanValidationWorkflowSteps,
  isFoundationGapStatus,
  programMethodRequired
} from "./summary";

describe("foundation summary helpers", () => {
  it("keeps static workflow and component summaries available outside Supabase data access", () => {
    expect(coreComplianceComponents.map((component) => component.name)).toContain("BioType Branching Engine");
    expect(aiWorkflowSteps).toContain("BioRisk scoring");
    expect(humanValidationWorkflowSteps).toContain("Approve/reject/request changes");
  });

  it("builds the deterministic demo Intelligence Foundation summary", () => {
    const summary = demoIntelligenceFoundationSummary();

    expect(summary.companyName).toBe("NorthStar BioLabs");
    expect(summary.biotypeSelection?.primaryBioType).toBe("rd_biotech");
    expect(summary.guardrailText.toLowerCase()).toContain("draft");
    expect(summary.latestAssessmentInput.workflow).toBeTruthy();
  });

  it("normalizes gap statuses and program-method applicability", () => {
    expect(isFoundationGapStatus("missing")).toBe(true);
    expect(isFoundationGapStatus("current")).toBe(false);
    expect(programMethodRequired("Training Program", "Training Gap")).toBe(true);
    expect(programMethodRequired("Document Control", "Incident Screening")).toBe(false);
    expect(programMethodRequired("Any Program", "AI Guardrail")).toBe(true);
  });
});
