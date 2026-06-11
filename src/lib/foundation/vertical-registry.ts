import { canonicalBioTypeFoundations } from "@/lib/foundation/biotypes";
import type { VerticalPack } from "@/lib/foundation/vertical-pack";
import { bioRiskFamilies } from "@/lib/bio-ai/risk-families";
import type { BioRiskFamily } from "@/lib/bio-ai/risk-families";
import type { VerticalKey } from "@/lib/bio-ai/types";

/**
 * DRAFT starter risk families for general_manufacturing (PredictSafe MFG).
 * Phase 1 ships these as a proof the abstraction is real; the hazard taxonomy,
 * critical controls, and owner-role naming still need John's domain sign-off
 * (see Phase 2). They are only ever loaded for orgs whose vertical is
 * general_manufacturing, so they cannot affect PredictSafe BIO behavior.
 */
const generalManufacturingRiskFamilies: BioRiskFamily[] = [
  {
    id: "machine_safety_energy_control",
    label: "Machine safeguarding and energy control",
    signalTypes: ["machine_guarding_event", "loto_event", "equipment_event"],
    keywords: ["guard", "guarding", "lockout", "tagout", "loto", "pinch point", "nip point", "unguarded", "energy isolation"],
    criticalControls: [
      "machine guarding verification",
      "lockout/tagout procedure applied",
      "energy isolation confirmed",
      "stop-use until safeguarded",
      "incident documentation"
    ],
    ownerRoles: ["maintenance_lead", "ehs", "production_supervisor"],
    actionType: "equipment_review"
  },
  {
    id: "ergonomics_manual_handling",
    label: "Ergonomics and manual handling",
    signalTypes: ["ergonomic_risk_signal"],
    keywords: ["ergonomic", "lifting", "manual handling", "repetitive", "strain", "musculoskeletal", "msd"],
    criticalControls: [
      "ergonomic assessment completed",
      "job rotation or load reduction",
      "early symptom reporting reviewed",
      "workstation adjustment",
      "training verification"
    ],
    ownerRoles: ["ehs", "production_supervisor"],
    actionType: "training_review"
  }
];

export const VERTICAL_PACKS: Record<VerticalKey, VerticalPack> = {
  biotech_pharma: {
    key: "biotech_pharma",
    brandLabel: "PredictSafe BIO",
    scoreLabel: "BioRisk score",
    regulator: ["FDA 21 CFR", "OSHA 29 CFR 1910", "CDC BMBL"],
    priorityHSLFactor: "Psychological Safety",
    // Existing canonical content, wrapped verbatim — same array references the
    // engine used before the abstraction, so bio output is unchanged.
    industryProfiles: canonicalBioTypeFoundations,
    riskFamilies: bioRiskFamilies
  },
  general_manufacturing: {
    key: "general_manufacturing",
    brandLabel: "PredictSafe MFG",
    scoreLabel: "Safety risk score",
    regulator: ["OSHA 29 CFR 1910"],
    priorityHSLFactor: "Complacency",
    // Phase 2 authors the full industry profiles + setup questions.
    industryProfiles: [],
    riskFamilies: generalManufacturingRiskFamilies
  }
};

export const DEFAULT_VERTICAL: VerticalKey = "biotech_pharma";

/**
 * Resolve the active vertical pack. A null/undefined/unknown key falls back to
 * DEFAULT_VERTICAL so that every legacy caller (which passes no vertical) keeps
 * the biotech_pharma behavior unchanged.
 */
export function resolvePack(vertical: VerticalKey | null | undefined): VerticalPack {
  if (vertical && vertical in VERTICAL_PACKS) {
    return VERTICAL_PACKS[vertical];
  }
  return VERTICAL_PACKS[DEFAULT_VERTICAL];
}
