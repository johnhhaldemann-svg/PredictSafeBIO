// ---------------------------------------------------------------------------
// Serious Injury & Fatality (SIF) potential model.
//
// Modern EHS practice separates the small set of hazards that could KILL or
// permanently maim from the large volume of minor injuries, and tracks their
// precursors. The reference SAFE audit calls these "SIFp" modules.
//
// The high-energy principle (after the work of Fatality & Serious Injury
// research): SIF potential exists when a HIGH-ENERGY SOURCE is present and a
// DIRECT CONTROL is absent, failed, or ineffective — regardless of the actual
// outcome. A high-energy event with no/minor harm is a SIF *precursor*: it
// could have been a fatality.
//
// Pure functions + data; integrates with ./scoring risk bands.
// ---------------------------------------------------------------------------

import type { RiskBand } from "./scoring";

/** High-energy hazard sources capable of causing a serious injury or fatality. */
export type EnergySource =
  | "gravity"
  | "motion"
  | "mechanical"
  | "electrical"
  | "pressure"
  | "temperature"
  | "chemical"
  | "biological"
  | "radiation"
  | "sound_explosion";

export const ENERGY_SOURCE_LABELS: Record<EnergySource, string> = {
  gravity: "Gravity (falls, dropped or falling objects)",
  motion: "Motion (vehicles, mobile equipment, moving loads)",
  mechanical: "Mechanical (rotating, crushing, stored mechanical energy)",
  electrical: "Electrical energy",
  pressure: "Pressure (compressed gas, hydraulics, pneumatics, vacuum)",
  temperature: "Temperature (hot/cold surfaces, steam, fire, cryogens)",
  chemical: "Chemical (toxic or corrosive release / exposure)",
  biological: "Biological (infectious agent exposure or release)",
  radiation: "Radiation (ionizing or high-power non-ionizing)",
  sound_explosion: "Sound / explosion (blast, deflagration, high noise)"
};

// Keyword cues for detecting energy sources in free-text hazard descriptions.
const ENERGY_KEYWORDS: Record<EnergySource, string[]> = {
  gravity: ["fall", "falling", "height", "elevated", "dropped", "ladder", "roof", "scaffold", "mezzanine", "rack"],
  motion: ["forklift", "vehicle", "pit ", "powered industrial truck", "mobile", "crane", "hoist", "moving load", "struck by"],
  mechanical: ["rotating", "crush", "pinch point", "nip point", "conveyor", "press", "guard", "stored energy", "machine"],
  electrical: ["electrical", "voltage", "arc flash", "energized", "shock", "live circuit"],
  pressure: ["pressure", "compressed gas", "hydraulic", "pneumatic", "cylinder", "vacuum", "vessel", "boiler"],
  temperature: ["hot", "burn", "steam", "fire", "flame", "cryogen", "ln2", "liquid nitrogen", "autoclave", "thermal"],
  chemical: ["chemical", "toxic", "corrosive", "acid", "solvent", "release", "fume", "vapor", "exposure"],
  biological: ["biological", "infectious", "pathogen", "bbp", "bloodborne", "aerosol", "biohazard", "sharps"],
  radiation: ["radiation", "radioactive", "x-ray", "laser", "ionizing", "isotope"],
  sound_explosion: ["explosion", "blast", "deflagration", "detonation", "noise", "decibel", "85 db"]
};

/** Detect likely high-energy sources from a free-text hazard description. */
export function detectEnergySources(text: string): EnergySource[] {
  const haystack = text.toLowerCase();
  const found: EnergySource[] = [];
  for (const source of Object.keys(ENERGY_KEYWORDS) as EnergySource[]) {
    if (ENERGY_KEYWORDS[source].some((keyword) => haystack.includes(keyword))) {
      found.push(source);
    }
  }
  return found;
}

export type SifOutcome =
  | "none"
  | "near_miss"
  | "first_aid"
  | "recordable"
  | "lost_time"
  | "fatality";

/** Outcomes that constitute an actual serious injury or fatality. */
const ACTUAL_SIF_OUTCOMES: SifOutcome[] = ["lost_time", "fatality"];

export type SifInput = {
  /** High-energy sources present (supply directly, or derive via detectEnergySources). */
  energySources: EnergySource[];
  /** Is a verified DIRECT control mitigating the energy in place and effective? */
  directControlInPlace: boolean;
  /** Actual outcome, if this represents a real event (default "none"). */
  actualOutcome?: SifOutcome;
  /** Optional inherent risk band for context. */
  inherentBand?: RiskBand;
};

export type SifResult = {
  /** Could this cause a serious injury or fatality? */
  sifPotential: boolean;
  /** A high-energy event/condition with a missing control but no serious harm yet. */
  isPrecursor: boolean;
  /** A high-energy event that actually resulted in serious harm. */
  isActualSif: boolean;
  energySources: EnergySource[];
  rationale: string;
};

/**
 * Classify SIF potential. SIF potential is present when a high-energy source
 * exists AND no effective direct control is in place. Such a case with no (yet)
 * serious outcome is a *precursor*; with a serious outcome it is an actual SIF.
 */
export function classifySif(input: SifInput): SifResult {
  const outcome = input.actualOutcome ?? "none";
  const highEnergy = input.energySources.length > 0;
  const sifPotential = highEnergy && !input.directControlInPlace;
  const isActualSif = highEnergy && ACTUAL_SIF_OUTCOMES.includes(outcome);
  const isPrecursor = sifPotential && !ACTUAL_SIF_OUTCOMES.includes(outcome);

  let rationale: string;
  if (!highEnergy) {
    rationale = "No high-energy source identified; not classified as SIF potential.";
  } else if (isActualSif) {
    rationale = `Actual serious injury/fatality involving high energy (${input.energySources.map((s) => ENERGY_SOURCE_LABELS[s]).join(", ")}).`;
  } else if (isPrecursor) {
    rationale = `High-energy source present with no effective direct control — SIF precursor. Energy: ${input.energySources.map((s) => ENERGY_SOURCE_LABELS[s]).join(", ")}.`;
  } else {
    rationale = "High-energy source present but a direct control is in place; potential mitigated, continue to verify the control.";
  }

  return { sifPotential, isPrecursor, isActualSif, energySources: input.energySources, rationale };
}

/** Convenience: classify SIF straight from a hazard description + control flag. */
export function classifySifFromText(
  description: string,
  directControlInPlace: boolean,
  actualOutcome: SifOutcome = "none"
): SifResult {
  return classifySif({
    energySources: detectEnergySources(description),
    directControlInPlace,
    actualOutcome
  });
}
