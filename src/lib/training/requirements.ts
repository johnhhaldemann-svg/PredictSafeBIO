// ---------------------------------------------------------------------------
// Training requirements model.
//
// Encodes the structure of the reference "Trainings Matrix SAFE" workbook:
//   • each course tagged with WHY it is required (regulatory / company / incident
//     / risk / insurance / best practice)
//   • a frequency model including incident- and risk-triggered retraining
//   • awareness vs. authorized competency levels
//   • a trainer qualification register
//
// De-branded to generic EHS courses. Pure data + functions; `now` is always a
// parameter so the module stays deterministic and testable.
// ---------------------------------------------------------------------------

/** Why a course is required — drives audit defensibility ("tied to a requirement"). */
export type RequirementReason =
  | "regulatory"
  | "company"
  | "incident_near_hit"
  | "risk_assessment"
  | "insurance"
  | "best_practice";

export const REQUIREMENT_REASON_LABELS: Record<RequirementReason, string> = {
  regulatory: "Regulatory requirement",
  company: "Company requirement",
  incident_near_hit: "Injury / incident / near-hit",
  risk_assessment: "Risk assessment",
  insurance: "Insurance requirement",
  best_practice: "Best practice"
};

/** How often a course recurs. Event-triggered values have no fixed interval. */
export type TrainingFrequency =
  | "hire"
  | "initial"
  | "annual"
  | "biannual"
  | "triennial"
  | "incident_triggered"
  | "risk_triggered";

/** Months between renewals for interval-based frequencies; null for event-driven. */
export const FREQUENCY_MONTHS: Record<TrainingFrequency, number | null> = {
  hire: null,
  initial: null,
  annual: 12,
  biannual: 24,
  triennial: 36,
  incident_triggered: null,
  risk_triggered: null
};

/** Awareness (general) vs. Authorized (qualified to perform the work). */
export type CompetencyLevel = "awareness" | "authorized";

export type TrainingCourse = {
  id: string;
  name: string;
  reasons: RequirementReason[];
  frequencies: TrainingFrequency[];
  competencyLevel?: CompetencyLevel;
};

// De-branded course catalog from the reference SAFE training matrix.
export const TRAINING_CATALOG: TrainingCourse[] = [
  { id: "ehs_orientation", name: "EHS Orientation", reasons: ["regulatory", "company"], frequencies: ["hire"] },
  { id: "hazard_communication", name: "Hazard Communication", reasons: ["regulatory"], frequencies: ["annual"] },
  { id: "loto_awareness", name: "LOTO Awareness", reasons: ["regulatory", "company"], frequencies: ["annual"], competencyLevel: "awareness" },
  { id: "loto_authorized", name: "LOTO Authorized", reasons: ["regulatory", "company"], frequencies: ["annual"], competencyLevel: "authorized" },
  { id: "pit_awareness", name: "Powered Industrial Truck Awareness", reasons: ["regulatory", "company", "incident_near_hit"], frequencies: ["initial", "incident_triggered"], competencyLevel: "awareness" },
  { id: "pit_authorized", name: "Powered Industrial Truck Authorized", reasons: ["regulatory", "company", "incident_near_hit"], frequencies: ["triennial", "incident_triggered"], competencyLevel: "authorized" },
  { id: "heights_awareness", name: "Working from Heights Awareness", reasons: ["regulatory", "company", "incident_near_hit"], frequencies: ["annual"], competencyLevel: "awareness" },
  { id: "heights_authorized", name: "Working from Heights Authorized", reasons: ["regulatory", "company", "incident_near_hit"], frequencies: ["annual"], competencyLevel: "authorized" },
  { id: "ppe", name: "Personal Protective Equipment", reasons: ["regulatory", "company", "incident_near_hit", "risk_assessment"], frequencies: ["annual"] },
  { id: "emergency_response", name: "Emergency Response", reasons: ["regulatory", "company", "incident_near_hit", "risk_assessment"], frequencies: ["annual"] },
  { id: "first_aid_cpr_aed", name: "First Aid / CPR / AED", reasons: ["regulatory", "company", "incident_near_hit", "risk_assessment"], frequencies: ["biannual"] },
  { id: "bbp", name: "Bloodborne Pathogens", reasons: ["regulatory"], frequencies: ["annual"] },
  { id: "incident_management", name: "Incident Management", reasons: ["company"], frequencies: ["annual"] },
  { id: "heat_stress", name: "Heat Illness Prevention", reasons: ["regulatory", "risk_assessment"], frequencies: ["annual"] },
  { id: "electrical_safety", name: "Electrical Safety", reasons: ["regulatory", "company"], frequencies: ["annual"] },
  { id: "crane_hoist", name: "Crane & Hoist", reasons: ["regulatory"], frequencies: ["annual"] },
  { id: "risk_assessment_awareness", name: "Risk Assessment Awareness", reasons: ["regulatory", "company"], frequencies: ["annual"], competencyLevel: "awareness" },
  { id: "risk_assessment_authorized", name: "Risk Assessment Authorized", reasons: ["company"], frequencies: ["annual"], competencyLevel: "authorized" },
  { id: "machine_guarding", name: "Machine Guarding", reasons: ["regulatory", "company"], frequencies: ["annual"] },
  { id: "ergonomics", name: "Ergonomics", reasons: ["risk_assessment", "incident_near_hit"], frequencies: ["annual", "incident_triggered"] },
  { id: "hot_work_awareness", name: "Hot Work Awareness", reasons: ["company", "insurance"], frequencies: ["annual", "incident_triggered"], competencyLevel: "awareness" },
  { id: "hot_work_authorized", name: "Hot Work / Fire Watch Authorized", reasons: ["regulatory", "company", "insurance"], frequencies: ["annual", "incident_triggered"], competencyLevel: "authorized" },
  { id: "stormwater", name: "Stormwater", reasons: ["regulatory"], frequencies: ["annual"] },
  { id: "spill_response", name: "Spill Response and Prevention", reasons: ["regulatory"], frequencies: ["annual"] },
  { id: "hazwaste_awareness", name: "Hazardous Waste Awareness", reasons: ["regulatory"], frequencies: ["annual"], competencyLevel: "awareness" },
  { id: "hazwaste_handler", name: "Hazardous Waste (Waste Handlers)", reasons: ["regulatory"], frequencies: ["annual"], competencyLevel: "authorized" },
  { id: "arc_flash", name: "Arc Flash Safety", reasons: ["regulatory"], frequencies: ["annual"] },
  { id: "confined_space_awareness", name: "Confined Space Awareness", reasons: ["regulatory", "company"], frequencies: ["annual"], competencyLevel: "awareness" },
  { id: "confined_space_entry", name: "Confined Space Entry", reasons: ["regulatory", "company"], frequencies: ["annual"], competencyLevel: "authorized" },
  { id: "general_lab_safety", name: "General Lab Safety", reasons: ["regulatory", "risk_assessment"], frequencies: ["annual"] },
  { id: "laser_safety", name: "Laser Safety", reasons: ["regulatory", "company"], frequencies: ["annual"] },
  { id: "radiation_safety", name: "Radiation Safety", reasons: ["regulatory", "company"], frequencies: ["annual"] },
  { id: "chemical_hygiene_plan", name: "Chemical Hygiene Plan", reasons: ["regulatory"], frequencies: ["annual"] },
  { id: "hmbp", name: "HazMat Business Plan (CA)", reasons: ["regulatory"], frequencies: ["annual"] },
  { id: "dot_hazmat", name: "DOT Hazmat Training", reasons: ["regulatory"], frequencies: ["triennial"] },
  { id: "sop_equipment_specific", name: "SOP / Equipment-Specific Training", reasons: ["regulatory", "risk_assessment", "company"], frequencies: ["initial", "incident_triggered", "risk_triggered"] }
];

