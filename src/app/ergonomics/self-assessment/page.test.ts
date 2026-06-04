import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "src/app/ergonomics/self-assessment/page.tsx"), "utf8");
const client = readFileSync(join(process.cwd(), "src/app/ergonomics/self-assessment/ErgonomicSelfAssessmentClient.tsx"), "utf8");
const inspections = readFileSync(join(process.cwd(), "src/app/inspections/page.tsx"), "utf8");
const level2Page = readFileSync(join(process.cwd(), "src/app/ergonomics/advanced-evaluation/page.tsx"), "utf8");
const level2Client = readFileSync(join(process.cwd(), "src/app/ergonomics/advanced-evaluation/Level2InspectionClient.tsx"), "utf8");
const platformNav = readFileSync(join(process.cwd(), "src/components/PlatformCategoryNav.tsx"), "utf8");

describe("ergonomic Level 1 UI", () => {
  it("surfaces the worker-facing Level 1 screening route", () => {
    expect(page).toContain("Hazard & Exposure Screening");
    expect(page).toContain("Level 1 HSE Signal");
    expect(page).toContain("No measurements needed");
    expect(client).toContain("What type of work are you doing?");
    expect(client).toContain("How does this task feel on your body?");
    expect(client).toContain("Which parts of your body feel the strain?");
    expect(client).toContain("How often do you do this task?");
    expect(client).toContain("Any additional comments?");
  });

  it("keeps the advanced workflow separate from the Level 1 worker form", () => {
    const formSection = client.split("<form action={submitAction}")[1].split("</form>")[0];

    expect(formSection).not.toMatch(/measurement|equation|horizontal|vertical|distance|multiplier/i);
    expect(client).toContain("Request Advanced Evaluation");
    expect(client).toContain("Level 2 is separate");
  });

  it("adds access from Inspections and the Ergonomics sidebar section", () => {
    expect(inspections).toContain("ergonomic.inspectionType.title");
    expect(inspections).toContain("ergonomic.level2InspectionType.title");
    // Button text is rendered as hardcoded labels alongside the dynamic titles
    expect(inspections).toContain("Start screening");
    expect(inspections).toContain("Open evaluation");
    expect(platformNav).toContain("HSE Management");
    expect(platformNav).toContain("/ergonomics/self-assessment");
  });

  it("keeps Level 2 measurement inspection separate and gated", () => {
    expect(level2Page).toContain("Advanced HSE Audit Evaluation");
    expect(level2Page).toContain("Level 2 Measurement Inspection");
    expect(level2Client).toContain("Measurement capture");
    expect(level2Client).toContain("Load or force (lb)");
    expect(level2Client).toContain("Horizontal reach (in)");
    expect(level2Client).toContain("Level 2 locked");
    expect(client.split("<form action={submitAction}")[1].split("</form>")[0]).not.toMatch(/Load or force|Horizontal reach|Vertical hand height/i);
  });
});
