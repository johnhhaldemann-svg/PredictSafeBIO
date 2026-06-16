export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpenCheck,
  BrainCircuit,
  FileSearch,
  Gauge,
  GitBranch,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FoundationReviewActionsPanel } from "@/components/FoundationReviewActionsPanel";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import {
  getAuditReadinessConsoleSummary,
  getFoundationAdminAccessSummary,
  getFoundationAssigneeOptions,
  getFoundationReviewActionsSummary,
  getIntelligenceFoundationSummary,
} from "@/lib/supabase/data";
import { FoundationWorkflowClient } from "./FoundationWorkflowClient";

export const metadata: Metadata = { title: "Compliance Foundation – PredictSafe" };

function safeSettle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export default async function FoundationPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  const [summary, adminAccess, auditConsole, reviewActions, assignees] = await Promise.all([
    safeSettle(getIntelligenceFoundationSummary(), {
      companyName: "Demo Workspace",
      counts: [],
      coreComponents: [],
      biotypes: [],
      intake: [],
      programs: [],
      methods: [],
      applicability: [],
      evidence: [],
      changes: [],
      readiness: {
        overallScore: 0,
        documentsScore: 0,
        trainingScore: 0,
        capaScore: 0,
        incidentsScore: 0,
        equipmentScore: 0,
        evidenceScore: 0,
        topGaps: [],
      },
      auditReadinessNotes: [],
      aiWorkflow: [],
      humanValidationWorkflow: [],
      guardrailText: "Draft - Human Review Required",
      latestAssessmentInput: {},
    } as Awaited<ReturnType<typeof getIntelligenceFoundationSummary>>),
    safeSettle(getFoundationAdminAccessSummary(), {
      configured: false,
      signedIn: false,
      isOwner: false,
      message: "Could not load access summary.",
    }),
    safeSettle(getAuditReadinessConsoleSummary(), {
      latestScore: 0,
      trend: "not_enough_data" as const,
      recentScores: [],
      unresolvedGaps: [],
      generatedActions: [],
      notes: [],
      humanReviewStatus: "Draft - human review required",
      draftOnly: true,
    }),
    safeSettle(getFoundationReviewActionsSummary(), []),
    safeSettle(getFoundationAssigneeOptions(), []),
  ]);

  const assessment = assessBioRisk(summary.latestAssessmentInput);
  const pendingActions = reviewActions.filter((a) => a.status !== "complete").length;
  const openGaps = auditConsole.unresolvedGaps.length;
  const evidenceTotal = summary.evidence.length;
  const evidenceReady = evidenceTotal > 0
    ? Math.round((summary.evidence.filter((e) => e.auditReady).length / evidenceTotal) * 100)
    : 0;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Assess · Plan</p>
            <h1>Compliance Foundation</h1>
            <p className="muted">
              Source-traced compliance intelligence for {summary.companyName}. BioType branching,
              evidence tracking, and audit readiness in one view.
            </p>
          </div>
          <Link className="button-primary" href="/my-work">Open My Work</Link>
        </header>

        {/* KPI strip */}
        <section className="kpi-strip" aria-label="Compliance summary">
          <div className="kpi-card">
            <div className="kpi-icon"><Gauge size={18} /></div>
            <div className="kpi-body">
              <div className="kpi-val">{auditConsole.latestScore}</div>
              <div className="kpi-label">Readiness Score</div>
              <div className="kpi-trend">{auditConsole.trend.replace(/_/g, " ")}</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><AlertTriangle size={18} /></div>
            <div className="kpi-body">
              <div className="kpi-val">{openGaps}</div>
              <div className="kpi-label">Open Gaps</div>
              <div className="kpi-trend">{openGaps > 0 ? "needs attention" : "none outstanding"}</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><ShieldCheck size={18} /></div>
            <div className="kpi-body">
              <div className="kpi-val">{pendingActions}</div>
              <div className="kpi-label">Tasks Pending</div>
              <div className="kpi-trend">in My Work</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><TrendingUp size={18} /></div>
            <div className="kpi-body">
              <div className="kpi-val">{evidenceReady}<span className="kpi-badge">%</span></div>
              <div className="kpi-label">Evidence Ready</div>
              <div className="kpi-trend">{summary.evidence.filter((e) => e.auditReady).length} of {evidenceTotal} items</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><BrainCircuit size={18} /></div>
            <div className="kpi-body">
              <div className="kpi-val">{assessment.score}</div>
              <div className="kpi-label">BioRisk Score</div>
              <div className="kpi-trend">{assessment.level} · {assessment.confidence}</div>
            </div>
          </div>
        </section>

        {params.message ? <p className="form-message">{params.message}</p> : null}

        {/* Pending tasks callout */}
        {pendingActions > 0 && (
          <section className="panel foundation-workbench-handoff command-center-lane">
            <div>
              <p className="section-label">Generated Actions</p>
              <h2>{pendingActions} task{pendingActions !== 1 ? "s" : ""} waiting in My Work</h2>
              <p className="muted">
                Foundation source gaps and review actions are ready for assignment, due dates, and closure.
              </p>
            </div>
            <Link className="button-primary" href="/my-work">Open My Work</Link>
          </section>
        )}

        {/* Audit readiness console */}
        <section className="panel command-center-lane" id="audit-readiness-console">
          <div className="panel-heading">
            <div>
              <p className="section-label">Audit Readiness</p>
              <h2>Compliance operating console</h2>
            </div>
            <Gauge size={22} />
          </div>
          <div className="readiness-console-grid">
            <div>
              <h3>Unresolved gaps</h3>
              <ul>
                {auditConsole.unresolvedGaps.length > 0 ? (
                  auditConsole.unresolvedGaps.slice(0, 6).map((gap) => (
                    <li key={`${gap.label}-${gap.status}`}>
                      <Link href={gap.sourceHref}>{gap.label}</Link>
                      <span>{gap.status}</span>
                    </li>
                  ))
                ) : (
                  <li className="muted">No unresolved gaps.</li>
                )}
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
          {auditConsole.generatedActions.length > 0 && (
            <div className="action-list compact-list" style={{ marginTop: 16 }}>
              <h3>Generated review actions</h3>
              {auditConsole.generatedActions.map((action) => (
                <article className="action-row" key={`${action.id}-${action.sourceModule}`}>
                  <div>
                    <strong>{action.title}</strong>
                    <span>{action.priority} / {action.status}</span>
                  </div>
                  <p>
                    <Link href={action.sourceHref}>{action.sourceLabel}</Link>
                    {action.reason ? ` - ${action.reason}` : ""}
                  </p>
                </article>
              ))}
            </div>
          )}
          <Link className="button-secondary" href="/workbench" style={{ marginTop: 12 }}>
            Open in Risk Workbench →
          </Link>
        </section>

        {/* Owner edit workflows */}
        {adminAccess.isOwner && (
          <div id="foundation-workflows">
            <FoundationWorkflowClient canManage={adminAccess.isOwner} summary={summary} />
          </div>
        )}

        {/* BioType + Regulatory mapping */}
        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">BioType Branching Engine</p>
                <h2>Active BioTypes</h2>
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
            <div className="guardrail-box">
              <span>
                Company operating context is configured in{" "}
                <Link className="text-link" href="/account/company">Company Settings →</Link>
              </span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Regulatory Mapping</p>
                <h2>Required obligations</h2>
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
        </section>

        {/* Company profile + Evidence + Change + Operate */}
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

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Change Impact</p>
                <h2>Impact events</h2>
              </div>
              <BrainCircuit size={22} />
            </div>
            <div className="action-list">
              {summary.changes.length > 0 ? (
                summary.changes.map((change) => (
                  <article className="action-row" key={`${change.type}-${change.summary}`}>
                    <div>
                      <strong>{change.type}</strong>
                      <span>draft</span>
                    </div>
                    <p>
                      {change.summary} Actions: {change.actions}
                    </p>
                  </article>
                ))
              ) : (
                <p className="muted">No change impact events recorded.</p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Operate</p>
                <h2>Operating library</h2>
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
                      <span>{program.status} / {program.owner}</span>
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
        </section>

        {/* Generated task cards */}
        <FoundationReviewActionsPanel
          actions={reviewActions.slice(0, 8)}
          assignees={assignees}
          canManage={adminAccess.signedIn}
          canEditAssignment={adminAccess.isOwner}
          canEditDueDate={adminAccess.isOwner}
          canEditPriority={adminAccess.isOwner}
          laneLabel="Generated Actions"
          laneDescription="Source-traced task cards for assignment, due dates, and closeout."
          primaryActionHref="/my-work"
          primaryActionLabel="Open My Work"
          returnTo="/foundation"
        />
      </div>
    </AppShell>
  );
}
