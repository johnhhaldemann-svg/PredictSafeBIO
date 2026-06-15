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
        <section className="kpi-grid" aria-label="Change management summary">
          <div className={`kpi-card ${highPriority > 0 ? "kpi-card--red" : "kpi-card--blue"}`}>
            <div className="kpi-label">High-Priority Items</div>
            <div className="kpi-value">{highPriority}</div>
            <div className="kpi-sub">{highPriority > 0 ? "Flagged high priority" : `${plannedItems} planned in roadmap`}</div>
          </div>
          <div className={`kpi-card ${mocInReview > 0 ? "kpi-card--amber" : "kpi-card--green"}`}>
            <div className="kpi-label">MOC Awaiting Review</div>
            <div className="kpi-value">{mocInReview}</div>
            <div className="kpi-sub">{mocInReview > 0 ? "Routed to reviewers" : "None pending"}</div>
          </div>
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-label">Total MOC Records</div>
            <div className="kpi-value">{mocRecords.length}</div>
            <div className="kpi-sub">Change records on file</div>
          </div>
          <div className="kpi-card kpi-card--purple">
            <div className="kpi-label">Active Items</div>
            <div className="kpi-value">{activeItems.length}</div>
            <div className="kpi-sub">In-progress changes</div>
          </div>
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
