import type { BioRiskFamily } from "@/lib/bio-ai/risk-families";
import type { VerticalKey } from "@/lib/bio-ai/types";
import type { BioTypeFoundation } from "@/lib/foundation/biotypes";

/**
 * A VerticalPack is the per-industry configuration layer that sits beneath the
 * shared risk engine. The engine (assessBioRisk) and the ARC P-CLSS pipeline are
 * constant across verticals; only this pack changes — regulator references,
 * hazard/risk families, industry profiles, owner roles, and surface labels.
 *
 * PredictSafe BIO (biotech_pharma) is the original product; its pack simply
 * wraps the existing canonical foundations and bio risk families verbatim, so
 * existing organizations behave identically. New verticals (e.g. PredictSafe MFG
 * / general_manufacturing) supply their own pack without touching the engine.
 */
export type VerticalPack = {
  key: VerticalKey;
  /** Module brand shown inside an org of this vertical, e.g. "PredictSafe BIO". */
  brandLabel: string;
  /** Risk-score noun used in copy, e.g. "BioRisk score" vs "Safety risk score". */
  scoreLabel: string;
  /** Regulatory bodies/standards this vertical maps to (display + applicability). */
  regulator: string[];
  /** Highest-weighted ARC Human Signal Layer factor for this vertical. */
  priorityHSLFactor: string;
  /** Per-industry foundation profiles (programs, documents, records, training). */
  industryProfiles: BioTypeFoundation[];
  /** Risk families the engine matches signals/keywords against for this vertical. */
  riskFamilies: BioRiskFamily[];
};
