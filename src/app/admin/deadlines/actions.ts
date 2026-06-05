"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { canViewPlatform } from "@/lib/role-permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const STATUSES = ["upcoming", "due_soon", "overdue", "complete"] as const;

/** Gate every mutation to platform staff / superadmin. */
async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();
  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!canViewPlatform(access)) redirect("/");
  return { actorId: user.id };
}

function clean(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readFields(formData: FormData) {
  const title = clean(formData, "title");
  const regulation_ref = clean(formData, "regulation_ref");
  const site_label = clean(formData, "site_label") || "All Sites";
  const due_date = clean(formData, "due_date");
  const statusRaw = clean(formData, "status");
  const status = (STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : "upcoming";
  return { title, regulation_ref, site_label, due_date, status };
}

function refresh() {
  revalidatePath("/admin/deadlines");
  revalidatePath("/admin/dashboard");
}

export async function createDeadlineAction(formData: FormData) {
  const { actorId } = await requireAdmin();
  const { title, regulation_ref, site_label, due_date, status } = readFields(formData);

  if (!title || !due_date) {
    redirect("/admin/deadlines?error=A+title+and+due+date+are+required");
  }

  const admin = getSupabaseAdminClient();
  const { error } = await (admin as any).from("regulatory_deadlines").insert({
    organization_id: null, // platform-wide / all tenants
    title,
    regulation_ref,
    site_label,
    due_date,
    status,
    created_by: actorId,
  });

  if (error) redirect(`/admin/deadlines?error=${encodeURIComponent(error.message)}`);
  refresh();
  redirect("/admin/deadlines?success=Deadline+added");
}

export async function updateDeadlineAction(formData: FormData) {
  await requireAdmin();
  const id = clean(formData, "id");
  const { title, regulation_ref, site_label, due_date, status } = readFields(formData);

  if (!id) redirect("/admin/deadlines?error=Missing+deadline+id");
  if (!title || !due_date) {
    redirect(`/admin/deadlines?edit=${id}&error=A+title+and+due+date+are+required`);
  }

  const admin = getSupabaseAdminClient();
  const { error } = await (admin as any)
    .from("regulatory_deadlines")
    .update({
      title,
      regulation_ref,
      site_label,
      due_date,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect(`/admin/deadlines?edit=${id}&error=${encodeURIComponent(error.message)}`);
  refresh();
  redirect("/admin/deadlines?success=Deadline+updated");
}

export async function deleteDeadlineAction(formData: FormData) {
  await requireAdmin();
  const id = clean(formData, "id");
  if (!id) redirect("/admin/deadlines?error=Missing+deadline+id");

  const admin = getSupabaseAdminClient();
  const { error } = await (admin as any).from("regulatory_deadlines").delete().eq("id", id);

  if (error) redirect(`/admin/deadlines?error=${encodeURIComponent(error.message)}`);
  refresh();
  redirect("/admin/deadlines?success=Deadline+removed");
}
