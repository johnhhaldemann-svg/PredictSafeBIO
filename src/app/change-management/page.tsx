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
        <div className="plan-grid" aria-label="Change management modules">
          <Link href="/change-plan" className="plan-card">
            <div style={{ fontSize: 20, marginBottom: 6 }}>📋</div>
            <strong>Change Plan</strong>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Strategic improvement roadmap — track planned changes, prioritise by impact, monitor progress.
            </p>
          </Link>
          <Link href="/operate/management-of-change" className="plan-card">
            <div style={{ fontSize: 20, marginBottom: 6 }}>🔄</div>
            <strong>Management of Change</strong>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Operational change control — materials, processes, equipment. Auto-routes to reviewers.
            </p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
