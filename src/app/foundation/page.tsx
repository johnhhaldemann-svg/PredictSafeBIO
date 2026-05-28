import Link from "next/link";
import {
  AlertTriangle,
  BookOpenCheck,
  BrainCircuit,
  DatabaseZap,
  FileSearch,
  Gauge,
  GitBranch,
  Network,
  ShieldCheck
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import { getIntelligenceFoundationSummary } from "@/lib/supabase/data";
import { seedIntelligenceFoundationAction } from "./actions";

export default async function FoundationPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const summary = await getIntelligenceFoundationSummary();
  const assessment = assessBioRisk(summary.latestAssessmentInput);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">PredictSafeBIO Intelligence Foundation</p>
          <h1>Core Compliance Components</h1>
        </header>

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Pilot foundation</p>
            <h2>{summary.companyName}</h2>
            <p className="muted">
              Company intake, Programs & Methods, applicability, evidence, change impact, and audit readiness feed deterministic AI context.
            </p>
          </div>
          <form action={seedIntelligenceFoundationAction}>
            <button className="button-primary" type="submit">
              <DatabaseZap size={16} />
              Seed NorthStar
            </button>
          </form>
        </section>

        {params.message ? <p className="form-message">{params.message}</p> : null}

        <section className="summary-strip" aria-label="Foundation counts">
          {summary.counts.map((count) => (
            <span key={count.label}>
              {count.label}: {count.value}
            </span>
          ))}
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Core Compliance Components</p>
                <h2>13 shared foundation components</h2>
              </div>
              <Network size={22} />
            </div>
            <div className="component-grid">
              {summary.coreComponents.map((component) => (
                <article className="profile-row" key={component.name}>
                  <span>{component.name}</span>
                  <strong>{component.purpose}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">BioType Foundation Packages</p>
                <h2>Primary and secondary branches</h2>
              </div>
              <GitBranch size={22} />
            </div>
            <div className="action-list">
              {summary.biotypes.map((biotype) => (
                <article className="action-row" key={biotype.name}>
                  <div>
                    <strong>{biotype.name}</strong>
                    <span>{biotype.role}</span>
                  </div>
                  <p>
                    {biotype.focus} Requirements: {biotype.requirements}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="foundation-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Company Intake Wizard</p>
                <h2>Applicability triggers</h2>
              </div>
              <BookOpenCheck size={22} />
            </div>
            <div className="action-list">
              {summary.intake.slice(0, 6).map((item) => (
                <article className="action-row" key={item.question}>
                  <div>
                    <strong>{item.question}</strong>
                    <span>{item.answer}</span>
                  </div>
                  <p>{item.triggers}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Programs & Methods Library</p>
                <h2>Draft operating library</h2>
              </div>
              <GitBranch size={22} />
            </div>
            <div className="mini-columns">
              <div>
                <h3>Programs</h3>
                <ul>
                  {summary.programs.slice(0, 6).map((program) => (
                    <li key={program.name}>
                      <strong>{program.name}</strong>
                      <span>
                        {program.status} / {program.owner}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Methods</h3>
                <ul>
                  {summary.methods.slice(0, 6).map((method) => (
                    <li key={method.name}>
                      <strong>{method.name}</strong>
                      <span>{method.purpose}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Applicability Engine</p>
                <h2>Required controls</h2>
              </div>
              <FileSearch size={22} />
            </div>
            <div className="action-list">
              {summary.applicability.slice(0, 6).map((rule) => (
                <article className="action-row" key={rule.rule}>
                  <div>
                    <strong>{rule.rule}</strong>
                    <span>{rule.reviewer}</span>
                  </div>
                  <p>{rule.required}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Evidence Map</p>
                <h2>Audit-ready records</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <div className="action-list">
              {summary.evidence.slice(0, 7).map((item) => (
                <article className="action-row" key={item.requirement}>
                  <div>
                    <strong>{item.requirement}</strong>
                    <span>{item.auditReady ? "ready" : "gap"}</span>
                  </div>
                  <p>{item.status}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Change Impact Engine</p>
                <h2>Draft impact events</h2>
              </div>
              <BrainCircuit size={22} />
            </div>
            <div className="action-list">
              {summary.changes.map((change) => (
                <article className="action-row" key={`${change.type}-${change.summary}`}>
                  <div>
                    <strong>{change.type}</strong>
                    <span>draft</span>
                  </div>
                  <p>
                    {change.summary} Actions: {change.actions}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Audit Readiness + AI Engine</p>
                <h2>Deterministic foundation context</h2>
              </div>
              <Gauge size={22} />
            </div>
            <div className="score-wrap">
              <span className="score">{summary.readiness.overallScore}</span>
              <div>
                <p className="score-label">Readiness score</p>
                <p className="muted">
                  Documents {summary.readiness.documentsScore} / Training {summary.readiness.trainingScore} / Evidence{" "}
                  {summary.readiness.evidenceScore}
                </p>
              </div>
            </div>
            <div className="score-wrap compact-score">
              <span className="score">{assessment.score}</span>
              <div>
                <p className="score-label">{assessment.level} AI risk</p>
                <p className="muted">Confidence: {assessment.confidence}</p>
              </div>
              <StatusBadge level={assessment.level} />
            </div>
            <div className="draft-banner">
              <AlertTriangle size={18} />
              Draft - Human Review Required
            </div>
            <ul>
              {summary.readiness.topGaps.slice(0, 5).map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
            <div className="guardrail-box">
              <ShieldCheck size={18} />
              <span>{summary.guardrailText}</span>
            </div>
            <Link className="button-secondary" href="/workbench">
              Open foundation context in Workbench
            </Link>
          </div>
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">AI Workflow Map</p>
                <h2>Deterministic data flow</h2>
              </div>
              <BrainCircuit size={22} />
            </div>
            <div className="workflow-steps">
              {summary.aiWorkflow.map((step) => (
                <span key={step}>{step}</span>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Human Validation Workflow</p>
                <h2>Draft to controlled use</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <div className="workflow-steps">
              {summary.humanValidationWorkflow.map((step) => (
                <span key={step}>{step}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
