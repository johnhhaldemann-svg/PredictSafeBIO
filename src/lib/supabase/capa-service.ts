/**
 * CAPA (Corrective and Preventive Action) service.
 * Handles all reads and writes for capa_records and capa_actions.
 */

import { withAuditTrace } from "@/lib/audit-trace";
import { canManageWorkspace } from "@/lib/role-permissions";
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CapaStatus =
  | "draft_human_review_required"
  | "open"
  | "in_progress"
  | "closed"
  | "void";

export type CapaActionStatus = "open" | "in_progress" | "complete" | "blocked";
export type CapaActionType = "corrective" | "preventive";

export type CapaRecord = {
  id: string;
  organizationId: string;
  title: string;
  status: CapaStatus;
  ownerRole?: string | null;
  dueDate?: string | null;
  effectivenessCheckDue?: string | null;
  sourceIncidentId?: string | null;
  sourceAssessmentId?: string | null;
  linkedRecordType?: string | null;
  linkedRecordId?: string | null;
  rootCause?: string | null;
  capaFlag?: boolean;
  recurrenceCount?: number;
  verificationNote?: string | null;
  archivedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // derived
  isOverdue?: boolean;
  // joined fields
  actionCount?: number;
  openActionCount?: number;
};

export type CapaAction = {
  id: string;
  organizationId: string;
  capaRecordId: string;
  actionType: CapaActionType;
  title: string;
  status: CapaActionStatus;
  ownerId?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt?: string;
};

export type CapaDetail = CapaRecord & {
  actions: CapaAction[];
  auditTrail: Array<{
    eventType: string;
    summary: string;
    createdAt?: string;
  }>;
};

export type CapaResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------

export const capaStatusLabels: Record<CapaStatus, string> = {
  draft_human_review_required: "Draft — review required",
  open: "Open",
  in_progress: "In progress",
  closed: "Closed",
  void: "Void"
};

export const capaStatusOptions: CapaStatus[] = [
  "draft_human_review_required",
  "open",
  "in_progress",
  "closed",
  "void"
];

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoCapaRecords(): CapaRecord[] {
  return [
    {
      id: "demo-capa-001",
      organizationId: "demo-org",
      title: "Sterility assay deviation — corrective action",
      status: "in_progress",
      ownerRole: "quality_unit",
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      effectivenessCheckDue: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      sourceAssessmentId: "demo-critical-contamination",
      createdAt: new Date().toISOString(),
      actionCount: 2,
      openActionCount: 1
    },
    {
      id: "demo-capa-002",
      organizationId: "demo-org",
      title: "Expired aseptic technique training — preventive action",
      status: "open",
      ownerRole: "qa",
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      sourceAssessmentId: "demo-training-gap",
      createdAt: new Date().toISOString(),
      actionCount: 1,
      openActionCount: 1
    },
    {
      id: "demo-capa-003",
      organizationId: "demo-org",
      title: "BSC-001 calibration gap — equipment corrective action",
      status: "draft_human_review_required",
      ownerRole: "validation_lead",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      actionCount: 0,
      openActionCount: 0
    }
  ];
}

function filterDemoCapaRecords(filters?: { status?: CapaStatus | "all" }) {
  const records = demoCapaRecords();
  if (!filters?.status || filters.status === "all") return records;
  return records.filter((record) => record.status === filters.status);
}

function demoCapaDetail(id: string): CapaDetail | null {
  const record = demoCapaRecords().find((r) => r.id === id);
  if (!record) return null;
  return {
    ...record,
    actions: [
      {
        id: `${id}-action-1`,
        organizationId: "demo-org",
        capaRecordId: id,
        actionType: "corrective",
        title: "Investigate root cause and document findings",
        status: "in_progress",
        dueDate: record.dueDate,
        createdAt: record.createdAt
      },
      {
        id: `${id}-action-2`,
        organizationId: "demo-org",
        capaRecordId: id,
        actionType: "preventive",
        title: "Update SOP and re-train affected staff",
        status: "open",
        dueDate: record.effectivenessCheckDue ?? record.dueDate,
        createdAt: record.createdAt
      }
    ],
    auditTrail: [
      {
        eventType: "demo_seed_created",
        summary: "Demo CAPA record created for review.",
        createdAt: record.createdAt
      }
    ]
  };
}

// ---------------------------------------------------------------------------
// Read: list
// ---------------------------------------------------------------------------

