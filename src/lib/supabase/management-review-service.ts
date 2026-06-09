/**
 * Management Review service.
 * Covers management_reviews and management_review_action_items tables.
 * Implements ISO 45001 Clause 9.3 and ICH Q10 Phase 6 PDCA close-loop.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReviewType = "quarterly" | "annual" | "special";
export type ReviewStatus = "draft" | "completed";
export type ActionItemStatus = "open" | "closed";

export type ManagementReview = {
  id: string;
  organizationId: string;
  reviewType: ReviewType;
  reviewDate: string;
  reviewPeriodStart: string | null;
  reviewPeriodEnd: string | null;
  attendees: string | null;
  agendaSummary: string | null;
  status: ReviewStatus;
  kpiSnapshot: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewActionItem = {
  id: string;
  reviewId: string;
  organizationId: string;
  description: string;
  ownerRole: string | null;
  dueDate: string | null;
  status: ActionItemStatus;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
};

export type ReviewResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const reviewTypeLabels: Record<ReviewType, string> = {
  quarterly: "Quarterly Review",
  annual:    "Annual Review",
  special:   "Special Review",
};

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  draft:     "Draft",
  completed: "Completed",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapReview(row: Record<string, unknown>): ManagementReview {
  return {
    id:                row.id as string,
    organizationId:    row.organization_id as string,
    reviewType:        (row.review_type as ReviewType) ?? "quarterly",
    reviewDate:        row.review_date as string,
    reviewPeriodStart: row.review_period_start as string | null,
    reviewPeriodEnd:   row.review_period_end as string | null,
    attendees:         row.attendees as string | null,
    agendaSummary:     row.agenda_summary as string | null,
    status:            (row.status as ReviewStatus) ?? "draft",
    kpiSnapshot:       row.kpi_snapshot as Record<string, unknown> | null,
    createdAt:         row.created_at as string,
    updatedAt:         row.updated_at as string,
  };
}

function mapActionItem(row: Record<string, unknown>): ReviewActionItem {
  const dueDate = row.due_date as string | null;
  const isOverdue =
    (row.status as string) !== "closed" &&
    dueDate !== null &&
    new Date(dueDate) < new Date();
  return {
    id:             row.id as string,
    reviewId:       row.review_id as string,
    organizationId: row.organization_id as string,
    description:    row.description as string,
    ownerRole:      row.owner_role as string | null,
    dueDate,
    status:         (row.status as ActionItemStatus) ?? "open",
    createdAt:      row.created_at as string,
    updatedAt:      row.updated_at as string,
    isOverdue,
  };
}

// ---------------------------------------------------------------------------
// Demo fallback
// ---------------------------------------------------------------------------

function demoReviews(): ManagementReview[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "demo-rev-001", organizationId: "demo-org",
      reviewType: "quarterly", reviewDate: today,
      reviewPeriodStart: null, reviewPeriodEnd: null,
      attendees: "EHS Manager, Lab Director, Operations Lead",
      agendaSummary: "CAPA backlog review, training completion status, upcoming regulatory deadlines.",
      status: "completed",
      kpiSnapshot: { open_capas: 3, training_completion_pct: 87, audit_readiness_score: 72 },
      createdAt: today, updatedAt: today,
    },
  ];
}

function demoActionItems(): ReviewActionItem[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "demo-ai-001", reviewId: "demo-rev-001", organizationId: "demo-org",
      description: "Update chemical inventory SOP to include newly onboarded reagents.",
      ownerRole: "EHS Manager", dueDate: today, status: "open",
      createdAt: today, updatedAt: today, isOverdue: false,
    },
    {
      id: "demo-ai-002", reviewId: "demo-rev-001", organizationId: "demo-org",
      description: "Schedule Q3 emergency response drill.",
      ownerRole: "Safety Officer", dueDate: today, status: "open",
      createdAt: today, updatedAt: today, isOverdue: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listReviews(): Promise<ManagementReview[]> {
  if (!isSupabaseConfigured()) return demoReviews();
  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoReviews();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("management_reviews")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("review_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapReview);
  } catch {
    return demoReviews();
  }
}

export async function listActionItems(): Promise<ReviewActionItem[]> {
  if (!isSupabaseConfigured()) return demoActionItems();
  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoActionItems();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("management_review_action_items")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapActionItem);
  } catch {
    return demoActionItems();
  }
}

export async function createReview(input: {
  reviewType: ReviewType;
  reviewDate: string;
  reviewPeriodStart?: string | null;
  reviewPeriodEnd?: string | null;
  attendees?: string | null;
  agendaSummary?: string | null;
}): Promise<ReviewResult> {
  if (!isSupabaseConfigured())
    return { ok: true, message: "Demo: Review created.", id: "demo-new" };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("management_reviews")
      .insert({
        organization_id:     ctx.organizationId,
        review_type:         input.reviewType,
        review_date:         input.reviewDate,
        review_period_start: input.reviewPeriodStart ?? null,
        review_period_end:   input.reviewPeriodEnd ?? null,
        attendees:           input.attendees ?? null,
        agenda_summary:      input.agendaSummary ?? null,
        status:              "draft",
        created_by:          ctx.userId,
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Review record created. Add action items below.", id: data.id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function createActionItem(input: {
  reviewId: string;
  description: string;
  ownerRole?: string | null;
  dueDate?: string | null;
}): Promise<ReviewResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Action item added." };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("management_review_action_items").insert({
      review_id:       input.reviewId,
      organization_id: ctx.organizationId,
      description:     input.description,
      owner_role:      input.ownerRole ?? null,
      due_date:        input.dueDate ?? null,
      status:          "open",
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Action item added." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}

export async function closeActionItem(id: string): Promise<ReviewResult> {
  if (!isSupabaseConfigured()) return { ok: true, message: "Demo: Action item closed." };
  try {
    const ctx = await getProfileContext();
    if (!ctx) return { ok: false, message: "Not authenticated." };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("management_review_action_items")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", ctx.organizationId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Action item closed." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unexpected error." };
  }
}
