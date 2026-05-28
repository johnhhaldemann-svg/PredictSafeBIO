"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { seedIntelligenceFoundation } from "@/lib/supabase/data";

function redirectWithMessage(path: string, message: string): never {
  const params = new URLSearchParams({ message });
  redirect(`${path}?${params.toString()}`);
}

export async function seedIntelligenceFoundationAction() {
  const result = await seedIntelligenceFoundation();
  if (!result.ok) {
    redirectWithMessage("/foundation", result.message);
  }

  revalidatePath("/foundation");
  revalidatePath("/operations");
  revalidatePath("/workbench");
  revalidatePath("/admin/audit");
  redirectWithMessage(
    "/foundation",
    `${result.seedLabel} created. Draft audit readiness score is ${result.readinessScore}; human review is required.`
  );
}
