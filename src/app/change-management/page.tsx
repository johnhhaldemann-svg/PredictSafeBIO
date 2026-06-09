import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Change Management – PredictSafeBIO" };

export default function ChangeManagementPage() {
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Plan · Change Management</p>
            <h1>Change Management</h1>
            <p className="muted">
              Manage both your improvement roadmap and operational change control from one place.
              Use the Change Plan for strategic improvements; use Management of Change when operational
              processes, materials, or equipment are being modified and controls must be revalidated.
            </p>
          </div>
        </header>

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
