/**
 * Internal Foundation helpers shared across the foundation-* service files.
 * Do NOT import from outside src/lib/supabase/.
 */

import { withAuditTrace } from "@/lib/audit-trace";
import type { AuditEvent } from "@/lib/bio-ai/types";
import type { FoundationSourceResolutionState } from "@/lib/foundation/review-actions";
import { createSupabaseServerClient } from "./server";
import type { ProfileContext } from "./data-helpers";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// ---------------------------------------------------------------------------
// Shared Foundation types referenced by helpers below and by foundation-* services
// ---------------------------------------------------------------------------

export type FoundationDuplicateSkipSummary = {
  title: string;
  sourceModule: string;
  sourceRecordId?: string;
  reason: string;
};

export type FoundationVerificationStatusSummary = {
  checklist: Array<{
    key: string;
    label: string;
    status: "pass" | "pending";
    detail: string;
    eventTypes: AuditEvent["eventType"][];
  }>;
  latestWorkflowSave?: {
    eventType: AuditEvent["eventType"];
    summary: string;
    createdAt?: string;
    sourceModule?: string;
    targetModule?: string;
  };
  latestReviewActionRun?: {
    summary: string;
    createdAt?: string;
    created: number;
    candidateCount: number;
    skippedDuplicates: FoundationDuplicateSkipSummary[];
  };
  latestAuditEvent?: {
    eventType: AuditEvent["eventType"];
    summary: string;
    createdAt?: string;
    sourceModule?: string;
    targetModule?: string;
    draftOnly: boolean;
  };
  latestFinalSignoff?: {
    id: string;
    note: string;
    createdAt?: string;
  };
  allChecklistPassed: boolean;
  productionPromotionAllowed: boolean;
  productionGateReason: string;
};

