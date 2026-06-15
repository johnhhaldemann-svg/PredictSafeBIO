"use server";

import { redirect } from "next/navigation";
import {
  createPlan,
  createDrill,
  createStep,
  toggleStepComplete,
  createContact,
  deleteContact,
  type PlanType,
  type DrillOutcome,
  type ContactType,
} from "@/lib/supabase/emergency-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";

// ── Plan ─────────────────────────────────────────────────────────────────────

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

// ── Drills ────────────────────────────────────────────────────────────────────

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

// ── Steps ─────────────────────────────────────────────────────────────────────

export async function createStepAction(formData: FormData) {
  const planId     = String(formData.get("planId") ?? "").trim();
  const text       = String(formData.get("text") ?? "").trim();
  const isRequired = formData.get("isRequired") === "on";

  if (!planId || !text) redirect(authMessage(`/emergency-response`, "Step text is required."));

  const result = await createStep({ planId, text, isRequired });
  const back = planId ? `/emergency-response?plan=${planId}` : "/emergency-response";
  redirect(
    result.ok
      ? authSuccess(back, result.message)
      : authMessage(back, result.message)
  );
}

export async function toggleStepAction(formData: FormData) {
  const stepId    = String(formData.get("stepId") ?? "").trim();
  const planId    = String(formData.get("planId") ?? "").trim();
  const completed = formData.get("completed") === "true";

  if (!stepId) redirect(authMessage("/emergency-response", "Invalid step."));

  await toggleStepComplete(stepId, completed);
  const back = planId ? `/emergency-response?plan=${planId}` : "/emergency-response";
  redirect(back);
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export async function createContactAction(formData: FormData) {
  const name        = String(formData.get("name") ?? "").trim();
  const role        = String(formData.get("role") ?? "").trim();
  const phone       = String(formData.get("phone") ?? "").trim();
  const contactType = (String(formData.get("contactType") ?? "internal")) as ContactType;
  const isPrimary   = formData.get("isPrimary") === "on";

  if (!name || !phone) redirect(authMessage("/emergency-response", "Name and phone are required."));

  const result = await createContact({ name, role, phone, contactType, isPrimary });
  redirect(
    result.ok
      ? authSuccess("/emergency-response", result.message)
      : authMessage("/emergency-response", result.message)
  );
}

export async function deleteContactAction(formData: FormData) {
  const id = String(formData.get("contactId") ?? "").trim();
  if (!id) redirect(authMessage("/emergency-response", "Invalid contact."));
  await deleteContact(id);
  redirect("/emergency-response");
}
