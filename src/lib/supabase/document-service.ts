/**
 * Document domain service.
 * Extracted from data.ts — all document read/write operations live here.
 */

import { randomUUID } from "node:crypto";
import { withAuditTrace } from "@/lib/audit-trace";
import type { AuditEvent, DocumentMetadata } from "@/lib/bio-ai/types";
import { demoDocuments } from "@/lib/demo-data";
import {
  generateDocumentGapRecommendations,
  generateDocumentUpdateRecommendations
} from "@/lib/documents/recommendations";
import { isSupabaseConfigured } from "./env";
import { createSupabaseServerClient } from "./server";
import { getProfileContext, mapAuditEvent, mapDocument } from "./data-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocumentRecommendationRecord = {
  id: string;
  recommendationType: "gap" | "draft_update";
  title: string;
  label: string;
  humanReviewRequired: boolean;
  payload: Record<string, unknown>;
  createdBy?: string | null;
  createdAt?: string;
};

export type DocumentRecommendationRun = {
  runKey: string;
  createdAt?: string;
  auditEvent?: AuditEvent;
  recommendations: DocumentRecommendationRecord[];
};

export type SaveDocumentMetadataInput = {
  title: string;
  documentType: DocumentMetadata["documentType"];
  status: DocumentMetadata["status"];
  ownerRole: DocumentMetadata["ownerRole"];
  area?: string | null;
  relatedProcess?: string | null;
  revision?: string | null;
  effectiveDate?: string | null;
  nextReviewDate?: string | null;
  gaps?: string[];
  file?: File | null;
};

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

export async function listDocuments(): Promise<DocumentMetadata[]> {
  const context = await getProfileContext();
  if (!context) return demoDocuments;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data.map(mapDocument);
}

export async function getDocument(documentId: string): Promise<DocumentMetadata | null> {
  const context = await getProfileContext();
  if (!context) {
    return demoDocuments.find((doc) => doc.id === documentId) ?? demoDocuments[0] ?? null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("id", documentId)
    .maybeSingle();

  if (error || !data) return null;
  return mapDocument(data);
}

export async function getDocumentRecommendationHistory(
  documentId: string
): Promise<DocumentRecommendationRun[]> {
  const context = await getProfileContext();
  if (!context) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_recommendations")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const { data: auditRows } = await supabase
    .from("audit_events")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("event_type", "document_recommendation_generated")
    .order("created_at", { ascending: false })
    .limit(100);

  const audits = (auditRows ?? [])
    .map(mapAuditEvent)
    .filter((event) => {
      const payload = event.payload as Record<string, unknown> | undefined;
      return payload?.documentId === documentId;
    });

  const grouped = new Map<string, DocumentRecommendationRecord[]>();
  for (const row of data) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const runKey =
      typeof payload.runId === "string" ? payload.runId : (row.created_at ?? row.id);
    const record: DocumentRecommendationRecord = {
      id: row.id,
      recommendationType: row.recommendation_type,
      title: row.title,
      label: row.label,
      humanReviewRequired: row.human_review_required,
      payload,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
    grouped.set(runKey, [...(grouped.get(runKey) ?? []), record]);
  }

  return [...grouped.entries()].map(([runKey, recommendations]) => {
    const createdAt = recommendations[0]?.createdAt;
    const auditEvent =
      audits.find(
        (e) => (e.payload as Record<string, unknown> | undefined)?.runId === runKey
      ) ?? audits.find((e) => e.createdAt === createdAt);
    return { runKey, createdAt, auditEvent, recommendations };
  });
}

export async function saveDocumentMetadata(input: SaveDocumentMetadataInput) {
  const context = await getProfileContext();
  if (!context) {
    return {
      ok: false,
      status: 401,
      message: isSupabaseConfigured()
        ? "Sign in and finish onboarding before saving document metadata."
        : "Supabase environment variables are not configured; document metadata cannot be saved yet."
    };
  }

  const supabase = await createSupabaseServerClient();
  const uploadFile = input.file && input.file.size > 0 ? input.file : null;
  const { data, error } = await supabase
    .from("document_metadata")
    .insert({
      organization_id: context.organizationId,
      title: input.title,
      document_type: input.documentType,
      status: input.status,
      owner_role: input.ownerRole,
      area: input.area || null,
      related_process: input.relatedProcess || null,
      revision: input.revision || null,
      effective_date: input.effectiveDate || null,
      next_review_date: input.nextReviewDate || null,
      gaps: input.gaps ?? [],
      created_by: context.userId
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, message: error?.message ?? "Could not save document metadata." };
  }

  let uploadWarning: string | undefined;
  let storageBucket: string | null = null;
  let storagePath: string | null = null;

  if (uploadFile) {
    storageBucket = "biotech-documents";
    const safeName = uploadFile.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-");
    storagePath = `${context.organizationId}/${data.id}/${safeName}`;
    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, buffer, {
        contentType: uploadFile.type || "application/octet-stream",
        upsert: false
      });

    if (uploadError) {
      uploadWarning = `Metadata saved, but file upload failed: ${uploadError.message}`;
      storageBucket = null;
      storagePath = null;
    } else {
      await supabase
        .from("document_metadata")
        .update({
          storage_bucket: storageBucket,
          storage_path: storagePath,
          updated_at: new Date().toISOString()
        })
        .eq("organization_id", context.organizationId)
        .eq("id", data.id);
    }
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "document_metadata_created",
    summary: `Document metadata created for ${input.title}.`,
    payload: withAuditTrace(
      {
        documentId: data.id,
        title: input.title,
        documentType: input.documentType,
        storageBucket,
        storagePath
      },
      {
        sourceModule: "document",
        sourceRecordId: data.id,
        targetModule: "document",
        targetRecordId: data.id,
        draftOnly: input.status !== "approved"
      }
    )
  });

  return {
    ok: true,
    status: 201,
    document: mapDocument({ ...data, storage_bucket: storageBucket, storage_path: storagePath }),
    message: uploadWarning
  };
}

export async function persistDocumentRecommendations(document: DocumentMetadata) {
  const context = await getProfileContext();
  const gapRecommendations = generateDocumentGapRecommendations(document);
  const updateRecommendations = generateDocumentUpdateRecommendations(document);

  if (!context || !document.id) {
    return { ok: false, gapRecommendations, updateRecommendations };
  }

  const supabase = await createSupabaseServerClient();
  const rows = [
    ...gapRecommendations.map((rec) => ({
      organization_id: context.organizationId,
      document_id: document.id,
      recommendation_type: "gap",
      title: rec.title,
      payload: rec,
      created_by: context.userId
    })),
    ...updateRecommendations.map((rec) => ({
      organization_id: context.organizationId,
      document_id: document.id,
      recommendation_type: "draft_update",
      title: rec.title,
      payload: rec,
      created_by: context.userId
    }))
  ];

  if (rows.length > 0) {
    const runId = randomUUID();
    const generatedAt = new Date().toISOString();
    await supabase.from("document_recommendations").insert(
      rows.map((row) => ({
        ...row,
        payload: { ...(row.payload as Record<string, unknown>), runId, generatedAt }
      }))
    );
    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "document_recommendation_generated",
      summary: `Generated draft document recommendations for ${document.title}.`,
      payload: withAuditTrace(
        { documentId: document.id, count: rows.length, runId, generatedAt },
        {
          sourceModule: "document",
          sourceRecordId: document.id,
          targetModule: "document_recommendation",
          targetRecordId: document.id,
          runId,
          draftOnly: true
        }
      )
    });
  }

  return { ok: true, gapRecommendations, updateRecommendations };
}