export async function listCapaRecords(filters?: {
  status?: CapaStatus | "all";
}): Promise<CapaRecord[]> {
  if (!isSupabaseConfigured()) return filterDemoCapaRecords(filters);

  const context = await getProfileContext();
  if (!context) return filterDemoCapaRecords(filters);

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("capa_records")
    .select("id,title,status,owner_role,due_date,effectiveness_check_due,source_incident_id,source_assessment_id,created_by,created_at,updated_at,organization_id")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Fetch action counts per CAPA
  const ids = data.map((r) => r.id);
  const { data: actionRows } = ids.length
    ? await supabase
        .from("capa_actions")
        .select("capa_record_id, status")
        .eq("organization_id", context.organizationId)
        .in("capa_record_id", ids)
    : { data: [] };

  const countMap = new Map<string, { total: number; open: number }>();
  for (const row of actionRows ?? []) {
    const entry = countMap.get(row.capa_record_id) ?? { total: 0, open: 0 };
    entry.total++;
    if (row.status !== "complete") entry.open++;
    countMap.set(row.capa_record_id, entry);
  }

  return data.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    status: row.status as CapaStatus,
    ownerRole: row.owner_role,
    dueDate: row.due_date,
    effectivenessCheckDue: row.effectiveness_check_due,
    sourceIncidentId: row.source_incident_id,
    sourceAssessmentId: row.source_assessment_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    actionCount: countMap.get(row.id)?.total ?? 0,
    openActionCount: countMap.get(row.id)?.open ?? 0
  }));
}

// ---------------------------------------------------------------------------
// Read: detail
// ---------------------------------------------------------------------------

