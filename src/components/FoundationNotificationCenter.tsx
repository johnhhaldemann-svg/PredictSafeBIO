"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { markAllFoundationNotificationsReadAction, updateFoundationNotificationReadStateAction } from "@/app/foundation/actions";
import { isKnowledgeNotificationType } from "@/lib/foundation/review-actions";
import type { FoundationNotificationSummary } from "@/lib/supabase/data";

export function FoundationNotificationCenter({
  notifications,
  returnTo,
  title = "Notifications"
}: {
  notifications: FoundationNotificationSummary;
  returnTo: "/workbench" | "/my-work";
  title?: string;
}) {
  return (
    <section className="panel notification-center-panel" aria-labelledby={`${returnTo.replace("/", "") || "work"}-notifications-title`}>
      <div className="panel-heading">
        <div>
          <p className="section-label">Notifications</p>
          <h2 id={`${returnTo.replace("/", "") || "work"}-notifications-title`}>{notifications.unreadCount} unread work notification(s)</h2>
          <p className="muted">{title}</p>
        </div>
        <Bell size={22} />
      </div>
      {notifications.notifications.length > 0 ? (
        <form action={markAllFoundationNotificationsReadAction} className="notification-clear-form">
          <input name="returnTo" type="hidden" value={returnTo} />
          <button className="button-secondary compact" type="submit">
            Mark all read
          </button>
        </form>
      ) : null}
      <div className="notification-list">
        {notifications.notifications.length > 0 ? (
          notifications.notifications.slice(0, 8).map((notification) => {
            const isKnowledge = isKnowledgeNotificationType(notification.notificationType);
            return (
              <article
                className={notification.readAt ? "notification-row" : "notification-row notification-unread"}
                key={notification.id}
              >
                <div>
                  <strong>{notification.title}</strong>
                  <span className="notification-type-label">{notification.label}</span>
                  <span>{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : "Pending timestamp"}</span>
                </div>
                <p>{notification.body}</p>
                <div className="notification-actions">
                  {isKnowledge ? (
                    <Link className="text-link" href="/admin/ai-knowledge">
                      Review AI Knowledge
                    </Link>
                  ) : notification.taskId ? (
                    <Link className="text-link" href="/my-work">
                      Open task queue
                    </Link>
                  ) : null}
                  <form action={updateFoundationNotificationReadStateAction}>
                    <input name="notificationId" type="hidden" value={notification.id} />
                    <input name="read" type="hidden" value={notification.readAt ? "false" : "true"} />
                    <input name="returnTo" type="hidden" value={returnTo} />
                    <button className="text-button" type="submit">
                      {notification.readAt ? "Mark unread" : "Mark read"}
                    </button>
                  </form>
                </div>
              </article>
            );
          })
        ) : (
          <p className="muted">No task notifications have been created yet.</p>
        )}
      </div>
    </section>
  );
}
