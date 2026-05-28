import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const foundationPage = readFileSync(join(process.cwd(), "src/app/foundation/page.tsx"), "utf8");
const companyProfilePage = readFileSync(join(process.cwd(), "src/app/company-profile/page.tsx"), "utf8");

describe("foundation UI alignment", () => {
  it("surfaces BioType, core component, AI workflow, and human validation sections", () => {
    expect(foundationPage).toContain("Core Compliance Components");
    expect(foundationPage).toContain("BioType Foundation Packages");
    expect(foundationPage).toContain("AI Workflow Map");
    expect(foundationPage).toContain("Human Validation Workflow");
  });

  it("shows BioType selections on the company profile surface", () => {
    expect(companyProfilePage).toContain("BioType Foundation Packages");
    expect(companyProfilePage).toContain("Selected operating profile");
  });
});
