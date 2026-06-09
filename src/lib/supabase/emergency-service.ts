/**
 * Emergency Response service.
 * Covers emergency_response_plans and emergency_drills tables.
 * Required under OSHA 29 CFR 1910.38 and NFPA 45.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanType =
  | "chemical_spill"
  | "biological_release"
  | "fire"
  | "medical"
  | "power_failure"
  | "severe_weather"
  | "other";

export type PlanStatus = "draft" | "current" | "needs_review";
export type DrillOutcome = "satisfactory" | "needs_improvement" | "unsatisfactory";

export type EmergencyPlan = {
  id: string;
  organizationId: string;
  planType: PlanType;
  title: string;
  description: string | null;
  lastReviewed: string | null;
  nextDrillDate: string | null;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  needsReview: boolean;
};

export type EmergencyDrill = {
  id: string;
  organizationId: string;
  planId: string | null;
  drillDate: string;
  drillType: string | null;
  participantsCount: number | null;
  outcome: DrillOutcome;
  notes: string | null;
  conductedBy: string | null;
  createdAt: string;
};

export type EmergencyResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const planTypeLabels: Record<PlanType, string> = {
  chemical_spill:     "Chemical Spill Response",
  biological_release: "Biological Material Release",
  fire:               "Fire & Evacuation",
  medical:            "Medical Emergency",
  power_failure:      "Power Failure",
  severe_weather:     "Severe Weather",
  other:              "Other",
};

export const planStatusLabels: Record<PlanStatus, string> = {
  draft:        "Draft",
  current:      "Current",
  needs_review: "Needs Review",
};

export const drillOutcomeLabels: Record<DrillOutcome, string> = {
  satisfactory:      "Satisfactory",
  needs_improvement: "Needs Improvement",
  unsatisfactory:    "Unsatisfactory",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveNeedsReview(lastReviewed: string | null): boolean {
  if (!lastReviewed) return true;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return new Date(lastReviewed) < cutoff;
}

function mapPlanRow(row: Record<string, unknown>): EmergencyPlan {
  return {
    id:            row.id as string,
    organizationId: row.organization_id as string,
    planType:      (row.plan_type as PlanType) ?? "other",
    title:         row.title as string,
    description:   row.description as string | null,
    lastReviewed:  row.last_reviewed as string | null,
    nextDrillDate: row.next_drill_date as string | null,
    status:        (row.status as PlanStatus) ?? "draft",
    createdAt:     row.created_at as string,
    updatedAt:     row.updated_at as string,
    needsReview:   deriveNeedsReview(row.last_reviewed as string | null),
  };
}

function mapDrillRow(row: Record<string, unknown>): EmergencyDrill {
  return {
    id:                row.id as string,
    organizationId:    row.organization_id as string,
    planId:            row.plan_id as string | null,
    drillDate:         row.drill_date as string,
    drillType:         row.drill_type as string | null,
    participantsCount: row.participants_count as number | null,
    outcome:           (row.outcome as DrillOutcome) ?? "satisfactory",
    notes:             row.notes as string | null,
    conductedBy:       row.conducted_by as string | null,
    createdAt:         row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Demo fallback
// ---------------------------------------------------------------------------

function demoPlans(): EmergencyPlan[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "demo-erp-001", organizationId: "demo-org",
      planType: "chemical_spill", title: "Chemical Spill Response Plan",
      description: "Spill containment, PPE donning, decontamination, and regulatory notification.",
      lastReviewed: today, nextDrillDate: null, status: "current",
      createdAt: today, updatedAt: today, needsReview: false,
    },
    {
      id: "demo-erp-002", organizationId: "demo-org",
      planType: "fire", title: "Fire & Evacuation Plan",
      description: "Alarm response, evacuation routes, assembly points, and emergency contacts.",
      lastReviewed: null, nextDrillDate: null, status: "draft",
      createdAt: today, updatedAt: today, needsReview: true,
    },
    {
      id: "demo-erp-003", organizationId: "demo-org",
      planType: "biological_release", title: "Biological Material Release",
      description: "BSL-specific containment, disinfection protocol, and exposure prophylaxis.",
      lastReviewed: null, nextDrillDate: null, status: "draft",
      createdAt: today, updatedAt: today, needsReview: true,
    },
  ];
}

function demoDrills(): EmergencyDrill[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "demo-drill-001", organizationId: "demo-org", planId: "demo-erp-001",
      drillDate: today, drillType: "tabletop", participantsCount: 8,
      outcome: "satisfactory",
      notes: "All participants evacuated within 3 minutes. Spill kit location confirmed.",
      conductedBy: "EHS Manager",
      createdAt: today,
    },
  ];
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listPlans(): Promise<EmergencyPlan[]> {
  if (!isSupabaseConfigured()) return demoPlans();
  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoPlans();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("emergency_response_plans")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("plan_type", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapPlanRow);
  } catch {
    return demoPlans();
  }
}

export async function createPlan(input: {
  planType: PlanType;
  title: string;
  description?: string | null;
  lastReviewed?: string | null;
  nextDrillDate?: string | null;
}): Promise<EmergencyResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Plan added." };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("emergency_response_plans").insert({
      organization_id: ctx.organizationId,
      plan_type:       input.planType,
      title:           input.title,
      description:     input.description ?? null,
      last_reviewed:   input.lastReviewed ?? null,
      next_drill_date: input.nextDrillDate ?? null,
      status:          input.lastReviewed ? "current" : "draft",
      created_by:      ctx.userId,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `${input.title} added to ERP registry.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function listDrills(): Promise<EmergencyDrill[]> {
  if (!isSupabaseConfigured()) return demoDrills();
  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoDrills();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("emergency_drills")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("drill_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapDrillRow);
  } catch {
    return demoDrills();
  }
}

export async function createDrill(input: {
  planId?: string | null;
  drillDate: string;
  drillType?: string | null;
  participantsCount?: number | null;
  outcome: DrillOutcome;
  notes?: string | null;
  conductedBy?: string | null;
}): Promise<EmergencyResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Drill logged." };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("emergency_drills").insert({
      organization_id:    ctx.organizationId,
      plan_id:            input.planId ?? null,
      drill_date:         input.drillDate,
      drill_type:         input.drillType ?? null,
      participants_count: input.participantsCount ?? null,
      outcome:            input.outcome,
      notes:              input.notes ?? null,
      conducted_by:       input.conductedBy ?? null,
      created_by:         ctx.userId,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Drill logged successfully." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
