import { describe, expect, it } from "vitest";
import { programData } from "@/lib/programs/program-data";
import {
  buildRubricRequirements,
  pickRubric,
  selectRubricPrograms
} from "./rubric";

const doc = (overrides: Partial<Parameters<typeof selectRubricPrograms>[0]>) => ({
  title: "",
  area: null,
  relatedProcess: null,
  documentType: "sop" as const,
  ...overrides
});

describe("selectRubricPrograms", () => {
  it("maps common safety document names to their program via curated aliases", () => {
    const cases: { title: string; expected: string }[] = [
      { title: "Biosafety Manual", expected: "biosafety" },
      { title: "Exposure Control Plan", expected: "bloodborne-pathogens" },
      { title: "Chemical Hygiene Plan", expected: "chemical-hygiene" },
      { title: "Injury and Illness Prevention Program", expected: "iipp" },
      { title: "Spill Response Procedure", expected: "spill-response" },
      { title: "Emergency Action Plan", expected: "emergency-response" },
      { title: "Lockout/Tagout Energy Control Program", expected: "loto" },
      { title: "Hazardous Waste Management Plan", expected: "waste-management" }
    ];
    for (const { title, expected } of cases) {
      const result = selectRubricPrograms(doc({ title }));
      expect(result.matchedBy).toBe("alias");
      expect(result.programIds).toContain(expected);
    }
  });

  it("uses the document area and related process, not just the title", () => {
    const result = selectRubricPrograms(
      doc({ title: "Site SOP 12", area: "BSL-2 lab", relatedProcess: "biosafety cabinet use" })
    );
    expect(result.programIds).toContain("biosafety");
  });

  it("honors an explicit program override and ignores invalid ids", () => {
    const result = selectRubricPrograms(doc({ title: "Biosafety Manual" }), {
      programIds: ["chemical-hygiene", "not-a-real-program"]
    });
    expect(result.matchedBy).toBe("explicit");
    expect(result.programIds).toEqual(["chemical-hygiene"]);
  });

  it("falls back to a documentType default when nothing else matches", () => {
    const result = selectRubricPrograms(doc({ title: "General Policy XYZ", documentType: "policy" }));
    expect(result.matchedBy).toBe("documentType");
    expect(result.programIds).toEqual(["ehs-management"]);
  });

  it("returns an empty fallback when no program can be confidently matched", () => {
    const result = selectRubricPrograms(doc({ title: "Zzzzq Untitled", documentType: "sop" }));
    expect(result.matchedBy).toBe("fallback");
    expect(result.programIds).toEqual([]);
  });

  it("only ever returns valid program ids", () => {
    const validIds = new Set(programData.map((p) => p.id));
    const titles = ["Biosafety Manual", "Forklift Program", "Stormwater SWPPP", "PPE Hazard Assessment"];
    for (const title of titles) {
      for (const id of selectRubricPrograms(doc({ title })).programIds) {
        expect(validIds.has(id)).toBe(true);
      }
    }
  });
});

describe("buildRubricRequirements", () => {
  it("flattens a program's checklist into uniquely-id'd requirements", () => {
    const reqs = buildRubricRequirements(["biosafety"]);
    const biosafety = programData.find((p) => p.id === "biosafety")!;
    expect(reqs.length).toBe(biosafety.checklist.length);
    expect(reqs[0].requirementId).toMatch(/^biosafety:/);
    expect(reqs.every((r) => r.programId === "biosafety")).toBe(true);
    expect(reqs.every((r) => r.label.length > 0)).toBe(true);
  });

  it("de-duplicates requirement ids across programs and ignores unknown ids", () => {
    const reqs = buildRubricRequirements(["biosafety", "biosafety", "does-not-exist"]);
    const ids = reqs.map((r) => r.requirementId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(programData.find((p) => p.id === "biosafety")!.checklist.length);
  });

  it("returns nothing for an empty program list", () => {
    expect(buildRubricRequirements([])).toEqual([]);
  });
});

describe("pickRubric", () => {
  it("returns matched programs and their flattened requirements end to end", () => {
    const rubric = pickRubric(doc({ title: "Chemical Hygiene Plan" }));
    expect(rubric.matchedBy).toBe("alias");
    expect(rubric.programIds).toContain("chemical-hygiene");
    expect(rubric.requirements.length).toBeGreaterThan(0);
    expect(rubric.requirements.every((r) => rubric.programIds.includes(r.programId))).toBe(true);
  });

  it("produces an empty requirement set on fallback", () => {
    const rubric = pickRubric(doc({ title: "Zzzzq Untitled" }));
    expect(rubric.matchedBy).toBe("fallback");
    expect(rubric.requirements).toEqual([]);
  });
});
