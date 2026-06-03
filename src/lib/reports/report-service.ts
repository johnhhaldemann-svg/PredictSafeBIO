/**
 * Data fetching for report generation.
 * Pulls all fields needed by PDF and DOCX templates.
 */

import { createServerClient } from "@/lib/supabase/server";
import type { AssessmentReportData } from "./pdf-assessment";
import type { IncidentReportData } from "./pdf-incident";

// ─── Shared ───────────────────────────────────────────────────────────────────
function reportNumber(prefix: string, id: string) {
  return `${prefix}-${new Date().getFullYear()}-${id.slice(0, 6).toUpperCase()}`;
}

async function getOrgName(supabase: Awaited<ReturnType<typeof createServerClient>>, orgId: string) {
  const { data } = await supabase
    .from("company_profiles")
    .select("company_name")
    .eq("organization_id", orgId)
    .maybeSingle();
  return (data as any)?.company_name ?? "Your Organisation";
}

// ─── Assessment report data ───────────────────────────────────────────────────
export async function getAssessmentReportData(id: string): Promise<AssessmentReportData | null> {
  const supabase = await createServerClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  // Fetch assessment + signals + audit events
  const { data: assessment } = await supabase
    .from("assessments")
    .select(`
      id, workflow, area, score, level, confidence,
      human_review_status, reviewed_at, reviewer_notes,
      assigned_reviewer_id, review_due_date,
      output, organization_id
    `)
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!assessment) return null;

  const [signalsResult, eventsResult, reviewerResult] = await Promise.all([
    supabase
      .from("assessment_signals")
      .select("label, type, evidence")
      .eq("assessment_id", id),
    supabase
      .from("audit_events")
      .select("created_at, event_type, metadata")
      .eq("organization_id", profile.organization_id)
      .contains("metadata", { assessmentId: id })
      .order("created_at", { ascending: false })
      .limit(20),
    (assessment as any).assigned_reviewer_id
      ? supabase
          .from("profiles")
          .select("full_name")
          .eq("id", (assessment as any).assigned_reviewer_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const companyName = await getOrgName(supabase, profile.organization_id);
  const a = assessment as any;
  const output = a.output ?? {};

  return {
    id: a.id,
    workflow: a.workflow ?? "Untitled",
    area: a.area ?? "—",
    score: a.score ?? 0,
    level: a.level ?? "unknown",
    confidence: a.confidence ?? "—",
    humanReviewStatus: a.human_review_status ?? "pending",
    reviewedAt: a.reviewed_at,
    reviewerNotes: a.reviewer_notes,
    reviewDueDate: a.review_due_date,
    assignedReviewerName: (reviewerResult.data as any)?.full_name ?? null,
    output: {
      explanation: output.explanation ?? "",
      topDrivers: output.topDrivers ?? [],
      criticalControlGaps: output.criticalControlGaps ?? [],
      missingInformation: output.missingInformation ?? [],
      recommendedActions: output.recommendedActions ?? [],
    },
    signals: (signalsResult.data ?? []) as any[],
    auditEvents: (eventsResult.data ?? []).map((e: any) => ({
      createdAt: e.created_at,
      eventType: e.event_type,
      summary: e.metadata?.summary ?? e.event_type.replace(/_/g, " "),
    })),
    companyName,
    generatedAt: new Date().toISOString(),
    reportNumber: reportNumber("BRA", a.id),
  };
}

// ─── Incident report data ─────────────────────────────────────────────────────
export async function getIncidentReportData(id: string): Promise<IncidentReportData | null> {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const { data: incident } = await supabase
    .from("incidents")
    .select("id, title, incident_type, severity, status, occurred_at, reported_by, summary, lab_id, organization_id")
    .eq("id", id)
    .eq("organization_id", (profile as any).organization_id)
    .single();

  if (!incident) return null;

  const inc = incident as any;

  const [stepsResult, capasResult, eventsResult, labResult, reporterResult] = await Promise.all([
    supabase
      .from("incident_investigation_steps")
      .select("id, step_type, description, completed_at, completed_by")
      .eq("incident_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("capa_records")
      .select(`
        id, title, status, owner_role, due_date,
        capa_actions ( id, title, action_type, status, due_date, completed_at )
      `)
      .eq("source_incident_id", id),
    supabase
      .from("audit_events")
      .select("created_at, event_type, metadata")
      .eq("organization_id", (profile as any).organization_id)
      .contains("metadata", { incidentId: id })
      .order("created_at", { ascending: false })
      .limit(15),
    inc.lab_id
      ? supabase.from("labs").select("name").eq("id", inc.lab_id).single()
      : Promise.resolve({ data: null }),
    inc.reported_by
      ? supabase.from("profiles").select("full_name").eq("id", inc.reported_by).single()
      : Promise.resolve({ data: null }),
  ]);

  const companyName = await getOrgName(supabase, (profile as any).organization_id);

  return {
    id: inc.id,
    title: inc.title,
    incidentType: inc.incident_type ?? "general",
    severity: inc.severity ?? "medium",
    status: inc.status ?? "open",
    occurredAt: inc.occurred_at,
    summary: inc.summary,
    labName: (labResult.data as any)?.name ?? null,
    reportedByName: (reporterResult.data as any)?.full_name ?? null,
    investigationSteps: (stepsResult.data ?? []) as any[],
    linkedCapas: (capasResult.data ?? []).map((c: any) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      ownerRole: c.owner_role,
      dueDate: c.due_date,
      actions: (c.capa_actions ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        actionType: a.action_type,
        status: a.status,
        dueDate: a.due_date,
        completedAt: a.completed_at,
      })),
    })),
    auditEvents: (eventsResult.data ?? []).map((e: any) => ({
      createdAt: e.created_at,
      eventType: e.event_type,
      summary: e.metadata?.summary ?? e.event_type.replace(/_/g, " "),
    })),
    companyName,
    generatedAt: new Date().toISOString(),
    reportNumber: reportNumber("IIR", inc.id),
  };
}
