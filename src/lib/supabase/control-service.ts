/**
 * Control Register service — diagram Stage 5 (Control Selection & Planning).
 * Covers the `controls` table and the hierarchy of controls.
 *
 * Predictive tie-in (residual-risk forecasting): a control is linked to a
 * hazard. Whenever controls change, the linked hazard's risk cell is re-scored
 * with the residual control posture — better controls lower predicted risk,
 * and overdue verification raises it again.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { scoreAndWriteRiskCell, resolveRiskCell } from "./continuous-scoring-service";
import { getHazardById, hazardTypeLabels, type HazardType } from "./hazard-service";
import type { BioAiInput, BioAiSignal, BioSignalType } from "@/lib/bio-ai/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ControlTier =
  | "elimination"
  | "substitution"
  | "engineering"
  | "administrative"
  | "ppe";

export type ControlStatus = "planned" | "in_place" | "verified" | "retired";

export type ControlRecord = {
  id: string;
  organizationId: string;
  hazardId?: string | null;
  name: string;
  controlType: ControlTier;
  status: ControlStatus;
  description?: string | null;
  ownerRole?: string | null;
  verificationDue?: string | null;
  lastVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  // Derived
  verificationOverdue: boolean;
};

export type ControlResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels, ranks & options
// ---------------------------------------------------------------------------

/** Hierarchy of controls — most effective first. Higher rank = more effective. */
export const controlTierRank: Record<ControlTier, number> = {
  elimination: 5,
  substitution: 4,
  engineering: 3,
  administrative: 2,
  ppe: 1,
};

export const controlTierLabels: Record<ControlTier, string> = {
  elimination: "Elimination",
  substitution: "Substitution",
  engineering: "Engineering",
  administrative: "Administrative",
  ppe: "PPE",
};

export const controlStatusLabels: Record<ControlStatus, string> = {
  planned: "Planned",
  in_place: "In place",
  verified: "Verified",
  retired: "Retired",
};

// ---------------------------------------------------------------------------
// Residual-risk forecasting (predictive tie-in)
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

type ResidualPosture = {
  effectiveness: NonNullable<BioAiInput["controlEffectiveness"]>;
  controlGap: number;
  highestTier: ControlTier | null;
  activeControls: number;
  overdueVerification: boolean;
};

function isOverdue(verificationDue?: string | null, status?: ControlStatus): boolean {
  if (!verificationDue) return false;
  if (status === "verified") return false;
  return new Date(verificationDue) < new Date();
}

/** Compute a hazard's residual control posture from its controls. */
function residualPosture(controls: ControlRecord[]): ResidualPosture {
  const active = controls.filter((c) => c.status !== "retired" && !c.archivedAt);
  if (active.length === 0) {
    return { effectiveness: "missing", controlGap: 5, highestTier: null, activeControls: 0, overdueVerification: false };
  }

  const statusFactor: Record<ControlStatus, number> = {
    verified: 1,
    in_place: 0.6,
    planned: 0.3,
    retired: 0,
  };

  let best = 0;
  let highestTier: ControlTier | null = null;
  let overdueVerification = false;

  for (const c of active) {
    const overdue = c.verificationOverdue;
    if (overdue) overdueVerification = true;
    const factor = overdue ? Math.min(statusFactor[c.status], 0.4) : statusFactor[c.status];
    const score = controlTierRank[c.controlType] * factor;
    if (score > best) {
      best = score;
      highestTier = c.controlType;
    }
  }

  let effectiveness: ResidualPosture["effectiveness"];
  let controlGap: number;
  if (best >= 4) {
    effectiveness = "effective";
    controlGap = 1;
  } else if (best >= 2.4) {
    effectiveness = "partial";
    controlGap = 3;
  } else {
    effectiveness = "ineffective";
    controlGap = 4;
  }

  // Overdue verification degrades the residual posture by one level.
  if (overdueVerification) {
    if (effectiveness === "effective") {
      effectiveness = "partial";
      controlGap = 3;
    } else if (effectiveness === "partial") {
      effectiveness = "ineffective";
      controlGap = 4;
    }
  }

  return { effectiveness, controlGap, highestTier, activeControls: active.length, overdueVerification };
}

