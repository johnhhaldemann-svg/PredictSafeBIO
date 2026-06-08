// Manual v1.1 — Compliance Calendar service (§7).
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

export type CalendarStatus = "scheduled" | "in_progress" | "completed" | "overdue" | "cancelled";
export type CalendarUrgency = "overdue" | "due_this_week" | "upcoming" | "completed";

export type CalendarItem = {
  id: string;
  taskName: string;
  taskType: string | null;
  frequency: string | null;
  dueDate: string | null;
  status: CalendarStatus;
  urgency: CalendarUrgency;
  riskRegisterEntryId: string | null;
  programName: string | null;
};

export type ServiceResult = { ok: true; message: string } | { ok: false; message: string };

function urgencyOf(dueDate: string | null, status: CalendarStatus): CalendarUrgency {
  if (status === "completed") return "completed";
  if (!dueDate) return "upcoming";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "due_this_week";
  return "upcoming";
}

export async function listCalendarItems(filters?: { taskType?: string; program?: string }): Promise<CalendarItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const ctx = await getProfileContext();
    if (!ctx) return [];
    const supabase = await createSupabaseServerClient();
    let q = supabase.from("compliance_calendar_items")
      .select("id,task_name,task_type,frequency,due_date,status,risk_register_entry_id,rre:risk_register_entry_id(program_name)")
      .eq("organization_id", ctx.organizationId)
      .order("due_date", { ascending: true });
    if (filters?.taskType) q = q.eq("task_type", filters.taskType);
    const { data, error } = await q;
    if (error) throw error;
    let items = (data ?? []).map((r: Record<string, unknown>) => {
      const rre = r.rre as Record<string, unknown> | null;
      const status = (r.status as CalendarStatus) ?? "scheduled";
      return {
        id: r.id as string,
        taskName: r.task_name as string,
        taskType: (r.task_type as string) ?? null,
        frequency: (r.frequency as string) ?? null,
        dueDate: (r.due_date as string) ?? null,
        status,
        urgency: urgencyOf((r.due_date as string) ?? null, status),
        riskRegisterEntryId: (r.risk_register_entry_id as string) ?? null,
        programName: (rre?.program_name as string) ?? null,
      } as CalendarItem;
    });
    if (filters?.program) items = items.filter((i) => i.programName === filters.program);
    return items;
  } catch {
    return [];
  }
}

export async function completeCalendarItem(id: string): Promise<ServiceResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Workspace not connected." };
  const ctx = await getProfileContext();
  if (!ctx) return { ok: false, message: "Sign in to update the calendar." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("compliance_calendar_items")
    .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id).eq("organization_id", ctx.organizationId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Calendar task marked complete." };
}
