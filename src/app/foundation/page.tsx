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
import { CopyVerificationSummaryButton } from "@/components/CopyVerificationSummaryButton";
import { FoundationReviewActionsPanel } from "@/components/FoundationReviewActionsPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import {
  getAuditReadinessConsoleSummary,
  getFoundationAdminAccessSummary,
  getFoundationAssigneeOptions,
  getFoundationReviewActionsSummary,
  getFoundationSourceDrilldownSummary,
  getFoundationVerificationStatusSummary,
  getIntelligenceFoundationSummary
} from "@/lib/supabase/data";
import { addFoundationFinalPreviewSignoffAction, createFoundationReviewActionFromSourceAction } from "./actions";
import { FoundationWorkflowClient } from "./FoundationWorkflowClient";

const sourceDrilldownIds: Record<string, string> = {
  evidence_map: "evidence-drilldown",
  biotype_selection: "biotype-drilldown",
  incident: "incident-drilldown",
  equipment: "equipment-drilldown",
  training_assignment: "training-drilldown"
};

function sourceRecordAnchor(sourceModule: string, sourceRecordId?: string) {
  return sourceRecordId ? `source-${sourceModule}-${sourceRecordId}` : undefined;
}

export default async function FoundationPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const [summary, adminAccess, auditConsole, reviewActions, sourceDrilldowns, verificationStatus, assignees] = await Promise.all([
    getIntelligenceFoundationSummary(),
    getFoundationAdminAccessSummary(),
    getAuditReadinessConsoleSummary(),
    getFoundationReviewActionsSummary(),
    getFoundationSourceDrilldownSummary(),
    getFoundationVerificationStatusSummary(),
    getFoundationAssigneeOptions()
  ]);
  const assessment = assessBioRisk(summary.latestAssessmentInput);
  const verificationSummaryText = [
    `PredictSafeBIO Foundation verification summary for ${summary.companyName}`,
    `Promotion gate: ${verificationStatus.productionPromotionAllowed ? "allowed" : "blocked"}`,
    `Gate reason: ${verificationStatus.productionGateReason}`,
    `Checklist: ${verificationStatus.checklist.map((step) => `${step.label}=${step.status}`).join("; ")}`,
    `Latest workflow save: ${verificationStatus.latestWorkflowSave?.eventType ?? "pending"}`,
    `Latest action run: ${verificationStatus.latestReviewActionRun?.summary ?? "pending"}`,
    `Latest audit event: ${verificationStatus.latestAuditEvent?.eventType ?? "pending"}`,
    `Final signoff: ${verificationStatus.latestFinalSignoff?.createdAt ?? "pending"}`,
    `Counts: ${summary.counts.map((count) => `${count.label} ${count.value}`).join(", ")}`,
    `Unresolved gaps: ${auditConsole.unresolvedGaps.map((gap) => `${gap.label} (${gap.status})`).join("; ") || "none listed"}`,
    `Guardrail: ${summary.guardrailText}`
  ].join("\n");

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Compliance + System Reliance</p>
          <h1>Compliance Map & AI Guardrails</h1>
        </header>

        <section className="panel inline-action-panel command-center-lane">
          <div>
            <p className="section-label">Source Intelligence</p>
            <h2>{summary.companyName}</h2>
            <p className="muted">
              Company profile intelligence, BioType branching, evidence tracking, change impact, and audit readiness feed deterministic AI context.
            </p>
          </div>
          <nav className="command-center-link-strip" aria-label="Foundation command center navigation">
            <Link className="button-primary compact" href="/foundation">
              Source Intelligence
            </Link>
            <Link className="button-secondary compact" href="/my-work">
              Open My Work
            </Link>
            <Link className="button-secondary compact" href="/workbench">
              Open Workbench
            </Link>
          </nav>
        </section>

        <section className={`panel access-banner ${adminAccess.isOwner ? "access-enabled" : "access-readonly"}`}>
          <strong>{adminAccess.isOwner ? "Owner controls enabled" : "Read-only Foundation mode"}</strong>
          <span>{adminAccess.message}</span>
        </section>

        {params.message ? <p className="form-message">{params.message}</p> : null}

        <section className="panel foundation-workbench-handoff command-center-lane">
          <div>
            <p className="section-label">Generated Actions</p>
            <h2>{reviewActions.filter((action) => action.status !== "complete").length} task(s) waiting in My Work</h2>
            <p className="muted">Foundation source gaps and review actions are routed to the Workbench operating console for assignment, notes, due dates, and closure review.</p>
          </div>
          <Link className="button-primary" href="/my-work">
            Open My Work
          </Link>
        </section>

        <section className={`panel verification-status-panel ${adminAccess.isOwner ? "access-enabled" : "access-readonly"}`}>
          <div className="panel-heading">
            <div>
              <p className="section-label">Owner verification status</p>
              <h2>Latest live workflow evidence</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          {adminAccess.isOwner ? (
            <>
              <div className="verification-guidance">
                <strong>Run verification mode</strong>
                <span>
                  Save BioTypes, edit one intake answer, update one evidence row, add one audit note, generate an action plan, then update one
                  generated task status.
                </span>
              </div>
              <div className="verification-checklist">
                {verificationStatus.checklist.map((step) => (
                  <article className={step.status === "pass" ? "checklist-pass" : "checklist-pending"} key={step.key}>
                    <strong>{step.label}</strong>
                    <span>{step.status === "pass" ? "Pass" : "Pending"}</span>
                    <small>{step.detail}</small>
                  </article>
                ))}
              </div>
              <div className="verification-status-grid">
                <article>
                  <span>Last workflow save</span>
                  <strong>{verificationStatus.latestWorkflowSave?.summary ?? "No owner workflow save captured yet."}</strong>
                  <small>
                    {verificationStatus.latestWorkflowSave?.eventType ?? "pending"} /{" "}
                    {verificationStatus.latestWorkflowSave?.createdAt
                      ? new Date(verificationStatus.latestWorkflowSave.createdAt).toLocaleString()
                      : "not run"}
                  </small>
                </article>
                <article>
                  <span>Last action run</span>
                  <strong>{verificationStatus.latestReviewActionRun?.summary ?? "Generate Action Plan has not run yet."}</strong>
                  <small>
                    Created {verificationStatus.latestReviewActionRun?.created ?? 0} / Candidates{" "}
                    {verificationStatus.latestReviewActionRun?.candidateCount ?? 0} / Duplicates{" "}
                    {verificationStatus.latestReviewActionRun?.skippedDuplicates.length ?? 0}
                  </small>
                </article>
                <article>
                  <span>Latest audit event</span>
                  <strong>{verificationStatus.latestAuditEvent?.summary ?? "No audit event captured yet."}</strong>
                  <small>
                    {verificationStatus.latestAuditEvent?.eventType ?? "pending"} / Draft-only{" "}
                    {verificationStatus.latestAuditEvent?.draftOnly === false ? "false" : "true"}
                  </small>
                </article>
              </div>
            </>
          ) : (
            <p className="muted">Sign in as an organization owner to run and view live workflow verification status.</p>
          )}
          <div className={`verification-passed-banner ${verificationStatus.allChecklistPassed ? "checklist-pass" : "checklist-pending"}`}>
            <strong>{verificationStatus.allChecklistPassed ? "Verification passed" : "Verification pending"}</strong>
            <span>
              {verificationStatus.allChecklistPassed
                ? "All owner workflow checklist items have supporting audit events."
                : "Complete each owner workflow step to unlock final preview signoff."}
            </span>
          </div>
          {adminAccess.isOwner && verificationStatus.latestReviewActionRun?.skippedDuplicates.length ? (
            <div className="duplicate-skip-panel">
              <h3>Duplicate prevention visibility</h3>
              {verificationStatus.latestReviewActionRun.skippedDuplicates.slice(0, 6).map((duplicate) => (
                <p key={`${duplicate.sourceModule}-${duplicate.sourceRecordId}-${duplicate.title}`}>
                  <strong>{duplicate.title}</strong>
                  <span>
                    {duplicate.reason} / {duplicate.sourceModule}
                    {duplicate.sourceRecordId ? ` / ${duplicate.sourceRecordId}` : ""}
                  </span>
                </p>
              ))}
            </div>
          ) : null}
        </section>

        <section className={`panel production-gate-panel ${verificationStatus.productionPromotionAllowed ? "access-enabled" : "access-readonly"}`}>
          <div className="panel-heading">
            <div>
              <p className="section-label">Production readiness gate</p>
              <h2>{verificationStatus.productionPromotionAllowed ? "Promotion allowed" : "Promotion blocked"}</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <p className="muted">{verificationStatus.productionGateReason}</p>
          {adminAccess.isOwner ? (
            <form action={addFoundationFinalPreviewSignoffAction} className="stacked-form">
              <input name="auditReadinessScoreId" type="hidden" value={summary.readiness.id ?? ""} />
              <label>
                Final preview signoff note
                <textarea
                  name="note"
                  placeholder="Record owner signoff, preview URL reviewed, and any promotion decision context..."
                  rows={3}
                />
              </label>
              <button className="button-secondary" type="submit">
                Add final preview signoff
              </button>
            </form>
          ) : (
            <p className="muted">Owner sign-in is required to add final preview signoff.</p>
          )}
          {verificationStatus.latestFinalSignoff ? (
            <div className="signoff-note">
              <strong>Latest signoff</strong>
              <span>{verificationStatus.latestFinalSignoff.createdAt ? new Date(verificationStatus.latestFinalSignoff.createdAt).toLocaleString() : "draft"}</span>
              <p>{verificationStatus.latestFinalSignoff.note}</p>
            </div>
          ) : null}
        </section>

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

          <div className="panel command-center-lane" id="audit-readiness-console">
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

        <FoundationReviewActionsPanel
          actions={reviewActions.slice(0, 8)}
          assignees={assignees}
          canManage={adminAccess.signedIn}
          canEditAssignment={adminAccess.isOwner}
          canEditDueDate={adminAccess.isOwner}
          canEditPriority={adminAccess.isOwner}
          laneLabel="Generated Actions"
          laneDescription="These are the canonical Foundation task cards: source trace, assignment, due date, source resolution, activity, and closeout in one place."
          primaryActionHref="/my-work"
          primaryActionLabel="Open My Work"
          returnTo="/foundation"
        />

        <section className="panel verification-export-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Verification export summary</p>
              <h2>Draft owner verification packet</h2>
            </div>
            <div className="panel-heading-actions">
              <CopyVerificationSummaryButton summary={verificationSummaryText} />
              <FileSearch size={22} />
            </div>
          </div>
          <div className="verification-export-grid">
            <article>
              <strong>Counts</strong>
              <span>{summary.counts.map((count) => `${count.label}: ${count.value}`).join(" / ")}</span>
            </article>
            <article>
              <strong>Latest events</strong>
              <span>
                Save: {verificationStatus.latestWorkflowSave?.eventType ?? "pending"} / Action run:{" "}
                {verificationStatus.latestReviewActionRun ? "captured" : "pending"} / Audit: {verificationStatus.latestAuditEvent?.eventType ?? "pending"}
              </span>
            </article>
            <article>
              <strong>Unresolved gaps</strong>
              <span>{auditConsole.unresolvedGaps.map((gap) => `${gap.label} (${gap.status})`).join(" / ") || "No live gaps listed"}</span>
            </article>
            <article>
              <strong>Guardrail</strong>
              <span>{summary.guardrailText}</span>
            </article>
          </div>
        </section>

        <section className="panel command-center-lane">
          <div className="panel-heading">
            <div>
              <p className="section-label">Source Drilldowns</p>
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
                      <details className="source-detail-row" id={sourceRecordAnchor(item.sourceModule, item.sourceRecordId)} key={`${group.key}-${item.id}`}>
                        <summary>
                          <strong>{item.label}</strong>
                          <span>
                            {item.status} / {item.ownerRole}
                          </span>
                        </summary>
                        <p>{item.detail}</p>
                        <p>Recommended action: {item.recommendedAction}</p>
                        <small>
                          {item.sourceModule}
                          {item.sourceRecordId ? ` / ${item.sourceRecordId}` : ""}
                        </small>
                        {adminAccess.isOwner && item.sourceRecordId ? (
                          <form action={createFoundationReviewActionFromSourceAction} className="source-action-form">
                            <input name="sourceModule" type="hidden" value={item.sourceModule} />
                            <input name="sourceRecordId" type="hidden" value={item.sourceRecordId} />
                            <input name="title" type="hidden" value={`Review ${item.label}`} />
                            <input name="reason" type="hidden" value={item.detail} />
                            <select name="priority" defaultValue={item.status === "expired" || item.status === "out_of_tolerance" ? "high" : "medium"}>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                            <button className="button-secondary compact" type="submit">
                              Create action
                            </button>
                          </form>
                        ) : null}
                      </details>
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
