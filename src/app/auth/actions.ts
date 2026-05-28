"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { demoCompanyProfile } from "@/lib/demo-data";
import type { ReviewOwnerRole } from "@/lib/bio-ai/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function listField(formData: FormData, name: string) {
  return field(formData, name)
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/workbench";
}

function authMessage(path: string, message: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("message", message);
  return `${pathname}?${params.toString()}`;
}

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("email rate limit")) {
    return "Supabase email rate limit reached. Wait for the throttle window to reset, or configure custom SMTP before more signup testing.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Email is not confirmed yet. Open the Supabase confirmation email, then sign in again.";
  }
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "An account already exists for that email. Sign in, or use the confirmation email if it is still pending.";
  }
  return message;
}

async function createClientOrRedirect(path: string) {
  try {
    return await createSupabaseServerClient();
  } catch {
    redirect(authMessage(path, "Supabase is not configured yet. Add the project URL and publishable key first."));
  }
}

export async function signInAction(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const email = field(formData, "email");
  const password = field(formData, "password");

  if (!email || !password) {
    redirect(authMessage(`/login?next=${encodeURIComponent(next)}`, "Email and password are required."));
  }

  const supabase = await createClientOrRedirect("/login");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(authMessage(`/login?next=${encodeURIComponent(next)}`, friendlyAuthError(error.message)));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle()
    : { data: null };

  revalidatePath("/", "layout");
  redirect(profile?.organization_id ? next : "/onboarding");
}

export async function signUpAction(formData: FormData) {
  const next = safeNext(formData.get("next")) || "/onboarding";
  const email = field(formData, "email");
  const password = field(formData, "password");

  if (!email || !password) {
    redirect(authMessage(`/signup?next=${encodeURIComponent(next)}`, "Email and password are required."));
  }

  const supabase = await createClientOrRedirect("/signup");
  const origin = (await headers()).get("origin");
  const emailRedirectTo = origin ? `${origin}/auth/confirm?next=${encodeURIComponent("/onboarding")}` : undefined;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined
  });

  if (error) {
    redirect(authMessage(`/signup?next=${encodeURIComponent(next)}`, friendlyAuthError(error.message)));
  }

  revalidatePath("/", "layout");

  if (!data.session) {
    redirect(authMessage("/login", "Account created. Check your email for the Supabase confirmation link, then finish onboarding."));
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createClientOrRedirect("/login");
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function completeOnboardingAction(formData: FormData) {
  const supabase = await createClientOrRedirect("/onboarding");
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authMessage("/login?next=%2Fonboarding", "Sign in before completing onboarding."));
  }

  const organizationId = randomUUID();
  const organizationName = field(formData, "organizationName") || demoCompanyProfile.companyName;
  const companyName = field(formData, "companyName") || organizationName;
  const fullName = field(formData, "fullName") || user.email || "PredictSafeBIO user";

  const { error: organizationError } = await supabase.from("organizations").insert({
    id: organizationId,
    name: organizationName
  });

  if (organizationError) {
    redirect(authMessage("/onboarding", organizationError.message));
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      organization_id: organizationId,
      full_name: fullName,
      role: "owner",
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (profileError) {
    redirect(authMessage("/onboarding", profileError.message));
  }

  const reviewOwnerRoles = listField(formData, "reviewOwnerRoles") as ReviewOwnerRole[];
  const { error: companyError } = await supabase.from("company_profiles").insert({
    organization_id: organizationId,
    company_name: companyName,
    primary_site: field(formData, "primarySite") || demoCompanyProfile.primarySite,
    operating_areas: listField(formData, "operatingAreas"),
    programs: listField(formData, "programs"),
    quality_system_scope: listField(formData, "qualityScope"),
    biosafety_levels: listField(formData, "biosafetyLevels"),
    review_owner_roles: reviewOwnerRoles,
    document_families: listField(formData, "documentFamilies"),
    created_by: user.id
  });

  if (companyError) {
    redirect(authMessage("/onboarding", companyError.message));
  }

  await supabase.from("audit_events").insert({
    organization_id: organizationId,
    actor_id: user.id,
    event_type: "company_profile_updated",
    summary: `Onboarding completed for ${companyName}.`,
    payload: { companyName, organizationName, primarySite: field(formData, "primarySite") || demoCompanyProfile.primarySite }
  });

  revalidatePath("/", "layout");
  redirect("/workbench?message=onboarding-complete");
}
