/**
 * Controlled Work / Permit service.
 * Covers the `controlled_work_permits` table.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { scorePermitRecord, resolveRiskCell } from "./continuous-scoring-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PermitType =
  | "loto"
  | "hot_work"
  | "line_break"
  | "confined_space"
  | "contractor"
  | "cleanroom"
  | "utility_shutdown"
  | "chemical_transfer";

export type CloseoutStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "active"
  | "closed"
  | "voided";

export type PermitRecord = {
  id: string;
  organizationId: string;
  permitType: PermitType;
  taskDescription?: string | null;
  location?: string | null;
  hazards?: string[];
  requiredControls?: string[];
  startTime?: string | null;
  stopTime?: string | null;
  isolationVerified: boolean;
  closeoutStatus: CloseoutStatus;
  closeoutNotes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  // derived
  isOverdue: boolean;    // active > 24 hrs without closeout
  isCritical: boolean;   // active > 24 hrs
};

export type PermitResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const permitTypeLabels: Record<PermitType, string> = {
  loto: "Lockout / Tagout (LOTO)",
  hot_work: "Hot Work",
  line_break: "Line Break",
  confined_space: "Confined Space Entry",
  contractor: "Contractor Work",
  cleanroom: "Cleanroom Access",
  utility_shutdown: "Utility Shutdown",
  chemical_transfer: "Chemical Transfer"
};

export const closeoutStatusLabels: Record<CloseoutStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  active: "Active",
  closed: "Closed",
  voided: "Voided"
};

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoPermits(): PermitRecord[] {
  const yesterday = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  return [
    {
      id: "demo-permit-001",
      organizationId: "demo-org",
      permitType: "hot_work",
      taskDescription: "Welding repair on exhaust flange — BSC room 201",
      location: "Lab 201",
      hazards: ["fire", "fumes", "sparks"],
      requiredControls: ["fire_watch", "fire_extinguisher", "ventilation"],
      startTime: yesterday,
      stopTime: tomorrow,
      isolationVerified: true,
      closeoutStatus: "active",
      createdAt: yesterday,
      isOverdue: true,
      isCritical: true
    },
    {
      id: "demo-permit-002",
      organizationId: "demo-org",
      permitType: "loto",
      taskDescription: "Autoclave preventive maintenance",
      location: "Sterilization Room",
      hazards: ["electrical", "steam"],
      requiredControls: ["loto_applied", "zero_energy_verified"],
      startTime: new Date().toISOString(),
      stopTime: tomorrow,
      isolationVerified: true,
      closeoutStatus: "approved",
      createdAt: new Date().toISOString(),
      isOverdue: false,
      isCritical: false
    },
    {
      id: "demo-permit-003",
      organizationId: "demo-org",
      permitType: "contractor",
      taskDescription: "HVAC filter replacement — BSL-2 suite",
      location: "BSL-2 Suite",
      hazards: ["biological", "particulates"],
      requiredControls: ["ppe_required", "escort_required", "biosafety_briefing"],
      startTime: null,
      stopTime: null,
      isolationVerified: false,
      closeoutStatus: "draft",
      createdAt: new Date().toISOString(),
      isOverdue: false,
      isCritical: false
    }
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function derivePermitFlags(row: {
  closeout_status?: string | null;
  start_time?: string | null;
}): { isOverdue: boolean; isCritical: boolean } {
  const active = row.closeout_status === "active" || row.closeout_status === "approved";
  if (!active || !row.start_time) return { isOverdue: false, isCritical: false };

  const hoursOpen = (Date.now() - new Date(row.start_time).getTime()) / 3600000;
  return {
    isCritical: hoursOpen > 24,
    isOverdue: hoursOpen > 24
  };
}

function mapRow(row: Record<string, unknown>): PermitRecord {
  const flags = derivePermitFlags({
    closeout_status: row.closeout_status as string | null,
    start_time: row.start_time as string | null
  });
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    permitType: (row.permit_type as PermitType) ?? "contractor",
    taskDescription: row.task_description as string | null,
    location: row.location as string | null,
    hazards: (row.hazards as string[]) ?? [],
    requiredControls: (row.required_controls as string[]) ?? [],
    startTime: row.start_time as string | null,
    stopTime: row.stop_time as string | null,
    isolationVerified: (row.isolation_verified as boolean) ?? false,
    closeoutStatus: (row.closeout_status as CloseoutStatus) ?? "draft",
    closeoutNotes: row.closeout_notes as string | null,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: row.archived_at as string | null,
    ...flags
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listPermits(filters?: {
  status?: CloseoutStatus;
  overdue?: boolean;
}): Promise<PermitRecord[]> {
  if (!isSupabaseConfigured()) return demoPermits();

  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoPermits();

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("controlled_work_permits")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("closeout_status", filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const records = (data ?? []).map(mapRow);
    if (filters?.overdue) return records.filter((r) => r.isOverdue);
    return records;
  } catch {
    return demoPermits();
  }
}

export type CreatePermitInput = {
  permitType: PermitType;
  taskDescription?: string | null;
  location?: string | null;
  hazards?: string[];
  requiredControls?: string[];
  startTime?: string | null;
  stopTime?: string | null;
};

export async function createPermit(input: CreatePermitInput): Promise<PermitResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Permit created.", id: "demo-new" };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("controlled_work_permits")
      .insert({
        organization_id: ctx.organizationId,
        permit_type: input.permitType,
        task_description: input.taskDescription ?? null,
        location: input.location ?? null,
        hazards: input.hazards ?? [],
        required_controls: input.requiredControls ?? [],
        start_time: input.startTime ?? null,
        stop_time: input.stopTime ?? null,
        isolation_verified: false,
        closeout_status: "draft",
        created_by: ctx.userId
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    // Score via bio-ai — replaces hardcoded control_cell with engine-assessed risk
    void scorePermitRecord({
      permit: {
        id: data.id,
        permitType: input.permitType,
        taskDescription: input.taskDescription ?? null,
        location: input.location ?? null,
        hazards: input.hazards ?? [],
        requiredControls: input.requiredControls ?? [],
        isolationVerified: false,
        closeoutStatus: "draft",
        startTime: input.startTime ?? null,
      },
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    });

    return { ok: true, message: "Permit created. Submit for approval before starting work.", id: data.id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function updatePermitStatus(
  id: string,
  closeoutStatus: CloseoutStatus,
  notes?: string
): Promise<PermitResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: `Demo: Permit ${closeoutStatus}.` };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();

    const updates: Record<string, unknown> = {
      closeout_status: closeoutStatus,
      updated_at: new Date().toISOString()
    };
    if (notes) updates.closeout_notes = notes;
    if (closeoutStatus === "active") updates.start_time = new Date().toISOString();

    const { error } = await supabase
      .from("controlled_work_permits")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);

    if (error) return { ok: false, message: error.message };

    if (closeoutStatus === "closed" || closeoutStatus === "voided") {
      // Permit closed — resolve the risk cell and promote to improvement_cell
      void resolveRiskCell({
        organizationId: ctx.organizationId,
        linkedRecordType: "controlled_work_permits",
        linkedRecordId: id,
        resolveLabel: `Permit closed: ${notes ?? closeoutStatus}`,
      });
    } else {
      // Permit status changed (approved → active, etc.) — re-score with current state.
      // Fetch enough fields to pass to the scorer.
      const { data: permit } = await supabase
        .from("controlled_work_permits")
        .select("permit_type, task_description, location, hazards, required_controls, isolation_verified, start_time")
        .eq("id", id)
        .eq("organization_id", ctx.organizationId)
        .maybeSingle();

      if (permit) {
        void scorePermitRecord({
          permit: {
            id,
            permitType: permit.permit_type as string,
            taskDescription: permit.task_description as string | null,
            location: permit.location as string | null,
            hazards: (permit.hazards as string[]) ?? [],
            requiredControls: (permit.required_controls as string[]) ?? [],
            isolationVerified: (permit.isolation_verified as boolean) ?? false,
            closeoutStatus,
            startTime: (permit.start_time as string | null) ?? null,
          },
          organizationId: ctx.organizationId,
          userId: ctx.userId,
        });
      }
    }

    return { ok: true, message: `Permit ${closeoutStatusLabels[closeoutStatus]}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