export const TRAINING_BY_ID = new Map(TRAINING_CATALOG.map((course) => [course.id, course]));

// ── Retraining triggers ─────────────────────────────────────────────────────

export type RetrainingTrigger = "incident" | "risk" | "return_to_work";

/** Courses that should be re-issued when a triggering event occurs. */
export function coursesTriggeredBy(trigger: RetrainingTrigger): TrainingCourse[] {
  if (trigger === "return_to_work") {
    // After an extended absence, re-verify every role-qualifying (authorized) course.
    return TRAINING_CATALOG.filter((course) => course.competencyLevel === "authorized");
  }
  const frequency: TrainingFrequency = trigger === "incident" ? "incident_triggered" : "risk_triggered";
  return TRAINING_CATALOG.filter((course) => course.frequencies.includes(frequency));
}

// ── Competency scoring ──────────────────────────────────────────────────────
// The reference matrix captures a numeric score per course, not just completion.

export const DEFAULT_COMPETENCY_PASS_THRESHOLD = 80;

/** Whether a recorded competency score meets the pass threshold. */
export function meetsCompetency(score: number, threshold: number = DEFAULT_COMPETENCY_PASS_THRESHOLD): boolean {
  return score >= threshold;
}

// ── Due / overdue calculation ───────────────────────────────────────────────

export type DueStatus = "current" | "due" | "overdue" | "never_completed" | "event_driven";

/**
 * Determine whether a course assignment is current/due/overdue.
 * `lastCompleted` and `now` are ISO date strings. Returns "event_driven" for
 * courses with no interval frequency (hire/initial/incident/risk triggered).
 */
export function trainingDueStatus(
  course: TrainingCourse,
  lastCompleted: string | null,
  now: string
): DueStatus {
  const intervalMonths = course.frequencies
    .map((f) => FREQUENCY_MONTHS[f])
    .filter((m): m is number => m !== null);

  if (intervalMonths.length === 0) return "event_driven";
  if (!lastCompleted) return "never_completed";

  // Use the shortest interval (most conservative) when a course has several.
  const months = Math.min(...intervalMonths);
  const due = new Date(lastCompleted);
  due.setMonth(due.getMonth() + months);
  const dueIso = due.toISOString().slice(0, 10);
  const today = now.slice(0, 10);

  if (today > dueIso) return "overdue";
  if (today === dueIso) return "due";
  return "current";
}

// ── Trainer qualification register ──────────────────────────────────────────

export type TrainerType = "internal" | "external";
export type QualificationBasis = "education" | "certification" | "experience";

export type TrainerRecord = {
  type: TrainerType;
  name: string;
  topics: string[];
  qualificationBasis: QualificationBasis;
  /** Evidence reference (e.g. certificate id, document link). */
  evidence?: string | null;
};

/** A trainer is valid for a topic only if listed for it with evidence on file. */
export function trainerCoversTopic(trainer: TrainerRecord, topic: string): boolean {
  return Boolean(trainer.evidence) && trainer.topics.includes(topic);
}
