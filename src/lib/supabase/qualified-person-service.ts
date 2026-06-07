// Manual v1.1 — Qualified Person Registry service (§10) + enforcement helper.
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

export type QualifiedPerson = {
  id: string;
  profileId: string;
  personName: string | null;
  roleTitle: string | null;
  qualifiedFor: string[];
  qualificationBasis: string | null;
  expirationDate: string | null;
  active: boolean;
};

export type ServiceResult = { ok: true; message: string } | { ok: false; message: string };

function mapRow(r: Record<string, unknown>): QualifiedPerson {
  const profiles = r.profiles as Record<string, unknown> | null;
  return {
    id: r.id as string,
    profileId: r.profile_id as string,
    personName: (profiles?.full_name as string) ?? (profiles?.email as string) ?? null,
    roleTitle: (r.role_title as string) ?? null,
    qualifiedFor: (r.qualified_for as string[]) ?? [],
    qualificationBasis: (r.qualification_basis as string) ?? null,
    expirationDate: (r.expiration_date as string) ?? null,
    active: (r.active as boolean) ?? true,
  };
}

export async function listQualifiedPersons(): Promise<QualifiedPerson[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const ctx = await getProfileContext();
    if (!ctx) return [];
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("qualified_person_registry")
      .select("id,profile_id,role_title,qualified_for,qualification_basis,expiration_date,active,profiles:profile_id(full_name,email)")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return [];
  }
}

export async function addQualifiedPerson(input: {
  profileId: string; roleTitle?: string; qualifiedFor: string[]; qualificationBasis?: string; expirationDate?: string | null;
}): Promise<ServiceResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Workspace not connected." };
  const ctx = await getProfileContext();
  if (!ctx) return { ok: false, message: "Sign in to update the registry." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("qualified_person_registry").insert({
    organization_id: ctx.organizationId,
    profile_id: input.profileId,
    role_title: input.roleTitle ?? null,
    qualified_for: input.qualifiedFor,
    qualification_basis: input.qualificationBasis ?? null,
    expiration_date: input.expirationDate || null,
    approved_by: ctx.userId,
  });
  if (error) return { ok: false, message: `Could not add: ${error.message}` };
  return { ok: true, message: "Qualified person added to the registry." };
}

export async function setQualifiedPersonActive(id: string, active: boolean): Promise<ServiceResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Workspace not connected." };
  const ctx = await getProfileContext();
  if (!ctx) return { ok: false, message: "Sign in to update the registry." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("qualified_person_registry")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id).eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: active ? "Reactivated." : "Deactivated." };
}

/** Enforcement: is this user an active, unexpired qualified reviewer for taskType? */
export async function isUserQualifiedFor(profileId: string, organizationId: string, taskType: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("qualified_person_registry")
      .select("qualified_for,expiration_date,active")
      .eq("organization_id", organizationId)
      .eq("profile_id", profileId)
      .eq("active", true);
    const today = new Date().toISOString().slice(0, 10);
    return (data ?? []).some((r: Record<string, unknown>) => {
      const exp = r.expiration_date as string | null;
      if (exp && exp < today) return false;
      const tags = (r.qualified_for as string[]) ?? [];
      return tags.includes(taskType) || tags.includes("all");
    });
  } catch {
    return false;
  }
}

export async function expiringQualifiedPersonCount(days = 30): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const ctx = await getProfileContext();
    if (!ctx) return 0;
    const supabase = await createSupabaseServerClient();
    const horizon = new Date(); horizon.setDate(horizon.getDate() + days);
    const { count } = await supabase
      .from("qualified_person_registry")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId)
      .eq("active", true)
      .not("expiration_date", "is", null)
      .lte("expiration_date", horizon.toISOString().slice(0, 10));
    return count ?? 0;
  } catch { return 0; }
}

export type OrgMember = { id: string; name: string };
export async function listOrgMembers(): Promise<OrgMember[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const ctx = await getProfileContext();
    if (!ctx) return [];
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .eq("organization_id", ctx.organizationId);
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: (r.full_name as string) || (r.email as string) || (r.id as string),
    }));
  } catch { return []; }
}
