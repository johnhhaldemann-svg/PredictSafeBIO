import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowRight, FileText, Phone } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: "Emergency Response – PredictSafeBIO" };

const ERP_TYPES = [
  { label: "Chemical Spill Response",     desc: "Spill containment, PPE donning, decontamination, and notification" },
  { label: "Biological Material Release", desc: "BSL-specific containment, disinfection, exposure prophylaxis" },
  { label: "Fire & Evacuation",           desc: "Alarm response, evacuation routes, assembly points, sweep procedure" },
  { label: "Medical Emergency",           desc: "First response, 911 routing, AED location, exposure care" },
  { label: "Power Failure",               desc: "Sample protection, equipment safe-state, cold-chain continuity" },
  { label: "Severe Weather",              desc: "Shelter-in-place, cryogen and compressed gas checks, recall list" },
];

export default function EmergencyResponsePage() {
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Plan · Emergency Response</p>
          <h1>Emergency Response Plans</h1>
          <p className="muted">
            Documented, drilled, and readily accessible response plans for every foreseeable
            emergency in your facility. Required under OSHA 29 CFR 1910.38 and NFPA 45.
          </p>
        </header>

        {/* Module status */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderLeft: "4px solid var(--brand)",
          borderRadius: "10px",
          padding: "20px 24px",
          maxWidth: "680px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <ShieldCheck size={18} style={{ color: "var(--brand)" }} />
            <span style={{ fontWeight: 700 }}>Module in Development</span>
          </div>
          <p style={{ fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "16px" }}>
            The ERP builder — step-by-step plan authoring, drill scheduling, and real-time quick-reference
            cards — is on the roadmap. In the meantime, store your current emergency response SOPs in
            the Documents module and tag them as emergency plans.
          </p>
          <Link
            href="/documents"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              fontSize: ".83rem", fontWeight: 600, color: "var(--brand)", textDecoration: "none"
            }}
          >
            Open Documents <ArrowRight size={13} />
          </Link>
        </div>

        {/* Plan types */}
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>
            Required Plans — Biotech / Pharma Facility
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", maxWidth: "760px" }}>
            {ERP_TYPES.map((t) => (
              <div
                key={t.label}
                style={{
                  padding: "12px 16px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: ".85rem", marginBottom: "4px" }}>{t.label}</div>
                <div style={{ fontSize: ".78rem", color: "var(--muted)", lineHeight: 1.5 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Regulatory note */}
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "8px",
          padding: "14px 18px",
          maxWidth: "680px",
          fontSize: ".83rem",
          color: "#14532d",
          lineHeight: 1.6,
        }}>
          <strong>📋 OSHA 1910.38 requirement:</strong> Written emergency action plans are required
          for facilities with 10+ employees. Plans must be reviewed when facility layout changes,
          after any emergency event, or when processes that create new hazards are added.
        </div>
      </div>
    </AppShell>
  );
}
