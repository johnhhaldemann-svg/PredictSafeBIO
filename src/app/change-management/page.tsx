export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, GitBranch, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { listChangePlanItems } from "@/lib/supabase/data";
import { listMocRecords } from "@/lib/supabase/moc-service";

export const metadata: Metadata = { title: "Change Management – PredictSafe" };

export default async function ChangeManagementPage() {
  const [plan, mocRecords] = await Promise.all([
    listChangePlanItems().catch(() => ({ items: [], canManage: false, isFallback: true, message: "", persisted: false })),
    listMocRecords().catch(() => []),
  ]);

  const activeItems    = plan.items.filter((r) => r.status !== "Archived");
  const highPriority   = activeItems.filter((r) => r.priority === "High").length;
  const plannedItems   = activeItems.filter((r) => r.status === "Planned").length;
  const mocInReview    = mocRecords.filter((r) => r.status === "in_review").length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Plan · Change Management</p>
            <h1>Change Management</h1>
            <p className="muted">
              Use the Change Plan for strategic improvements; use Management of Change when processes,
              materials, or equipment change and controls must be revalidated.
            </p>
          </div>
        </header>

        {/* KPI strip */}
        <section className="command-card-grid" aria-label="Change management summary">
          <article className={`command-card ${highPriority > 0 ? "platform-red" : "platform-blue"}`}>
            <div><span><ClipboardList size={16} /></span><strong>High-priority roadmap items</strong></div>
            <small>{highPriority}</small>
            <em>
              {highPriority > 0
                ? `${highPriority} item${highPriority !== 1 ? "s" : ""} flagged High priority.`
                : activeItems.length > 0
                ? `${plannedItems} planned item${plannedItems !== 1 ? "s" : ""} in roadmap.`
                : "No active roadmap items yet."}
            </em>
          </article>
          <article className={`command-card ${mocInReview > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><GitBranch size={16} /></span><strong>MOC awaiting review</strong></div>
            <small>{mocInReview}</small>
            <em>
              {mocInReview > 0
                ? `${mocInReview} change${mocInReview !== 1 ? "s" : ""} routed to reviewers.`
                : "No changes pending review."}
            </em>
          </article>
          <article className="command-card platform-blue">
            <div><span><RefreshCw size={16} /></span><strong>Total MOC records</strong></div>
            <small>{mocRecords.length}</small>
            <em>Change records on file.</em>
          </article>
        </section>

        {/* Module cards */}
        <section className="command-card-grid" aria-label="Change management modules">
          <article className="command-card platform-blue">
            <div><span><ClipboardList size={16} /></span><strong>Change Plan</strong></div>
            <em>
              Strategic improvement roadmap — track planned changes to programs, processes, and
              compliance gaps. Prioritise by impact and monitor progress to completion.
            </em>
            <Link className="button-secondary compact" href="/change-plan">Open Change Plan →</Link>
          </article>
          <article className="command-card platform-blue">
            <div><span><RefreshCw size={16} /></span><strong>Management of Change</strong></div>
            <em>
              Operational change control — when materials, processes, equipment, or scale change,
              controls must be revalidated. Auto-routes to reviewers based on affected programs.
            </em>
            <Link className="button-secondary compact" href="/operate/management-of-change">Open MOC →</Link>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
