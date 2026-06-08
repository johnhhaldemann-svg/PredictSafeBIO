/**
 * Incident Reporting service.
 * Handles all reads and writes for the incidents table.
 */

import { withAuditTrace } from "@/lib/audit-trace";
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IncidentStatus = "open" | "investigating" | "contained" | "closed";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentType =
  | "near_miss"
  | "first_aid"
  | "recordable_injury"
  | "exposure_event"
  | "property_damage"
  | "environmental_release";

export type Incident = {
  id: string;
  organizationId: string;
  labId?: string | null;
  incidentType: IncidentType;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurredAt?: string | null;
  reportedBy?: string | null;
  summary?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // derived
  isOshaRecordable?: boolean;
  isOverdue?: boolean;
};

export type IncidentResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const incidentStatusLabels: Record<IncidentStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  contained: "Contained",
  closed: "Closed",
};

export const incidentSeverityLabels: Record<IncidentSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const incidentTypeLabels: Record<IncidentType, string> = {
  near_miss: "Near Miss",
  first_aid: "First Aid Case",
  recordable_injury: "Recordable Injury",
  exposure_event: "Exposure Event",
  property_damage: "Property Damage",
  environmental_release: "Environmental Release",
};

export const incidentTypeOptions: IncidentType[] = [
  "near_miss",
  "first_aid",
  "recordable_injury",
  "exposure_event",
  "property_damage",
  "environmental_release",
];

export const incidentSeverityOptions: IncidentSeverity[] = [
  "low",
  "medium",
  "high",
  "critical",
];

// OSHA recordable types
const OSHA_RECORDABLE_TYPES: IncidentType[] = [
  "recordable_injury",
  "exposure_event",
];

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoIncidents(): Incident[] {
  const now = new Date();
  return [
    {
      id: "demo-inc-001",
      organizationId: "demo-org",
      incidentType: "exposure_event",
      title: "Formaldehyde vapour exposure — lab 3 fume hood failure",
      severity: "high",
      status: "investigating",
      occurredAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      summary: "Fume hood alarm triggered during fixative prep. Two staff members reported eye and throat irritation. Investigated by EHS.",
      createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      isOshaRecordable: true,
    },
    {
      id: "demo-inc-002",
      organizationId: "demo-org",
      incidentType: "near_miss",
      title: "BSC-02 glove puncture — near miss, no breach",
      severity: "medium",
      status: "open",
      occurredAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      summary: "Sharp instrument punctured outer glove during sample processing. Inner glove intact. No skin contact.",
      createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      isOshaRecordable: false,
    },
    {
      id: "demo-inc-003",
      organizationId: "demo-org",
      incidentType: "first_aid",
      title: "Chemical splash — sodium hypochlorite, first aid treated",
      severity: "low",
      status: "closed",
      occurredAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      summary: "Small splash to forearm during disinfection. Irrigated for 15 min. No medical treatment required.",
      createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      isOshaRecordable: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Read: list
// ---------------------------------------------------------------------------

export async function listIncidents(filters?: {
  status?: IncidentStatus | "all";
  severity?: IncidentSeverity | "all";
}): Promise<Incident[]> {
  if (!isSupabaseConfigured()) {
    const records = demoIncidents();
    if (filters?.status && filters.status !== "all") {
      return records.filter((r) => r.status === filters.status);
    }
    return records;
  }

  const context = await getProfileContext();
  if (!context) return demoIncidents();

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("incidents")
    .select("id,organization_id,lab_id,incident_type,title,severity,status,occurred_at,reported_by,summary,created_at,updated_at")
    .eq("organization_id", context.organizationId)
    .order("occurred_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.severity && filters.severity !== "all") {
    query = query.eq("severity", filters.severity);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    labId: row.lab_id,
    incidentType: row.incident_type as IncidentType,
    title: row.title,
    severity: row.severity as IncidentSeverity,
    status: row.status as IncidentStatus,
    occurredAt: row.occurred_at,
    reportedBy: row.reported_by,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOshaRecordable: OSHA_RECORDABLE_TYPES.includes(row.incident_type as IncidentType),
  }));
}

// ---------------------------------------------------------------------------
// Read: single
// ---------------------------------------------------------------------------

export async function getIncident(incidentId: string): Promise<Incident | null> {
  if (!isSupabaseConfigured()) {
    return demoIncidents().find((r) => r.id === incidentId) ?? null;
  }

  const context = await getProfileContext();
  if (!context) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("incidents")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("id", incidentId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    labId: data.lab_id,
    incidentType: data.incident_type as IncidentType,
    title: data.title,
    severity: data.severity as IncidentSeverity,
    status: data.status as IncidentStatus,
    occurredAt: data.occurred_at,
    reportedBy: data.reported_by,
    summary: data.summary,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isOshaRecordable: OSHA_RECORDABLE_TYPES.includes(data.incident_type as IncidentType),
  };
}

// ---------------------------------------------------------------------------
// Write: create
// ---------------------------------------------------------------------------

export async function createIncident(input: {
  incidentType: IncidentType;
  title: string;
  severity: IncidentSeverity;
  occurredAt?: string | null;
  summary?: string | null;
  labId?: string | null;
}): Promise<IncidentResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Incident logged (demo mode).", id: "demo-new" };
  }

  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Not signed in." };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      organization_id: context.organizationId,
      lab_id: input.labId ?? null,
      incident_type: input.incidentType,
      title: input.title,
      severity: input.severity,
      status: "open",
      occurred_at: input.occurredAt || null,
      summary: input.summary || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not log incident." };
  }

  await withAuditTrace({
    organizationId: context.organizationId,
    eventType: "incident_created",
    summary: `Incident logged: ${input.title}`,
    payload: { incidentId: data.id, incidentType: input.incidentType, severity: input.severity },
  });

  return { ok: true, message: "Incident logged successfully.", id: data.id };
}

// ---------------------------------------------------------------------------
// Write: update status
// ---------------------------------------------------------------------------

export async function updateIncidentStatus(input: {
  incidentId: string;
  status: IncidentStatus;
  note?: string;
}): Promise<IncidentResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Status updated (demo mode)." };
  }

  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Not signed in." };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("incidents")
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq("organization_id", context.organizationId)
    .eq("id", input.incidentId);

  if (error) return { ok: false, message: error.message };

  await withAuditTrace({
    organizationId: context.organizationId,
    eventType: "incident_status_updated",
    summary: input.note ?? `Incident status changed to ${input.status}.`,
    payload: { incidentId: input.incidentId, newStatus: input.status },
  });

  return { ok: true, message: `Status updated to ${incidentStatusLabels[input.status]}.` };
}
