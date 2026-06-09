/**
 * Equipment & Calibration service.
 * Covers the `equipment_records` table.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EquipmentType =
  | "bsc"
  | "fume_hood"
  | "autoclave"
  | "centrifuge"
  | "balance"
  | "temperature_unit"
  | "ph_meter"
  | "pipette"
  | "gas_detector"
  | "eyewash"
  | "other";

export type CalibrationFrequency =
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "annual"
  | "biennial"
  | "as_needed";

export type EquipmentStatus = "current" | "due_soon" | "overdue" | "retired";

export type EquipmentRecord = {
  id: string;
  organizationId: string;
  name: string;
  equipmentType: EquipmentType;
  location: string | null;
  department: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  lastCalibrated: string | null;
  calibrationFrequency: CalibrationFrequency;
  nextDue: string | null;
  certificateUrl: string | null;
  status: EquipmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type EquipmentResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const equipmentTypeLabels: Record<EquipmentType, string> = {
  bsc:              "Biosafety Cabinet (BSC)",
  fume_hood:        "Chemical Fume Hood",
  autoclave:        "Autoclave / Sterilizer",
  centrifuge:       "Centrifuge",
  balance:          "Analytical Balance",
  temperature_unit: "Incubator / Refrigerator / Freezer",
  ph_meter:         "pH Meter",
  pipette:          "Pipette",
  gas_detector:     "Gas Detector / PID",
  eyewash:          "Eyewash / Emergency Shower",
  other:            "Other",
};

export const calibrationFrequencyLabels: Record<CalibrationFrequency, string> = {
  monthly:    "Monthly",
  quarterly:  "Quarterly",
  semiannual: "Semi-annual",
  annual:     "Annual",
  biennial:   "Biennial",
  as_needed:  "As needed",
};

export const equipmentStatusLabels: Record<EquipmentStatus, string> = {
  current:  "Current",
  due_soon: "Due soon",
  overdue:  "Overdue",
  retired:  "Retired",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function computeNextDue(
  lastCalibrated: string | null,
  frequency: CalibrationFrequency
): string | null {
  if (!lastCalibrated || frequency === "as_needed") return null;
  const d = new Date(lastCalibrated);
  switch (frequency) {
    case "monthly":    d.setMonth(d.getMonth() + 1); break;
    case "quarterly":  d.setMonth(d.getMonth() + 3); break;
    case "semiannual": d.setMonth(d.getMonth() + 6); break;
    case "annual":     d.setFullYear(d.getFullYear() + 1); break;
    case "biennial":   d.setFullYear(d.getFullYear() + 2); break;
  }
  return d.toISOString().slice(0, 10);
}

function computeStatus(nextDue: string | null, storedStatus: string): EquipmentStatus {
  if (storedStatus === "retired") return "retired";
  if (!nextDue) return "current";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDue);
  if (due < today) return "overdue";
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 30);
  if (due <= soon) return "due_soon";
  return "current";
}

function mapRow(row: Record<string, unknown>): EquipmentRecord {
  const nextDue = row.next_due as string | null;
  return {
    id:                   row.id as string,
    organizationId:       row.organization_id as string,
    name:                 row.name as string,
    equipmentType:        (row.equipment_type as EquipmentType) ?? "other",
    location:             row.location as string | null,
    department:           row.department as string | null,
    serialNumber:         row.serial_number as string | null,
    manufacturer:         row.manufacturer as string | null,
    lastCalibrated:       row.last_calibrated as string | null,
    calibrationFrequency: (row.calibration_frequency as CalibrationFrequency) ?? "annual",
    nextDue,
    certificateUrl:       row.certificate_url as string | null,
    status:               computeStatus(nextDue, (row.status as string) ?? "current"),
    notes:                row.notes as string | null,
    createdAt:            row.created_at as string,
    updatedAt:            row.updated_at as string,
    archivedAt:           row.archived_at as string | null,
  };
}

// ---------------------------------------------------------------------------
// Demo fallback
// ---------------------------------------------------------------------------

function demoRecords(): EquipmentRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  const past = new Date();
  past.setFullYear(past.getFullYear() - 1);
  past.setDate(past.getDate() - 15);
  const pastStr = past.toISOString().slice(0, 10);
  const nextAnnual = computeNextDue(pastStr, "annual");
  const nextFwd = computeNextDue(today, "annual");

  return [
    {
      id: "demo-eq-001", organizationId: "demo-org",
      name: "BSC Class II Type A2 — Lab 101",
      equipmentType: "bsc",
      location: "Lab 101", department: "Research",
      serialNumber: "BSC-20230001", manufacturer: "Thermo Scientific",
      lastCalibrated: pastStr, calibrationFrequency: "annual",
      nextDue: nextAnnual, certificateUrl: null,
      status: computeStatus(nextAnnual, "current"),
      notes: null,
      createdAt: today, updatedAt: today, archivedAt: null,
    },
    {
      id: "demo-eq-002", organizationId: "demo-org",
      name: "Chemical Fume Hood — Lab 102",
      equipmentType: "fume_hood",
      location: "Lab 102", department: "Chemistry",
      serialNumber: "FH-2022-005", manufacturer: "AirClean Systems",
      lastCalibrated: today, calibrationFrequency: "annual",
      nextDue: nextFwd, certificateUrl: null,
      status: "current",
      notes: null,
      createdAt: today, updatedAt: today, archivedAt: null,
    },
    {
      id: "demo-eq-003", organizationId: "demo-org",
      name: "Autoclave — Sterilization Room",
      equipmentType: "autoclave",
      location: "Sterilization Room", department: "Operations",
      serialNumber: "AC-2021-003", manufacturer: "Tuttnauer",
      lastCalibrated: null, calibrationFrequency: "quarterly",
      nextDue: null, certificateUrl: null,
      status: "current",
      notes: "Weekly spore tests performed separately.",
      createdAt: today, updatedAt: today, archivedAt: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listEquipmentRecords(): Promise<EquipmentRecord[]> {
  if (!isSupabaseConfigured()) return demoRecords();

  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoRecords();

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("equipment_records")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return demoRecords();
  }
}

export type CreateEquipmentInput = {
  name: string;
  equipmentType: EquipmentType;
  location?: string | null;
  department?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  lastCalibrated?: string | null;
  calibrationFrequency: CalibrationFrequency;
  notes?: string | null;
};

export async function createEquipmentRecord(
  input: CreateEquipmentInput
): Promise<EquipmentResult> {
  if (!isSupabaseConfigured())
    return { ok: true, message: "Demo: Equipment added.", id: "demo-new" };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const nextDue = input.lastCalibrated
      ? computeNextDue(input.lastCalibrated, input.calibrationFrequency)
      : null;
    const status = computeStatus(nextDue, "current");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("equipment_records")
      .insert({
        organization_id:       ctx.organizationId,
        name:                  input.name,
        equipment_type:        input.equipmentType,
        location:              input.location ?? null,
        department:            input.department ?? null,
        serial_number:         input.serialNumber ?? null,
        manufacturer:          input.manufacturer ?? null,
        last_calibrated:       input.lastCalibrated ?? null,
        calibration_frequency: input.calibrationFrequency,
        next_due:              nextDue,
        status,
        notes:                 input.notes ?? null,
        created_by:            ctx.userId,
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `${input.name} added to equipment registry.`, id: data.id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function logCalibration(
  id: string,
  calibratedDate: string
): Promise<EquipmentResult> {
  if (!isSupabaseConfigured())
    return { ok: true, message: "Demo: Calibration logged." };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("equipment_records")
      .select("calibration_frequency, name")
      .eq("id", id)
      .single();

    if (fetchErr) return { ok: false, message: fetchErr.message };

    const frequency = existing.calibration_frequency as CalibrationFrequency;
    const nextDue = computeNextDue(calibratedDate, frequency);
    const status = computeStatus(nextDue, "current");

    const { error } = await supabase
      .from("equipment_records")
      .update({
        last_calibrated: calibratedDate,
        next_due:        nextDue,
        status,
        updated_at:      new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);

    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      message: `Calibration logged for ${existing.name as string}. Next due: ${nextDue ?? "N/A"}.`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
