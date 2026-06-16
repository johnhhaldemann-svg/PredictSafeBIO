export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { listHazards, type HazardRecord } from "@/lib/supabase/hazard-service";
import { HazardRegisterWrapper } from "@/components/HazardRegisterWrapper";
import type { Hazard, HazardType as ViewHazardType, HazardStatus as ViewHazardStatus } from "@/components/HazardRegister";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Hazard Register – PredictSafe" };

/* Map the richer service HazardType (10 values) → the 4-category view type */
function mapType(t: HazardRecord["hazardType"]): ViewHazardType {
  if (t === "biological") return "biological";
  if (t === "chemical") return "chemical";
  if (t === "ergonomic") return "ergonomic";
  return "physical"; // radiation, laser, electrical, fire, equipment, environmental, other
}

/* Map service status (4 values) → view status (4 values) */
function mapStatus(s: HazardRecord["status"]): ViewHazardStatus {
  if (s === "controlled" || s === "retired") return "controlled";
  if (s === "assessed") return "under_assessment";
  return "identified";
}

/* Derive a 0–10 risk score from hazard type + status (approximation until
   the risk_score column is added to the hazards table via migration) */
const BASE_SCORE: Record<HazardRecord["hazardType"], number> = {
  radiation: 9, biological: 8, chemical: 8, laser: 7, fire: 7,
  electrical: 6, equipment: 5, ergonomic: 4, environmental: 4, other: 4,
};
function deriveRiskScore(r: HazardRecord): number {
  const base = BASE_SCORE[r.hazardType] ?? 5;
  if (r.status === "controlled") return Math.max(1, base - 4);
  if (r.status === "assessed")   return Math.max(2, base - 2);
  return base;
}

const CONSEQUENCE: Record<HazardRecord["hazardType"], string> = {
  biological: "Exposure / infection",
  chemical: "Toxic exposure",
  ergonomic: "Repetitive strain",
  radiation: "Radiation exposure",
  laser: "Eye / skin injury",
  electrical: "Electrocution",
  fire: "Fire / burns",
  equipment: "Equipment failure",
  environmental: "Contamination",
  other: "General hazard",
};

function toViewHazard(r: HazardRecord): Hazard {
  const score = deriveRiskScore(r);
  const st = mapStatus(r.status);
  const controlsInPlace = st === "controlled" ? 3 : st === "under_assessment" ? 1 : 0;
  return {
    id: r.id,
    name: r.name,
    location: r.location ?? "Unspecified",
    containment: r.containment ?? "Not documented",
    containmentLevel: r.bslLevel && r.bslLevel !== "n/a" ? r.bslLevel : "PPE req.",
    type: mapType(r.hazardType),
    riskScore: score,
    consequenceNote: CONSEQUENCE[r.hazardType] ?? "General hazard",
    controlsInPlace,
    controlsRequired: 3,
    ownerName: null,
    nextReview: null,
    status: st,
  };
}

export default async function HazardRegisterPage() {
  const records = await listHazards().catch(() => []);
  const hazards = records.map(toViewHazard);
  return (
    <AppShell>
      <HazardRegisterWrapper hazards={hazards} />
    </AppShell>
  );
}
