"use server";
import { redirect } from "next/navigation";
import { completeCalendarItem } from "@/lib/supabase/compliance-calendar-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";
const PATH = "/plan/compliance-calendar";
export async function completeCalendarItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(PATH);
  const result = await completeCalendarItem(id);
  redirect(result.ok ? authSuccess(PATH, result.message) : authMessage(PATH, result.message));
}
