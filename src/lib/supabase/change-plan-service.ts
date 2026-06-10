import {
  changePlanPriorities,
  changePlanRows,
  changePlanStatuses,
  type ChangePlanPriority,
  type ChangePlanRow,
  type ChangePlanStatus
} from "@/lib/platform-outline";
import { canManageWorkspace } from "@/lib/role-permissions";
import { createSupabaseServerClient } from "./server";
import { getProfileContext, type FoundationActionResult } from "./data-helpers";

export type ChangePlanItem = ChangePlanRow & {
  id?: string;
  sortOrder: number;
  persisted: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ChangePlanItemsSummary = {
  items: ChangePlanItem[];
  canManage: boolean;
  signedIn: boolean;
  isFallback: boolean;
  message: string;
};

export type ChangePlanItemInput = {
  id?: string;
  category: string;
  feature: string;
  owner: string;
  priority: string;
  status: string;
  notes: string;
  href: string;
  sortOrder?: number;
};

function fallbackChangePlanItems(): ChangePlanItem[] {
  return changePlanRows.map((row, index) => ({
    ...row,
    sortOrder: index + 1,
    persisted: false
  }));
}

function normalizeChangePlanPriority(priority: string): ChangePlanPriority {
  return changePlanPriorities.includes(priority as ChangePlanPriority) ? (priority as ChangePlanPriority) : "Medium";
}

function normalizeChangePlanStatus(status: string): ChangePlanStatus {
  return changePlanStatuses.includes(status as ChangePlanStatus) ? (status as ChangePlanStatus) : "Planned";
}

function normalizeChangePlanText(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function mapChangePlanItem(row: Record<string, any>): ChangePlanItem {
  return {
    id: row.id,
    category: row.category,
    feature: row.feature,
    owner: row.owner,
    priority: normalizeChangePlanPriority(row.priority),
    status: normalizeChangePlanStatus(row.status),
    notes: row.notes ?? "",
    href: row.href ?? "/change-plan",
    sortOrder: Number(row.sort_order ?? 0),
    persisted: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listChangePlanItems(): Promise<ChangePlanItemsSummary> {
  const fallbackItems = fallbackChangePlanItems();
  const context = await getProfileContext();

  if (!context) {
    return {
      items: fallbackItems,
      canManage: false,
      signedIn: false,
      isFallback: true,
      message: "Public demo mode is showing curated starter roadmap rows."
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("change_plan_items")
      .select("id,category,feature,owner,priority,status,notes,href,sort_order,created_at,updated_at")
      .eq("organization_id", context.organizationId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return {
        items: fallbackItems,
        canManage: canManageWorkspace(context),
        signedIn: true,
        isFallback: true,
        message: "Live Change Plan rows are unavailable; showing curated starter rows."
      };
    }

    if (!data || data.length === 0) {
      return {
        items: fallbackItems,
        canManage: canManageWorkspace(context),
        signedIn: true,
        isFallback: true,
        message: "This workspace has not seeded its Change Plan yet."
      };
    }

    return {
      items: data.map((row) => mapChangePlanItem(row as Record<string, any>)),
      canManage: canManageWorkspace(context),
      signedIn: true,
      isFallback: false,
      message: canManageWorkspace(context) ? "Owner roadmap controls enabled." : "Roadmap editing is owner-only for this workspace."
    };
  } catch {
    return {
      items: fallbackItems,
      canManage: canManageWorkspace(context),
      signedIn: true,
      isFallback: true,
      message: "Live Change Plan rows are unavailable; showing curated starter rows."
    };
  }
}

export async function seedDefaultChangePlanItems(): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before seeding Change Plan rows." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can manage Change Plan rows." };

  const supabase = await createSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from("change_plan_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", context.organizationId);

  if (countError) return { ok: false, message: countError.message };
  if ((count ?? 0) > 0) return { ok: true, message: "This workspace already has persisted Change Plan rows." };

  const rows = changePlanRows.map((row, index) => ({
    organization_id: context.organizationId,
    category: row.category,
    feature: row.feature,
    owner: row.owner,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    href: row.href,
    sort_order: index + 1,
    created_by: context.userId
  }));

  const { error } = await supabase.from("change_plan_items").insert(rows);
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Starter Change Plan rows seeded for owner editing." };
}

export async function createChangePlanItem(input: ChangePlanItemInput): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before creating Change Plan rows." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can manage Change Plan rows." };

  const category = normalizeChangePlanText(input.category, "System Reliance");
  const feature = normalizeChangePlanText(input.feature, "");
  const owner = normalizeChangePlanText(input.owner, "Platform Owner");
  const notes = normalizeChangePlanText(input.notes, "Roadmap requirement detail pending owner review.");
  const href = normalizeChangePlanText(input.href, "/change-plan");

  if (!feature) return { ok: false, message: "Add a Change Plan feature before saving." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("change_plan_items").insert({
    organization_id: context.organizationId,
    category,
    feature,
    owner,
    priority: normalizeChangePlanPriority(input.priority),
    status: normalizeChangePlanStatus(input.status),
    notes,
    href,
    sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 99,
    created_by: context.userId
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Change Plan item created." };
}

export async function updateChangePlanItem(input: ChangePlanItemInput): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating Change Plan rows." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can manage Change Plan rows." };
  if (!input.id) return { ok: false, message: "Choose a persisted Change Plan row to update." };

  const category = normalizeChangePlanText(input.category, "System Reliance");
  const feature = normalizeChangePlanText(input.feature, "");
  const owner = normalizeChangePlanText(input.owner, "Platform Owner");
  const notes = normalizeChangePlanText(input.notes, "Roadmap requirement detail pending owner review.");
  const href = normalizeChangePlanText(input.href, "/change-plan");

  if (!feature) return { ok: false, message: "Add a Change Plan feature before saving." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("change_plan_items")
    .update({
      category,
      feature,
      owner,
      priority: normalizeChangePlanPriority(input.priority),
      status: normalizeChangePlanStatus(input.status),
      notes,
      href,
      sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 99,
      updated_at: new Date().toISOString()
    })
    .eq("organization_id", context.organizationId)
    .eq("id", input.id)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, message: error?.message ?? "Change Plan item could not be updated." };
  return { ok: true, message: "Change Plan item updated." };
}
