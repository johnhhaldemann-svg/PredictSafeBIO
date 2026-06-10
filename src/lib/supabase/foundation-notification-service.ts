import { getFoundationNotificationLabel } from "@/lib/foundation/review-actions";
import { createSupabaseServerClient } from "./server";
import { getProfileContext, type FoundationActionResult } from "./data-helpers";

export type FoundationNotificationSummary = {
  unreadCount: number;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    notificationType: string;
    label: string;
    taskId?: string | null;
    createdAt?: string;
    readAt?: string | null;
  }>;
};

export async function getFoundationNotificationSummary(): Promise<FoundationNotificationSummary> {
  const context = await getProfileContext();
  if (!context) return { unreadCount: 0, notifications: [] };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,body,notification_type,task_id,read_at,created_at")
      .eq("organization_id", context.organizationId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error || !data) return { unreadCount: 0, notifications: [] };
    const notifications = data.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body ?? "",
      notificationType: row.notification_type ?? "task",
      label: getFoundationNotificationLabel(row.notification_type ?? "task"),
      taskId: row.task_id,
      createdAt: row.created_at,
      readAt: row.read_at
    }));
    return {
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
      notifications
    };
  } catch {
    return { unreadCount: 0, notifications: [] };
  }
}

export async function updateFoundationNotificationReadState(input: { notificationId: string; read: boolean }): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to update notification state." };

  const notificationId = String(input.notificationId ?? "").trim();
  if (!notificationId) return { ok: false, message: "Choose a notification to update." };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: input.read ? new Date().toISOString() : null })
      .eq("organization_id", context.organizationId)
      .eq("user_id", context.userId)
      .eq("id", notificationId);

    if (error) return { ok: false, message: error.message };
    return { ok: true, message: input.read ? "Notification marked read." : "Notification marked unread." };
  } catch {
    return { ok: false, message: "Notification state could not be updated." };
  }
}

export async function markAllFoundationNotificationsRead(): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to clear notifications." };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("organization_id", context.organizationId)
      .eq("user_id", context.userId)
      .is("read_at", null);

    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Unread notifications marked read." };
  } catch {
    return { ok: false, message: "Notifications could not be cleared." };
  }
}
