"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { demoCompanyProfile } from "@/lib/demo-data";
import type { ReviewOwnerRole } from "@/lib/bio-ai/types";
import { authMessage, friendlyAuthError, passwordMeetsMinimum, safeAuthNext } from "@/lib/auth-routing";
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

async function createClientOrRedirect(path: string) {
  try {
    return await createSupabaseServerClient();
  } catch {
    redirect(authMessage(path, "Workspace is not connected. Contact your administrator to configure the platform."));
  }
}

export async function signInAction(formData: FormData) {
  const next = safeAuthNext(formData.get("next"));
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
  const next = safeAuthNext(formData.get("next"), "/onboarding");
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
    redirect(authMessage("/login", "Account created. Check your email for a confirmation link to activate your account, then sign in."));
  }

  redirect("/onboarding");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = field(formData, "email");

  if (!email) {
    redirect(authMessage("/forgot-password", "Email is required."));
  }

  const supabase = await createClientOrRedirect("/forgot-password");
  const origin = (await headers()).get("origin");
  const redirectTo = origin ? `${origin}/auth/confirm?next=${encodeURIComponent("/account/password")}` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);

  if (error) {
    redirect(authMessage("/forgot-password", friendlyAuthError(error.message)));
  }

  redirect(authMessage("/login", "Password reset email sent. Open the link, then set a new password."));
}

export async function updatePasswordAction(formData: FormData) {
  const password = field(formData, "password");
  const confirmPassword = field(formData, "confirmPassword");

  if (!password || !confirmPassword) {
    redirect(authMessage("/account/password", "Enter and confirm the new password."));
  }

  if (password !== confirmPassword) {
    redirect(authMessage("/account/password", "Passwords do not match."));
  }

  if (!passwordMeetsMinimum(password)) {
    redirect(authMessage("/account/password", "Use a password with at least 8 characters."));
  }

  const supabase = await createClientOrRedirect("/account/password");
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authMessage("/login?next=%2Faccount%2Fpassword", "Open the reset email link or sign in before changing your password."));
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(authMessage("/account/password", friendlyAuthError(error.message)));
  }

  revalidatePath("/", "layout");
  redirect(authMessage("/workbench", "Password updated."));
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
