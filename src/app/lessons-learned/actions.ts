"use server";

import { redirect } from "next/navigation";
import { createHazard } from "@/lib/supabase/hazard-service";
import type { HazardType } from "@/lib/supabase/hazard-service";
import {
  createLesson,
  publishLesson,
  type SourceType,
  type LessonPhase,
} from "@/lib/supabase/lessons-learned-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";

/**
 * Feed a lesson learned directly into the Hazard Register (Phase 1).
 * This is the automated Phase 6 → Phase 1 loop-back mechanism.
 */
export async function feedLessonToHazardRegisterAction(formData: FormData) {
  const name        = String(formData.get("name") ?? "").trim();
  const hazardType  = String(formData.get("hazardType") ?? "other") as HazardType;
  const description = String(formData.get("description") ?? "").trim();
  const location    = String(formData.get("location") ?? "").trim() || null;

  if (!name) {
    redirect("/lessons-learned?message=Finding+name+is+required");
  }

  const result = await createHazard({
    name,
    hazardType,
    description: description ? `[From Lessons Learned] ${description}` : "[From Lessons Learned]",
    location: location ?? undefined,
    status: "identified",
  });

  if (!result.ok) {
    redirect(`/lessons-learned?message=${encodeURIComponent(result.message)}`);
  }

  redirect(`/hazards?message=${encodeURIComponent("Lesson added to Hazard Register. Now feeding the Predictive Engine.")}`);
}

export async function createLessonAction(formData: FormData) {
  const title       = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sourceType  = String(formData.get("sourceType") ?? "other") as SourceType;
  const sourceId    = String(formData.get("sourceId") ?? "").trim() || null;
  const phase       = String(formData.get("phase") ?? "operate") as LessonPhase;
  const hazardType  = String(formData.get("hazardType") ?? "").trim() || null;

  if (!title || !description) {
    redirect(authMessage("/lessons-learned", "Title and description are required."));
  }

  const result = await createLesson({ title, description, sourceType, sourceId, phase, hazardType });
  redirect(
    result.ok
      ? authSuccess("/lessons-learned", result.message)
      : authMessage("/lessons-learned", result.message)
  );
}

export async function publishLessonAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/lessons-learned");

  const result = await publishLesson(id);
  redirect(
    result.ok
      ? authSuccess("/lessons-learned", result.message)
      : authMessage("/lessons-learned", result.message)
  );
}
