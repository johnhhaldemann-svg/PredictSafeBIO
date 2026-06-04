"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { seedDemoWorkspace } from "@/lib/supabase/data";

function redirectWithMessage(path: string, message: string): never {
  const params = new URLSearchParams({ message });
  redirect(`${path}?${params.toString()}`);
}

export async function seedDemoWorkspaceAction() {
  const result = await seedDemoWorkspace();
  if (!result.ok) {
    redirectWithMessage("/admin/demo", result.message);
  }

  revalidatePath("/workbench");
  revalidatePath("/assessments");
  revalidatePath("/documents");
  revalidatePath("/admin/audit");
  redirectWithMessage(
    "/admin/demo",
    `${result.seedLabel} created. Assessment ${result.assessmentId} and document ${result.documentId} are ready for review.`
  );
}
