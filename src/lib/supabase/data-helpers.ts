/**
 * Internal Supabase helpers shared across domain service files.
 * Do NOT import this file from outside src/lib/supabase/.
 */

import { normalizeWorkspaceRole } from "@/lib/role-permissions";
import type { AuditEvent, DocumentMetadata } from "@/lib/bio-ai/types";
import { createSupabaseServerClient } from "./server";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

export type FoundationActionResult = { ok: true; message: string } | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Profile context
// ---------------------------------------------------------------------------

export type ProfileContext = {
  userId: string;
  organizationId: string;
  role: string;
};

export async function getProfileContext(): Promise<ProfileContext | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("organization_id,role")
      .eq("id", user.id)
      .maybeSingle();

    if (!data?.organization_id) return null;

    return {
      userId: user.id,
      organizationId: data.organization_id,
      role: normalizeWorkspaceRole(data.role)
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generic query helpers
// ---------------------------------------------------------------------------

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function countRows(
  supabase: SupabaseClient,
  table: string,
  organizationId: string
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) return 0;
  return count ?? 0;
}

export async function latestRow(
  supabase: SupabaseClient,
  table: string,
  organizationId: string,
  columns: string
) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function latestRows(
  supabase: SupabaseClient,
  table: string,
  organizationId: string,
  columns: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

export function mapAuditEvent(event: Record<string, unknown>): AuditEvent {
  return {
    id: event.id as string | undefined,
    organizationId: event.organization_id as string | undefined,
    actorId: event.actor_id as string | null | undefined,
    eventType: event.event_type as AuditEvent["eventType"],
    summary: event.summary as string,
    payload: event.payload as Record<string, unknown> | undefined,
    createdAt: event.created_at as string | undefined
  };
}

export function mapDocument(document: Record<string, unknown>): DocumentMetadata {
  return {
    id: document.id as string | undefined,
    organizationId: document.organization_id as string | undefined,
    title: document.title as string,
    documentType: document.document_type as DocumentMetadata["documentType"],
    status: document.status as DocumentMetadata["status"],
    ownerRole: document.owner_role as DocumentMetadata["ownerRole"],
    area: document.area as string | null | undefined,
    relatedProcess: document.related_process as string | null | undefined,
    revision: document.revision as string | null | undefined,
    effectiveDate: document.effective_date as string | null | undefined,
    nextReviewDate: document.next_review_date as string | null | undefined,
    lastReviewedAt: document.last_reviewed_at as string | null | undefined,
    storageBucket: document.storage_bucket as string | null | undefined,
    storagePath: document.storage_path as string | null | undefined,
    gaps: (document.gaps as string[] | null) ?? []
  };
}

export function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "";
}

export function summarizeJson(value: unknown) {
  if (Array.isArray(value)) return value.slice(0, 3).join(", ") || "none";
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 3);
    return entries.map(([key, item]) => `${key}: ${String(item)}`).join(", ");
  }
  if (value == null) return "none";
  return String(value);
}
