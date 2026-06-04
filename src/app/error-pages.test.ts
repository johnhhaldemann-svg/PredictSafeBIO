import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const notFoundPage = readFileSync(join(process.cwd(), "src/app/not-found.tsx"), "utf8");
const errorPage = readFileSync(join(process.cwd(), "src/app/error.tsx"), "utf8");
const myWorkPage = readFileSync(join(process.cwd(), "src/app/my-work/page.tsx"), "utf8");
const assessmentsPage = readFileSync(join(process.cwd(), "src/app/assessments/page.tsx"), "utf8");

describe("error pages and empty states", () => {
  it("404 page is branded and links back to key routes", () => {
    expect(notFoundPage).toContain("PredictSafeBIO");
    expect(notFoundPage).toContain("Biosafety Intelligence");
    expect(notFoundPage).toContain("Page not found");
    expect(notFoundPage).toContain("404");
    expect(notFoundPage).toContain('href="/workbench"');
    expect(notFoundPage).toContain('href="/login"');
    expect(notFoundPage).not.toContain("AI Engine MVP");
  });

  it("error boundary is a client component with retry and home link", () => {
    expect(errorPage).toContain('"use client"');
    expect(errorPage).toContain("Something went wrong");
    expect(errorPage).toContain("Try again");
    expect(errorPage).toContain("Return to Workbench");
    expect(errorPage).toContain("onClick={reset}");
    expect(errorPage).toContain("error.digest");
  });

  it("My Work shows a getting-started guide when there are no tasks", () => {
    expect(myWorkPage).toContain("Getting started");
    expect(myWorkPage).toContain("Your workspace is ready");
    expect(myWorkPage).toContain("Run a BioRisk assessment");
    expect(myWorkPage).toContain("Open the Compliance Map");
    expect(myWorkPage).toContain("Add controlled documents");
    expect(myWorkPage).toContain("Invite your team");
    expect(myWorkPage).toContain("allActions.length === 0");
  });

  it("My Work empty task message guides the user rather than just saying empty", () => {
    expect(myWorkPage).toContain("Run a BioRisk assessment on the Workbench");
    expect(myWorkPage).toContain("open the Compliance Map to generate source-traced tasks");
    expect(myWorkPage).not.toContain("No generated Foundation review tasks are available yet.");
  });

  it("Assessments shows getting-started guidance when workspace has no saved assessments", () => {
    expect(assessmentsPage).toContain("No risk assessments saved yet");
    expect(assessmentsPage).toContain("Run a BioRisk assessment");
    expect(assessmentsPage).toContain("assessments.length === 0");
    expect(assessmentsPage).toContain("Clear filters");
  });
});
