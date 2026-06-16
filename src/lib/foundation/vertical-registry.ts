import { canonicalBioTypeFoundations } from "@/lib/foundation/biotypes";
import type { VerticalPack } from "@/lib/foundation/vertical-pack";
import { bioRiskFamilies } from "@/lib/bio-ai/risk-families";
import { generalManufacturingRiskFamilies } from "@/lib/foundation/packs/manufacturing-risk-families";
import type { VerticalKey } from "@/lib/bio-ai/types";

export const VERTICAL_PACKS: Record<VerticalKey, VerticalPack> = {
  biotech_pharma: {
    key: "biotech_pharma",
    brandLabel: "PredictSafe BIO",
    scoreLabel: "HSE risk score",
    tagline: "Biosafety Intelligence",
    contextLabel: "Biotech Context",
    contextHeading: "Program guidance for life science facilities",
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
    tagline: "Safety Intelligence",
    contextLabel: "Manufacturing Context",
    contextHeading: "Program guidance for manufacturing facilities",
    regulator: ["OSHA 29 CFR 1910"],
    priorityHSLFactor: "Complacency",
    // industryProfiles (per-vertical foundation profiles) are populated when
    // onboarding can select them (Phase 3); the shared OSHA 1910 program catalog
    // already covers manufacturing. riskFamilies is the engine-facing taxonomy.
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
