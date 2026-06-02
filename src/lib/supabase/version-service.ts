/**
 * Document version control service.
 * Covers document_versions and document_approvals tables.
 */

import { withAuditTrace } from "@/lib/audit-trace";
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocumentVersion = {
  id: string;
  documentId: string;
  versionLabel: string;
  changeSummary?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  createdBy?: string | null;
  createdAt?: string;
};

export type ApprovalStatus = "pending" | "approved" | "rejected" | "withdrawn";

export type DocumentApproval = {
  id: string;
  documentId: string;
  documentVersionId?: string | null;
  approvalStatus: ApprovalStatus;
  reviewerRole: string;
  reviewerId?: string | null;
  notes?: string | null;
  createdAt?: string;
};

export type DocumentVersionHistory = {
  documentId: string;
  versions: DocumentVersion[];
  latestApproval?: DocumentApproval | null;
};

export type VersionResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Read: version history for all documents in an org
// ---------------------------------------------------------------------------

export async function getVersionHistories(): Promise<Map<string, DocumentVersionHistory>> {
  const result = new Map<string, DocumentVersionHistory>();

  if (!isSupabaseConfigured()) {
    // Demo data
    result.set("demo-doc-001", {
      documentId: "demo-doc-001",
      versions: [
        { id: "demo-v3", documentId: "demo-doc-001", versionLabel: "v3.0", changeSummary: "Annual review — updated containment procedures", createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
        { id: "demo-v2", documentId: "demo-doc-001", versionLabel: "v2.1", changeSummary: "Minor correction to Section 4.2", createdAt: new Date(Date.now() - 180 * 86400000).toISOString() },
        { id: "demo-v1", documentId: "demo-doc-001", versionLabel: "v2.0", changeSummary: "Initial approved version", createdAt: new Date(Date.now() - 365 * 86400000).toISOString() }
      ],
      latestApproval: { id: "demo-appr-1", documentId: "demo-doc-001", approvalStatus: "approved", reviewerRole: "quality_unit", createdAt: new Date(Date.now() - 30 * 86400000).toISOString() }
    });
    return result;
  }

  const context = await getProfileContext();
  if (!context) return result;

  const supabase = await createSupabaseServerClient();

  const [{ data: versions }, { data: approvals }] = await Promise.all([
    supabase
      .from("document_versions")
      .select("id,document_id,version_label,change_summary,storage_bucket,storage_path,created_by,created_at")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("document_approvals")
      .select("id,document_id,document_version_id,approval_status,reviewer_role,reviewer_id,notes,created_at")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(200)
  ]);

  // Group versions by document
  for (const v of versions ?? []) {
    const existing = result.get(v.document_id) ?? { documentId: v.document_id, versions: [] as DocumentVersion[], latestApproval: null as DocumentApproval | null };
    existing.versions.push({
      id: v.id,
      documentId: v.document_id,
      versionLabel: v.version_label,
      changeSummary: v.change_summary,
      storageBucket: v.storage_bucket,
      storagePath: v.storage_path,
      createdBy: v.created_by,
      createdAt: v.created_at
    });
    result.set(v.document_id, existing);
  }

  // Attach latest approval per document
  const seenApprovalDocs = new Set<string>();
  for (const a of approvals ?? []) {
    if (seenApprovalDocs.has(a.document_id)) continue;
    seenApprovalDocs.add(a.document_id);
    const entry = result.get(a.document_id) ?? { documentId: a.document_id, versions: [], latestApproval: null };
    entry.latestApproval = {
      id: a.id,
      documentId: a.document_id,
      documentVersionId: a.document_version_id,
      approvalStatus: a.approval_status as ApprovalStatus,
      reviewerRole: a.reviewer_role,
      reviewerId: a.reviewer_id,
      notes: a.notes,
      createdAt: a.created_at
    };
    result.set(a.document_id, entry);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Write: log a new version
// ---------------------------------------------------------------------------

export async function logDocumentVersion(input: {
  documentId: string;
  versionLabel: string;
  changeSummary?: string;
}): Promise<VersionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in before logging a document version." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_versions")
    .insert({
      organization_id: context.organizationId,
      document_id: input.documentId,
      version_label: input.versionLabel.trim(),
      change_summary: input.changeSummary?.trim() || null,
      created_by: context.userId
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Could not log version." };

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "document_metadata_updated",
    summary: `Document version ${input.versionLabel} logged: ${input.changeSummary ?? "no summary"}.`,
    payload: withAuditTrace(
      { documentId: input.documentId, versionId: data.id, versionLabel: input.versionLabel },
      {
        sourceModule: "document",
        sourceRecordId: input.documentId,
        targetModule: "document",
        targetRecordId: data.id,
        draftOnly: true
      }
    )
  });

  return { ok: true, message: `Version ${input.versionLabel} logged.`, id: data.id };
}

// ---------------------------------------------------------------------------
// Write: request approval
// ---------------------------------------------------------------------------

export async function requestDocumentApproval(input: {
  documentId: string;
  documentVersionId?: string;
  reviewerRole: string;
  notes?: string;
}): Promise<VersionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in before requesting approval." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_approvals")
    .insert({
      organization_id: context.organizationId,
      document_id: input.documentId,
      document_version_id: input.documentVersionId || null,
      approval_status: "pending",
      reviewer_role: input.reviewerRole,
      reviewer_id: context.userId,
      notes: input.notes?.trim() || null
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Could not request approval." };

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "document_metadata_updated",
    summary: `Approval requested for document by ${input.reviewerRole}.`,
    payload: withAuditTrace(
      { documentId: input.documentId, approvalId: data.id, reviewerRole: input.reviewerRole },
      {
        sourceModule: "document",
        sourceRecordId: input.documentId,
        targetModule: "document",
        targetRecordId: data.id,
        draftOnly: true
      }
    )
  });

  return { ok: true, message: `Approval request sent to ${input.reviewerRole}.`, id: data.id };
}

// ---------------------------------------------------------------------------
// Write: record approval decision
// ---------------------------------------------------------------------------

export async function recordApprovalDecision(input: {
  approvalId: string;
  documentId: string;
  decision: "approved" | "rejected";
  notes?: string;
}): Promise<VersionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to record an approval decision." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("document_approvals")
    .update({
      approval_status: input.decision,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.approvalId)
    .eq("organization_id", context.organizationId);

  if (error) return { ok: false, message: error.message };

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "document_metadata_updated",
    summary: `Document approval ${input.decision}: ${input.notes ?? "no notes"}.`,
    payload: withAuditTrace(
      { documentId: input.documentId, approvalId: input.approvalId, decision: input.decision },
      {
        sourceModule: "document",
        sourceRecordId: input.documentId,
        draftOnly: input.decision !== "approved"
      }
    )
  });

  return { ok: true, message: `Document marked ${input.decision}.` };
}
