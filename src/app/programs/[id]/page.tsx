export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  ShieldCheck,
  Zap
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getProgramById, frequencyBadge } from "@/lib/programs/program-data";

type Props = { params: Promise<{ id: string }> };

export default async function ProgramToolPage({ params }: Props) {
  const { id } = await params;
  const program = getProgramById(id);
  if (!program) notFound();

  const freq = frequencyBadge[program.frequency];

  return (
    <AppShell>
      <div className="page-stack">

        {/* Breadcrumb */}
        <nav className="breadcrumb-override" aria-label="Breadcrumb">
          <Link href="/programs">Safety Programs</Link>
          <ChevronRight size={14} />
          <span>{program.title}</span>
        </nav>

        {/* Header */}
        <header className="page-header">
          <p className="section-label">{program.groupLabel}</p>
          <h1>
            {program.title}
            {program.subtitle ? <small style={{ fontWeight: 400, fontSize: "0.65em", marginLeft: "0.5rem", color: "var(--text-secondary)" }}>— {program.subtitle}</small> : null}
          </h1>
          <p className="muted">{program.overview}</p>
        </header>

        {/* Key metadata strip */}
        <section className="summary-strip" aria-label="Program details">
          <span>Regulation: <strong>{program.regulation}</strong></span>
          <span>Frequency: <strong className={freq.className}>{freq.label}</strong></span>
          <span>Owner: <strong>{program.owner}</strong></span>
        </section>

        {/* Quick actions */}
        <section className="command-card-grid" aria-label="Quick actions">
          <article className="command-card platform-blue">
            <div><span><ClipboardList size={16} /></span><strong>Log Inspection</strong></div>
            <em>Record a completed inspection or audit for this program.</em>
            <Link className="button-primary compact" href={program.inspectionHref}>
              Schedule / Log
            </Link>
          </article>
          {program.relatedHref ? (
            <article className="command-card platform-green">
              <div><span><Zap size={16} /></span><strong>Platform Module</strong></div>
              <em>This program has a dedicated tool in PredictSafeBIO.</em>
              <Link className="button-primary compact" href={program.relatedHref}>
                {program.relatedLabel ?? "Open Module"}
              </Link>
            </article>
          ) : null}
          <article className="command-card platform-blue">
            <div><span><FileText size={16} /></span><strong>Inspections Log</strong></div>
            <em>Review all past inspections and open findings.</em>
            <Link className="button-secondary compact" href="/inspections">
              View Inspections
            </Link>
          </article>
        </section>

        {/* Biotech-specific note */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Biotech Context</p>
              <h2>Program guidance for life science facilities</h2>
            </div>
            <BookOpen size={22} />
          </div>
          <p>{program.biotechNote}</p>
          <div className="summary-strip" style={{ marginTop: "1rem" }}>
            <span>Primary regulation: <strong>{program.regulation}</strong></span>
          </div>
          {program.additionalRegs && program.additionalRegs.length > 0 ? (
            <div style={{ marginTop: "0.75rem" }}>
              <p className="section-label">Also applicable</p>
              <ul style={{ margin: "0.25rem 0 0 1rem" }}>
                {program.additionalRegs.map((r) => (
                  <li key={r} style={{ fontSize: "0.85em", color: "var(--text-secondary)" }}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Requirements */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Compliance Requirements</p>
              <h2>What this program must include</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="action-list">
            {program.requirements.map((req, i) => (
              <article className="action-row" key={i} style={{ padding: "0.6rem 0" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                  <CheckCircle2 size={16} style={{ color: "var(--color-green)", marginTop: "2px", flexShrink: 0 }} />
                  <p style={{ margin: 0 }}>{req}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Compliance Checklist */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Inspection Checklist</p>
              <h2>{program.checklist.length}-point compliance checklist</h2>
              <p className="muted">Use this checklist during inspections. Log findings via the Inspections module.</p>
            </div>
            <ClipboardList size={22} />
          </div>
          <div className="action-list">
            {program.checklist.map((item) => (
              <article className="action-row compact-list" key={item.id}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <span style={{
                    display: "inline-block",
                    width: "18px",
                    height: "18px",
                    border: "2px solid var(--border-color)",
                    borderRadius: "4px",
                    flexShrink: 0,
                    marginTop: "2px"
                  }} aria-label="Checklist checkbox" />
                  <div>
                    <strong style={{ fontSize: "0.9em" }}>{item.label}</strong>
                    {item.detail ? <p className="muted" style={{ margin: "0.15rem 0 0" }}>{item.detail}</p> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link className="button-primary" href={program.inspectionHref}>
              <ClipboardList size={15} />
              Log inspection for this program
            </Link>
            <Link className="button-secondary" href="/inspections">
              View all inspections
            </Link>
          </div>
        </section>

        {/* Guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Compliance decisions require qualified personnel</h2>
            <p className="muted">
              This checklist and program guidance are informational tools to support qualified EHS professionals. Regulatory interpretations, compliance determinations, and corrective action decisions are the sole responsibility of trained, credentialed safety personnel. All records are <strong>Draft — Human Review Required</strong> until closed by an authorized reviewer.
            </p>
          </div>
          <AlertTriangle size={24} />
        </section>

      </div>
    </AppShell>
  );
}

export async function generateStaticParams() {
  const { programData } = await import("@/lib/programs/program-data");
  return programData.map((p) => ({ id: p.id }));
}
