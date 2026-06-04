import { withAuditTrace } from "@/lib/audit-trace";
import type { CompanyProfile } from "@/lib/bio-ai/types";
import { demoCompanyProfile } from "@/lib/demo-data";
import {
  changedCompanyProfileFields,
  type AccountProfileUpdateInput,
  type CompanyProfileUpdateInput
} from "@/lib/account-profile";
import { isSupabaseConfigured } from "./env";
import { createSupabaseServerClient } from "./server";

type AccountProfileContext = {
  userId: string;
  organizationId: string;
  role: string;
};

type AccountActionResult = { ok: true; message: string } | { ok: false; message: string };

export type AuthSummary = {
  configured: boolean;
  signedIn: boolean;
  userId?: string;
  userEmail?: string;
  fullName?: string | null;
  organizationId?: string;
  role?: string;
  needsOnboarding: boolean;
};

export type AccountSummary = AuthSummary & {
  companyProfile: CompanyProfile | null;
};

export async function getAuthSummary(): Promise<AuthSummary> {
  if (!isSupabaseConfigured()) {
    return { configured: false, signedIn: false, needsOnboarding: false };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { configured: true, signedIn: false, needsOnboarding: false };
    }

    const { data } = await supabase.from("profiles").select("organization_id,role,full_name").eq("id", user.id).maybeSingle();
    return {
      configured: true,
      signedIn: true,
      userId: user.id,
      userEmail: user.email ?? undefined,
      fullName: data?.full_name ?? null,
      organizationId: data?.organization_id ?? undefined,
      role: data?.role ?? undefined,
      needsOnboarding: !data?.organization_id
    };
  } catch {
    return { configured: false, signedIn: false, needsOnboarding: false };
  }
}

export async function getAccountSummary(): Promise<AccountSummary> {
  const auth = await getAuthSummary();
  if (!auth.signedIn || !auth.organizationId) return { ...auth, companyProfile: null };
  return { ...auth, companyProfile: await getCompanyProfile() };
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const context = await getAccountProfileContext();
  if (!context) return demoCompanyProfile;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return demoCompanyProfile;

  return {
    id: data.id,
    organizationId: data.organization_id,
    companyName: data.company_name,
    primarySite: data.primary_site,
    operatingAreas: data.operating_areas ?? [],
    programs: data.programs ?? [],
    qualitySystemScope: data.quality_system_scope ?? [],
    biosafetyLevels: data.biosafety_levels ?? [],
    reviewOwnerRoles: data.review_owner_roles ?? [],
    documentFamilies: data.document_families ?? [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function updateAccountProfile(input: AccountProfileUpdateInput): Promise<AccountActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase is not configured." };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, message: "Sign in before updating your account profile." };

    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: input.fullName, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("organization_id,full_name")
      .maybeSingle();

    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "Account profile was not found. Finish onboarding first." };

    if (data.organization_id) {
      await supabase.from("audit_events").insert({
        organization_id: data.organization_id,
        actor_id: user.id,
        event_type: "account_profile_updated",
        summary: "Account profile name updated.",
        payload: withAuditTrace({ updatedFields: ["fullName"] }, { sourceModule: "company_profile", targetModule: "company_profile" })
      });
    }

    return { ok: true, message: "Account profile updated." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Account profile update failed." };
  }
}

export async function updateCompanyProfile(input: CompanyProfileUpdateInput): Promise<AccountActionResult> {
  const context = await getAccountProfileContext();
  if (!context) return { ok: false, message: "Finish onboarding before updating company profile details." };

  try {
    const supabase = await createSupabaseServerClient();
    const previous = await getCompanyProfile();
    const now = new Date().toISOString();
    const values = {
      organization_id: context.organizationId,
      company_name: input.companyName,
      primary_site: input.primarySite,
      operating_areas: input.operatingAreas,
      programs: input.programs,
      quality_system_scope: input.qualitySystemScope,
      biosafety_levels: input.biosafetyLevels,
      review_owner_roles: input.reviewOwnerRoles,
      document_families: input.documentFamilies,
      updated_at: now
    };

    const result = previous.id
      ? await supabase.from("company_profiles").update(values).eq("id", previous.id)
      : await supabase.from("company_profiles").insert({ ...values, created_by: context.userId, created_at: now });

    if (result.error) return { ok: false, message: result.error.message };

    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "company_profile_updated",
      summary: `Company profile updated for ${input.companyName}.`,
      payload: withAuditTrace(
        {
          companyName: input.companyName,
          changedFields: previous.id ? changedCompanyProfileFields(previous, input) : ["created"]
        },
        { sourceModule: "company_profile", targetModule: "company_profile" }
      )
    });

    return { ok: true, message: "Company profile updated." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Company profile update failed." };
  }
}

async function getAccountProfileContext(): Promise<AccountProfileContext | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase.from("profiles").select("organization_id,role").eq("id", user.id).maybeSingle();
    if (!data?.organization_id) return null;

    return { userId: user.id, organizationId: data.organization_id, role: data.role ?? "member" };
  } catch {
    return null;
  }
}
