/**
 * Waste Management service.
 * Covers the `waste_records` table.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WasteType =
  | "chemical"
  | "biological"
  | "radioactive"
  | "sharps"
  | "pharmaceutical"
  | "universal"
  | "solid"
  | "liquid"
  | "mixed"
  | "other";

export type WasteStatus =
  | "accumulating"
  | "ready_for_pickup"
  | "picked_up"
  | "disposed"
  | "on_hold";

export type LabelStatus = "unlabeled" | "labeled" | "damaged";

export type WasteRecord = {
  id: string;
  organizationId: string;
  wasteType: WasteType;
  status: WasteStatus;
  containerLabel?: string | null;
  containerId?: string | null;
  fillLevel?: number | null;       // 0-100
  labelStatus: LabelStatus;
  disposalVendor?: string | null;
  disposalDate?: string | null;
  pickupScheduledDate?: string | null;
  manifestNumber?: string | null;
  incidentFlag: boolean;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  // Derived
  isCritical: boolean;             // fill >= 100 or incident
  isAtRisk: boolean;               // fill >= 80 or label damaged or pickup overdue
};

export type WasteResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const wasteTypeLabels: Record<WasteType, string> = {
  chemical: "Chemical",
  biological: "Biological",
  radioactive: "Radioactive",
  sharps: "Sharps",
  pharmaceutical: "Pharmaceutical",
  universal: "Universal",
  solid: "Solid",
  liquid: "Liquid",
  mixed: "Mixed",
  other: "Other"
};

export const wasteStatusLabels: Record<WasteStatus, string> = {
  accumulating: "Accumulating",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
  disposed: "Disposed",
  on_hold: "On hold"
};

export const labelStatusLabels: Record<LabelStatus, string> = {
  unlabeled: "Unlabeled",
  labeled: "Labeled",
  damaged: "Label damaged"
};

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoWasteRecords(): WasteRecord[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    {
      id: "demo-waste-001",
      organizationId: "demo-org",
      wasteType: "chemical",
      status: "accumulating",
      containerLabel: "CHW-2024-001",
      containerId: "CTR-A1",
      fillLevel: 85,
      labelStatus: "labeled",
      disposalVendor: "Clean Harbors",
      pickupScheduledDate: null,
      manifestNumber: null,
      incidentFlag: false,
      isCritical: false,
      isAtRisk: true
    },
    {
      id: "demo-waste-002",
      organizationId: "demo-org",
      wasteType: "biological",
      status: "ready_for_pickup",
      containerLabel: "BIO-2024-012",
      containerId: "CTR-B3",
      fillLevel: 100,
      labelStatus: "labeled",
      disposalVendor: "Stericycle",
      pickupScheduledDate: yesterday.toISOString().slice(0, 10),
      manifestNumber: null,
      incidentFlag: false,
      isCritical: true,
      isAtRisk: true
    },
    {
      id: "demo-waste-003",
      organizationId: "demo-org",
      wasteType: "sharps",
      status: "accumulating",
      containerLabel: "SHP-2024-005",
      containerId: "CTR-S2",
      fillLevel: 45,
      labelStatus: "damaged",
      disposalVendor: "Stericycle",
      pickupScheduledDate: null,
      manifestNumber: null,
      incidentFlag: false,
      isCritical: false,
      isAtRisk: true
    }
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveRiskFlags(row: {
  fill_level?: number | null;
  label_status?: string | null;
  pickup_scheduled_date?: string | null;
  incident_flag?: boolean | null;
}): { isCritical: boolean; isAtRisk: boolean } {
  const fill = row.fill_level ?? 0;
  const incident = row.incident_flag ?? false;
  const labelDamaged = row.label_status === "damaged";

  const pickupOverdue = row.pickup_scheduled_date
    ? new Date(row.pickup_scheduled_date) < new Date()
    : false;

  return {
    isCritical: fill >= 100 || incident,
    isAtRisk: fill >= 80 || labelDamaged || pickupOverdue
  };
}

function mapRow(row: Record<string, unknown>): WasteRecord {
  const flags = deriveRiskFlags({
    fill_level: row.fill_level as number | null,
    label_status: row.label_status as string | null,
    pickup_scheduled_date: row.pickup_scheduled_date as string | null,
    incident_flag: row.incident_flag as boolean | null
  });
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    wasteType: (row.waste_type as WasteType) ?? "other",
    status: (row.status as WasteStatus) ?? "accumulating",
    containerLabel: row.container_label as string | null,
    containerId: row.container_id as string | null,
    fillLevel: row.fill_level as number | null,
    labelStatus: (row.label_status as LabelStatus) ?? "unlabeled",
    disposalVendor: row.disposal_vendor as string | null,
    disposalDate: row.disposal_date as string | null,
    pickupScheduledDate: row.pickup_scheduled_date as string | null,
    manifestNumber: row.manifest_number as string | null,
    incidentFlag: (row.incident_flag as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: row.archived_at as string | null,
    ...flags
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listWasteRecords(filters?: {
  status?: WasteStatus;
  atRisk?: boolean;
}): Promise<WasteRecord[]> {
  if (!isSupabaseConfigured()) return demoWasteRecords();

  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoWasteRecords();

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("waste_records")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.atRisk) {
      query = query.gte("fill_level", 80);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return demoWasteRecords();
  }
}

export type CreateWasteInput = {
  wasteType: WasteType;
  containerLabel?: string | null;
  containerId?: string | null;
  fillLevel?: number | null;
  disposalVendor?: string | null;
  pickupScheduledDate?: string | null;
};

export async function createWasteRecord(input: CreateWasteInput): Promise<WasteResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Waste record added.", id: "demo-new" };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("waste_records")
      .insert({
        organization_id: ctx.organizationId,
        waste_type: input.wasteType,
        status: "accumulating",
        container_label: input.containerLabel ?? null,
        container_id: input.containerId ?? null,
        fill_level: input.fillLevel ?? 0,
        label_status: "unlabeled",
        disposal_vendor: input.disposalVendor ?? null,
        pickup_scheduled_date: input.pickupScheduledDate ?? null,
        incident_flag: false,
        created_by: ctx.userId
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    // Write risk cell based on fill level
    const fill = input.fillLevel ?? 0;
    const cellType = fill >= 80 ? "control_cell" : "control_cell";
    const severity = fill >= 100 ? "high" : fill >= 80 ? "medium" : "low";

    await supabase.from("risk_cells").upsert({
      organization_id: ctx.organizationId,
      cell_type: cellType,
      label: `Waste: ${input.containerLabel ?? input.wasteType} — ${fill}% full`,
      severity,
      linked_record_type: "waste_records",
      linked_record_id: data.id,
      payload: {
        waste_type: input.wasteType,
        fill_level: fill,
        disposal_vendor: input.disposalVendor
      },
      status: "active",
      created_by: ctx.userId
    }, { onConflict: "linked_record_type,linked_record_id" });

    return { ok: true, message: "Waste container added to registry.", id: data.id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function updateFillLevel(id: string, fillLevel: number): Promise<WasteResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Fill level updated." };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();

    const { data: record, error: fetchErr } = await supabase
      .from("waste_records")
      .select("container_label, waste_type")
      .eq("id", id)
      .single();

    if (fetchErr) return { ok: false, message: fetchErr.message };

    const { error } = await supabase
      .from("waste_records")
      .update({ fill_level: fillLevel, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);

    if (error) return { ok: false, message: error.message };

    // Update risk cell severity based on new fill level
    const severity = fillLevel >= 100 ? "high" : fillLevel >= 80 ? "medium" : "low";
    const cellType = fillLevel >= 100 ? "failure_cell" : "control_cell";

    await supabase.from("risk_cells").upsert({
      organization_id: ctx.organizationId,
      cell_type: cellType,
      label: `Waste: ${record.container_label ?? record.waste_type} — ${fillLevel}% full`,
      severity,
      linked_record_type: "waste_records",
      linked_record_id: id,
      payload: { fill_level: fillLevel },
      status: "active",
      created_by: ctx.userId
    }, { onConflict: "linked_record_type,linked_record_id" });

    return { ok: true, message: `Fill level updated to ${fillLevel}%.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function markPickedUp(id: string, manifestNumber?: string): Promise<WasteResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Marked as picked up." };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("waste_records")
      .update({
        status: "picked_up",
        disposal_date: new Date().toISOString().slice(0, 10),
        manifest_number: manifestNumber ?? null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);

    if (error) return { ok: false, message: error.message };

    // Resolve risk cell
    await supabase
      .from("risk_cells")
      .update({ status: "resolved" })
      .eq("linked_record_type", "waste_records")
      .eq("linked_record_id", id);

    return { ok: true, message: "Container marked as picked up. Risk cell resolved." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
