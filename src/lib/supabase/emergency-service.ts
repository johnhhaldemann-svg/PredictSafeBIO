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

export type ContactType = "internal" | "external" | "emergency";

export type EmergencyStep = {
  id: string;
  organizationId: string;
  planId: string;
  stepNumber: number;
  text: string;
  isRequired: boolean;
  completedAt: string | null;
  createdAt: string;
};

export type EmergencyContact = {
  id: string;
  organizationId: string;
  planId: string | null;
  name: string;
  role: string;
  phone: string;
  contactType: ContactType;
  isPrimary: boolean;
  createdAt: string;
};

export type EmergencyResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels / constants
// ---------------------------------------------------------------------------

export const contactTypeLabels: Record<ContactType, string> = {
  internal:  "Internal",
  external:  "External",
  emergency: "Emergency",
};

// ---------------------------------------------------------------------------
// Labels (plans / drills)
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

function mapStepRow(row: Record<string, unknown>): EmergencyStep {
  return {
    id:             row.id as string,
    organizationId: row.organization_id as string,
    planId:         row.plan_id as string,
    stepNumber:     row.step_number as number,
    text:           row.text as string,
    isRequired:     row.is_required as boolean,
    completedAt:    row.completed_at as string | null,
    createdAt:      row.created_at as string,
  };
}

