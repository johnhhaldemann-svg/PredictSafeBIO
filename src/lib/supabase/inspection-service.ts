/**
 * Inspection / Audit management service.
 * Covers the `audits` and `audit_findings` tables.
 */

import { withAuditTrace } from "@/lib/audit-trace";
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InspectionStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type InspectionType = "internal" | "external" | "regulatory" | "supplier" | "self";
export type FindingLevel = "observation" | "minor" | "major" | "critical";
export type FindingStatus = "open" | "in_progress" | "closed";

export type Inspection = {
  id: string;
  organizationId: string;
  title: string;
  auditType: InspectionType;
  status: InspectionStatus;
  scheduledFor?: string | null;
  completedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  findingCount?: number;
  openFindingCount?: number;
};

export type InspectionFinding = {
  id: string;
  organizationId: string;
  auditId: string;
  findingLevel: FindingLevel;
  title: string;
  status: FindingStatus;
  sourceModule?: string | null;
  createdAt?: string;
};

export type InspectionDetail = Inspection & {
  findings: InspectionFinding[];
};

export type InspectionResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const inspectionStatusLabels: Record<InspectionStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled"
};

export const inspectionTypeLabels: Record<InspectionType, string> = {
  internal: "Internal",
  external: "External",
  regulatory: "Regulatory",
  supplier: "Supplier",
  self: "Self-inspection"
};

export const findingLevelLabels: Record<FindingLevel, string> = {
  observation: "Observation",
  minor: "Minor",
  major: "Major",
  critical: "Critical"
};

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoInspections(): Inspection[] {
  const now = new Date();
  return [
    {
      id: "demo-insp-001",
      organizationId: "demo-org",
      title: "Annual biosafety program internal audit",
      auditType: "internal",
      status: "planned",
      scheduledFor: new Date(now.getTime() + 21 * 86400000).toISOString().slice(0, 10),
      createdAt: now.toISOString(),
      findingCount: 0,
      openFindingCount: 0
    },
    {
      id: "demo-insp-002",
      organizationId: "demo-org",
      title: "GxP document control review",
      auditType: "internal",
      status: "in_progress",
      scheduledFor: new Date(now.getTime() - 3 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
      findingCount: 3,
      openFindingCount: 2
    },
    {
      id: "demo-insp-003",
      organizationId: "demo-org",
      title: "Quarterly EHS compliance check",
      auditType: "self",
      status: "completed",
      scheduledFor: new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10),
      completedAt: new Date(now.getTime() - 25 * 86400000).toISOString(),
      createdAt: new Date(now.getTime() - 45 * 86400000).toISOString(),
      findingCount: 2,
      openFindingCount: 0
    }
  ];
}

function demoInspectionDetail(id: string): InspectionDetail | null {
  const record = demoInspections().find((r) => r.id === id);
  if (!record) return null;
  return {
    ...record,
    findings: id === "demo-insp-002"
      ? [
          { id: "demo-finding-1", organizationId: "demo-org", auditId: id, findingLevel: "minor", title: "SOP-GxP-003 not current — revision pending since Q1", status: "open", createdAt: record.createdAt },
          { id: "demo-finding-2", organizationId: "demo-org", auditId: id, findingLevel: "major", title: "Training evidence missing for 2 staff on critical SOP", status: "in_progress", createdAt: record.createdAt },
          { id: "demo-finding-3", organizationId: "demo-org", auditId: id, findingLevel: "observation", title: "Document log missing date-of-approval field", status: "closed", createdAt: record.createdAt }
        ]
      : []
  };
}

// ---------------------------------------------------------------------------
// Read: list
// ---------------------------------------------------------------------------

export async function listInspections(filter?: { status?: InspectionStatus | "all" }): Promise<Inspection[]> {
  if (!isSupabaseConfigured()) return demoInspections();

  const context = await getProfileContext();
  if (!context) return demoInspections();

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("audits")
    .select("id,title,audit_type,status,scheduled_for,completed_at,created_by,created_at,updated_at,organization_id")
    .eq("organization_id", context.organizationId)
    .order("scheduled_for", { ascending: false })
    .limit(100);

  if (filter?.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const ids = data.map((r) => r.id);
  const { data: findingRows } = ids.length
    ? await supabase
        .from("audit_findings")
        .select("audit_id, status")
        .eq("organization_id", context.organizationId)
        .in("audit_id", ids)
    : { data: [] };

  const countMap = new Map<string, { total: number; open: number }>();
  for (const row of findingRows ?? []) {
    const e = countMap.get(row.audit_id) ?? { total: 0, open: 0 };
    e.total++;
    if (row.status !== "closed") e.open++;
    countMap.set(row.audit_id, e);
  }

  return data.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    auditType: row.audit_type as InspectionType,
    status: row.status as InspectionStatus,
    scheduledFor: row.scheduled_for,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    findingCount: countMap.get(row.id)?.total ?? 0,
    openFindingCount: countMap.get(row.id)?.open ?? 0
  }));
}