export type FoundationReviewActionCandidate = {
  sourceModule: string;
  sourceRecordId: string;
  title: string;
  priority: "medium" | "high";
  reason: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function foundationActionKey(sourceModule?: string | null, sourceRecordId?: string | null, title?: string | null) {
  if (!sourceModule || !sourceRecordId || !title) return null;
  return `${sourceModule}:${sourceRecordId}:${title}`;
}

export async function getFoundationSourceResolutionStates(
  supabase: SupabaseClient,
  organizationId: string,
  refs: Array<{ sourceModule: string; sourceRecordId?: string }>
): Promise<Map<string, FoundationSourceResolutionState>> {
  const states = new Map<string, FoundationSourceResolutionState>();
  const refsByModule = new Map<string, string[]>();
  for (const ref of refs) {
    if (!ref.sourceRecordId) continue;
    refsByModule.set(ref.sourceModule, [...(refsByModule.get(ref.sourceModule) ?? []), ref.sourceRecordId]);
  }

  const evidenceIds = Array.from(new Set(refsByModule.get("evidence_map") ?? []));
  const trainingIds = Array.from(new Set(refsByModule.get("training_assignment") ?? []));
  const equipmentIds = Array.from(new Set(refsByModule.get("equipment") ?? []));
  const incidentIds = Array.from(new Set(refsByModule.get("incident") ?? []));

  const [evidenceRows, trainingRows, equipmentRows, incidentRows] = await Promise.all([
    evidenceIds.length > 0
      ? supabase
          .from("compliance_evidence_map")
          .select("id,evidence_status,audit_ready,human_review_required")
          .eq("organization_id", organizationId)
          .in("id", evidenceIds)
      : Promise.resolve({ data: [] }),
    trainingIds.length > 0
      ? supabase
          .from("training_assignments")
          .select("id,status,completed_at,expires_at")
          .eq("organization_id", organizationId)
          .in("id", trainingIds)
      : Promise.resolve({ data: [] }),
    equipmentIds.length > 0
      ? supabase
          .from("equipment")
          .select("id,status,qualification_status")
          .eq("organization_id", organizationId)
          .in("id", equipmentIds)
      : Promise.resolve({ data: [] }),
    incidentIds.length > 0
      ? supabase
          .from("incidents")
          .select("id,status,severity")
          .eq("organization_id", organizationId)
          .in("id", incidentIds)
      : Promise.resolve({ data: [] })
  ]);

  for (const row of ((evidenceRows.data as Record<string, any>[]) ?? [])) {
    const resolved = row.audit_ready === true && row.evidence_status === "current";
    states.set(`evidence_map:${row.id}`, {
      state: resolved ? "Source appears resolved" : "Source still needs evidence review",
      detail: `Evidence status ${row.evidence_status ?? "unknown"}; audit ready ${row.audit_ready ? "yes" : "no"}; human review ${row.human_review_required ? "required" : "not flagged"}.`
    });
  }
  for (const row of ((trainingRows.data as Record<string, any>[]) ?? [])) {
    const resolved = row.status === "completed" && Boolean(row.completed_at);
    states.set(`training_assignment:${row.id}`, {
      state: resolved ? "Source appears resolved" : "Training source still needs review",
      detail: `Training status ${row.status ?? "unknown"}${row.expires_at ? `; expires ${row.expires_at}` : ""}.`
    });
  }
  for (const row of ((equipmentRows.data as Record<string, any>[]) ?? [])) {
    const resolved = row.status === "active" && ["qualified", "current", "ready"].includes(String(row.qualification_status ?? "").toLowerCase());
    states.set(`equipment:${row.id}`, {
      state: resolved ? "Source appears resolved" : "Equipment source still needs review",
      detail: `Equipment status ${row.status ?? "unknown"}; qualification ${row.qualification_status ?? "not recorded"}.`
    });
  }
  for (const row of ((incidentRows.data as Record<string, any>[]) ?? [])) {
    const resolved = row.status === "closed";
    states.set(`incident:${row.id}`, {
      state: resolved ? "Source appears resolved" : "Incident source still needs review",
      detail: `Incident status ${row.status ?? "unknown"}; severity ${row.severity ?? "not recorded"}.`
    });
  }

  return states;
}

export function getReadinessTrend(latest: number, previous?: number) {
  if (typeof previous !== "number") return "not_enough_data" as const;
  if (latest > previous) return "improving" as const;
  if (latest < previous) return "declining" as const;
  return "steady" as const;
}

export function dedupeReadinessGaps(gaps: Array<{ label: string; status: string; sourceHref: string }>) {
  const seen = new Set<string>();
  return gaps.filter((gap) => {
    const key = `${gap.label}:${gap.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterAuditEvents(events: AuditEvent[], filters?: { eventType?: string; sourceModule?: string }) {
  return events.filter((event) => {
    const eventMatches = !filters?.eventType || filters.eventType === "all" || event.eventType === filters.eventType;
    const sourceMatches =
      !filters?.sourceModule ||
      filters.sourceModule === "all" ||
      String((event.payload as Record<string, unknown> | undefined)?.sourceModule ?? "") === filters.sourceModule;
    return eventMatches && sourceMatches;
  });
}

export function mapFoundationWorkflowSave(row: Record<string, any> | null): FoundationVerificationStatusSummary["latestWorkflowSave"] {
  if (!row) return undefined;
  return {
    eventType: row.event_type,
    summary: row.summary,
    createdAt: row.created_at,
    sourceModule: row.payload?.sourceModule,
    targetModule: row.payload?.targetModule
  };
}

export function mapProductionVerificationEvent(row: Record<string, any>) {
  return {
    eventType: row.event_type as AuditEvent["eventType"],
    summary: String(row.summary ?? ""),
    createdAt: row.created_at
  };
}

export function mapFoundationReviewRun(row: Record<string, any> | null): FoundationVerificationStatusSummary["latestReviewActionRun"] {
  if (!row) return undefined;
  return {
    summary: row.summary,
    createdAt: row.created_at,
    created: Number(row.payload?.created ?? 0),
    candidateCount: Number(row.payload?.candidateCount ?? 0),
    skippedDuplicates: normalizeSkippedDuplicates(row.payload?.skippedDuplicates)
  };
}

export function mapFoundationLatestAudit(row: Record<string, any> | null): FoundationVerificationStatusSummary["latestAuditEvent"] {
  if (!row) return undefined;
  return {
    eventType: row.event_type,
    summary: row.summary,
    createdAt: row.created_at,
    sourceModule: row.payload?.sourceModule,
    targetModule: row.payload?.targetModule,
    draftOnly: row.payload?.draftOnly !== false
  };
}

export function mapFoundationFinalSignoff(row: Record<string, any> | null): FoundationVerificationStatusSummary["latestFinalSignoff"] {
  if (!row) return undefined;
  return {
    id: row.id,
    note: row.note,
    createdAt: row.created_at
  };
}

export function buildFoundationVerificationChecklist(rows: Record<string, any>[]): FoundationVerificationStatusSummary["checklist"] {
  const steps: Array<{
    key: string;
    label: string;
    eventTypes: AuditEvent["eventType"][];
  }> = [
    { key: "biotypes", label: "BioTypes saved", eventTypes: ["foundation_biotype_selection_updated"] },
    { key: "intake", label: "Intake edited", eventTypes: ["foundation_intake_response_updated"] },
    { key: "evidence", label: "Evidence readiness updated", eventTypes: ["foundation_evidence_readiness_updated"] },
    { key: "note", label: "Audit note added", eventTypes: ["foundation_audit_readiness_note_added"] },
    { key: "actions", label: "Action plan generated", eventTypes: ["foundation_review_actions_generated"] },
    { key: "taskStatus", label: "Task status updated", eventTypes: ["foundation_review_task_status_updated"] }
  ];
  return steps.map((step) => {
    const match = rows.find((row) => step.eventTypes.includes(row.event_type));
    return {
      ...step,
      status: match ? ("pass" as const) : ("pending" as const),
      detail: match?.created_at ? `Last seen ${new Date(match.created_at).toLocaleString()}` : "Pending owner verification"
    };
  });
}

export function normalizeSkippedDuplicates(value: unknown): FoundationDuplicateSkipSummary[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      title: String(row.title ?? "Duplicate review action"),
      sourceModule: String(row.sourceModule ?? "foundation"),
      sourceRecordId: row.sourceRecordId ? String(row.sourceRecordId) : undefined,
      reason: String(row.reason ?? "Existing open action")
    };
  });
}

export function demoFoundationVerificationStatusSummary(): FoundationVerificationStatusSummary {
  const checklist = buildFoundationVerificationChecklist([]);
  return {
    checklist,
    latestWorkflowSave: {
      eventType: "foundation_evidence_readiness_updated",
      summary: "Demo evidence readiness update available for owner verification.",
      createdAt: undefined,
      sourceModule: "evidence_map",
      targetModule: "compliance_evidence_map"
    },
    latestReviewActionRun: {
      summary: "Demo action planning run. Draft outputs require human review.",
      createdAt: undefined,
      created: 0,
      candidateCount: 2,
      skippedDuplicates: [
        {
          title: "Review evidence gap - Biosafety Manual acknowledgement",
          sourceModule: "evidence_map",
          sourceRecordId: "demo-evidence-0",
          reason: "Existing open task"
        }
      ]
    },
    latestAuditEvent: {
      eventType: "foundation_review_actions_generated",
      summary: "Demo action generation audit event.",
      createdAt: undefined,
      sourceModule: "foundation",
      targetModule: "task",
      draftOnly: true
    },
    latestFinalSignoff: undefined,
    allChecklistPassed: false,
    productionPromotionAllowed: false,
    productionGateReason: "Production promotion is blocked until owner verification and final preview signoff are captured."
  };
}

export async function hasOpenFoundationTask(
  supabase: SupabaseClient,
  organizationId: string,
  sourceModule: string,
  sourceRecordId: string,
  title: string
) {
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("source_module", sourceModule)
    .eq("source_record_id", sourceRecordId)
    .eq("title", title)
    .in("status", ["open", "in_progress"]);

  if (error) return false;
  return (count ?? 0) > 0;
}

export async function hasOpenFoundationRecommendation(
  supabase: SupabaseClient,
  organizationId: string,
  sourceModule: string,
  sourceRecordId: string,
  title: string
) {
  const { count, error } = await supabase
    .from("document_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("title", title)
    .contains("payload", {
      actionType: "foundation_review_action",
      sourceModule,
      sourceRecordId
    });

  if (error) return false;
  return (count ?? 0) > 0;
}

export async function writeFoundationAuditEvent(
  supabase: SupabaseClient,
  context: ProfileContext,
  input: {
    eventType: AuditEvent["eventType"];
    summary: string;
    sourceModule: string;
    sourceRecordId?: string | null;
    targetModule: string;
    targetRecordId?: string | null;
    runId?: string;
    payload?: Record<string, unknown>;
  }
) {
  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: input.eventType,
    summary: input.summary,
    payload: withAuditTrace(input.payload ?? {}, {
      sourceModule: input.sourceModule,
      sourceRecordId: input.sourceRecordId ?? undefined,
      targetModule: input.targetModule,
      targetRecordId: input.targetRecordId ?? undefined,
      runId: input.runId,
      draftOnly: true
    })
  });
}
