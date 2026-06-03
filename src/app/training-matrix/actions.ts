"use server";

import { redirect } from "next/navigation";
import { withAuditTrace } from "@/lib/audit-trace";
import { canManageWorkspace } from "@/lib/role-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileContext } from "@/lib/supabase/data-helpers";
import { authMessage } from "@/lib/auth-routing";
import { scoreTrainingGap, resolveRiskCell } from "@/lib/supabase/continuous-scoring-service";

// ---------------------------------------------------------------------------
// Owner: create a training requirement
// ---------------------------------------------------------------------------
export async function createTrainingRequirementAction(formData: FormData) {
  const context = await getProfileContext();
  if (!context || !canManageWorkspace(context)) {
    redirect(authMessage("/training-matrix", "Only owners can create training requirements."));
  }

  const title = String(formData.get("title") ?? "").trim();
  const roleKey = String(formData.get("roleKey") ?? "").trim() || null;
  const frequencyMonths = Number(formData.get("frequencyMonths") ?? 0) || null;
  const documentId = String(formData.get("documentId") ?? "").trim() || null;

  if (!title) redirect(authMessage("/training-matrix", "Title is required."));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("training_requirements")
    .insert({
      organization_id: context.organizationId,
      title,
      role_key: roleKey,
      frequency_months: frequencyMonths,
      document_id: documentId,
      required_for: {},
      created_by: context.userId
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(authMessage("/training-matrix", error?.message ?? "Could not create requirement."));
  }

  // Auto-create an assignment for the creating owner so they appear in the matrix
  const dueDateStr = frequencyMonths
    ? new Date(Date.now() + frequencyMonths * 30 * 86400000).toISOString().slice(0, 10)
    : null;

  const { data: assignmentRow } = await supabase.from("training_assignments").insert({
    organization_id: context.organizationId,
    training_requirement_id: data.id,
    assigned_user_id: context.userId,
    status: "assigned",
    due_date: dueDateStr
  }).select("id").single();

  // Score the open training assignment via bio-ai and write a risk_cell.
  // Each assignment gets its own cell so completion resolves it precisely.
  if (assignmentRow?.id) {
    void scoreTrainingGap({
      requirementId: data.id,
      assignmentId: assignmentRow.id,
      title,
      roleKey,
      dueDateStr,
      organizationId: context.organizationId,
      userId: context.userId,
    });
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "foundation_starter_records_created",
    summary: `Training requirement created: ${title}.`,
    payload: withAuditTrace(
      { requirementId: data.id, title, roleKey, frequencyMonths, documentId },
      { sourceModule: "training", sourceRecordId: data.id, targetModule: "training", draftOnly: false }
    )
  });

  redirect(authMessage("/training-matrix", `Training requirement "${title}" created.`));
}

// ---------------------------------------------------------------------------
// Member / Owner: mark an assignment complete + optional evidence upload
// ---------------------------------------------------------------------------
export async function markTrainingCompleteAction(formData: FormData) {
  const context = await getProfileContext();
  if (!context) redirect(authMessage("/training-matrix", "Sign in to mark training complete."));

  const assignmentId = String(formData.get("assignmentId") ?? "").trim();
  const evidenceNote = String(formData.get("evidenceNote") ?? "").trim() || null;
  const file = formData.get("evidenceFile") as File | null;

  if (!assignmentId) redirect(authMessage("/training-matrix", "Missing assignment ID."));

  const supabase = await createSupabaseServerClient();

  // Verify the assignment belongs to this org
  const { data: assignment } = await supabase
    .from("training_assignments")
    .select("id, training_requirement_id, assigned_user_id")
    .eq("id", assignmentId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (!assignment) redirect(authMessage("/training-matrix", "Assignment not found."));

  let evidencePath: string | null = null;
  let evidenceBucket: string | null = null;

  if (file && file.size > 0) {
    evidenceBucket = "biotech-documents";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
    evidencePath = `${context.organizationId}/training/${assignmentId}/${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await supabase.storage
      .from(evidenceBucket)
      .upload(evidencePath, buffer, { contentType: file.type || "application/octet-stream", upsert: true });
  }

  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("training_assignments")
    .update({
      status: "completed",
      completed_at: completedAt,
      evidence_path: evidencePath,
      evidence_bucket: evidenceBucket,
      updated_at: completedAt
    })
    .eq("id", assignmentId)
    .eq("organization_id", context.organizationId);

  if (error) redirect(authMessage("/training-matrix", error.message));

  // Resolve the bio-ai risk cell for this assignment — removes it from the
  // Risk Command Center's active queue and promotes it to improvement_cell.
  void resolveRiskCell({
    organizationId: context.organizationId,
    linkedRecordType: "training_assignments",
    linkedRecordId: assignmentId,
    resolveLabel: `Training complete: ${evidenceNote ?? "evidence submitted"}`,
  });

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "foundation_evidence_readiness_updated",
    summary: `Training assignment marked complete${evidenceNote ? `: ${evidenceNote}` : ""}.`,
    payload: withAuditTrace(
      { assignmentId, evidencePath, evidenceNote, completedAt },
      {
        sourceModule: "training",
        sourceRecordId: assignmentId,
        targetModule: "training_assignment",
        draftOnly: false
      }
    )
  });

  redirect(authMessage("/training-matrix", "Training marked complete."));
}

// ---------------------------------------------------------------------------
// Owner: delete a training requirement
// ---------------------------------------------------------------------------
export async function deleteTrainingRequirementAction(formData: FormData) {
  const context = await getProfileContext();
  if (!context || !canManageWorkspace(context)) {
    redirect(authMessage("/training-matrix", "Only owners can delete requirements."));
  }

  const requirementId = String(formData.get("requirementId") ?? "").trim();
  if (!requirementId) redirect(authMessage("/training-matrix", "Missing requirement ID."));

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("training_requirements")
    .delete()
    .eq("id", requirementId)
    .eq("organization_id", context.organizationId);

  redirect(authMessage("/training-matrix", "Training requirement deleted."));
}
