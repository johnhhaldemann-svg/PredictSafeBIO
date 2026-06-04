import { describe, expect, it } from "vitest";
import { formatDocumentStatus, formatDocumentType, formatOwnerRole } from "./display-labels";

describe("display-labels", () => {
  it("formatDocumentType converts known values to human-readable labels", () => {
    expect(formatDocumentType("sop")).toBe("SOP");
    expect(formatDocumentType("batch_record")).toBe("Batch Record");
    expect(formatDocumentType("protocol")).toBe("Protocol");
    expect(formatDocumentType("validation")).toBe("Validation");
    expect(formatDocumentType("other")).toBe("Other");
  });

  it("formatDocumentType falls back to replacing underscores for unknown values", () => {
    expect(formatDocumentType("custom_type")).toBe("custom type");
  });

  it("formatDocumentStatus converts known values to human-readable labels", () => {
    expect(formatDocumentStatus("in_review")).toBe("In Review");
    expect(formatDocumentStatus("approved")).toBe("Approved");
    expect(formatDocumentStatus("draft")).toBe("Draft");
    expect(formatDocumentStatus("obsolete")).toBe("Obsolete");
    expect(formatDocumentStatus("unknown")).toBe("Unknown");
  });

  it("formatOwnerRole converts known values to human-readable labels", () => {
    expect(formatOwnerRole("quality_unit")).toBe("Quality Unit");
    expect(formatOwnerRole("biosafety_officer")).toBe("Biosafety Officer");
    expect(formatOwnerRole("responsible_scientist")).toBe("Responsible Scientist");
    expect(formatOwnerRole("qa")).toBe("QA");
    expect(formatOwnerRole("validation_lead")).toBe("Validation Lead");
    expect(formatOwnerRole("ehs")).toBe("EHS");
  });

  it("display helpers are used in key rendering pages", () => {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const documentsPage = readFileSync(join(process.cwd(), "src/app/documents/page.tsx"), "utf8");
    const versionControl = readFileSync(join(process.cwd(), "src/app/documents/version-control/page.tsx"), "utf8");
    const capaPage = readFileSync(join(process.cwd(), "src/app/operations/capa/page.tsx"), "utf8");
    const trainingPage = readFileSync(join(process.cwd(), "src/app/training-matrix/page.tsx"), "utf8");
    // All rendering pages import from display-labels
    expect(documentsPage).toContain("display-labels");
    expect(versionControl).toContain("display-labels");
    expect(capaPage).toContain("display-labels");
    expect(trainingPage).toContain("display-labels");
    // Raw snake_case no longer rendered directly in data cards
    expect(documentsPage).not.toContain("{document.documentType}");
    expect(documentsPage).not.toContain("{document.status}");
  });

  it("meta description uses customer language not MVP language", () => {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toContain("AI-powered biosafety intelligence platform");
    expect(layout).not.toContain("AI Engine MVP foundation");
  });
});
