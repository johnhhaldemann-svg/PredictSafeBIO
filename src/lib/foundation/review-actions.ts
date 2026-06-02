import type { AuditEvent } from "@/lib/bio-ai/types";
import {
  FIELD_REPORT_DUE_SOON_DAYS,
  getDaysUntilDate,
  getFieldReportDueState
} from "@/lib/foundation/timing";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export const foundationReviewSourceModules: string[] = [
  "evidence_map",
  "training_assignment",
  "equipment",
  "incident",
  "biotype_selection",
  "audit_readiness",
  "foundation"
];

export type FoundationActionHistoryItem = {
  eventType: AuditEvent["eventType"];
  summary: string;
  createdAt?: string;
  status?: string;
  previousStatus?: string | null;
  priority?: string | null;
  previousPriority?: string | null;
  note?: string;
  closeoutNote?: string | null;
  actorRole?: string | null;
  previousDueDate?: string | null;
  dueDate?: string | null;
  previousAssignedTo?: string | null;
  assignedTo?: string | null;
  previousAssigneeName?: string | null;
  assigneeName?: string | null;
  resolutionState?: string | null;
  resolutionDetail?: string | null;
  readyForClosureReview?: boolean | null;
};

export type FoundationTaskAuditEvent = {
  eventType: AuditEvent["eventType"];
  summary: string;
  createdAt?: string;
  payload: Record<string, any>;
};

export type FoundationSourceResolutionState = {
  state: string;
  detail: string;
};

export function getFoundationSourceTarget(sourceModule: string) {
  const targets: Record<string, { label: string; href: string }> = {
    evidence_map: { label: "Evidence map", href: "/foundation#evidence-map" },
    training_assignment: { label: "Training readiness", href: "/foundation#training-drilldown" },
    equipment: { label: "Equipment readiness", href: "/foundation#equipment-drilldown" },
    incident: { label: "Incident/CAPA screening", href: "/foundation#incident-drilldown" },
    biotype_selection: { label: "BioType controls", href: "/foundation#foundation-workflows" },
    audit_readiness: { label: "Audit readiness", href: "/foundation#audit-readiness-console" },
    foundation: { label: "Foundation", href: "/foundation" }
  };

  return targets[sourceModule] ?? { label: sourceModule.replace(/_/g, " "), href: "/foundation" };
}

export function getFoundationExactSourceHref(sourceModule: string, sourceRecordId?: string) {
  if (sourceRecordId && foundationReviewSourceModules.includes(sourceModule)) {
    return `/foundation#source-${sourceModule}-${sourceRecordId}`;
  }
  return getFoundationSourceTarget(sourceModule).href;
}

export function getFoundationActionOperatingState(status: string, dueDate?: string | null) {
  if (status === "complete") return "Closed with human review";
  if (status === "blocked") return "Blocked - owner decision needed";
  if (status === "in_progress") return "Active review underway";
  const dueState = getFieldReportDueState(dueDate);
  if (dueState === "unscheduled") return "Open - needs schedule";
  return dueState === "overdue" ? "Open - overdue" : "Open - queued";
}

export function getFoundationActionNextStep(status: string, assignedTo?: string | null, dueDate?: string | null) {
  if (status === "complete") return "Confirm evidence and audit trail remain linked; no further draft action is implied.";
  if (status === "blocked") return "Capture the blocker, owner decision, or missing evidence before moving forward.";
  if (!assignedTo) return "Assign an owner so follow-through is accountable.";
  if (!dueDate) return "Set a due date and move the task to in progress when review starts.";
  if (status === "in_progress") return "Complete the source review, update evidence, then close or block with notes.";
  return "Move to in progress when the assigned owner starts review.";
}

export function getFoundationTaskStatusHistory(
  auditEvents: FoundationTaskAuditEvent[],
  taskId: string,
  sourceRecordId?: string,
  profiles?: Map<string, Record<string, any>>
): FoundationActionHistoryItem[] {
  return mapFoundationTaskHistory(auditEvents, taskId, sourceRecordId, profiles, 5);
}

export function getFoundationTaskActivityHistory(
  auditEvents: FoundationTaskAuditEvent[],
  taskId: string,
  sourceRecordId?: string,
  profiles?: Map<string, Record<string, any>>
): FoundationActionHistoryItem[] {
  return mapFoundationTaskHistory(auditEvents, taskId, sourceRecordId, profiles, 8);
}

export function getFoundationTaskCloseoutNote(statusHistory: FoundationActionHistoryItem[]) {
  return statusHistory.find((event) => event.status === "complete" && event.closeoutNote)?.closeoutNote ?? null;
}

export function getFoundationSourceResolution(
  states: Map<string, FoundationSourceResolutionState>,
  sourceModule: string,
  sourceRecordId?: string
): FoundationSourceResolutionState {
  if (!sourceRecordId) {
    return {
      state: "No exact source linked",
      detail: "This action is not tied to a source row yet, so resolution must be reviewed manually."
    };
  }
  return (
    states.get(`${sourceModule}:${sourceRecordId}`) ?? {
      state: "Manual source review required",
      detail: "No automated source-resolution signal is available for this source module yet."
    }
  );
}

