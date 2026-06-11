// ---------------------------------------------------------------------------
// Audit question bank.
//
// Turns the platform's safety program library (program-data.ts) into a flat,
// citation-linked bank of audit questions — the reusable content that powers a
// structured audit (and, later, an "audit dry-run"). Mirrors the reference PPV
// dashboards: every question carries its program, category, and standard
// reference, and can be scoped to a quick "core" audit or the full set.
//
// Pure data + selectors; findings/scoring live in ./findings.
// ---------------------------------------------------------------------------

import { programData } from "@/lib/programs/program-data";
import type { ModuleCategory, AuditScope } from "./findings";

export type AuditQuestion = {
  /** `${programId}:${checklistItemId}` — matches AuditFinding.questionId. */
  id: string;
  programId: string;
  programTitle: string;
  /** Program group, surfaced as the audit module/category grouping. */
  group: string;
  groupLabel: string;
  /** The checklist item, asked as an audit question. */
  question: string;
  detail?: string;
  /** Primary regulatory citation for the program. */
  standardReference: string;
};

// Programs included in the quick "core elements" audit — the high-energy /
// high-consequence set (the platform analog of a 10-element verification audit).
export const CORE_AUDIT_PROGRAM_IDS: string[] = [
  "biosafety",
  "bloodborne-pathogens",
  "chemical-hygiene",
  "loto",
  "machine-guarding",
  "fall-protection",
  "forklift",
  "emergency-response",
  "spill-response",
  "injury-investigation"
];

// Map a program group to an audit module category.
const GROUP_TO_CATEGORY: Record<string, ModuleCategory> = {
  laboratory: "critical",
  physical: "critical",
  emergency: "critical",
  warehouse: "critical",
  environmental: "management",
  admin: "management"
};

export function categoryForGroup(group: string): ModuleCategory {
  return GROUP_TO_CATEGORY[group] ?? "management";
}

/** Build the full audit question bank from the program library. */
export function buildQuestionBank(): AuditQuestion[] {
  const questions: AuditQuestion[] = [];
  for (const program of programData) {
    for (const item of program.checklist) {
      questions.push({
        id: `${program.id}:${item.id}`,
        programId: program.id,
        programTitle: program.title,
        group: program.group,
        groupLabel: program.groupLabel,
        question: item.label,
        detail: item.detail,
        standardReference: program.regulation
      });
    }
  }
  return questions;
}

/** Questions for the given audit scope: "core" = the quick-audit programs only. */
export function questionsForScope(scope: AuditScope): AuditQuestion[] {
  const all = buildQuestionBank();
  if (scope === "full") return all;
  const core = new Set(CORE_AUDIT_PROGRAM_IDS);
  return all.filter((q) => core.has(q.programId));
}

/** Questions for a single program. */
export function questionsForProgram(programId: string): AuditQuestion[] {
  return buildQuestionBank().filter((q) => q.programId === programId);
}

/** Question count grouped by program, for audit planning. */
export function questionCountsByProgram(): { programId: string; programTitle: string; count: number }[] {
  return programData.map((program) => ({
    programId: program.id,
    programTitle: program.title,
    count: program.checklist.length
  }));
}
