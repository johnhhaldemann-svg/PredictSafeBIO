// ---------------------------------------------------------------------------
// Regulatory Applicability Register — Program Performance Verification (PPV) model.
//
// Mirrors the reference "Environmental Program Applicability Review" / Cal-OSHA
// PPV dashboards: for each regulatory program, determine whether it applies to
// the site, which job roles are exposed, whether a written program exists and is
// current, and prioritize follow-up by open-finding count.
//
// Regulatory citations below are transcribed verbatim from the source PPVA
// workbook (a CHMM-authored assessment) — they are sourced, not generated. Per
// the engine's non-negotiable rules, citations are never invented here.
//
// Pure data + functions; no I/O.
// ---------------------------------------------------------------------------

export type Applicability = "yes" | "no" | "unknown" | "further_assessment";

export type WrittenProgramStatus = {
  /** Does a written program / plan / permit exist? */
  exists: boolean | null;
  /** ISO date string of last update, or null if unknown / NA. */
  lastUpdate?: string | null;
  /** ISO date string the program/permit is next due, or null. */
  dueDate?: string | null;
};

export type RegulatoryProgram = {
  id: string;
  /** Program / plan / permit name. */
  program: string;
  /** Regulatory citation, transcribed from source. */
  citation: string;
  /** Whether this is a Federal or California-specific requirement. */
  jurisdiction: "federal" | "california";
  /** Default applicability in the reference assessment (site teams override). */
  defaultApplicability: Applicability;
};

// A curated set drawn directly from the reference PPVA Applicability Review.
export const REGULATORY_PROGRAMS: RegulatoryProgram[] = [
  { id: "spcc", program: "Spill Prevention, Control, and Countermeasure (SPCC)", citation: "40 CFR Part 112", jurisdiction: "federal", defaultApplicability: "yes" },
  { id: "apsa", program: "Aboveground Petroleum Storage Tank Act (APSA)", citation: "Cal. Health & Safety Code §25270 – 25270.13", jurisdiction: "california", defaultApplicability: "yes" },
  { id: "rcra", program: "Resource Conservation and Recovery Act (RCRA)", citation: "40 CFR Parts 260 – 282", jurisdiction: "federal", defaultApplicability: "yes" },
  { id: "hwca_title22", program: "Hazardous Waste Control Act (Title 22)", citation: "22 CCR §66260 et seq.", jurisdiction: "california", defaultApplicability: "yes" },
  { id: "dtsc_evq", program: "DTSC eVerification Questionnaire (eVQ)", citation: "Cal. Health & Safety Code §25205.16", jurisdiction: "california", defaultApplicability: "yes" },
  { id: "dot_training", program: "DOT Hazardous Materials Training", citation: "49 CFR Parts 171 – 180", jurisdiction: "federal", defaultApplicability: "yes" },
  { id: "tsca", program: "Toxic Substances Control Act (TSCA)", citation: "15 USC §2601 et seq.", jurisdiction: "federal", defaultApplicability: "no" },
  { id: "prop65", program: "Proposition 65", citation: "Cal. Health & Safety Code §25249.5 – 25249.14", jurisdiction: "california", defaultApplicability: "yes" },
  { id: "caa", program: "Clean Air Act (CAA)", citation: "42 USC §7401 et seq.", jurisdiction: "federal", defaultApplicability: "unknown" },
  { id: "neshap", program: "National Emission Standards for Hazardous Air Pollutants (NESHAP)", citation: "40 CFR Part 63", jurisdiction: "federal", defaultApplicability: "further_assessment" },
  { id: "cwa", program: "Clean Water Act (CWA)", citation: "33 USC §1251 et seq.", jurisdiction: "federal", defaultApplicability: "yes" },
  { id: "npdes", program: "National Pollutant Discharge Elimination System (NPDES) — Industrial Stormwater", citation: "NPDES General Permit Order 2014-0057-DWQ (CAS000001)", jurisdiction: "california", defaultApplicability: "yes" },
  { id: "swppp", program: "Storm Water Pollution Prevention Program (SWPPP)", citation: "27 CCR §22500 et seq.", jurisdiction: "california", defaultApplicability: "yes" },
  { id: "hmbp", program: "California Hazardous Materials Business Plan (HMBP)", citation: "19 CCR §2720 et seq.", jurisdiction: "california", defaultApplicability: "yes" },
  { id: "cupa", program: "Annual CUPA Unified Program Facility Permit", citation: "Cal. Health & Safety Code §25404 et seq.", jurisdiction: "california", defaultApplicability: "yes" },
  { id: "calarp", program: "California Accidental Release Program (CalARP)", citation: "19 CCR §5130.6 (adapted from CAA §112(r))", jurisdiction: "california", defaultApplicability: "no" },
  { id: "carb_ghg", program: "CARB Annual Greenhouse Gas Reporting", citation: "17 CCR §95100 et seq.", jurisdiction: "california", defaultApplicability: "yes" },
  { id: "tri", program: "Toxic Release Inventory (TRI) Reporting", citation: "40 CFR §372", jurisdiction: "federal", defaultApplicability: "further_assessment" },
  { id: "ewaste", program: "Electronic Waste Recycling Act", citation: "14 CCR §18660 – 18660.4", jurisdiction: "california", defaultApplicability: "yes" },
  { id: "lead_fee", program: "Occupational Lead Poisoning Prevention Fee", citation: "Cal. Health & Safety Code §105185 et seq.", jurisdiction: "california", defaultApplicability: "yes" }
];

