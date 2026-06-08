"use server";

import { redirect } from "next/navigation";
import { createHazard } from "@/lib/supabase/hazard-service";
import type { HazardType } from "@/lib/supabase/hazard-service";

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
