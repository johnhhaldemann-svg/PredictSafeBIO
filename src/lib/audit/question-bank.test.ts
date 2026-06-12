import { describe, expect, it } from "vitest";
import { programData } from "@/lib/programs/program-data";
import {
  buildQuestionBank,
  categoryForGroup,
  CORE_AUDIT_PROGRAM_IDS,
  questionCountsByProgram,
  questionsForProgram,
  questionsForScope
} from "./question-bank";

describe("buildQuestionBank", () => {
  it("flattens every program checklist item into a uniquely-id'd question", () => {
    const bank = buildQuestionBank();
    const expected = programData.reduce((sum, p) => sum + p.checklist.length, 0);
    expect(bank.length).toBe(expected);
    const ids = bank.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(bank.every((q) => q.question && q.standardReference)).toBe(true);
  });

  it("ids match the AuditFinding questionId convention (programId:itemId)", () => {
    const bank = buildQuestionBank();
    expect(bank[0].id).toMatch(/^[a-z0-9-]+:[a-z0-9]+$/i);
  });
});

describe("questionsForScope", () => {
  it("core scope only includes the core audit programs", () => {
    const core = questionsForScope("core");
    const coreSet = new Set(CORE_AUDIT_PROGRAM_IDS);
    expect(core.every((q) => coreSet.has(q.programId))).toBe(true);
    expect(core.length).toBeGreaterThan(0);
  });

  it("full scope includes everything", () => {
    expect(questionsForScope("full").length).toBe(buildQuestionBank().length);
    expect(questionsForScope("full").length).toBeGreaterThan(questionsForScope("core").length);
  });

  it("core program ids all exist in the program library", () => {
    const valid = new Set(programData.map((p) => p.id));
    expect(CORE_AUDIT_PROGRAM_IDS.every((id) => valid.has(id))).toBe(true);
  });
});

describe("questionsForProgram", () => {
  it("returns exactly the checklist for one program", () => {
    const biosafety = programData.find((p) => p.id === "biosafety")!;
    expect(questionsForProgram("biosafety").length).toBe(biosafety.checklist.length);
  });
});

describe("categoryForGroup", () => {
  it("maps lab/physical/emergency/warehouse groups to critical", () => {
    expect(categoryForGroup("laboratory")).toBe("critical");
    expect(categoryForGroup("physical")).toBe("critical");
    expect(categoryForGroup("emergency")).toBe("critical");
    expect(categoryForGroup("warehouse")).toBe("critical");
  });

  it("maps environmental and admin to management and defaults unknown groups", () => {
    expect(categoryForGroup("environmental")).toBe("management");
    expect(categoryForGroup("admin")).toBe("management");
    expect(categoryForGroup("nonexistent-group")).toBe("management");
  });
});

describe("questionCountsByProgram", () => {
  it("counts questions per program", () => {
    const counts = questionCountsByProgram();
    expect(counts.length).toBe(programData.length);
    expect(counts.every((c) => c.count >= 0)).toBe(true);
  });
});