/**
 * Re-score a hazard's risk cell using the residual posture from its controls.
 * Best-effort — never blocks the parent write.
 */
async function rescoreHazardResidual(
  hazardId: string,
  organizationId: string,
  userId?: string | null
): Promise<void> {
  try {
    const hazard = await getHazardById(hazardId);
    if (!hazard) return;

    const controls = await listControls({ hazardId });
    const posture = residualPosture(controls);

    const severity = hazardSeverity[hazard.hazardType] ?? 2;
    const biosafetyImpact =
      hazard.hazardType === "biological" ||
      hazard.hazardType === "radiation" ||
      hazard.bslLevel === "BSL-3" ||
      hazard.bslLevel === "BSL-4";

    const likelihood =
      posture.effectiveness === "missing"
        ? Math.min(5, severity)
        : posture.effectiveness === "ineffective"
          ? Math.max(2, severity - 1)
          : posture.effectiveness === "partial"
            ? Math.max(2, severity - 2)
            : 1;

    const residualNote =
      posture.activeControls > 0
        ? ` (residual after ${posture.activeControls} control${posture.activeControls === 1 ? "" : "s"}${posture.overdueVerification ? ", verification overdue" : ""})`
        : "";

    const signal: BioAiSignal = {
      id: hazard.id,
      type: hazardSignalType[hazard.hazardType] ?? "biosafety_event",
      label: `${hazardTypeLabels[hazard.hazardType]} hazard: ${hazard.name}${residualNote}`,
      severity,
      likelihood,
      controlGap: posture.controlGap,
      biosafetyImpactPotential: biosafetyImpact,
      overdue: posture.overdueVerification,
      sourceRecords: [{ module: "biosafety", recordId: hazard.id, label: hazard.name }],
    };

    const input: BioAiInput = {
      organizationId,
      labId: hazard.labId ?? undefined,
      area: hazard.location ?? undefined,
      workflow: "control selection and planning",
      biosafetyImpactPotential: biosafetyImpact,
      controlEffectiveness: posture.effectiveness,
      signals: [signal],
      sourceRecords: [{ module: "biosafety", recordId: hazard.id, label: hazard.name }],
    };

    await scoreAndWriteRiskCell({
      organizationId,
      label: `Hazard: ${hazard.name}${residualNote}`,
      linkedRecordType: "hazards",
      linkedRecordId: hazard.id,
      input,
      extraPayload: {
        hazard_type: hazard.hazardType,
        residual_effectiveness: posture.effectiveness,
        highest_control_tier: posture.highestTier,
        active_controls: posture.activeControls,
        overdue_verification: posture.overdueVerification,
        forecast: "residual_after_controls",
      },
      createdBy: userId,
    });
  } catch {
    // Best-effort — never block the parent write
  }
}

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoControls(): ControlRecord[] {
  return [
    {
      id: "demo-ctrl-001",
      organizationId: "demo-org",
      hazardId: "demo-haz-001",
      name: "Class II Biosafety Cabinet",
      controlType: "engineering",
      status: "verified",
      description: "Aerosols contained at the source.",
      ownerRole: "Biosafety Officer",
      verificationDue: null,
      lastVerifiedAt: new Date().toISOString(),
      verificationOverdue: false,
    },
    {
      id: "demo-ctrl-002",
      organizationId: "demo-org",
      hazardId: "demo-haz-002",
      name: "Interlocked laser enclosure",
      controlType: "engineering",
      status: "in_place",
      description: "Beam path enclosed during operation.",
      ownerRole: "Laser Safety Officer",
      verificationDue: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10),
      lastVerifiedAt: null,
      verificationOverdue: true,
    },
    {
      id: "demo-ctrl-003",
      organizationId: "demo-org",
      hazardId: "demo-haz-001",
      name: "Sealed-rotor SOP + training",
      controlType: "administrative",
      status: "in_place",
      description: "Mandatory sealed rotor for all spins.",
      ownerRole: "Lab Manager",
      verificationDue: null,
      lastVerifiedAt: null,
      verificationOverdue: false,
    },
  ];
}

