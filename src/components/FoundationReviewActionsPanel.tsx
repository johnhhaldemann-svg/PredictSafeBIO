import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { updateFoundationReviewTaskStatusAction } from "@/app/foundation/actions";
import type { FoundationReviewActionSummary } from "@/lib/supabase/data";

export function FoundationReviewActionsPanel({
  actions,
  canManage = false,
  emptyMessage = "No open action-planning items have been generated yet.",
  title = "Source-traced follow-through"
}: {
  actions: FoundationReviewActionSummary[];
  canManage?: boolean;
  emptyMessage?: string;
  title?: string;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Action Planning</p>
          <h2>{title}</h2>
        </div>
        <ClipboardList size={22} />
      </div>
      <div className="action-list">
        {actions.length > 0 ? (
          actions.map((action) => (
            <article className="action-row foundation-action-row" key={`${action.id}-${action.sourceModule}`}>
              <div>
                <strong>{action.title}</strong>
                <span>
                  {action.priority} / {action.status}
                </span>
              </div>
              <p>
                Source: <Link href={action.sourceHref}>{action.sourceLabel}</Link>
                {action.dueDate ? ` / Due ${action.dueDate}` : ""}
                {action.reason ? ` / ${action.reason}` : ""}
              </p>
              {canManage && action.taskId ? (
                <form action={updateFoundationReviewTaskStatusAction} className="task-status-form">
                  <input name="taskId" type="hidden" value={action.taskId} />
                  <select name="status" defaultValue={action.status === "open" ? "in_progress" : action.status}>
                    <option value="in_progress">In progress</option>
                    <option value="complete">Complete</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <button className="button-secondary compact" type="submit">
                    Update task
                  </button>
                </form>
              ) : null}
            </article>
          ))
        ) : (
          <p className="muted">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
