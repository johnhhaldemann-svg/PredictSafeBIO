export const dynamic = "force-dynamic";

/**
 * /admin/deadlines — manage the cross-tenant regulatory deadline calendar.
 *
 * Add, edit, and remove platform-wide regulatory deadlines that surface on the
 * Command Center. Gated to platform staff / superadmin. All rows created here
 * are platform-wide (organization_id = NULL / "All Sites").
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { PlatformConfigError } from "@/components/PlatformConfigError";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import { listAllRegulatoryDeadlines } from "@/lib/supabase/platform-service";
import { createDeadlineAction, updateDeadlineAction, deleteDeadlineAction } from "./actions";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "due_soon", label: "Due soon" },
  { value: "overdue", label: "Overdue" },
  { value: "complete", label: "Complete" },
];

function formatDue(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label ?? value;
}

type Props = {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
};

export default async function DeadlinesPage({ searchParams }: Props) {
  const params = await searchParams;

  // Gate (same direct role check as /admin/organizations).
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin" && profile?.role !== "platform_staff") redirect("/workbench");

  if (!isSupabaseServiceConfigured()) return <PlatformConfigError feature="Regulatory Deadlines" />;

  const deadlines = await listAllRegulatoryDeadlines();
  const editing = params.edit ? deadlines.find((d) => d.id === params.edit) ?? null : null;

  return (
    <AppShell>
      <div className="page-stack">
        <div className="psb-topbar" style={{ marginBottom: 8 }}>
          <div>
            <h1 className="psb-h1">
              Regulatory <span>Deadlines</span>
            </h1>
            <div className="psb-crumb">
              Platform-wide compliance calendar · shown on the Command Center
            </div>
          </div>
          <Link href="/admin/dashboard" className="button-secondary compact">
            ← Command Center
          </Link>
        </div>

        {params.success && (
          <div className="psb-alert" style={{ borderLeftColor: "var(--green)", background: "rgba(74,222,128,.08)", borderColor: "rgba(74,222,128,.4)" }}>
            <span className="tag" style={{ color: "var(--green)" }}>✓</span>
            <span>{params.success}</span>
          </div>
        )}
        {params.error && (
          <div className="psb-alert" role="alert">
            <span className="tag">⚠ Error:</span>
            <span>{params.error}</span>
          </div>
        )}

        {/* Add / Edit form */}
        <div className="psb-panel">
          <div className="psb-panel-h">
            <h2>{editing ? "Edit deadline" : "Add a deadline"}</h2>
            {editing && (
              <Link href="/admin/deadlines">Cancel edit ✕</Link>
            )}
          </div>

          <form action={editing ? updateDeadlineAction : createDeadlineAction} className="form-grid" style={{ gap: "0.75rem" }}>
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <label style={{ gridColumn: "1 / -1" }}>
              Title
              <input
                name="title"
                required
                placeholder="e.g. EPA TRI Reporting (Form R)"
                defaultValue={editing?.title ?? ""}
              />
            </label>

            <label>
              Regulation reference
              <input
                name="regulation_ref"
                placeholder="e.g. EPCRA §313"
                defaultValue={editing?.regulationRef ?? ""}
              />
            </label>

            <label>
              Site / scope
              <input
                name="site_label"
                placeholder="All Sites"
                defaultValue={editing?.siteLabel ?? "All Sites"}
              />
            </label>

            <label>
              Due date
              <input name="due_date" type="date" required defaultValue={editing?.dueDate ?? ""} />
            </label>

            <label>
              Status
              <select name="status" defaultValue={editing?.status ?? "upcoming"}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.6rem" }}>
              <button className="button-primary" type="submit">
                {editing ? "Save changes" : "Add deadline"}
              </button>
            </div>
          </form>
        </div>

        {/* Existing deadlines */}
        <div className="psb-panel">
          <div className="psb-panel-h">
            <h2>All deadlines</h2>
            <span className="muted" style={{ fontSize: 12 }}>{deadlines.length} total</span>
          </div>

          {deadlines.length === 0 ? (
            <p className="muted">No deadlines yet. Add your first one above.</p>
          ) : (
            <table className="psb-table">
              <thead>
                <tr>
                  <th>Due</th>
                  <th>Title</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deadlines.map((d) => (
                  <tr key={d.id}>
                    <td className="psb-mono" style={{ whiteSpace: "nowrap" }}>{formatDue(d.dueDate)}</td>
                    <td>
                      <div className="psb-site-name">{d.title}</div>
                      {d.regulationRef && <div className="psb-site-meta psb-mono">{d.regulationRef}</div>}
                    </td>
                    <td>{d.siteLabel}</td>
                    <td>{statusLabel(d.status)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link href={`/admin/deadlines?edit=${d.id}`} className="button-secondary compact" style={{ marginRight: 8 }}>
                        Edit
                      </Link>
                      <form action={deleteDeadlineAction} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className="button-secondary compact" type="submit" style={{ color: "var(--red)", borderColor: "var(--red)" }}>
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