function filterDemoControls(filters?: { hazardId?: string }) {
  return demoControls().filter((c) => (filters?.hazardId ? c.hazardId === filters.hazardId : true));
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>): ControlRecord {
  const verificationDue = row.verification_due as string | null;
  const status = (row.status as ControlStatus) ?? "planned";
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    hazardId: row.hazard_id as string | null,
    name: row.name as string,
    controlType: (row.control_type as ControlTier) ?? "administrative",
    status,
    description: row.description as string | null,
    ownerRole: row.owner_role as string | null,
    verificationDue,
    lastVerifiedAt: row.last_verified_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: row.archived_at as string | null,
    verificationOverdue: isOverdue(verificationDue, status),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listControls(filters?: { hazardId?: string }): Promise<ControlRecord[]> {
  if (!isSupabaseConfigured()) return filterDemoControls(filters);

  try {
    const ctx = await getProfileContext();
    if (!ctx) return filterDemoControls(filters);

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("controls")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (filters?.hazardId) query = query.eq("hazard_id", filters.hazardId);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return filterDemoControls(filters);
  }
}

export type CreateControlInput = {
  hazardId?: string | null;
  name: string;
  controlType: ControlTier;
  status?: ControlStatus;
  description?: string | null;
  ownerRole?: string | null;
  verificationDue?: string | null;
};

export async function createControl(input: CreateControlInput): Promise<ControlResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Control added.", id: "demo-new" };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();
    const status: ControlStatus = input.status ?? "planned";

    const { data, error } = await supabase
      .from("controls")
      .insert({
        organization_id: ctx.organizationId,
        hazard_id: input.hazardId ?? null,
        name: input.name,
        control_type: input.controlType,
        status,
        description: input.description ?? null,
        owner_role: input.ownerRole ?? null,
        verification_due: input.verificationDue ?? null,
        last_verified_at: status === "verified" ? new Date().toISOString() : null,
        created_by: ctx.userId,
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    // Predictive tie-in: re-forecast the linked hazard's residual risk.
    if (input.hazardId) {
      void rescoreHazardResidual(input.hazardId, ctx.organizationId, ctx.userId);
    }

    return {
      ok: true,
      message: "Control added. Draft — human review required. Residual risk re-forecast for the linked hazard.",
      id: data.id,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function setControlStatus(id: string, status: ControlStatus): Promise<ControlResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Control updated." };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "verified") update.last_verified_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("controls")
      .update(update)
      .eq("id", id)
      .eq("organization_id", ctx.organizationId)
      .select("hazard_id")
      .single();

    if (error) return { ok: false, message: error.message };

    if (data?.hazard_id) {
      void rescoreHazardResidual(data.hazard_id as string, ctx.organizationId, ctx.userId);
    }

    return { ok: true, message: `Control marked ${controlStatusLabels[status].toLowerCase()}. Residual risk re-forecast.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function archiveControl(id: string): Promise<ControlResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Control retired." };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("controls")
      .update({ archived_at: new Date().toISOString(), status: "retired" })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId)
      .select("hazard_id")
      .single();

    if (error) return { ok: false, message: error.message };

    if (data?.hazard_id) {
      void rescoreHazardResidual(data.hazard_id as string, ctx.organizationId, ctx.userId);
    } else {
      await resolveRiskCell({
        organizationId: ctx.organizationId,
        linkedRecordType: "controls",
        linkedRecordId: id,
      });
    }

    return { ok: true, message: "Control retired. Residual risk re-forecast for the linked hazard." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
