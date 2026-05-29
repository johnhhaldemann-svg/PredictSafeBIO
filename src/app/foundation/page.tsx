import Link from "next/link";
import {
  AlertTriangle,
  BookOpenCheck,
  BrainCircuit,
  FileSearch,
  Gauge,
  GitBranch,
  Network,
  ShieldCheck
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FoundationReviewActionsPanel } from "@/components/FoundationReviewActionsPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import {
  getAuditReadinessConsoleSummary,
  getFoundationAdminAccessSummary,
  getFoundationReviewActionsSummary,
  getFoundationSourceDrilldownSummary,
  getIntelligenceFoundationSummary
} from "@/lib/supabase/data";
import { FoundationWorkflowClient } from "./FoundationWorkflowClient";

const sourceDrilldownIds: Record<string, string> = {
  evidence_map: "evidence-drilldown",
  biotype_selection: "biotype-drilldown",
  incident: "incident-drilldown",
  equipment: "equipment-drilldown",
  training_assignment: "training-drilldown"
};

export default async function FoundationPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const [summary, adminAccess, auditConsole, reviewActions, sourceDrilldowns] = await Promise.all([
    getIntelligenceFoundationSummary(),
    getFoundationAdminAccessSummary(),
    getAuditReadinessConsoleSummary(),
    getFoundationReviewActionsSummary(),
    getFoundationSourceDrilldownSummary()
  ]);
  const assessment = assessBioRisk(summary.latestAssessmentInput);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Compliance + System Reliance</p>
          <h1>Compliance Map & AI Guardrails</h1>
        </header>

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Common Utilities Across All Categories</p>
            <h2>{summary.companyName}</h2>
            <p className="muted">
              Company profile intelligence, BioType branching, evidence tracking, change impact, and audit readiness feed deterministic AI context.
            </p>
          </div>
          <Link className="button-secondary" href="#foundation-workflows">
            {adminAccess.isOwner ? "Review platform controls" : "View owner controls"}
          </Link>
        </section>

        <section className={`panel access-banner ${adminAccess.isOwner ? "access-enabled" : "access-readonly"}`}>
          <strong>{adminAccess.isOwner ? "Owner controls enabled" : "Read-only Foundation mode"}</strong>
          <span>{adminAccess.message}</span>
        </section>

        {params.message ? <p className="form-message">{params.message}</p> : null}

        <section className="summary-strip" aria-label="Foundation counts">
          {summary.counts.map((count) => (
            <span key={count.label}>
              {count.label}: {count.value}
            </span>
          ))}
        </section>

        <div id="foundation-workflows">
          <FoundationWorkflowClient canManage={adminAccess.isOwner} summary={summary} />
        </div>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Common Utilities</p>
                <h2>13 shared platform components</h2>
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
                <p className="section-label">BioType Branching Engine</p>
                <h2>Primary and secondary BioTypes</h2>
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
                <p className="section-label">Company Profile Intelligence</p>
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
                <p className="section-label">HSE Management Systems</p>
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
                <p className="section-label">Regulatory Mapping</p>
                <h2>Required obligations and controls</h2>
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

          <div className="panel" id="evidence-map">
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
                <p className="section-label">Change Impact Management</p>
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

          <div className="panel" id="audit-readiness-console">
            <div className="panel-heading">
              <div>
                <p className="section-label">Audit Readiness</p>
                <h2>Compliance operating console</h2>
              </div>
              <Gauge size={22} />
            </div>
            <div className="score-wrap">
              <span className="score">{auditConsole.latestScore}</span>
              <div>
                <p className="score-label">Readiness score</p>
                <p className="muted">
                  Documents {summary.readiness.documentsScore} / Training {summary.readiness.trainingScore} / Evidence{" "}
                  {summary.readiness.evidenceScore} / Trend {auditConsole.trend.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="score-wrap compact-score">
              <span className="score">{assessment.score}</span>
              <div>
                <p className="score-label">{assessment.level} BioRisk</p>
                <p className="muted">Confidence: {assessment.confidence}</p>
              </div>
              <StatusBadge level={assessment.level} />
            </div>
            <div className="draft-banner">
              <AlertTriangle size={18} />
              {auditConsole.humanReviewStatus}
            </div>
            <div className="readiness-console-grid">
              <div>
                <h3>Unresolved gaps</h3>
                <ul>
                  {auditConsole.unresolvedGaps.slice(0, 5).map((gap) => (
                    <li key={`${gap.label}-${gap.status}`}>
                      <Link href={gap.sourceHref}>{gap.label}</Link>
                      <span>{gap.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Recent scores</h3>
                <ul>
                  {auditConsole.recentScores.length > 0 ? (
                    auditConsole.recentScores.map((score) => (
                      <li key={score.id}>
                        <strong>{score.overallScore}</strong>
                        <span>{score.generatedAt ? new Date(score.generatedAt).toLocaleString() : "draft"}</span>
                      </li>
                    ))
                  ) : (
                    <li>No live readiness scores yet.</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="action-list compact-list">
              <h3>Generated review actions</h3>
              {auditConsole.generatedActions.length > 0 ? (
                auditConsole.generatedActions.map((action) => (
                  <article className="action-row" key={`${action.id}-${action.sourceModule}`}>
                    <div>
                      <strong>{action.title}</strong>
                      <span>
                        {action.priority} / {action.status}
                      </span>
                    </div>
                    <p>
                      <Link href={action.sourceHref}>{action.sourceLabel}</Link>
                      {action.reason ? ` - ${action.reason}` : ""}
                    </p>
                  </article>
                ))
              ) : (
                <p className="muted">No generated Foundation review actions yet.</p>
              )}
            </div>
            <div className="action-list compact-list">
              <h3>Notes history</h3>
              {auditConsole.notes.length > 0 ? (
                auditConsole.notes.map((note) => (
                  <article className="action-row" key={note.id}>
                    <div>
                      <strong>{note.noteType}</strong>
                      <span>{note.createdAt ? new Date(note.createdAt).toLocaleString() : "draft"}</span>
                    </div>
                    <p>{note.note}</p>
                  </article>
                ))
              ) : (
                <p className="muted">No audit readiness notes yet.</p>
              )}
            </div>
            <div className="guardrail-box">
              <ShieldCheck size={18} />
              <span>{summary.guardrailText}</span>
            </div>
            <Link className="button-secondary" href="/workbench">
              Open compliance context in BioRisk Scoring
            </Link>
          </div>
        </section>

        <FoundationReviewActionsPanel actions={reviewActions.slice(0, 8)} canManage={adminAccess.isOwner} />

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Compliance source drilldowns</p>
              <h2>Traceable source detail</h2>
            </div>
            <FileSearch size={22} />
          </div>
          <div className="source-drilldown-grid">
            {sourceDrilldowns.groups.map((group) => (
              <article className="source-drilldown-card" id={sourceDrilldownIds[group.key] ?? `${group.key}-drilldown`} key={group.key}>
                <div>
                  <h3>{group.title}</h3>
                  <span>{group.items.length} source(s)</span>
                </div>
                <p>{group.description}</p>
                <div className="action-list compact-list">
                  {group.items.length > 0 ? (
                    group.items.slice(0, 4).map((item) => (
                      <div className="source-detail-row" key={`${group.key}-${item.id}`}>
                        <strong>{item.label}</strong>
                        <span>
                          {item.status} / {item.ownerRole}
                        </span>
                        <p>
                          {item.detail} Action: {item.recommendedAction}
                        </p>
                        <small>
                          {item.sourceModule}
                          {item.sourceRecordId ? ` / ${item.sourceRecordId}` : ""}
                        </small>
                      </div>
                    ))
                  ) : (
                    <p className="muted">No active source gaps in this group.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">AI Guardrails</p>
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
