"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { canViewPlatform } from "@/lib/role-permissions";
import { setFeatureFlag } from "@/lib/supabase/feature-flag-service";
import { updatePlatformConfigBulk } from "@/lib/supabase/platform-config-service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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

// ── Feature flags ─────────────────────────────────────────────────────────────

export async function toggleFeatureFlagAction(formData: FormData) {
  const { actorId } = await requireAdmin();
  const key     = String(formData.get("key") ?? "");
  const enabled = formData.get("enabled") === "true";

  const { error } = await setFeatureFlag(key, enabled, actorId);
  if (error) redirect(`/admin/config/flags?error=${encodeURIComponent(error)}`);
  revalidatePath("/admin/config/flags");
  redirect("/admin/config/flags?success=Flag+updated");
}

// ── Platform branding ─────────────────────────────────────────────────────────

export async function saveBrandingAction(formData: FormData) {
  const { actorId } = await requireAdmin();

  const keys = [
    "platform_name", "platform_tagline", "primary_color",
    "logo_url", "footer_text", "support_email",
    "support_url", "privacy_policy_url", "terms_url",
  ];

  const updates: Record<string, string> = {};
  for (const key of keys) {
    updates[key] = String(formData.get(key) ?? "").trim();
  }

  const { error } = await updatePlatformConfigBulk(updates, actorId);
  if (error) redirect(`/admin/config/branding?error=${encodeURIComponent(error)}`);
  revalidatePath("/admin/config/branding");
  redirect("/admin/config/branding?success=Branding+saved");
}

// ── Email templates ───────────────────────────────────────────────────────────

export async function saveEmailTemplateAction(formData: FormData) {
  await requireAdmin();
  const key       = String(formData.get("key") ?? "");
  const subject   = String(formData.get("subject") ?? "").trim();
  const body_html = String(formData.get("body_html") ?? "").trim();
  const body_text = String(formData.get("body_text") ?? "").trim();
  const is_active = formData.get("is_active") !== "false";

  if (!key || !subject || !body_html) {
    redirect(`/admin/config/emails?error=Key%2C+subject%2C+and+HTML+body+are+required`);
  }

  const admin = getSupabaseAdminClient();
   
  const { error } = await (admin as any)
    .from("email_templates")
    .update({
      subject,
      body_html,
      body_text,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) redirect(`/admin/config/emails?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/config/emails");
  redirect(`/admin/config/emails?success=Template+saved&tab=${key}`);
}