// ---------------------------------------------------------------------------
// Read: detail
// ---------------------------------------------------------------------------

export async function getInspectionDetail(id: string): Promise<InspectionDetail | null> {
  if (!isSupabaseConfigured()) return demoInspectionDetail(id);

  const context = await getProfileContext();
  if (!context) return demoInspectionDetail(id);

  const supabase = await createSupabaseServerClient();
  const [{ data: record }, { data: findings }] = await Promise.all([
    supabase
      .from("audits")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("audit_findings")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("audit_id", id)
      .order("created_at", { ascending: true })
  ]);

  if (!record) return null;

  const mappedFindings: InspectionFinding[] = (findings ?? []).map((f) => ({
    id: f.id,
    organizationId: f.organization_id,
    auditId: f.audit_id,
    findingLevel: f.finding_level as FindingLevel,
    title: f.title,
    status: f.status as FindingStatus,
    sourceModule: f.source_module,
    createdAt: f.created_at
  }));

  return {
    id: record.id,
    organizationId: record.organization_id,
    title: record.title,
    auditType: record.audit_type as InspectionType,
    status: record.status as InspectionStatus,
    scheduledFor: record.scheduled_for,
    completedAt: record.completed_at,
    createdBy: record.created_by,
    createdAt: record.created_at,
    findingCount: mappedFindings.length,
    openFindingCount: mappedFindings.filter((f) => f.status !== "closed").length,
    findings: mappedFindings
  };
}

// ---------------------------------------------------------------------------
// Write: create inspection
// ---------------------------------------------------------------------------

export async function createInspection(input: {
  title: string;
  auditType: InspectionType;
  scheduledFor?: string | null;
}): Promise<InspectionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in before creating an inspection." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audits")
    .insert({
      organization_id: context.organizationId,
      title: input.title.trim(),
      audit_type: input.auditType,
      status: "planned",
      scheduled_for: input.scheduledFor || null,
      created_by: context.userId
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Could not create inspection." };

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "intelligence_foundation_evaluated",
    summary: `Inspection scheduled: ${input.title}.`,
    payload: withAuditTrace(
      { inspectionId: data.id, title: input.title, auditType: input.auditType },
      { sourceModule: "audit", sourceRecordId: data.id, targetModule: "audit", draftOnly: false }
    )
  });

  return { ok: true, message: "Inspection scheduled.", id: data.id };
}

// ---------------------------------------------------------------------------
// Write: update status
// ---------------------------------------------------------------------------

export async function updateInspectionStatus(input: {
  inspectionId: string;
  status: InspectionStatus;
}): Promise<InspectionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to update an inspection." };

  const supabase = await createSupabaseServerClient();
  const completedAt = input.status === "completed" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("audits")
    .update({ status: input.status, completed_at: completedAt, updated_at: new Date().toISOString() })
    .eq("id", input.inspectionId)
    .eq("organization_id", context.organizationId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Inspection marked ${inspectionStatusLabels[input.status]}.` };
}

// ---------------------------------------------------------------------------
// Write: add finding
// ---------------------------------------------------------------------------

export async function addInspectionFinding(input: {
  inspectionId: string;
  findingLevel: FindingLevel;
  title: string;
}): Promise<InspectionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to add a finding." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_findings")
    .insert({
      organization_id: context.organizationId,
      audit_id: input.inspectionId,
      finding_level: input.findingLevel,
      title: input.title.trim(),
      status: "open"
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Could not add finding." };
  return { ok: true, message: "Finding recorded.", id: data.id };
}

// ---------------------------------------------------------------------------
// Write: close finding
// ---------------------------------------------------------------------------

export async function closeInspectionFinding(input: {
  findingId: string;
  inspectionId: string;
}): Promise<InspectionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to close a finding." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("audit_findings")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", input.findingId)
    .eq("organization_id", context.organizationId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Finding closed." };
}
