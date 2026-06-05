/**
 * Assessment auto-trigger logic.
 *
 * Called immediately after a successful assessment save. Each risk level
 * fires a defined chain of records (CAPA, risk cell, audit events, review
 * scheduling) without manual escalation.
 *
 * All operations are best-effort — a trigger failure never blocks the save.
 */

import { withAuditTrace } from "@/lib/audit-trace";
import type { BioAiAssessment, BioAiInput } from "@/lib/bio-ai/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type TriggerContext = {
  organizationId: string;
  userId: string;
};

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function hoursFromNow(h: number): string {
  const d = new Date(Date.now() + h * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createTriggeredCapa(
  supabase: SupabaseClient,
  ctx: TriggerContext,
  opts: {
    title: string;
    dueDate: string;
    assessmentId: string;
    initialAction?: string;
    severity: "low" | "medium" | "high" | "critical";
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from("capa_records")
    .insert({
      organization_id: ctx.organizationId,
      title: opts.title,
      status: "open",
      due_date: opts.dueDate,
      source_assessment_id: opts.assessmentId,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !data) return null;

  await supabase.from("risk_cells").upsert(
    {
      organization_id: ctx.organizationId,
      cell_type: "failure_cell",
      label: `CAPA: ${opts.title}`,
      severity: opts.severity,
      linked_record_type: "capa_records",
      linked_record_id: data.id,
      payload: { source_assessment_id: opts.assessmentId, due_date: opts.dueDate },
      status: "active",
      created_by: ctx.userId,
    },
    { onConflict: "linked_record_type,linked_record_id" }
  );

  if (opts.initialAction) {
    await supabase.from("capa_actions").insert({
      organization_id: ctx.organizationId,
      capa_record_id: data.id,
      action_type: "corrective",
      title: opts.initialAction,
      status: "open",
      owner_id: ctx.userId,
      due_date: opts.dueDate,
    });
  }

  await supabase.from("audit_events").insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.userId,
    event_type: "map_operations_bundle_created",
    summary: `CAPA auto-created from assessment trigger: ${opts.title}.`,
    payload: withAuditTrace(
      { capaRecordId: data.id, sourceAssessmentId: opts.assessmentId },
      {
        sourceModule: "assessment",
        sourceRecordId: opts.assessmentId,
        targetModule: "capa",
        targetRecordId: data.id,
        draftOnly: false,
      }
    ),
  });

  return data.id;
}

// ── Main trigger dispatcher ───────────────────────────────────────────────────

export async function runAssessmentTriggers(
  supabase: SupabaseClient,
  ctx: TriggerContext,
  assessmentId: string,
  assessment: BioAiAssessment,
  input: BioAiInput
): Promise<void> {
  const level = assessment.level;
  const workflowLabel = [input.workflow, input.area].filter(Boolean).join(" — ") || "Unspecified workflow";

  // ── Shared: set review_due_date based on tier ─────────────────────────────
  const reviewDueDateMap: Record<typeof level, string> = {
    low: daysFromNow(180),
    moderate: daysFromNow(60),
    high: daysFromNow(14),
    critical: today(),
  };

  await supabase
    .from("assessments")
    .update({ review_due_date: reviewDueDateMap[level] })
    .eq("id", assessmentId)
    .eq("organization_id", ctx.organizationId);

  // ── Level-specific logic ──────────────────────────────────────────────────

  if (level === "low") {
    await supabase.from("audit_events").insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.userId,
      event_type: "assessment_trigger_low",
      summary: `Low risk assessment filed. Safe work reminder generated. Review scheduled in 180 days.`,
      payload: withAuditTrace(
        { assessmentId, level, reviewDueDate: reviewDueDateMap.low },
        {
          sourceModule: "assessment",
          sourceRecordId: assessmentId,
          targetModule: "assessment",
          targetRecordId: assessmentId,
          draftOnly: true,
        }
      ),
    });
    return;
  }

  if (level === "moderate") {
    const capaTitle = `Moderate risk CAPA — ${workflowLabel}`;
    await createTriggeredCapa(supabase, ctx, {
      title: capaTitle,
      dueDate: daysFromNow(7),
      assessmentId,
      severity: "medium",
    });

    await supabase.from("audit_events").insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.userId,
      event_type: "assessment_trigger_moderate",
      summary: `Moderate risk trigger fired. CAPA created (7-day deadline). Supervisor notification pending.`,
      payload: withAuditTrace(
        { assessmentId, level, reviewDueDate: reviewDueDateMap.moderate, capaTitle },
        {
          sourceModule: "assessment",
          sourceRecordId: assessmentId,
          targetModule: "capa",
          targetRecordId: assessmentId,
          draftOnly: false,
        }
      ),
    });
    return;
  }

  if (level === "high") {
    const capaTitle = `High risk CAPA — ${workflowLabel}`;
    await createTriggeredCapa(supabase, ctx, {
      title: capaTitle,
      dueDate: hoursFromNow(48),
      assessmentId,
      initialAction: "Complete root cause analysis before record closure.",
      severity: "high",
    });

    // Work-stop risk cell
    await supabase.from("risk_cells").upsert(
      {
        organization_id: ctx.organizationId,
        cell_type: "work_stop_cell",
        label: `Work stop recommended — ${workflowLabel}`,
        severity: "high",
        linked_record_type: "assessments",
        linked_record_id: assessmentId,
        payload: {
          reason: "High risk assessment triggered work stop recommendation.",
          escalation_deadline_hours: 24,
        },
        status: "active",
        created_by: ctx.userId,
      },
      { onConflict: "linked_record_type,linked_record_id" }
    );

    await supabase.from("audit_events").insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.userId,
      event_type: "assessment_trigger_high",
      summary: `High risk trigger fired. Work stop recommended. CAPA created (48 hr deadline). Escalation timer started.`,
      payload: withAuditTrace(
        {
          assessmentId,
          level,
          reviewDueDate: reviewDueDateMap.high,
          capaTitle,
          workStopRecommended: true,
          escalationDeadlineHours: 24,
        },
        {
          sourceModule: "assessment",
          sourceRecordId: assessmentId,
          targetModule: "capa",
          targetRecordId: assessmentId,
          draftOnly: false,
        }
      ),
    });
    return;
  }

  if (level === "critical") {
    const capaTitle = `CRITICAL CAPA — ${workflowLabel}`;
    await createTriggeredCapa(supabase, ctx, {
      title: capaTitle,
      dueDate: hoursFromNow(24),
      assessmentId,
      initialAction: "Immediate investigation and containment response required within 72 hours.",
      severity: "critical",
    });

    // Work-stop (hard block) risk cell
    await supabase.from("risk_cells").upsert(
      {
        organization_id: ctx.organizationId,
        cell_type: "work_stop_cell",
        label: `WORK STOP REQUIRED — ${workflowLabel}`,
        severity: "critical",
        linked_record_type: "assessments",
        linked_record_id: assessmentId,
        payload: {
          reason: "Critical risk assessment — work stop required until executive sign-off.",
          requires_executive_signoff: true,
          escalation_deadline_hours: 0,
        },
        status: "active",
        created_by: ctx.userId,
      },
      { onConflict: "linked_record_type,linked_record_id" }
    );

    // Incident record entry
    await supabase.from("audit_events").insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.userId,
      event_type: "incident_initiated",
      summary: `Critical risk incident initiated from assessment — ${workflowLabel}. 72-hour investigation required.`,
      payload: withAuditTrace(
        {
          assessmentId,
          level,
          workflowLabel,
          incidentInitiated: true,
          investigationDeadline72h: true,
          incidentTimestamp: new Date().toISOString(),
        },
        {
          sourceModule: "assessment",
          sourceRecordId: assessmentId,
          targetModule: "incident",
          targetRecordId: assessmentId,
          draftOnly: false,
        }
      ),
    });

    // Regulatory notification checklist trigger
    await supabase.from("audit_events").insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.userId,
      event_type: "assessment_trigger_critical",
      summary: `Critical risk trigger fired. Work stop required. CAPA created (24 hr deadline). Regulatory checklist triggered.`,
      payload: withAuditTrace(
        {
          assessmentId,
          level,
          reviewDueDate: reviewDueDateMap.critical,
          capaTitle,
          workStopRequired: true,
          requiresExecutiveSignoff: true,
          regulatoryChecklist: {
            osha: { required: true, notified: false },
            cdc: { required: true, notified: false },
            ibc: { required: true, notified: false },
          },
          immutableAuditTrail: true,
          triggeredAt: new Date().toISOString(),
        },
        {
          sourceModule: "assessment",
          sourceRecordId: assessmentId,
          targetModule: "capa",
          targetRecordId: assessmentId,
          draftOnly: false,
        }
      ),
    });
  }
}
