/**
 * Exposure Map service — diagram Stage 2 (Work & Exposure Mapping).
 * Covers the `exposures` table and a read of `labs` for the map.
 *
 * Predictive tie-in (exposure-based early warning): each exposure pathway is
 * scored by route severity x frequency and written to risk_cells. Accumulating
 * high-route, routine exposures raise predicted risk before an incident.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { scoreAndWriteRiskCell, resolveRiskCell } from "./continuous-scoring-service";
import type { BioAiInput, BioAiSignal } from "@/lib/bio-ai/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExposureRoute = "inhalation" | "skin" | "injection" | "ingestion" | "mucosal" | "other";
export type ExposureFrequency = "routine" | "occasional" | "rare";
export type ExposureStatus = "active" | "mitigated" | "retired";

export type LabOption = { id: string; name: string; biosafetyLevel?: string | null };

export type ExposureRecord = {
  id: string;
  organizationId: string;
  labId?: string | null;
  hazardId?: string | null;
  material?: string | null;
  personRole?: string | null;
  exposureRoute: ExposureRoute;
  frequency: ExposureFrequency;
  status: ExposureStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  // Derived
  highRoute: boolean;
};

export type ExposureResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const exposureRouteLabels: Record<ExposureRoute, string> = {
  inhalation: "Inhalation",
  skin: "Skin / dermal",
  injection: "Injection / sharps",
  ingestion: "Ingestion",
  mucosal: "Mucosal",
  other: "Other",
};

export const exposureFrequencyLabels: Record<ExposureFrequency, string> = {
  routine: "Routine",
  occasional: "Occasional",
  rare: "Rare",
};

export const exposureStatusLabels: Record<ExposureStatus, string> = {
  active: "Active",
  mitigated: "Mitigated",
  retired: "Retired",
};

export const exposureRouteOptions: ExposureRoute[] = [
  "inhalation",
  "skin",
  "injection",
  "ingestion",
  "mucosal",
  "other",
];

export const exposureFrequencyOptions: ExposureFrequency[] = ["routine", "occasional", "rare"];

// ---------------------------------------------------------------------------
// Early-warning scoring (predictive tie-in)
// ---------------------------------------------------------------------------

const routeSeverity: Record<ExposureRoute, number> = {
  injection: 5,
  inhalation: 4,
  mucosal: 3,
  ingestion: 3,
  skin: 2,
  other: 2,
};

const frequencyLikelihood: Record<ExposureFrequency, number> = {
  routine: 4,
  occasional: 3,
  rare: 2,
};

const HIGH_ROUTES: ExposureRoute[] = ["injection", "inhalation"];

function isHighRoute(route: ExposureRoute): boolean {
  return HIGH_ROUTES.includes(route);
}

/**
 * Score an exposure pathway as an early-warning signal and upsert it into
 * risk_cells. Best-effort — never blocks the parent write.
 */
async function scoreExposure(exposure: ExposureRecord, userId?: string | null): Promise<void> {
  const severity = routeSeverity[exposure.exposureRoute] ?? 2;
  const likelihood = frequencyLikelihood[exposure.frequency] ?? 3;
  const high = isHighRoute(exposure.exposureRoute);
  // No linked hazard control context here, so treat exposure as a partial-control precursor.
  const controlGap = exposure.status === "mitigated" ? 2 : high ? 4 : 3;

  const who = exposure.personRole ?? "personnel";
  const what = exposure.material ?? "material";
  const label = `Exposure: ${who} — ${what} via ${exposureRouteLabels[exposure.exposureRoute]}`;

  const signal: BioAiSignal = {
    id: exposure.id,
    type: "environmental_monitoring",
    label,
    severity,
    likelihood,
    controlGap,
    biosafetyImpactPotential: high,
    evidence: exposure.notes ?? undefined,
    sourceRecords: [{ module: "biosafety", recordId: exposure.id, label }],
  };

  const input: BioAiInput = {
    organizationId: exposure.organizationId,
    labId: exposure.labId ?? undefined,
    workflow: "work and exposure mapping",
    materials: exposure.material ? [exposure.material] : undefined,
    biosafetyImpactPotential: high,
    controlEffectiveness: exposure.status === "mitigated" ? "partial" : "ineffective",
    signals: [signal],
    sourceRecords: [{ module: "biosafety", recordId: exposure.id, label }],
  };

  await scoreAndWriteRiskCell({
    organizationId: exposure.organizationId,
    label,
    linkedRecordType: "exposures",
    linkedRecordId: exposure.id,
    input,
    extraPayload: {
      exposure_route: exposure.exposureRoute,
      frequency: exposure.frequency,
      high_route: high,
      hazard_id: exposure.hazardId,
      early_warning: high && exposure.frequency === "routine",
    },
    createdBy: userId,
  });
}

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoLabs(): LabOption[] {
  return [
    { id: "demo-lab-101", name: "Lab 101", biosafetyLevel: "BSL-2" },
    { id: "demo-lab-204", name: "Lab 204", biosafetyLevel: "BSL-1" },
  ];
}

