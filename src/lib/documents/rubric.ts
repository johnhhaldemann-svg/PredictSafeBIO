// ---------------------------------------------------------------------------
// Document Intelligence — Rubric mapper
//
// Turns the static Safety Program Library (program-data.ts) into a grading
// rubric for an uploaded document. Given a document's metadata, this picks the
// relevant program(s) and flattens their compliance checklists into a flat list
// of requirements that a grader can check the document text against.
//
// Pure functions only — no AI, no I/O. The clause grader (phase 3) consumes the
// `DocumentRubric` this produces.
// ---------------------------------------------------------------------------

import type { DocumentMetadata } from "@/lib/bio-ai/types";
import { programData } from "@/lib/programs/program-data";

export type RubricRequirement = {
  /** Stable, globally-unique id: `${programId}:${checklistItemId}` (e.g. "biosafety:b5"). */
  requirementId: string;
  programId: string;
  programTitle: string;
  /** The checklist item text the document is graded against. */
  label: string;
  detail?: string;
};

export type RubricMatchReason = "explicit" | "alias" | "keyword" | "documentType" | "fallback";

export type DocumentRubric = {
  /** Program ids the document was matched to, in match-confidence order. */
  programIds: string[];
  /** How the programs were chosen — drives whether the UI should ask the user to confirm. */
  matchedBy: RubricMatchReason;
  /** Flattened, de-duplicated requirements across all matched programs. */
  requirements: RubricRequirement[];
};

// ---------------------------------------------------------------------------
// Curated phrase → program aliases.
//
// High-precision mapping from the common *names* of real safety documents to
// the program whose checklist should grade them. Phrases are matched as
// case-insensitive substrings against title + area + related process.
// ---------------------------------------------------------------------------

const DOCUMENT_ALIASES: { phrase: string; programId: string }[] = [
  { phrase: "biosafety manual", programId: "biosafety" },
  { phrase: "biosafety", programId: "biosafety" },
  { phrase: "ibc", programId: "biosafety" },
  { phrase: "biological safety", programId: "biosafety" },
  { phrase: "exposure control plan", programId: "bloodborne-pathogens" },
  { phrase: "bloodborne", programId: "bloodborne-pathogens" },
  { phrase: "blood borne", programId: "bloodborne-pathogens" },
  { phrase: "bbp", programId: "bloodborne-pathogens" },
  { phrase: "chemical hygiene plan", programId: "chemical-hygiene" },
  { phrase: "chemical hygiene", programId: "chemical-hygiene" },
  { phrase: "laboratory standard", programId: "chemical-hygiene" },
  { phrase: "chemical management", programId: "chemical-management" },
  { phrase: "chemical inventory", programId: "chemical-management" },
  { phrase: "hazard communication", programId: "communication" },
  { phrase: "hazcom", programId: "communication" },
  { phrase: "safety communication", programId: "communication" },
  { phrase: "iipp", programId: "iipp" },
  { phrase: "injury and illness prevention", programId: "iipp" },
  { phrase: "injury & illness prevention", programId: "iipp" },
  { phrase: "ehs management", programId: "ehs-management" },
  { phrase: "osha log", programId: "osha-log" },
  { phrase: "osha 300", programId: "osha-log" },
  { phrase: "recordkeeping", programId: "osha-log" },
  { phrase: "vivarium", programId: "vivarium" },
  { phrase: "iacuc", programId: "vivarium" },
  { phrase: "animal care", programId: "vivarium" },
  { phrase: "emergency action plan", programId: "emergency-response" },
  { phrase: "emergency response", programId: "emergency-response" },
  { phrase: "evacuation", programId: "emergency-response" },
  { phrase: "spill response", programId: "spill-response" },
  { phrase: "spill", programId: "spill-response" },
  { phrase: "emergency equipment", programId: "er-equipment" },
  { phrase: "eyewash", programId: "er-equipment" },
  { phrase: "safety shower", programId: "er-equipment" },
  { phrase: "ergonomic", programId: "ergonomics" },
  { phrase: "lockout", programId: "loto" },
  { phrase: "loto", programId: "loto" },
  { phrase: "energy control", programId: "loto" },
  { phrase: "machine guarding", programId: "machine-guarding" },
  { phrase: "fall protection", programId: "fall-protection" },
  { phrase: "personal protective equipment", programId: "ppe" },
  { phrase: "ppe", programId: "ppe" },
  { phrase: "workplace violence", programId: "workplace-violence" },
  { phrase: "wvpp", programId: "workplace-violence" },
  { phrase: "warehouse", programId: "warehouse-safety" },
  { phrase: "forklift", programId: "forklift" },
  { phrase: "powered industrial truck", programId: "forklift" },
  { phrase: "rack inspection", programId: "rack-inspections" },
  { phrase: "waste management", programId: "waste-management" },
  { phrase: "hazardous waste", programId: "waste-management" },
  { phrase: "stormwater", programId: "stormwater" },
  { phrase: "swppp", programId: "stormwater" },
  { phrase: "air quality", programId: "air-quality" },
  { phrase: "permit to operate", programId: "air-quality" },
  { phrase: "regulatory permit", programId: "regulatory-permits" },
  { phrase: "hmbp", programId: "regulatory-permits" },
  { phrase: "work permit", programId: "work-permits" },
  { phrase: "confined space", programId: "work-permits" },
  { phrase: "hot work", programId: "work-permits" },
  { phrase: "injury investigation", programId: "injury-investigation" },
  { phrase: "incident investigation", programId: "injury-investigation" },
  { phrase: "root cause", programId: "injury-investigation" }
];

