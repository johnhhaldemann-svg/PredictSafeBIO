/**
 * Chemical & SDS Management service.
 * Covers the `chemical_inventory` table.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { scoreChemicalRecord, resolveRiskCell } from "./continuous-scoring-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HazardClass =
  | "flammable"
  | "corrosive"
  | "toxic"
  | "oxidizer"
  | "compressed_gas"
  | "environmental"
  | "health_hazard"
  | "irritant"
  | "explosive"
  | "other";

export type ChemicalRecord = {
  id: string;
  organizationId: string;
  chemicalName: string;
  casNumber?: string | null;
  hazardClass?: HazardClass | null;
  storageGroup?: string | null;
  storageLocation?: string | null;
  quantity?: string | null;
  expirationDate?: string | null;
  sdsStoragePath?: string | null;
  sdsStorageBucket?: string | null;
  gghsPictograms?: string[] | null;
  ppeRequired?: string[] | null;
  spillResponseNotes?: string | null;
  wasteRoute?: string | null;
  exposureControls?: string | null;
  restricted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  // Derived flags
  sdsPresent: boolean;
  expiringSoon: boolean; // within 30 days
  expired: boolean;
};

export type ChemicalResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const hazardClassLabels: Record<HazardClass, string> = {
  flammable: "Flammable",
  corrosive: "Corrosive",
  toxic: "Toxic",
  oxidizer: "Oxidizer",
  compressed_gas: "Compressed Gas",
  environmental: "Environmental Hazard",
  health_hazard: "Health Hazard",
  irritant: "Irritant",
  explosive: "Explosive",
  other: "Other"
};

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoChemicals(): ChemicalRecord[] {
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const past = new Date();
  past.setDate(past.getDate() - 10);

  return [
    {
      id: "demo-chem-001",
      organizationId: "demo-org",
      chemicalName: "Ethanol (200 proof)",
      casNumber: "64-17-5",
      hazardClass: "flammable",
      storageGroup: "Flammable Cabinet A",
      storageLocation: "Lab 101",
      quantity: "4L",
      expirationDate: soon.toISOString().slice(0, 10),
      sdsStoragePath: "/sds/ethanol.pdf",
      sdsStorageBucket: "sds-documents",
      ppeRequired: ["gloves", "safety_glasses"],
      spillResponseNotes: "Absorb with dry sand. Avoid open flame.",
      wasteRoute: "Flammable Waste",
      restricted: false,
      sdsPresent: true,
      expiringSoon: true,
      expired: false
    },
    {
      id: "demo-chem-002",
      organizationId: "demo-org",
      chemicalName: "Hydrochloric Acid 37%",
      casNumber: "7647-01-0",
      hazardClass: "corrosive",
      storageGroup: "Acid Cabinet",
      storageLocation: "Lab 102",
      quantity: "500mL",
      expirationDate: null,
      sdsStoragePath: null,
      sdsStorageBucket: null,
      ppeRequired: ["gloves", "face_shield", "lab_coat"],
      spillResponseNotes: "Neutralize with sodium bicarbonate. Ventilate area.",
      wasteRoute: "Aqueous Acid Waste",
      restricted: true,
      sdsPresent: false,
      expiringSoon: false,
      expired: false
    },
    {
      id: "demo-chem-003",
      organizationId: "demo-org",
      chemicalName: "Sodium Azide",
      casNumber: "26628-22-8",
      hazardClass: "toxic",
      storageGroup: "Toxics Secure Cabinet",
      storageLocation: "Lab 103",
      quantity: "100g",
      expirationDate: past.toISOString().slice(0, 10),
      sdsStoragePath: "/sds/sodium-azide.pdf",
      sdsStorageBucket: "sds-documents",
      ppeRequired: ["gloves", "face_shield", "respirator"],
      spillResponseNotes: "Do NOT use water. Call EHS immediately.",
      wasteRoute: "Reactive/Toxic Waste",
      restricted: true,
      sdsPresent: true,
      expiringSoon: false,
      expired: true
    }
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveFlags(row: {
  sds_storage_path?: string | null;
  expiration_date?: string | null;
}): { sdsPresent: boolean; expiringSoon: boolean; expired: boolean } {
  const sdsPresent = !!row.sds_storage_path;
  const now = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(now.getDate() + 30);

  if (!row.expiration_date) return { sdsPresent, expiringSoon: false, expired: false };

  const exp = new Date(row.expiration_date);
  return {
    sdsPresent,
    expiringSoon: exp > now && exp <= thirtyDays,
    expired: exp < now
  };
}

function mapRow(row: Record<string, unknown>): ChemicalRecord {
  const flags = deriveFlags({
    sds_storage_path: row.sds_storage_path as string | null,
    expiration_date: row.expiration_date as string | null
  });
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    chemicalName: row.chemical_name as string,
    casNumber: row.cas_number as string | null,
    hazardClass: row.hazard_class as HazardClass | null,
    storageGroup: row.storage_group as string | null,
    storageLocation: row.storage_location as string | null,
    quantity: row.quantity as string | null,
    expirationDate: row.expiration_date as string | null,
    sdsStoragePath: row.sds_storage_path as string | null,
    sdsStorageBucket: row.sds_storage_bucket as string | null,
    gghsPictograms: row.ghs_pictograms as string[] | null,
    ppeRequired: row.ppe_required as string[] | null,
    spillResponseNotes: row.spill_response_notes as string | null,
    wasteRoute: row.waste_route as string | null,
    exposureControls: row.exposure_controls as string | null,
    restricted: row.restricted as boolean ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: row.archived_at as string | null,
    ...flags
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listChemicals(filters?: {
  hazardClass?: HazardClass;
  expiringSoon?: boolean;
  missingSds?: boolean;
}): Promise<ChemicalRecord[]> {
  if (!isSupabaseConfigured()) return demoChemicals();

  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoChemicals();

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("chemical_inventory")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("chemical_name");

    if (filters?.hazardClass) {
      query = query.eq("hazard_class", filters.hazardClass);
    }
    if (filters?.expiringSoon) {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      query = query
        .not("expiration_date", "is", null)
        .lte("expiration_date", thirtyDays.toISOString().slice(0, 10));
    }
    if (filters?.missingSds) {
      query = query.is("sds_storage_path", null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return demoChemicals();
  }
}

export async function getChemicalById(id: string): Promise<ChemicalRecord | null> {
  if (!isSupabaseConfigured()) return demoChemicals().find((c) => c.id === id) ?? null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("chemical_inventory")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return mapRow(data);
  } catch {
    return null;
  }
}

export type CreateChemicalInput = {
  chemicalName: string;
  casNumber?: string | null;
  hazardClass?: HazardClass | null;
  storageGroup?: string | null;
  storageLocation?: string | null;
  quantity?: string | null;
  expirationDate?: string | null;
  ppeRequired?: string[];
  spillResponseNotes?: string | null;
  wasteRoute?: string | null;
  restricted?: boolean;
};

export async function createChemical(input: CreateChemicalInput): Promise<ChemicalResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Chemical added.", id: "demo-new" };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("chemical_inventory")
      .insert({
        organization_id: ctx.organizationId,
        chemical_name: input.chemicalName,
        cas_number: input.casNumber ?? null,
        hazard_class: input.hazardClass ?? null,
        storage_group: input.storageGroup ?? null,
        storage_location: input.storageLocation ?? null,
        quantity: input.quantity ?? null,
        expiration_date: input.expirationDate ?? null,
        ppe_required: input.ppeRequired ?? [],
        spill_response_notes: input.spillResponseNotes ?? null,
        waste_route: input.wasteRoute ?? null,
        restricted: input.restricted ?? false,
        created_by: ctx.userId
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    // Score via bio-ai engine — replaces hardcoded severity with AI-assessed risk level.
    // Covers SDS missing, expiration, hazard class, restricted status, PPE gaps.
    void scoreChemicalRecord({
      chemical: {
        id: data.id,
        chemicalName: input.chemicalName,
        hazardClass: input.hazardClass ?? null,
        storageLocation: input.storageLocation ?? null,
        ppeRequired: input.ppeRequired ?? null,
        spillResponseNotes: input.spillResponseNotes ?? null,
        restricted: input.restricted ?? false,
        // New chemicals always have no SDS yet — that's the primary control gap
        sdsPresent: false,
        expired: false,
        expiringSoon: false,
      },
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    });

    return { ok: true, message: "Chemical added. Upload SDS to resolve the open risk cell.", id: data.id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function archiveChemical(id: string): Promise<ChemicalResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Chemical archived." };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("chemical_inventory")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);

    if (error) return { ok: false, message: error.message };

    // Resolve the risk cell
    await supabase
      .from("risk_cells")
      .update({ status: "resolved" })
      .eq("linked_record_type", "chemical_inventory")
      .eq("linked_record_id", id);

    return { ok: true, message: "Chemical archived and risk cell resolved." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