function demoExposures(): ExposureRecord[] {
  return [
    {
      id: "demo-exp-001",
      organizationId: "demo-org",
      labId: "demo-lab-101",
      hazardId: "demo-haz-001",
      material: "Lentiviral vector",
      personRole: "Research associate",
      exposureRoute: "injection",
      frequency: "routine",
      status: "active",
      notes: "Needlestick risk during inoculation.",
      highRoute: true,
    },
    {
      id: "demo-exp-002",
      organizationId: "demo-org",
      labId: "demo-lab-101",
      hazardId: null,
      material: "Aerosolized reagent",
      personRole: "Lab technician",
      exposureRoute: "inhalation",
      frequency: "occasional",
      status: "mitigated",
      notes: "Handled inside fume hood.",
      highRoute: true,
    },
    {
      id: "demo-exp-003",
      organizationId: "demo-org",
      labId: "demo-lab-204",
      hazardId: null,
      material: "Disinfectant",
      personRole: "All staff",
      exposureRoute: "skin",
      frequency: "routine",
      status: "active",
      notes: "Surface decontamination.",
      highRoute: false,
    },
  ];
}

function filterDemoExposures(filters?: { labId?: string; highRouteOnly?: boolean }) {
  return demoExposures().filter((e) => {
    if (filters?.labId && e.labId !== filters.labId) return false;
    if (filters?.highRouteOnly && !e.highRoute) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>): ExposureRecord {
  const route = (row.exposure_route as ExposureRoute) ?? "other";
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    labId: row.lab_id as string | null,
    hazardId: row.hazard_id as string | null,
    material: row.material as string | null,
    personRole: row.person_role as string | null,
    exposureRoute: route,
    frequency: (row.frequency as ExposureFrequency) ?? "occasional",
    status: (row.status as ExposureStatus) ?? "active",
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: row.archived_at as string | null,
    highRoute: isHighRoute(route),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listLabsForExposure(): Promise<LabOption[]> {
  if (!isSupabaseConfigured()) return demoLabs();

  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoLabs();

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("labs")
      .select("id,name,biosafety_level")
      .eq("organization_id", ctx.organizationId)
      .order("name");

    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      biosafetyLevel: (row.biosafety_level as string | null) ?? null,
    }));
  } catch {
    return demoLabs();
  }
}

export async function listExposures(filters?: {
  labId?: string;
  highRouteOnly?: boolean;
}): Promise<ExposureRecord[]> {
  if (!isSupabaseConfigured()) return filterDemoExposures(filters);

  try {
    const ctx = await getProfileContext();
    if (!ctx) return filterDemoExposures(filters);

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("exposures")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (filters?.labId) query = query.eq("lab_id", filters.labId);
    if (filters?.highRouteOnly) query = query.in("exposure_route", HIGH_ROUTES);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return filterDemoExposures(filters);
  }
}

export type CreateExposureInput = {
  labId?: string | null;
  hazardId?: string | null;
  material?: string | null;
  personRole?: string | null;
  exposureRoute: ExposureRoute;
  frequency?: ExposureFrequency;
  status?: ExposureStatus;
  notes?: string | null;
};

export async function createExposure(input: CreateExposureInput): Promise<ExposureResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Exposure pathway added.", id: "demo-new" };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();
    const frequency: ExposureFrequency = input.frequency ?? "occasional";
    const status: ExposureStatus = input.status ?? "active";

    const { data, error } = await supabase
      .from("exposures")
      .insert({
        organization_id: ctx.organizationId,
        lab_id: input.labId ?? null,
        hazard_id: input.hazardId ?? null,
        material: input.material ?? null,
        person_role: input.personRole ?? null,
        exposure_route: input.exposureRoute,
        frequency,
        status,
        notes: input.notes ?? null,
        created_by: ctx.userId,
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    // Predictive tie-in: exposure-based early warning.
    void scoreExposure(
      {
        id: data.id,
        organizationId: ctx.organizationId,
        labId: input.labId ?? null,
        hazardId: input.hazardId ?? null,
        material: input.material ?? null,
        personRole: input.personRole ?? null,
        exposureRoute: input.exposureRoute,
        frequency,
        status,
        notes: input.notes ?? null,
        highRoute: isHighRoute(input.exposureRoute),
      },
      ctx.userId
    );

    return {
      ok: true,
      message: "Exposure pathway mapped. Draft — human review required. Early-warning signal sent to the engine.",
      id: data.id,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function setExposureStatus(id: string, status: ExposureStatus): Promise<ExposureResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Exposure updated." };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("exposures")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId)
      .select("*")
      .single();

    if (error) return { ok: false, message: error.message };

    if (status === "retired") {
      await resolveRiskCell({
        organizationId: ctx.organizationId,
        linkedRecordType: "exposures",
        linkedRecordId: id,
      });
    } else if (data) {
      void scoreExposure(mapRow(data), ctx.userId);
    }

    return { ok: true, message: `Exposure marked ${exposureStatusLabels[status].toLowerCase()}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
