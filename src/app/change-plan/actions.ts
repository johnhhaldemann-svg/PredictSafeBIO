"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createChangePlanItem,
  seedDefaultChangePlanItems,
  updateChangePlanItem,
  type ChangePlanItemInput,
  type FoundationActionResult
} from "@/lib/supabase/data";

function redirectWithMessage(message: string): never {
  const params = new URLSearchParams({ message });
  redirect(`/change-plan?${params.toString()}`);
}

function revalidateChangePlanPaths() {
  revalidatePath("/change-plan");
  revalidatePath("/workbench");
}

function redirectChangePlanResult(result: FoundationActionResult): never {
  revalidateChangePlanPaths();
  redirectWithMessage(result.message);
}

function parseSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 99);
  return Number.isFinite(parsed) ? parsed : 99;
}

function changePlanInputFromForm(formData: FormData): ChangePlanItemInput {
  return {
    id: String(formData.get("id") ?? ""),
    category: String(formData.get("category") ?? ""),
    feature: String(formData.get("feature") ?? ""),
    owner: String(formData.get("owner") ?? ""),
    priority: String(formData.get("priority") ?? ""),
    status: String(formData.get("status") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    href: String(formData.get("href") ?? ""),
    sortOrder: parseSortOrder(formData.get("sortOrder"))
  };
}

export async function seedDefaultChangePlanItemsAction() {
  const result = await seedDefaultChangePlanItems();
  redirectChangePlanResult(result);
}

export async function createChangePlanItemAction(formData: FormData) {
  const result = await createChangePlanItem(changePlanInputFromForm(formData));
  redirectChangePlanResult(result);
}

export async function updateChangePlanItemAction(formData: FormData) {
  const result = await updateChangePlanItem(changePlanInputFromForm(formData));
  redirectChangePlanResult(result);
}
