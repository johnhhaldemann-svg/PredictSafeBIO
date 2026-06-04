/**
 * Pesticide / Disinfectant Control service.
 * Covers the `pesticide_disinfectant_records` table.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductType = "pesticide" | "disinfectant" | "sanitizer" | "pest_control";

export type PesticideRecord = {
  id: string;
  organizationId: string;
  productName: string;
  productType: ProductType;
  epaRegistrationNumber?: string | null;
  approvedUse?: string | null;
  location?: string | null;
  applicationDate?: string | null;
  vendorName?: string | null;
  ppeRequired?: string[];
  contactTimeMinutes?: number | null;
  reentryTimeMinutes?: number | null;
  labelDocumentId?: string | null;
  deviationNoted: boolean;
  deviationNotes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  // derived
  hasLabel: boolean;
  needsAttention: boolean; // deviation noted OR missing label
};

export type PesticideResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const productTypeLabels: Record<ProductType, string> = {
  pesticide: "Pesticide",
  disinfectant: "Disinfectant",
  sanitizer: "Sanitizer",
  pest_control: "Pest Control"
};

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoRecords(): PesticideRecord[] {
  return [
    {
      id: "demo-pest-001",
      organizationId: "demo-org",
      productName: "Clorox Healthcare Bleach Germicidal Cleaner",
      productType: "disinfectant",
      epaRegistrationNumber: "67619-12",
      approvedUse: "Hard surface disinfection — BSL-2 benchtop",
      location: "Lab 101 — BSL-2",
      applicationDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      vendorName: "Clorox",
      ppeRequired: ["gloves", "safety_glasses"],
      contactTimeMinutes: 3,
      reentryTimeMinutes: 0,
      labelDocumentId: "doc-sds-clorox",
      deviationNoted: false,
      deviationNotes: null,
      hasLabel: true,
      needsAttention: false
    },
    {
      id: "demo-pest-002",
      organizationId: "demo-org",
      productName: "Catchmaster Glue Boards",
      productType: "pest_control",
      epaRegistrationNumber: null,
      approvedUse: "Rodent monitoring — perimeter",
      location: "Building perimeter — exterior",
      applicationDate: new Date(Date.now() - 7 * 86400000).toISOString(),
      vendorName: "External Pest Control Co.",
      ppeRequired: [],
      contactTimeMinutes: null,
      reentryTimeMinutes: null,
      labelDocumentId: null,
      deviationNoted: true,
      deviationNotes: "Placed inside lab 103 — not approved location per SOP.",
      hasLabel: false,
      needsAttention: true
    },
    {
      id: "demo-pest-003",
      organizationId: "demo-org",
      productName: "Virkon S",
      productType: "disinfectant",
      epaRegistrationNumber: "39967-129",
      approvedUse: "Biohazardous spill decontamination",
      location: "All BSL-2 labs",
      applicationDate: new Date().toISOString(),
      vendorName: "Lanxess",
      ppeRequired: ["gloves", "lab_coat", "face_shield"],
      contactTimeMinutes: 10,
      reentryTimeMinutes: 30,
      labelDocumentId: null,
      deviationNoted: false,
      deviationNotes: null,
      hasLabel: false,
      needsAttention: true
    }
  ];
}

function filterDemoRecords(filters?: {
  productType?: ProductType;
  deviationOnly?: boolean;
  missingLabel?: boolean;
}) {
  return demoRecords().filter((record) => {
    if (filters?.productType && record.productType !== filters.productType) return false;
    if (filters?.deviationOnly && !record.deviationNoted) return false;
    if (filters?.missingLabel && record.hasLabel) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>): PesticideRecord {
  const hasLabel = !!row.label_document_id;
  const deviationNoted = (row.deviation_noted as boolean) ?? false;
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    productName: row.product_name as string,
    productType: (row.product_type as ProductType) ?? "disinfectant",
    epaRegistrationNumber: row.epa_registration_number as string | null,
    approvedUse: row.approved_use as string | null,
    location: row.location as string | null,
    applicationDate: row.application_date as string | null,
    vendorName: row.vendor_name as string | null,
    ppeRequired: (row.ppe_required as string[]) ?? [],
    contactTimeMinutes: row.contact_time_minutes as number | null,
    reentryTimeMinutes: row.reentry_time_minutes as number | null,
    labelDocumentId: row.label_document_id as string | null,
    deviationNoted,
    deviationNotes: row.deviation_notes as string | null,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: row.archived_at as string | null,
    hasLabel,
    needsAttention: deviationNoted || !hasLabel
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listPesticideRecords(filters?: {
  productType?: ProductType;
  deviationOnly?: boolean;
  missingLabel?: boolean;
}): Promise<PesticideRecord[]> {
  if (!isSupabaseConfigured()) return filterDemoRecords(filters);

  try {
    const ctx = await getProfileContext();
    if (!ctx) return filterDemoRecords(filters);

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("pesticide_disinfectant_records")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("application_date", { ascending: false });

    if (filters?.productType) {
      query = query.eq("product_type", filters.productType);
    }
    if (filters?.deviationOnly) {
      query = query.eq("deviation_noted", true);
    }
    if (filters?.missingLabel) {
      query = query.is("label_document_id", null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return filterDemoRecords(filters);
  }
}

export type CreatePesticideInput = {
  productName: string;
  productType: ProductType;
  epaRegistrationNumber?: string | null;
  approvedUse?: string | null;
  location?: string | null;
  applicationDate?: string | null;
  vendorName?: string | null;
  ppeRequired?: string[];
  contactTimeMinutes?: number | null;
  reentryTimeMinutes?: number | null;
  deviationNoted?: boolean;
  deviationNotes?: string | null;
};

export async function createPesticideRecord(input: CreatePesticideInput): Promise<PesticideResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Record logged.", id: "demo-new" };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("pesticide_disinfectant_records")
      .insert({
        organization_id: ctx.organizationId,
        product_name: input.productName,
        product_type: input.productType,
        epa_registration_number: input.epaRegistrationNumber ?? null,
        approved_use: input.approvedUse ?? null,
        location: input.location ?? null,
        application_date: input.applicationDate ?? new Date().toISOString(),
        vendor_name: input.vendorName ?? null,
        ppe_required: input.ppeRequired ?? [],
        contact_time_minutes: input.contactTimeMinutes ?? null,
        reentry_time_minutes: input.reentryTimeMinutes ?? null,
        deviation_noted: input.deviationNoted ?? false,
        deviation_notes: input.deviationNotes ?? null,
        created_by: ctx.userId
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    // Write risk cell — deviation = failure_cell, missing label = failure_cell, clean = control_cell
    const hasDeviation = input.deviationNoted ?? false;
    const cellType = hasDeviation ? "failure_cell" : "control_cell";
    const severity = hasDeviation ? "high" : "low";
    const label = hasDeviation
      ? `Pesticide deviation: ${input.productName} — ${input.deviationNotes ?? "deviation noted"}`
      : `Pesticide applied: ${input.productName} — ${input.location ?? "no location"}`;

    await supabase.from("risk_cells").upsert({
      organization_id: ctx.organizationId,
      cell_type: cellType,
      label,
      severity,
      linked_record_type: "pesticide_disinfectant_records",
      linked_record_id: data.id,
      payload: {
        product_name: input.productName,
        product_type: input.productType,
        location: input.location,
        deviation_noted: hasDeviation
      },
      status: "active",
      created_by: ctx.userId
    }, { onConflict: "linked_record_type,linked_record_id" });

    const msg = hasDeviation
      ? "Application logged. Deviation flagged — EHS review required."
      : "Application logged successfully.";
    return { ok: true, message: msg, id: data.id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function resolveDeviation(id: string, resolutionNote: string): Promise<PesticideResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Deviation resolved." };

  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("pesticide_disinfectant_records")
      .update({
        deviation_noted: false,
        deviation_notes: resolutionNote,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);

    if (error) return { ok: false, message: error.message };

    // Resolve risk cell
    await supabase.from("risk_cells")
      .update({ status: "resolved", cell_type: "improvement_cell" })
      .eq("linked_record_type", "pesticide_disinfectant_records")
      .eq("linked_record_id", id);

    return { ok: true, message: "Deviation resolved and risk cell closed." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
