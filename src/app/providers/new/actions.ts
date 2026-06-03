"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkProviderLimit } from "@/lib/supabase/plan-limits-service";

export async function submitProviderProfileAction(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/providers/new");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/onboarding");

  const orgId = profile.organization_id;

  // Check plan limits before inserting
  const limitCheck = await checkProviderLimit(orgId);
  if (!limitCheck.allowed) {
    redirect(`/providers/new?error=${encodeURIComponent(limitCheck.reason)}`);
  }

  // Parse form fields
  const specialty       = String(formData.get("specialty") ?? "").trim();
  const npi_number      = String(formData.get("npi_number") ?? "").trim();
  const license_number  = String(formData.get("license_number") ?? "").trim();
  const license_state   = String(formData.get("license_state") ?? "").trim();
  const accepting       = formData.get("accepting_patients") === "true";
  const credentialsRaw  = formData.getAll("credentials").map(String);

  if (!specialty) redirect("/providers/new?error=Specialty+is+required");
  if (!npi_number) redirect("/providers/new?error=NPI+number+is+required");

  const admin = getSupabaseAdminClient();

  // Check if this user already has a pending/approved profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("provider_profiles")
    .select("id, review_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect(`/providers/new?error=You+already+have+a+provider+profile+(${existing.review_status})`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("provider_profiles").insert({
    organization_id:  orgId,
    user_id:          user.id,
    specialty,
    npi_number:       npi_number || null,
    license_number:   license_number || null,
    license_state:    license_state || null,
    credentials:      credentialsRaw,
    accepting_patients: accepting,
    review_status:    "pending",
    is_public:        false,
    is_active:        true,
    submitted_at:     new Date().toISOString(),
    created_by:       user.id,
    npi_checklist:    {},
    npi_verified:     false,
  });

  if (error) {
    console.error("[submitProviderProfile]", error.message);
    redirect(`/providers/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/providers/new?success=1");
}
