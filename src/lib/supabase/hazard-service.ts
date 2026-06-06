/**
 * Hazard Register service — diagram Stage 3 (Hazard Identification).
 * Covers the `hazards` table.
 *
 * Predictive tie-in: creating a hazard seeds the Predictive AI Safety Engine
 * with a leading indicator — each hazard is scored via the bio-ai engine and
 * written to risk_cells (typically a precursor_cell until controls exist).
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { scoreAndWriteRiskCell, resolveRiskCell } from "./continuous-scoring-service";
import { bioRiskFamilies } from "@/lib/bio-ai/risk-families";
import type { BioAiInput, BioAiSignal, BioSignalType } from "@/lib/bio-ai/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HazardType =
  | "biological"
  | "chemical"
  | "ergonomic"
  | "radiation"
  | "laser"
  | "electrical"
  | "fire"
  | "equipment"
  | "environmental"
  | "other";

export type HazardStatus = "identified" | "assessed" | "controlled" | "retired";

export type HazardRecord = {
  id: string;
  organizationId: string;
  labId?: string | null;
  name: string;
  hazardType: HazardType;
  riskFamily?: string | null;
  bslLevel?: string | null;
  containment?: string | null;
  location?: string | null;
  associatedMaterial?: string | null;
  status: HazardStatus;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
};

export type HazardResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels & options
// ---------------------------------------------------------------------------

export const hazardTypeLabels: Record<HazardType, string> = {
  biological: "Biological",
  chemical: "Chemical",
  ergonomic: "Ergonomic",
  radiation: "Radiation",
  laser: "Laser",
  electrical: "Electrical",
  fire: "Fire / flammable",
  equipment: "Equipment",
  environmental: "Environmental",
  other: "Other",
};

export const hazardStatusLabels: Record<HazardStatus, string> = {
  identified: "Identified",
  assessed: "Assessed",
  controlled: "Controlled",
  retired: "Retired",
};

export const bslLevels = ["n/a", "BSL-1", "BSL-2", "BSL-3", "BSL-4"] as const;

/** Risk-family options for the hazard form — drives predictive linkage. */
export const riskFamilyOptions = bioRiskFamilies.map((f) => ({ id: f.id, label: f.label }));

// ---------------------------------------------------------------------------
// Predictive scoring helpers
// ---------------------------------------------------------------------------

const hazardSeverity: Record<HazardType, number> = {
  radiation: 5,
  biological: 4,
  chemical: 4,
  laser: 4,
  fire: 4,
  electrical: 3,
  equipment: 3,
  ergonomic: 2,
  environmental: 2,
  other: 2,
};

const hazardSignalType: Record<HazardType, BioSignalType> = {
  biological: "biosafety_event",
  chemical: "contamination_event",
  equipment: "equipment_event",
  ergonomic: "ergonomic_risk_signal",
  environmental: "environmental_monitoring",
  radiation: "biosafety_event",
  laser: "equipment_event",
  electrical: "equipment_event",
  fire: "environmental_monitoring",
  other: "biosafety_event",
};

function controlPosture(status: HazardStatus): {
  effectiveness: NonNullable<BioAiInput["controlEffectiveness"]>;
  controlGap: number;
} {
  switch (status) {
    case "controlled":
      return { effectiveness: "effective", controlGap: 1 };
    case "assessed":
      return { effectiveness: "partial", controlGap: 3 };
    case "retired":
      return { effectiveness: "effective", controlGap: 1 };
    case "identified":
    default:
      return { effectiveness: "missing", controlGap: 5 };
  }
}

/**
 * Score a hazard as a leading indicator and upsert it into risk_cells.
 * Best-effort — never blocks the parent write.
 */
