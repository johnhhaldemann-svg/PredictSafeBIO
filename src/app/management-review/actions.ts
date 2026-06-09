"use server";

import { redirect } from "next/navigation";
import { createHazard } from "@/lib/supabase/hazard-service";
import type { HazardType } from "@/lib/supabase/hazard-service";
import {
  createReview,
  createActionItem,
  closeActionItem,
  type ReviewType,
} from "@/lib/supabase/management-review-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";

/**
 * Feed a management review finding directly into the Hazard Register (Phase 1).
 * This is the automated Phase 6 → Phase 1 loop-back mechanism.
 */
export async function feedFindingToHazardRegisterAction(formData: FormData) {
  const name        = String(formData.get("name") ?? "").trim();
  const hazardType  = String(formData.get("hazardType") ?? "other") as HazardType;
  const description = String(formData.get("description") ?? "").trim();
  const location    = String(formData.get("location") ?? "").trim() || null;

  if (!name) {
    redirect("/management-review?message=Finding+name+is+required");
  }

  const result = await createHazard({
    name,
    hazardType,
    description: description ? `[From Management Review] ${description}` : "[From Management Review]",
    location: location ?? undefined,
    status: "identified",
  });

  if (!result.ok) {
    redirect(`/management-review?message=${encodeURIComponent(result.message)}`);
  }

  redirect(`/hazards?message=${encodeURIComponent("Finding added to Hazard Register from Management Review.")}`);
}

export async function createReviewAction(formData: FormData) {
  const reviewType        = String(formData.get("reviewType") ?? "quarterly") as ReviewType;
  const reviewDate        = String(formData.get("reviewDate") ?? "").trim();
  const reviewPeriodStart = String(formData.get("reviewPeriodStart") ?? "").trim() || null;
  const reviewPeriodEnd   = String(formData.get("reviewPeriodEnd") ?? "").trim() || null;
  const attendees         = String(formData.get("attendees") ?? "").trim() || null;
  const agendaSummary     = String(formData.get("agendaSummary") ?? "").trim() || null;

  if (!reviewDate) redirect(authMessage("/management-review", "Review date is required."));

  const result = await createReview({
    reviewType, reviewDate, reviewPeriodStart, reviewPeriodEnd, attendees, agendaSummary,
  });
  redirect(
    result.ok
      ? authSuccess("/management-review", result.message)
      : authMessage("/management-review", result.message)
  );
}

export async function createActionItemAction(formData: FormData) {
  const reviewId    = String(formData.get("reviewId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const ownerRole   = String(formData.get("ownerRole") ?? "").trim() || null;
  const dueDate     = String(formData.get("dueDate") ?? "").trim() || null;

  if (!description) redirect(authMessage("/management-review", "Action item description is required."));

  const result = await createActionItem({ reviewId, description, ownerRole, dueDate });
  redirect(
    result.ok
      ? authSuccess("/management-review", result.message)
      : authMessage("/management-review", result.message)
  );
}

export async function closeActionItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/management-review");

  const result = await closeActionItem(id);
  redirect(
    result.ok
      ? authSuccess("/management-review", result.message)
      : authMessage("/management-review", result.message)
  );
}
