import type { Metadata } from "next";
import Link from "next/link";
import { GitBranch, ArrowRight, ClipboardList, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Change Management – PredictSafeBIO" };

export default function ChangeManagementPage() {
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Plan · Change Management</p>
          <h1>Change Management</h1>
          <p className="muted">
            Manage both your improvement roadmap and operational change control from one place.
            Use the Change Plan for strategic improvements; use Management of Change when operational
            processes, materials, or equipment are being modified and controls must be revalidated.
          </p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "800px" }}>
          <Link
            href="/change-plan"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              textDecoration: "none",
              color: "inherit",
              transition: "box-shadow .15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ClipboardList size={20} style={{ color: "var(--brand)" }} />
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>Change Plan</span>
            </div>
            <p style={{ fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.5 }}>
              Strategic improvement roadmap — track planned changes to programs, processes, and
              compliance gaps. Prioritise by impact and monitor progress to completion.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: ".82rem", color: "var(--brand)", fontWeight: 600, marginTop: "auto" }}>
              Open Change Plan <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/operate/management-of-change"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              textDecoration: "none",
              color: "inherit",
              transition: "box-shadow .15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <RefreshCw size={20} style={{ color: "var(--brand)" }} />
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>Management of Change</span>
            </div>
            <p style={{ fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.5 }}>
              Operational change control — when materials, processes, equipment, or scale change,
              controls must be revalidated. Auto-routes to reviewers based on affected programs.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: ".82rem", color: "var(--brand)", fontWeight: 600, marginTop: "auto" }}>
              Open MOC <ArrowRight size={14} />
            </div>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
