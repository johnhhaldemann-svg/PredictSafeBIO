"use server";

import { redirect } from "next/navigation";
import { withAuditTrace } from "@/lib/audit-trace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileContext } from "@/lib/supabase/data-helpers";
import { createCapaRecord } from "@/lib/supabase/capa-service";
import { authMessage } from "@/lib/auth-routing";

// ---------------------------------------------------------------------------
// Acknowledge — moves cell to "acknowledged" so it stays visible but is
// flagged as under review. Logged to audit trail.
// ---------------------------------------------------------------------------
export async function acknowledgeRiskCellAction(formData: FormData) {
  const cellId = String(formData.get("cellId") ?? "").trim();
  const note   = String(formData.get("note") ?? "").trim() || null;
  const returnTo = String(formData.get("returnTo") ?? "/risk-command-center");

  const ctx = await getProfileContext();
  if (!ctx) redirect(authMessage(returnTo, "Sign in to review risk cells."));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("risk_cells")
    .update({ status: "acknowledged", updated_at: new Date().toISOString() })
    .eq("id", cellId)
    .eq("organization_id", ctx.organizationId);

  if (error) redirect(authMessage(returnTo, error.message));

  await supabase.from("audit_events").insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.userId,
    event_type: "human_review_status_changed",
    summary: `Risk cell acknowledged${note ? `: ${note}` : ""}.`,
    payload: withAuditTrace(
      { cellId, note, newStatus: "acknowledged" },
      { sourceModule: "audit", sourceRecordId: cellId, targetModule: "audit", draftOnly: false }
    )
  });

  redirect(authMessage(returnTo, "Cell acknowledged — marked as under review."));
}

// ---------------------------------------------------------------------------
// Dismiss — resolves the cell with a required reason. Logged to audit trail.
// ---------------------------------------------------------------------------
export async function dismissRiskCellAction(formData: FormData) {
  const cellId = String(formData.get("cellId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "/risk-command-center");

  if (!reason) redirect(authMessage(returnTo, "A dismissal reason is required."));

  const ctx = await getProfileContext();
  if (!ctx) redirect(authMessage(returnTo, "Sign in to review risk cells."));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("risk_cells")
    .update({
      status: "resolved",
      updated_at: new Date().toISOString(),
      // Store reason in payload so audit reviewers can see it
    })
    .eq("id", cellId)
    .eq("organization_id", ctx.organizationId);

  if (error) redirect(authMessage(returnTo, error.message));

  await supabase.from("audit_events").insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.userId,
    event_type: "human_review_status_changed",
    summary: `Risk cell dismissed: ${reason}`,
    payload: withAuditTrace(
      { cellId, reason, newStatus: "resolved", dismissedBy: ctx.userId },
      { sourceModule: "audit", sourceRecordId: cellId, targetModule: "audit", draftOnly: false }
    )
  });

  redirect(authMessage(returnTo, "Cell dismissed and resolved."));
}

// ---------------------------------------------------------------------------
// Escalate to CAPA — creates a CAPA record from the cell, resolves the cell,
// and links them. The CAPA becomes the tracked corrective action.
// ---------------------------------------------------------------------------
export async function escalateToCapaAction(formData: FormData) {
  const cellId      = String(formData.get("cellId") ?? "").trim();
  const cellLabel   = String(formData.get("cellLabel") ?? "").trim();
  const ownerRole   = String(formData.get("ownerRole") ?? "qa").trim();
  const note        = String(formData.get("note") ?? "").trim() || null;
  const returnTo    = String(formData.get("returnTo") ?? "/risk-command-center");

  const ctx = await getProfileContext();
  if (!ctx) redirect(authMessage(returnTo, "Sign in to escalate a risk cell."));

  // Due date: 14 days for high/critical, 30 for lower severity
  const severity = String(formData.get("severity") ?? "medium");
  const dueDays  = ["critical", "high"].includes(severity) ? 14 : 30;
  const dueDate  = new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10);

  const capaTitle = `Risk cell escalation: ${cellLabel}`;

  const result = await createCapaRecord({
    title: capaTitle,
    ownerRole,
    dueDate,
    linkedRecordType: "risk_cells",
    linkedRecordId: cellId,
    rootCause: note ?? `Escalated from Risk Command Center: ${cellLabel}`,
    initialAction: note ? `Initial review note: ${note}` : null,
  });

  if (!result.ok) redirect(authMessage(returnTo, result.message));

  // Resolve the original cell — the CAPA is now the tracked item
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("risk_cells")
    .update({
      status: "resolved",
      cell_type: "event_cell",
      updated_at: new Date().toISOString(),
    })
    .eq("id", cellId)
    .eq("organization_id", ctx.organizationId);

  await supabase.from("audit_events").insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.userId,
    event_type: "human_review_status_changed",
    summary: `Risk cell escalated to CAPA: ${capaTitle}`,
    payload: withAuditTrace(
      { cellId, capaId: result.id, capaTitle, ownerRole, dueDate },
      { sourceModule: "capa", sourceRecordId: result.id, targetModule: "audit", draftOnly: false }
    )
  });

  redirect(authMessage("/operations/capa", `CAPA created from risk cell. Due ${dueDate}.`));
}