export async function getCapaDetail(capaId: string): Promise<CapaDetail | null> {
  if (!isSupabaseConfigured()) return demoCapaDetail(capaId);

  const context = await getProfileContext();
  if (!context) return demoCapaDetail(capaId);

  const supabase = await createSupabaseServerClient();

  const [{ data: record }, { data: actions }, { data: auditRows }] = await Promise.all([
    supabase
      .from("capa_records")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", capaId)
      .maybeSingle(),
    supabase
      .from("capa_actions")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("capa_record_id", capaId)
      .order("created_at", { ascending: true }),
    supabase
      .from("audit_events")
      .select("event_type, summary, created_at, payload")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  if (!record) return null;

  const capaAuditTrail = (auditRows ?? [])
    .filter((e) => {
      const p = e.payload as Record<string, unknown> | null;
      return p?.capaRecordId === capaId || p?.sourceRecordId === capaId;
    })
    .map((e) => ({
      eventType: e.event_type as string,
      summary: e.summary as string,
      createdAt: e.created_at as string | undefined
    }));

  const actionCount = (actions ?? []).length;
  const openActionCount = (actions ?? []).filter((a) => a.status !== "complete").length;

  return {
    id: record.id,
    organizationId: record.organization_id,
    title: record.title,
    status: record.status as CapaStatus,
    ownerRole: record.owner_role,
    dueDate: record.due_date,
    effectivenessCheckDue: record.effectiveness_check_due,
    sourceIncidentId: record.source_incident_id,
    sourceAssessmentId: record.source_assessment_id,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    actionCount,
    openActionCount,
    actions: (actions ?? []).map((a) => ({
      id: a.id,
      organizationId: a.organization_id,
      capaRecordId: a.capa_record_id,
      actionType: a.action_type as CapaActionType,
      title: a.title,
      status: a.status as CapaActionStatus,
      ownerId: a.owner_id,
      dueDate: a.due_date,
      completedAt: a.completed_at,
      createdAt: a.created_at
    })),
    auditTrail: capaAuditTrail
  };
}

// ---------------------------------------------------------------------------
// Write: create CAPA record
// ---------------------------------------------------------------------------

export async function createCapaRecord(input: {
  title: string;
  ownerRole?: string;
  dueDate?: string | null;
  effectivenessCheckDue?: string | null;
  sourceAssessmentId?: string | null;
  sourceIncidentId?: string | null;
  linkedRecordType?: string | null;
  linkedRecordId?: string | null;
  rootCause?: string | null;
  initialAction?: string | null;
}): Promise<CapaResult> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in before creating a CAPA record." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("capa_records")
    .insert({
      organization_id: context.organizationId,
      title: input.title.trim(),
      status: "open",
      owner_role: input.ownerRole || null,
      due_date: input.dueDate || null,
      effectiveness_check_due: input.effectivenessCheckDue || null,
      source_assessment_id: input.sourceAssessmentId || null,
      source_incident_id: input.sourceIncidentId || null,
      linked_record_type: input.linkedRecordType || null,
      linked_record_id: input.linkedRecordId || null,
      root_cause: input.rootCause || null,
      created_by: context.userId
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not create CAPA record." };
  }

  // Write failure_cell to risk dashboard
  await supabase.from("risk_cells").upsert({
    organization_id: context.organizationId,
    cell_type: "failure_cell",
    label: `CAPA: ${input.title}`,
    severity: "medium",
    linked_record_type: "capa_records",
    linked_record_id: data.id,
    payload: {
      root_cause: input.rootCause,
      linked_record_type: input.linkedRecordType,
      linked_record_id: input.linkedRecordId,
      due_date: input.dueDate
    },
    status: "active",
    created_by: context.userId
  }, { onConflict: "organization_id,linked_record_type,linked_record_id" });

  // Auto-create initial corrective action if provided
  if (input.initialAction?.trim()) {
    await supabase.from("capa_actions").insert({
      organization_id: context.organizationId,
      capa_record_id: data.id,
      action_type: "corrective",
      title: input.initialAction.trim(),
      status: "open",
      owner_id: context.userId,
      due_date: input.dueDate || null
    });
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "map_operations_bundle_created",
    summary: `CAPA record created: ${input.title}.`,
    payload: withAuditTrace(
      {
        capaRecordId: data.id,
        title: input.title,
        sourceAssessmentId: input.sourceAssessmentId,
        sourceIncidentId: input.sourceIncidentId
      },
      {
        sourceModule: "capa",
        sourceRecordId: data.id,
        targetModule: "capa",
        targetRecordId: data.id,
        draftOnly: false
      }
    )
  });

  return { ok: true, message: "CAPA record created.", id: data.id };
}

// ---------------------------------------------------------------------------
// Write: update CAPA status
// ---------------------------------------------------------------------------

export async function updateCapaStatus(input: {
  capaId: string;
  status: CapaStatus;
  note?: string;
}): Promise<CapaResult> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in before updating a CAPA record." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("capa_records")
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq("id", input.capaId)
    .eq("organization_id", context.organizationId);

  if (error) return { ok: false, message: error.message };

  // Update risk cell based on new status
  if (input.status === "closed") {
    // Closed CAPA becomes an improvement_cell (resolved)
    await supabase.from("risk_cells").update({
      cell_type: "improvement_cell",
      status: "resolved",
      label: `CAPA closed: ${input.note ?? "Verified and closed"}`
    })
    .eq("linked_record_type", "capa_records")
    .eq("linked_record_id", input.capaId);
  } else if (input.status === "void") {
    await supabase.from("risk_cells").update({ status: "resolved" })
      .eq("linked_record_type", "capa_records")
      .eq("linked_record_id", input.capaId);
  } else {
    // Escalate to high if overdue
    const { data: rec } = await supabase
      .from("capa_records")
      .select("due_date")
      .eq("id", input.capaId)
      .single();
    const overdue = rec?.due_date && new Date(rec.due_date) < new Date();
    if (overdue) {
      await supabase.from("risk_cells").update({ severity: "high" })
        .eq("linked_record_type", "capa_records")
        .eq("linked_record_id", input.capaId);
    }
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "foundation_review_task_status_updated",
    summary: `CAPA status updated to ${input.status}${input.note ? `: ${input.note}` : ""}.`,
    payload: withAuditTrace(
      { capaRecordId: input.capaId, status: input.status, note: input.note },
      {
        sourceModule: "capa",
        sourceRecordId: input.capaId,
        targetModule: "capa",
        targetRecordId: input.capaId,
        draftOnly: input.status !== "closed"
      }
    )
  });

  return { ok: true, message: `CAPA marked ${capaStatusLabels[input.status]}.` };
}

// ---------------------------------------------------------------------------
// Write: add CAPA action
// ---------------------------------------------------------------------------

export async function addCapaAction(input: {
  capaId: string;
  actionType: CapaActionType;
  title: string;
  dueDate?: string | null;
}): Promise<CapaResult> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in before adding a CAPA action." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("capa_actions")
    .insert({
      organization_id: context.organizationId,
      capa_record_id: input.capaId,
      action_type: input.actionType,
      title: input.title.trim(),
      status: "open",
      owner_id: context.userId,
      due_date: input.dueDate || null
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not add action." };
  }

  return { ok: true, message: "Action added.", id: data.id };
}

// ---------------------------------------------------------------------------
// Write: update CAPA action status
// ---------------------------------------------------------------------------

export async function updateCapaActionStatus(input: {
  actionId: string;
  status: CapaActionStatus;
}): Promise<CapaResult> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in before updating an action." };
  }

  const supabase = await createSupabaseServerClient();
  const completedAt =
    input.status === "complete" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("capa_actions")
    .update({
      status: input.status,
      completed_at: completedAt,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.actionId)
    .eq("organization_id", context.organizationId);

  if (error) return { ok: false, message: error.message };

  return { ok: true, message: `Action marked ${input.status}.` };
}