async function scoreHazardRecord(hazard: HazardRecord, userId?: string | null): Promise<void> {
  const severity = hazardSeverity[hazard.hazardType] ?? 2;
  const posture = controlPosture(hazard.status);
  const biosafetyImpact =
    hazard.hazardType === "biological" ||
    hazard.hazardType === "radiation" ||
    hazard.bslLevel === "BSL-3" ||
    hazard.bslLevel === "BSL-4";

  // Identified-but-uncontrolled hazards carry higher likelihood (a precursor).
  const likelihood = posture.effectiveness === "missing" ? Math.min(5, severity) : posture.effectiveness === "partial" ? Math.max(2, severity - 2) : 1;

  const signal: BioAiSignal = {
    id: hazard.id,
    type: hazardSignalType[hazard.hazardType] ?? "biosafety_event",
    label: `${hazardTypeLabels[hazard.hazardType]} hazard: ${hazard.name}`,
    severity,
    likelihood,
    controlGap: posture.controlGap,
    biosafetyImpactPotential: biosafetyImpact,
    evidence: hazard.description ?? undefined,
    sourceRecords: [{ module: "biosafety", recordId: hazard.id, label: hazard.name }],
  };

  const input: BioAiInput = {
    organizationId: hazard.organizationId,
    labId: hazard.labId ?? undefined,
    area: hazard.location ?? undefined,
    workflow: "hazard identification",
    materials: hazard.associatedMaterial ? [hazard.associatedMaterial] : undefined,
    biosafetyImpactPotential: biosafetyImpact,
    controlEffectiveness: posture.effectiveness,
    signals: [signal],
    sourceRecords: [{ module: "biosafety", recordId: hazard.id, label: hazard.name }],
  };

  await scoreAndWriteRiskCell({
    organizationId: hazard.organizationId,
    label: `Hazard: ${hazard.name}`,
    linkedRecordType: "hazards",
    linkedRecordId: hazard.id,
    input,
    extraPayload: {
      hazard_type: hazard.hazardType,
      risk_family: hazard.riskFamily,
      bsl_level: hazard.bslLevel,
      status: hazard.status,
      leading_indicator: posture.effectiveness === "missing",
    },
    createdBy: userId,
  });
}

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoHazards(): HazardRecord[] {
  return [
    {
      id: "demo-haz-001",
      organizationId: "demo-org",
      name: "Aerosol generation during centrifugation",
      hazardType: "biological",
      riskFamily: "biosafety_containment",
      bslLevel: "BSL-2",
      containment: "Sealed rotor + BSC Class II",
      location: "Lab 101",
      associatedMaterial: "Lentiviral vector",
      status: "identified",
      description: "Uncontained aerosols if rotor seal fails during high-speed spin.",
    },
    {
      id: "demo-haz-002",
      organizationId: "demo-org",
      name: "UV laser exposure at alignment station",
      hazardType: "laser",
      riskFamily: "equipment_calibration_validation",
      bslLevel: "n/a",
      containment: "Interlocked enclosure",
      location: "Lab 204",
      associatedMaterial: null,
      status: "assessed",
      description: "Class 3B beam path open during alignment.",
    },
    {
      id: "demo-haz-003",
      organizationId: "demo-org",
      name: "Repetitive pipetting strain",
      hazardType: "ergonomic",
      riskFamily: "sop_training_readiness",
      bslLevel: "n/a",
      containment: "Electronic pipettes + rotation schedule",
      location: "Lab 101",
      associatedMaterial: null,
      status: "controlled",
      description: "High-volume manual pipetting across long sessions.",
    },
  ];
}

function filterDemoHazards(filters?: { hazardType?: HazardType; status?: HazardStatus }) {
  return demoHazards().filter((h) => {
    if (filters?.hazardType && h.hazardType !== filters.hazardType) return false;
    if (filters?.status && h.status !== filters.status) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>): HazardRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    labId: row.lab_id as string | null,
    name: row.name as string,
    hazardType: (row.hazard_type as HazardType) ?? "other",
    riskFamily: row.risk_family as string | null,
    bslLevel: row.bsl_level as string | null,
    containment: row.containment as string | null,
    location: row.location as string | null,
    associatedMaterial: row.associated_material as string | null,
    status: (row.status as HazardStatus) ?? "identified",
    description: row.description as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: row.archived_at as string | null,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listHazards(filters?: {
  hazardType?: HazardType;
  status?: HazardStatus;
}): Promise<HazardRecord[]> {
  if (!isSupabaseConfigured()) return filterDemoHazards(filters);

  try {
    const ctx = await getProfileContext();
    if (!ctx) return filterDemoHazards(filters);

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("hazards")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (filters?.hazardType) query = query.eq("hazard_type", filters.hazardType);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return filterDemoHazards(filters);
  }
}

export async function getHazardById(id: string): Promise<HazardRecord | null> {
  if (!isSupabaseConfigured()) return demoHazards().find((h) => h.id === id) ?? null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("hazards").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  } catch {
    return null;
  }
}

export type CreateHazardInput = {
  name: string;
  hazardType: HazardType;
  riskFamily?: string | null;
  bslLevel?: string | null;
  containment?: string | null;
  location?: string | null;
  associatedMaterial?: string | null;
  status?: HazardStatus;
  description?: string | null;
};

export async function createHazard(input: CreateHazardInput): Promise<HazardResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Hazard added.", id: "demo-new" };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();
    const status: HazardStatus = input.status ?? "identified";

    const { data, error } = await supabase
      .from("hazards")
      .insert({
        organization_id: ctx.organizationId,
        name: input.name,
        hazard_type: input.hazardType,
        risk_family: input.riskFamily ?? null,
        bsl_level: input.bslLevel ?? null,
        containment: input.containment ?? null,
        location: input.location ?? null,
        associated_material: input.associatedMaterial ?? null,
        status,
        description: input.description ?? null,
        created_by: ctx.userId,
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    // Predictive tie-in: seed the engine with this hazard as a leading indicator.
    void scoreHazardRecord(
      {
        id: data.id,
        organizationId: ctx.organizationId,
        name: input.name,
        hazardType: input.hazardType,
        riskFamily: input.riskFamily ?? null,
        bslLevel: input.bslLevel ?? null,
        containment: input.containment ?? null,
        location: input.location ?? null,
        associatedMaterial: input.associatedMaterial ?? null,
        status,
        description: input.description ?? null,
      },
      ctx.userId
    );

    return {
      ok: true,
      message: "Hazard added. Draft — human review required. Now feeding the Predictive Engine as a leading indicator.",
      id: data.id,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function archiveHazard(id: string): Promise<HazardResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Hazard retired." };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("hazards")
      .update({ archived_at: new Date().toISOString(), status: "retired" })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);

    if (error) return { ok: false, message: error.message };

    await resolveRiskCell({ organizationId: ctx.organizationId, linkedRecordType: "hazards", linkedRecordId: id });

    return { ok: true, message: "Hazard retired and its risk signal resolved." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
