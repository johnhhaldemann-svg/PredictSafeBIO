import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const assessmentsPage = readFileSync(join(process.cwd(), "src/app/assessments/page.tsx"), "utf8");
const operationsPage = readFileSync(join(process.cwd(), "src/app/operations/page.tsx"), "utf8");
const trainingPage = readFileSync(join(process.cwd(), "src/app/training-matrix/page.tsx"), "utf8");

describe("assessments, operations, and training form customer copy", () => {
  it("assessments risk level dropdown uses capitalized labels", () => {
    expect(assessmentsPage).toContain(">Critical<");
    expect(assessmentsPage).toContain(">High<");
    expect(assessmentsPage).toContain(">Moderate<");
    expect(assessmentsPage).toContain(">Low<");
    // No lowercase-only option labels
    expect(assessmentsPage).not.toContain(">critical<");
    expect(assessmentsPage).not.toContain(">high<");
    expect(assessmentsPage).not.toContain(">moderate<");
    expect(assessmentsPage).not.toContain(">low<");
  });

  it("assessments reviewer state dropdown uses plain language", () => {
    expect(assessmentsPage).toContain("Has been reviewed");
    expect(assessmentsPage).toContain("Not yet reviewed");
    expect(assessmentsPage).not.toContain("Reviewed timestamp present");
    expect(assessmentsPage).not.toContain("No reviewed timestamp");
  });

  it("operations form uses placeholder hints instead of hardcoded demo defaults", () => {
    // No hardcoded demo site/lab names as defaultValues
    expect(operationsPage).not.toContain('defaultValue="PredictSafeBIO Pilot Site"');
    expect(operationsPage).not.toContain('defaultValue="QC Microbiology Lab"');
    expect(operationsPage).not.toContain('defaultValue="Biosafety readiness review"');
    expect(operationsPage).not.toContain('defaultValue="BSC-001"');
    expect(operationsPage).not.toContain('defaultValue="SAMPLE-001"');
    // Placeholders present instead
    expect(operationsPage).toContain('placeholder="e.g. Main Campus Lab"');
    expect(operationsPage).toContain('placeholder="e.g. BSC-001"');
    expect(operationsPage).toContain('placeholder="e.g. SAMPLE-001"');
  });

  it("training matrix form uses human-readable role label and placeholder", () => {
    expect(trainingPage).toContain("Assigned role");
    expect(trainingPage).toContain('placeholder="e.g. Biosafety Officer"');
    // No snake_case placeholder or internal label
    expect(trainingPage).not.toContain('placeholder="biosafety_officer"');
    expect(trainingPage).not.toContain("Role / owner key");
  });
});
