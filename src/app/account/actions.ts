"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authMessage } from "@/lib/auth-routing";
import { normalizeAccountProfileInput, normalizeCompanyProfileInput } from "@/lib/account-profile";
import { updateAccountProfile, updateCompanyProfile } from "@/lib/supabase/data";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function returnTo(formData: FormData) {
  const value = field(formData, "returnTo");
  return value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export async function updateAccountProfileAction(formData: FormData) {
  const target = returnTo(formData);
  let message = "Account profile updated.";
  let ok = false;

  try {
    const result = await updateAccountProfile(normalizeAccountProfileInput({ fullName: field(formData, "fullName") }));
    message = result.message;
    ok = result.ok;
  } catch (error) {
    redirect(authMessage(target, error instanceof Error ? error.message : "Account profile update failed."));
  }

  if (!ok) {
    redirect(authMessage(target, message));
  }

  revalidatePath("/", "layout");
  revalidatePath("/account");
  redirect(authMessage(target, message));
}

export async function updateCompanyProfileAction(formData: FormData) {
  const target = returnTo(formData);
  let message = "Company profile updated.";
  let ok = false;

  try {
    const result = await updateCompanyProfile(
      normalizeCompanyProfileInput({
        companyName: field(formData, "companyName"),
        primarySite: field(formData, "primarySite"),
        operatingAreas: field(formData, "operatingAreas"),
        programs: field(formData, "programs"),
        qualitySystemScope: field(formData, "qualitySystemScope"),
        biosafetyLevels: field(formData, "biosafetyLevels"),
        reviewOwnerRoles: field(formData, "reviewOwnerRoles"),
        documentFamilies: field(formData, "documentFamilies")
      })
    );
    message = result.message;
    ok = result.ok;
  } catch (error) {
    redirect(authMessage(target, error instanceof Error ? error.message : "Company profile update failed."));
  }

  if (!ok) {
    redirect(authMessage(target, message));
  }

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/company-profile");
  redirect(authMessage(target, message));
}
