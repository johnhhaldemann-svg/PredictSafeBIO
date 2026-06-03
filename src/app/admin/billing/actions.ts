"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import {
  upsertPlan,
  createManualOverride,
  revokeManualOverride,
} from "@/lib/supabase/billing-service";
import { isSuperAdmin, isAdminOrAbove } from "@/lib/role-permissions";

async function requireSuperAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();
  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!isAdminOrAbove(access)) redirect("/");
  return { actorId: user.id, isSA: isSuperAdmin(access) };
}

// ── Plan management ───────────────────────────────────────────────────────────

export async function savePlanAction(formData: FormData) {
  const { actorId } = await requireSuperAdmin();
  const tier = String(formData.get("tier") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const price_cents = parseInt(String(formData.get("price_cents") ?? "0"), 10);
  const stripe_price_id = String(formData.get("stripe_price_id") ?? "").trim() || null;
  const max_providers = formData.get("max_providers") ? parseInt(String(formData.get("max_providers")), 10) : null;
  const max_patients  = formData.get("max_patients")  ? parseInt(String(formData.get("max_patients")),  10) : null;

  const { error } = await upsertPlan(
    { tier, name, price_cents, stripe_price_id: stripe_price_id ?? undefined, max_providers: max_providers ?? undefined, max_patients: max_patients ?? undefined },
    actorId
  );
  if (error) redirect(`/admin/billing/plans?error=${encodeURIComponent(error)}`);
  revalidatePath("/admin/billing");
  revalidatePath("/admin/billing/plans");
  redirect("/admin/billing/plans?success=Plan+saved");
}

// ── Manual overrides ──────────────────────────────────────────────────────────

export async function createOverrideAction(formData: FormData) {
  const { actorId } = await requireSuperAdmin();
  const organization_id = String(formData.get("organization_id") ?? "");
  const override_type   = String(formData.get("override_type") ?? "");
  const value           = String(formData.get("value") ?? "").trim();
  const reason          = String(formData.get("reason") ?? "").trim();
  const expires_at_raw  = String(formData.get("expires_at") ?? "").trim();
  const expires_at      = expires_at_raw ? new Date(expires_at_raw).toISOString() : null;

  if (!reason) redirect("/admin/billing/overrides?error=Reason+is+required");

  const { error } = await createManualOverride(actorId, {
    organization_id,
    override_type,
    value,
    expires_at,
    reason,
  });

  if (error) redirect(`/admin/billing/overrides?error=${encodeURIComponent(error)}`);
  revalidatePath("/admin/billing/overrides");
  redirect("/admin/billing/overrides?success=Override+created");
}

export async function revokeOverrideAction(formData: FormData) {
  await requireSuperAdmin();
  const overrideId = String(formData.get("overrideId") ?? "");
  const { error } = await revokeManualOverride(overrideId);
  if (error) redirect(`/admin/billing/overrides?error=${encodeURIComponent(error)}`);
  revalidatePath("/admin/billing/overrides");
  redirect("/admin/billing/overrides?success=Override+revoked");
}