/** documentType → sensible default program when nothing else matches. */
const DOCUMENT_TYPE_DEFAULTS: Partial<Record<DocumentMetadata["documentType"], string[]>> = {
  policy: ["ehs-management"],
  training: ["ehs-management"]
};

const validProgramIds = new Set(programData.map((program) => program.id));

function haystack(document: Pick<DocumentMetadata, "title" | "area" | "relatedProcess">): string {
  return [document.title, document.area, document.relatedProcess]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word(s) substring match, so short aliases like "ppe" or "ibc" do not
 * match inside unrelated words (e.g. "stopped", "calibration"). */
function phraseMatches(hay: string, phrase: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(phrase)}([^a-z0-9]|$)`).test(hay);
}

/** Tokens (>3 chars) derived from a program's title and id, for loose keyword matching. */
function programTokens(programId: string, title: string): string[] {
  const raw = `${programId.replace(/-/g, " ")} ${title}`.toLowerCase();
  return [...new Set(raw.split(/[^a-z0-9]+/).filter((token) => token.length > 3))];
}

export type SelectRubricOptions = {
  /** Explicit program ids chosen by the user — overrides automatic matching. */
  programIds?: string[];
};

/**
 * Pick the program ids whose checklists should grade this document, plus how
 * they were chosen. Precedence: explicit override → curated alias → keyword →
 * documentType default → fallback (empty, caller should prompt the user).
 */
export function selectRubricPrograms(
  document: Pick<DocumentMetadata, "title" | "area" | "relatedProcess" | "documentType">,
  options: SelectRubricOptions = {}
): { programIds: string[]; matchedBy: RubricMatchReason } {
  const explicit = (options.programIds ?? []).filter((id) => validProgramIds.has(id));
  if (explicit.length > 0) {
    return { programIds: [...new Set(explicit)], matchedBy: "explicit" };
  }

  const hay = haystack(document);

  // 1. Curated alias phrases (highest precision). Order preserved, de-duplicated.
  const aliasHits: string[] = [];
  for (const { phrase, programId } of DOCUMENT_ALIASES) {
    if (phraseMatches(hay, phrase) && !aliasHits.includes(programId)) {
      aliasHits.push(programId);
    }
  }
  if (aliasHits.length > 0) {
    return { programIds: aliasHits, matchedBy: "alias" };
  }

  // 2. Loose keyword/token matching against program titles + ids, ranked by hits.
  const scored = programData
    .map((program) => {
      const tokens = programTokens(program.id, program.title);
      const score = tokens.reduce((total, token) => (hay.includes(token) ? total + 1 : total), 0);
      return { programId: program.id, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length > 0) {
    return { programIds: scored.map((entry) => entry.programId), matchedBy: "keyword" };
  }

  // 3. documentType default.
  const byType = DOCUMENT_TYPE_DEFAULTS[document.documentType];
  if (byType && byType.length > 0) {
    return { programIds: [...byType], matchedBy: "documentType" };
  }

  // 4. No confident match — caller should ask the user to choose a program.
  return { programIds: [], matchedBy: "fallback" };
}

/**
 * Flatten the compliance checklists of the given programs into a de-duplicated
 * list of gradeable requirements. Unknown program ids are ignored.
 */
export function buildRubricRequirements(programIds: string[]): RubricRequirement[] {
  const requirements: RubricRequirement[] = [];
  const seen = new Set<string>();

  for (const programId of programIds) {
    const program = programData.find((entry) => entry.id === programId);
    if (!program) continue;

    for (const item of program.checklist) {
      const requirementId = `${program.id}:${item.id}`;
      if (seen.has(requirementId)) continue;
      seen.add(requirementId);
      requirements.push({
        requirementId,
        programId: program.id,
        programTitle: program.title,
        label: item.label,
        detail: item.detail
      });
    }
  }

  return requirements;
}

/**
 * End-to-end: choose the rubric program(s) for a document and build the full
 * requirement list the grader will check against.
 */
export function pickRubric(
  document: Pick<DocumentMetadata, "title" | "area" | "relatedProcess" | "documentType">,
  options: SelectRubricOptions = {}
): DocumentRubric {
  const { programIds, matchedBy } = selectRubricPrograms(document, options);
  return {
    programIds,
    matchedBy,
    requirements: buildRubricRequirements(programIds)
  };
}
