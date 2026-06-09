"use server";

import { redirect } from "next/navigation";
import {
  createPlan,
  createDrill,
  type PlanType,
  type DrillOutcome,
} from "@/lib/supabase/emergency-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";

export async function createPlanAction(formData: FormData) {
  const planType      = String(formData.get("planType") ?? "other") as PlanType;
  const title         = String(formData.get("title") ?? "").trim();
  const description   = String(formData.get("description") ?? "").trim() || null;
  const lastReviewed  = String(formData.get("lastReviewed") ?? "").trim() || null;
  const nextDrillDate = String(formData.get("nextDrillDate") ?? "").trim() || null;

  if (!title) redirect(authMessage("/emergency-response", "Plan title is required."));

  const result = await createPlan({ planType, title, description, lastReviewed, nextDrillDate });
  redirect(
    result.ok
      ? authSuccess("/emergency-response", result.message)
      : authMessage("/emergency-response", result.message)
  );
}

export async function createDrillAction(formData: FormData) {
  const planId            = String(formData.get("planId") ?? "").trim() || null;
  const drillDate         = String(formData.get("drillDate") ?? "").trim();
  const drillType         = String(formData.get("drillType") ?? "").trim() || null;
  const participantsRaw   = parseInt(String(formData.get("participantsCount") ?? ""), 10);
  const participantsCount = isNaN(participantsRaw) ? null : participantsRaw;
  const outcome           = String(formData.get("outcome") ?? "satisfactory") as DrillOutcome;
  const notes             = String(formData.get("notes") ?? "").trim() || null;
  const conductedBy       = String(formData.get("conductedBy") ?? "").trim() || null;

  if (!drillDate) redirect(authMessage("/emergency-response", "Drill date is required."));

  const result = await createDrill({ planId, drillDate, drillType, participantsCount, outcome, notes, conductedBy });
  redirect(
    result.ok
      ? authSuccess("/emergency-response", result.message)
      : authMessage("/emergency-response", result.message)
  );
}