export async function createFoundationTaskNotification(
  supabase: SupabaseServerClient,
  organizationId: string,
  userId: string | null,
  taskId: string,
  notificationType: string,
  input: { title: string; body: string }
) {
  if (!userId) return;
  await supabase.from("notifications").insert({
    organization_id: organizationId,
    user_id: userId,
    task_id: taskId,
    notification_type: notificationType,
    title: input.title,
    body: input.body
  });
}

export async function createFoundationTaskNotificationIfMissing(
  supabase: SupabaseServerClient,
  organizationId: string,
  userId: string | null,
  taskId: string,
  notificationType: string,
  input: { title: string; body: string },
  since?: string
) {
  if (!userId) return;
  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .eq("notification_type", notificationType);
  if (since) query = query.gte("created_at", since);
  const { count, error } = await query;
  if (error || (count ?? 0) > 0) return;
  await createFoundationTaskNotification(supabase, organizationId, userId, taskId, notificationType, input);
}

export async function createFoundationDueNotifications(
  supabase: SupabaseServerClient,
  organizationId: string,
  tasks: Array<Record<string, any>>
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = new Date(today).toISOString();
  for (const task of tasks) {
    if (!task.assigned_to || !task.due_date || task.status === "complete") continue;
    const days = getDaysUntilDate(task.due_date, today);
    if (days === null) continue;
    if (days < 0) {
      await createFoundationTaskNotificationIfMissing(
        supabase,
        organizationId,
        task.assigned_to,
        task.id,
        "foundation_task_overdue",
        {
          title: "Foundation task overdue",
          body: `${task.title} is overdue and still needs human review follow-through.`
        },
        since
      );
    } else if (days <= FIELD_REPORT_DUE_SOON_DAYS) {
      await createFoundationTaskNotificationIfMissing(
        supabase,
        organizationId,
        task.assigned_to,
        task.id,
        "foundation_task_due_soon",
        {
          title: "Foundation task due soon",
          body: `${task.title} is due ${task.due_date}; review source evidence before closeout.`
        },
        since
      );
    }
  }
}

export function getFoundationNotificationLabel(notificationType: string) {
  if (notificationType === "foundation_task_assigned") return "Assigned";
  if (notificationType === "foundation_task_blocked") return "Blocked";
  if (notificationType === "foundation_task_due_soon") return "Due soon";
  if (notificationType === "foundation_task_overdue") return "Overdue";
  if (notificationType === "foundation_task_ready_for_closure") return "Ready for closure";
  return "Task";
}

export function normalizeFoundationReviewSourceModule(sourceModule: string) {
  return foundationReviewSourceModules.includes(sourceModule) ? sourceModule : null;
}

function mapFoundationTaskHistory(
  auditEvents: FoundationTaskAuditEvent[],
  taskId: string,
  sourceRecordId: string | undefined,
  profiles: Map<string, Record<string, any>> | undefined,
  limit: number
) {
  return auditEvents
    .filter((event) => {
      const payload = event.payload ?? {};
      return payload.taskId === taskId || payload.targetRecordId === taskId || (sourceRecordId && payload.sourceRecordId === sourceRecordId);
    })
    .slice(0, limit)
    .map((event) => ({
      eventType: event.eventType,
      summary: event.summary,
      createdAt: event.createdAt,
      status: typeof event.payload.status === "string" ? event.payload.status : undefined,
      previousStatus: typeof event.payload.previousStatus === "string" ? event.payload.previousStatus : null,
      priority: typeof event.payload.priority === "string" ? event.payload.priority : null,
      previousPriority: typeof event.payload.previousPriority === "string" ? event.payload.previousPriority : null,
      note: typeof event.payload.note === "string" ? event.payload.note : undefined,
      closeoutNote: typeof event.payload.closeoutNote === "string" ? event.payload.closeoutNote : null,
      actorRole: typeof event.payload.actorRole === "string" ? event.payload.actorRole : null,
      previousDueDate: typeof event.payload.previousDueDate === "string" ? event.payload.previousDueDate : null,
      dueDate: typeof event.payload.dueDate === "string" ? event.payload.dueDate : null,
      previousAssignedTo: typeof event.payload.previousAssignedTo === "string" ? event.payload.previousAssignedTo : null,
      assignedTo: typeof event.payload.assignedTo === "string" ? event.payload.assignedTo : null,
      previousAssigneeName: getProfileDisplayName(profiles, event.payload.previousAssignedTo),
      assigneeName: getProfileDisplayName(profiles, event.payload.assignedTo),
      resolutionState: typeof event.payload.resolutionState === "string" ? event.payload.resolutionState : null,
      resolutionDetail: typeof event.payload.resolutionDetail === "string" ? event.payload.resolutionDetail : null,
      readyForClosureReview: typeof event.payload.readyForClosureReview === "boolean" ? event.payload.readyForClosureReview : null
    }));
}

function getProfileDisplayName(profiles: Map<string, Record<string, any>> | undefined, profileId: unknown) {
  if (typeof profileId !== "string" || !profileId) return null;
  const profile = profiles?.get(profileId);
  return profile?.full_name ?? profile?.role ?? profileId;
}
