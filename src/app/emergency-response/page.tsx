import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
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
          <div className="page-header-left">
            <p className="section-label">Plan · Emergency Response</p>
            <h1>Emergency Response Plans</h1>
            <p className="muted">
              Documented, drilled, and readily accessible response plans for every foreseeable
              emergency in your facility. Required under OSHA 29 CFR 1910.38 and NFPA 45.
            </p>
          </div>
        </header>

        <div className="ai-context-bar ai-context-bar--warning">
          <ShieldCheck size={15} />
          <span>
            <strong>Module in Development.</strong>{" "}
            The ERP builder — step-by-step plan authoring, drill scheduling, and real-time quick-reference
            cards — is on the roadmap. Store current emergency response SOPs in the Documents module
            and tag them as emergency plans.
          </span>
          <Link className="ai-fill-btn ai-fill-btn--warning" href="/documents">Open Documents</Link>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Required plans</p>
              <h2>Biotech / Pharma Facility</h2>
            </div>
          </div>
          <div className="command-card-grid">
            {ERP_TYPES.map((t) => (
              <article key={t.label} className="command-card">
                <div><strong>{t.label}</strong></div>
                <em>{t.desc}</em>
              </article>
            ))}
          </div>
        </section>

        <div className="ai-context-bar ai-context-bar--success">
          <ShieldCheck size={15} />
          <span>
            <strong>OSHA 1910.38 requirement:</strong> Written emergency action plans are required
            for facilities with 10+ employees. Plans must be reviewed when facility layout changes,
            after any emergency event, or when processes that create new hazards are added.
          </span>
        </div>
      </div>
    </AppShell>
  );
}
