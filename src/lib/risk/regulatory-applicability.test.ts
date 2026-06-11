import { describe, expect, it } from "vitest";
import {
  assessProgram,
  priorityFromOpenFindings,
  REGULATORY_PROGRAMS,
  summarizeApplicability,
  type ProgramAssessment
} from "./regulatory-applicability";

describe("regulatory program library", () => {
  it("has unique ids and a citation for every program", () => {
    const ids = REGULATORY_PROGRAMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(REGULATORY_PROGRAMS.every((p) => p.citation.length > 0 && p.program.length > 0)).toBe(true);
  });
});

describe("priorityFromOpenFindings", () => {
  it("bands by the documented thresholds", () => {
    expect(priorityFromOpenFindings(0)).toBe("P3");
    expect(priorityFromOpenFindings(29)).toBe("P3");
    expect(priorityFromOpenFindings(30)).toBe("P2");
    expect(priorityFromOpenFindings(59)).toBe("P2");
    expect(priorityFromOpenFindings(60)).toBe("P1");
    expect(priorityFromOpenFindings(177)).toBe("P1");
  });
});

describe("assessProgram", () => {
  const base: ProgramAssessment = {
    programId: "hmbp",
    applicability: "yes",
    rolesExposed: ["EHS Manager"],
    writtenProgram: { exists: true, lastUpdate: "2025-01-01", dueDate: "2026-12-31" },
    openFindings: 3,
    closedFindings: 1
  };

  it("resolves citation/priority and clears gap flags for a current program", () => {
    const result = assessProgram(base, "2026-06-11")!;
    expect(result.citation).toBe("19 CCR §2720 et seq.");
    expect(result.priority).toBe("P3");
    expect(result.writtenProgramGap).toBe(false);
    expect(result.overdue).toBe(false);
  });

  it("flags an applicable program with no written program as a gap", () => {
    const result = assessProgram({ ...base, writtenProgram: { exists: false } }, "2026-06-11")!;
    expect(result.writtenProgramGap).toBe(true);
  });

  it("does not flag a gap when the program is not applicable", () => {
    const result = assessProgram({ ...base, applicability: "no", writtenProgram: { exists: false } }, "2026-06-11")!;
    expect(result.writtenProgramGap).toBe(false);
  });

  it("flags an overdue due date", () => {
    const result = assessProgram({ ...base, writtenProgram: { exists: true, dueDate: "2026-01-01" } }, "2026-06-11")!;
    expect(result.overdue).toBe(true);
  });

  it("returns null for an unknown program id", () => {
    expect(assessProgram({ ...base, programId: "not-real" }, "2026-06-11")).toBeNull();
  });
});

describe("summarizeApplicability", () => {
  it("rolls up applicability, gaps, findings, and priority counts", () => {
    const summary = summarizeApplicability(
      [
        { programId: "spcc", applicability: "yes", rolesExposed: [], writtenProgram: { exists: true }, openFindings: 65, closedFindings: 2 },
        { programId: "rcra", applicability: "yes", rolesExposed: [], writtenProgram: { exists: false }, openFindings: 40, closedFindings: 0 },
        { programId: "tsca", applicability: "no", rolesExposed: [], writtenProgram: { exists: null }, openFindings: 0, closedFindings: 0 },
        { programId: "tri", applicability: "further_assessment", rolesExposed: [], writtenProgram: { exists: null }, openFindings: 5, closedFindings: 0 }
      ],
      "2026-06-11"
    );
    expect(summary.applicableCount).toBe(2);
    expect(summary.needsFurtherAssessment).toContain("Toxic Release Inventory (TRI) Reporting");
    expect(summary.writtenProgramGaps).toContain("Resource Conservation and Recovery Act (RCRA)");
    expect(summary.totalOpenFindings).toBe(110);
    expect(summary.byPriority).toEqual({ P1: 1, P2: 1, P3: 0 });
  });
});
