import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "src/app/ergonomics/self-assessment/page.tsx"), "utf8");
const client = readFileSync(join(process.cwd(), "src/app/ergonomics/self-assessment/ErgonomicSelfAssessmentClient.tsx"), "utf8");
const inspections = readFileSync(join(process.cwd(), "src/app/inspections/page.tsx"), "utf8");
const shell = readFileSync(join(process.cwd(), "src/components/AppShell.tsx"), "utf8");

describe("ergonomic Level 1 UI", () => {
  it("surfaces the worker-facing Level 1 screening route", () => {
    expect(page).toContain("Ergonomic Self-Assessment");
    expect(page).toContain("Level 1 Screening");
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
    expect(inspections).toContain("Start Screening");
    expect(shell).toContain("Ergonomics");
    expect(shell).toContain("/ergonomics/self-assessment");
  });
});
