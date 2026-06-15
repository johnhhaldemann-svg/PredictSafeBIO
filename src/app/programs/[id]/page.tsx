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
import { manufacturingProgramNotes } from "@/lib/programs/manufacturing-notes";
import { getAuthSummary } from "@/lib/supabase/account-service";
import { resolvePack } from "@/lib/foundation/vertical-registry";

type Props = { params: Promise<{ id: string }> };

export default async function ProgramToolPage({ params }: Props) {
  const { id } = await params;
  const program = getProgramById(id);
  if (!program) notFound();

  const freq = frequencyBadge[program.frequency];
  const pack = resolvePack((await getAuthSummary()).vertical);
  // Bio orgs always have a note; MFG orgs use the manufacturing note when authored,
  // otherwise the section falls back to a neutral placeholder below.
  const verticalNote = pack.key === "biotech_pharma" ? program.biotechNote : manufacturingProgramNotes[program.id];

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
          <div className="page-header-left">
            <p className="section-label">Operate · {program.groupLabel}</p>
            <h1>
              {program.title}
              {program.subtitle ? <em className="muted"> — {program.subtitle}</em> : null}
            </h1>
            <p className="muted">{program.overview}</p>
          </div>
          <Link className="button-secondary" href="/programs">← All Programs</Link>
        </header>

        {/* Key metadata strip */}
        <section className="summary-strip" aria-label="Program details">
          <span>Regulation: <strong>{program.regulation}</strong></span>
          <span>Frequency: <strong className={freq.className}>{freq.label}</strong></span>
          <span>Owner: <strong>{program.owner}</strong></span>
        </section>

        {/* Quick actions */}
        <div className="plan-grid" aria-label="Quick actions">
          <Link href={program.inspectionHref} className="plan-card plan-card--active">
            <div className="plan-card-icon">📋</div>
            <div className="plan-card-name">Log Inspection</div>
            <div className="plan-card-meta">Record completed inspection or audit</div>
            <span className="badge badge--blue">Schedule / Log →</span>
          </Link>
          {program.relatedHref ? (
            <Link href={program.relatedHref} className="plan-card">
              <div className="plan-card-icon">⚡</div>
              <div className="plan-card-name">Platform Module</div>
              <div className="plan-card-meta">Dedicated tool in {pack.brandLabel}</div>
              <span className="badge badge--green">{program.relatedLabel ?? "Open Module"} →</span>
            </Link>
          ) : null}
          <Link href="/inspections" className="plan-card">
            <div className="plan-card-icon">📊</div>
            <div className="plan-card-name">Inspections Log</div>
            <div className="plan-card-meta">All past inspections &amp; findings</div>
            <span className="badge badge--blue">View →</span>
          </Link>
        </div>

        {/* Vertical-specific note */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">{pack.contextLabel}</p>
              <h2>{pack.contextHeading}</h2>
            </div>
            <BookOpen size={22} />
          </div>
          {verticalNote ? (
            <p>{verticalNote}</p>
          ) : (
            <p className="muted">
              Vertical-specific guidance for this program is being finalized. Refer to the primary
              regulation and the compliance requirements below.
            </p>
          )}
          <div className="summary-strip">
            <span>Primary regulation: <strong>{program.regulation}</strong></span>
          </div>
          {program.additionalRegs && program.additionalRegs.length > 0 ? (
            <div>
              <p className="section-label">Also applicable</p>
              <ul className="additional-regs-list">
                {program.additionalRegs.map((r) => (
                  <li key={r}>{r}</li>
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
              <article className="action-row" key={i}>
                <CheckCircle2 size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
                <p>{req}</p>
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
                <span className="checklist-box" aria-label="Checklist checkbox" />
                <div>
                  <strong>{item.label}</strong>
                  {item.detail ? <p className="muted">{item.detail}</p> : null}
                </div>
              </article>
            ))}
          </div>
          <div className="command-center-link-strip">
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