function mapContactRow(row: Record<string, unknown>): EmergencyContact {
  return {
    id:             row.id as string,
    organizationId: row.organization_id as string,
    planId:         row.plan_id as string | null,
    name:           row.name as string,
    role:           row.role as string,
    phone:          row.phone as string,
    contactType:    (row.contact_type as ContactType) ?? "internal",
    isPrimary:      row.is_primary as boolean,
    createdAt:      row.created_at as string,
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
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  const apr25 = "2025-04-15";
  const mar25 = "2025-03-04";
  const may25 = "2025-05-20";
  // nextDrillDate: Jul 14 of current year
  const jul14 = `${now.getFullYear()}-07-14`;
  // 47 days ago = drill overdue
  const overdueDate = new Date(now.getTime() - 47 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return [
    {
      id: "demo-erp-001", organizationId: "demo-org",
      planType: "fire", title: "Fire Emergency",
      description: "Alarm activation, evacuation routes, muster points, and fire brigade coordination.",
      lastReviewed: apr25, nextDrillDate: jul14, status: "current",
      createdAt: apr25, updatedAt: apr25, needsReview: false,
    },
    {
      id: "demo-erp-002", organizationId: "demo-org",
      planType: "other", title: "Earthquake Response",
      description: "Drop/cover/hold-on protocol, post-event structural inspection, and utility shutoff.",
      lastReviewed: mar25, nextDrillDate: null, status: "current",
      createdAt: mar25, updatedAt: mar25, needsReview: false,
    },
    {
      id: "demo-erp-003", organizationId: "demo-org",
      planType: "severe_weather", title: "Severe Weather",
      description: "NWS alert monitoring, shelter-in-place activation, and all-clear procedures.",
      lastReviewed: null, nextDrillDate: null, status: "needs_review",
      createdAt: today, updatedAt: today, needsReview: true,
    },
    {
      id: "demo-erp-004", organizationId: "demo-org",
      planType: "chemical_spill", title: "Chemical Spill",
      description: "Spill containment, PPE donning, decontamination corridor, and CHEMTREC notification.",
      lastReviewed: mar25, nextDrillDate: overdueDate, status: "current",
      createdAt: mar25, updatedAt: mar25, needsReview: false,
    },
    {
      id: "demo-erp-005", organizationId: "demo-org",
      planType: "medical", title: "Medical Emergency",
      description: "First responder activation, AED location, and EMS handoff protocol.",
      lastReviewed: may25, nextDrillDate: null, status: "current",
      createdAt: may25, updatedAt: may25, needsReview: false,
    },
  ];
}

function demoDrills(): EmergencyDrill[] {
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  const may12 = "2025-05-12";
  const mar04 = "2025-03-04";
  const jan20 = "2025-01-20";
  return [
    {
      id: "demo-drill-001", organizationId: "demo-org", planId: "demo-erp-001",
      drillDate: may12, drillType: "Fire Evacuation · Bldg 1-3",
      participantsCount: 24, outcome: "satisfactory",
      notes: "All personnel evacuated within 3 min. Assembly point headcount confirmed.",
      conductedBy: "EHS Manager", createdAt: may12,
    },
    {
      id: "demo-drill-002", organizationId: "demo-org", planId: "demo-erp-002",
      drillDate: mar04, drillType: "Earthquake Tabletop",
      participantsCount: 12, outcome: "satisfactory",
      notes: "Drop/cover/hold-on sequence reviewed. Utility shutoff locations confirmed.",
      conductedBy: "EHS Manager", createdAt: mar04,
    },
    {
      id: "demo-drill-003", organizationId: "demo-org", planId: "demo-erp-004",
      drillDate: jan20, drillType: "Chemical Spill – Lab",
      participantsCount: 8, outcome: "needs_improvement",
      notes: "PPE donning time exceeded 90-second target. Retraining scheduled.",
      conductedBy: "Lab Safety Officer", createdAt: jan20,
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
    const { data, error } = await supabase.from("emergency_drills").insert({
      organization_id:    ctx.organizationId,
      plan_id:            input.planId ?? null,
      drill_date:         input.drillDate,
      drill_type:         input.drillType ?? null,
      participants_count: input.participantsCount ?? null,
      outcome:            input.outcome,
      notes:              input.notes ?? null,
      conducted_by:       input.conductedBy ?? null,
      created_by:         ctx.userId,
    }).select("id").single();
    if (error || !data) return { ok: false, message: error?.message ?? "Insert failed." };
    return { ok: true, message: "Drill logged successfully.", id: (data as { id: string }).id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

// ---------------------------------------------------------------------------
// Steps — demo data
// ---------------------------------------------------------------------------

function demoSteps(planId: string): EmergencyStep[] {
  if (planId !== "demo-erp-001") return [];
  const now = new Date().toISOString();
  const done = new Date(Date.now() - 60_000).toISOString();
  return [
    { id: "demo-step-001", organizationId: "demo-org", planId, stepNumber: 1, text: "Activate Fire Alarm & Initiate Evacuation",      isRequired: true,  completedAt: done, createdAt: now },
    { id: "demo-step-002", organizationId: "demo-org", planId, stepNumber: 2, text: "Call 911 & Notify Site Safety Director",           isRequired: true,  completedAt: done, createdAt: now },
    { id: "demo-step-003", organizationId: "demo-org", planId, stepNumber: 3, text: "Account for All Personnel at Muster Point",        isRequired: true,  completedAt: null, createdAt: now },
    { id: "demo-step-004", organizationId: "demo-org", planId, stepNumber: 4, text: "Attempt Suppression — Only If Safe to Do So",      isRequired: false, completedAt: null, createdAt: now },
    { id: "demo-step-005", organizationId: "demo-org", planId, stepNumber: 5, text: "Meet & Brief Emergency Responders on Arrival",     isRequired: false, completedAt: null, createdAt: now },
    { id: "demo-step-006", organizationId: "demo-org", planId, stepNumber: 6, text: "Document Incident & Initiate Corrective Action",   isRequired: false, completedAt: null, createdAt: now },
  ];
}

// ---------------------------------------------------------------------------
// Steps — queries
// ---------------------------------------------------------------------------

export async function listSteps(planId: string): Promise<EmergencyStep[]> {
  if (!isSupabaseConfigured()) return demoSteps(planId);
  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoSteps(planId);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("emergency_response_steps")
      .select("*")
      .eq("plan_id", planId)
      .eq("organization_id", ctx.organizationId)
      .order("step_number", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapStepRow);
  } catch {
    return demoSteps(planId);
  }
}

export async function createStep(input: {
  planId: string;
  text: string;
  isRequired?: boolean;
}): Promise<EmergencyResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Step added." };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { data: existing } = await supabase
      .from("emergency_response_steps")
      .select("step_number")
      .eq("plan_id", input.planId)
      .order("step_number", { ascending: false })
      .limit(1);
    const nextNum = ((existing?.[0]?.step_number as number) ?? 0) + 1;
    const { error } = await supabase.from("emergency_response_steps").insert({
      organization_id: ctx.organizationId,
      plan_id:         input.planId,
      step_number:     nextNum,
      text:            input.text,
      is_required:     input.isRequired ?? false,
      created_by:      ctx.userId,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Step added." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function toggleStepComplete(
  stepId: string,
  completed: boolean,
): Promise<EmergencyResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Step updated." };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("emergency_response_steps")
      .update({ completed_at: completed ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq("id", stepId)
      .eq("organization_id", ctx.organizationId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: completed ? "Step completed." : "Step unmarked." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

// ---------------------------------------------------------------------------
// Contacts — demo data
// ---------------------------------------------------------------------------

function demoContacts(): EmergencyContact[] {
  const now = new Date().toISOString();
  return [
    { id: "demo-contact-001", organizationId: "demo-org", planId: null, name: "EHS Manager",            role: "Site Safety Director · Primary", phone: "+1 (317) 555-0142", contactType: "internal",  isPrimary: true,  createdAt: now },
    { id: "demo-contact-002", organizationId: "demo-org", planId: null, name: "Fire Marshal — Site",    role: "External · Emergency",           phone: "911 / Dispatch",    contactType: "emergency", isPrimary: false, createdAt: now },
    { id: "demo-contact-003", organizationId: "demo-org", planId: null, name: "EHS Lead — Building 4",  role: "Internal · Backup",              phone: "+1 (317) 555-0198", contactType: "internal",  isPrimary: false, createdAt: now },
  ];
}

// ---------------------------------------------------------------------------
// Contacts — queries
// ---------------------------------------------------------------------------

export async function listContacts(): Promise<EmergencyContact[]> {
  if (!isSupabaseConfigured()) return demoContacts();
  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoContacts();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapContactRow);
  } catch {
    return demoContacts();
  }
}

export async function createContact(input: {
  name: string;
  role: string;
  phone: string;
  contactType: ContactType;
  isPrimary: boolean;
  planId?: string | null;
}): Promise<EmergencyResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Contact added." };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("emergency_contacts").insert({
      organization_id: ctx.organizationId,
      name:            input.name,
      role:            input.role,
      phone:           input.phone,
      contact_type:    input.contactType,
      is_primary:      input.isPrimary,
      plan_id:         input.planId ?? null,
      created_by:      ctx.userId,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `${input.name} added to emergency contacts.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function deleteContact(id: string): Promise<EmergencyResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Contact removed." };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("emergency_contacts")
      .delete()
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Contact removed." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function resetSteps(planId: string): Promise<EmergencyResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Steps reset." };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("emergency_response_steps")
      .update({ completed_at: null, updated_at: new Date().toISOString() })
      .eq("plan_id", planId)
      .eq("organization_id", ctx.organizationId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "All steps reset. Ready to run drill." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