export const REGULATORY_PROGRAM_IDS = new Set(REGULATORY_PROGRAMS.map((p) => p.id));

// ── Priority banding (from the PPVA score thresholds) ───────────────────────
// Priority is driven by the count of open recommendations/findings for a program:
//   ≤ 29 → Priority 3   •   30–59 → Priority 2   •   ≥ 60 → Priority 1

export type PriorityBand = "P1" | "P2" | "P3";

export function priorityFromOpenFindings(openFindingCount: number): PriorityBand {
  if (openFindingCount >= 60) return "P1";
  if (openFindingCount >= 30) return "P2";
  return "P3";
}

export const PRIORITY_LABELS: Record<PriorityBand, string> = {
  P1: "Priority 1 — highest",
  P2: "Priority 2 — elevated",
  P3: "Priority 3 — routine"
};

// ── Applicability assessment ────────────────────────────────────────────────

export type ProgramAssessment = {
  programId: string;
  applicability: Applicability;
  /** Job roles exposed / responsible for the program. */
  rolesExposed: string[];
  writtenProgram: WrittenProgramStatus;
  openFindings: number;
  closedFindings: number;
};

export type ProgramAssessmentResult = ProgramAssessment & {
  program: string;
  citation: string;
  priority: PriorityBand;
  /** Applicable program with no current written program is a compliance gap. */
  writtenProgramGap: boolean;
  /** Overdue if a due date exists and is before `asOf`. */
  overdue: boolean;
};

/** Evaluate a program assessment: resolve metadata, priority, and gap flags. */
export function assessProgram(input: ProgramAssessment, asOf: string): ProgramAssessmentResult | null {
  const program = REGULATORY_PROGRAMS.find((p) => p.id === input.programId);
  if (!program) return null;

  const applies = input.applicability === "yes";
  const writtenProgramGap = applies && input.writtenProgram.exists === false;
  const due = input.writtenProgram.dueDate ?? null;
  const overdue = applies && due !== null && due < asOf;

  return {
    ...input,
    program: program.program,
    citation: program.citation,
    priority: priorityFromOpenFindings(input.openFindings),
    writtenProgramGap,
    overdue
  };
}

export type ApplicabilitySummary = {
  applicableCount: number;
  needsFurtherAssessment: string[];
  writtenProgramGaps: string[];
  overduePrograms: string[];
  totalOpenFindings: number;
  totalClosedFindings: number;
  byPriority: Record<PriorityBand, number>;
};

/** Roll a set of program assessments up into a site-level summary. */
export function summarizeApplicability(inputs: ProgramAssessment[], asOf: string): ApplicabilitySummary {
  const results = inputs.map((input) => assessProgram(input, asOf)).filter((r): r is ProgramAssessmentResult => r !== null);

  const byPriority: Record<PriorityBand, number> = { P1: 0, P2: 0, P3: 0 };
  for (const result of results) {
    if (result.applicability === "yes") byPriority[result.priority] += 1;
  }

  return {
    applicableCount: results.filter((r) => r.applicability === "yes").length,
    needsFurtherAssessment: results.filter((r) => r.applicability === "further_assessment" || r.applicability === "unknown").map((r) => r.program),
    writtenProgramGaps: results.filter((r) => r.writtenProgramGap).map((r) => r.program),
    overduePrograms: results.filter((r) => r.overdue).map((r) => r.program),
    totalOpenFindings: results.reduce((sum, r) => sum + r.openFindings, 0),
    totalClosedFindings: results.reduce((sum, r) => sum + r.closedFindings, 0),
    byPriority
  };
}
