"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Beaker, CheckCircle2, ClipboardList, Gauge, Save, ShieldCheck, Sparkles } from "lucide-react";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import type { BioAiInput, BioSignalType } from "@/lib/bio-ai/types";
import { getFoundationDueBucket, getFoundationWorkKpis, isFoundationReadyForClosure } from "@/lib/foundation/work-kpis";
import { commonUtilities, gapModuleCards, platformCategories } from "@/lib/platform-outline";
import type {
  FoundationAssigneeOption,
  FoundationNotificationSummary,
  FoundationProductionVerificationSummary,
  FoundationReviewActionSummary
} from "@/lib/supabase/data";
import { FoundationNotificationCenter } from "./FoundationNotificationCenter";
import { FoundationReviewActionsPanel } from "./FoundationReviewActionsPanel";
import { StatusBadge } from "./StatusBadge";

type CommandCenterSummary = {
  assessmentCount: number;
  criticalRiskCount: number;
  pendingReviewCount: number;
  documentCount: number;
  readinessScore: number;
  readinessTrend: string;
  hseSignalCount: number;
  openActionCount: number;
  changePlanItemCount: number;
  changePlanHighPriorityCount: number;
  changePlanPersisted: boolean;
  bioRiskTrend: string;
  openActionTrend: string;
  recentCriticalSignals: string[];
  ownerMode: boolean;
};

const starterInput: BioAiInput = {
  siteName: "Demo Biotech Site",
  area: "QC Microbiology Lab",
  workflow: "Sterility assay review",
  program: "BIO-001",
  productCandidate: "BIO-001",
  batchOrLot: "LOT-0001",
  controlEffectiveness: "partial",
  dataCompleteness: 0.68,
  contaminationSuspected: true,
  productQualityImpactPotential: true,
  gxpImpact: true,
  signals: [
    {
      type: "contamination_event",
      label: "Unexpected microbial growth in assay control",
      severity: "high",
      status: "open",
      productQualityImpactPotential: true,
      gxpImpact: true,
      controls: ["Initial lab notification completed"],
      evidence: "Assay control showed unexpected growth; investigation not complete."
    },
    {
      type: "data_integrity",
      label: "Missing second-person review signature",
      severity: "medium",
      status: "open",
      dataIntegrityConcern: 4,
      evidence: "Review signature missing from assay worksheet."
    }
  ]
};

const signalTypes: BioSignalType[] = [
  "contamination_event",
  "biosafety_event",
  "data_integrity",
  "equipment_event",
  "sample_chain_of_custody",
  "change_control",
  "training_gap",
  "sop_gap"
];

export function WorkbenchClient({
  assignees = [],
  canManageFoundationActions = false,
  foundationActions = [],
  initialInput = starterInput,
  notifications,
  productionVerification,
  commandCenter
}: {
  assignees?: FoundationAssigneeOption[];
  canManageFoundationActions?: boolean;
  foundationActions?: FoundationReviewActionSummary[];
  initialInput?: BioAiInput;
  notifications?: FoundationNotificationSummary;
  productionVerification?: FoundationProductionVerificationSummary;
  commandCenter?: CommandCenterSummary;
}) {
  const [input, setInput] = useState<BioAiInput>(initialInput);
  const [signalType, setSignalType] = useState<BioSignalType>("contamination_event");
  const [signalLabel, setSignalLabel] = useState("Unexpected microbial growth in assay control");
  const [evidence, setEvidence] = useState("Assay control showed unexpected growth; investigation not complete.");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [workStatusFilter, setWorkStatusFilter] = useState("all");
  const [workPriorityFilter, setWorkPriorityFilter] = useState("all");
  const [workSourceFilter, setWorkSourceFilter] = useState("all");
  const [workSpecialFilter, setWorkSpecialFilter] = useState("all");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "blocked" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Assessment has not been saved yet.");
  const assessment = useMemo(() => assessBioRisk(input), [input]);
  const commandSummary = commandCenter ?? {
    assessmentCount: 2,
    criticalRiskCount: assessment.level === "critical" ? 1 : 0,
    pendingReviewCount: assessment.humanReviewRequired ? 1 : 0,
    documentCount: 2,
    readinessScore: 72,
    readinessTrend: "steady",
    hseSignalCount: input.signals?.length ?? 0,
    openActionCount: foundationActions.length,
    changePlanItemCount: gapModuleCards.length,
    changePlanHighPriorityCount: 3,
    changePlanPersisted: false,
    bioRiskTrend: "not enough data",
    openActionTrend: foundationActions.length > 0 ? "active follow-up" : "clear",
    recentCriticalSignals: assessment.humanReviewRequired ? [`${input.workflow ?? "Current workflow"} / ${assessment.level}`] : [],
    ownerMode: false
  };
  const cardMetrics: Record<string, { value: string; detail: string }> = {
    "Document Control": {
      value: String(commandSummary.documentCount),
      detail: "SOP metadata and draft update records"
    },
    "Risk Intelligence": {
      value: String(commandSummary.assessmentCount),
      detail: `${commandSummary.criticalRiskCount} critical / ${commandSummary.pendingReviewCount} pending review`
    },
    Compliance: {
      value: String(commandSummary.readinessScore),
      detail: `Audit readiness / ${commandSummary.readinessTrend.replace(/_/g, " ")}`
    },
    "HSE Management Systems": {
      value: String(commandSummary.hseSignalCount),
      detail: "Incidents, inspections, training, and CAPA signals"
    },
    "System Reliance": {
      value: String(commandSummary.openActionCount),
      detail: "Open source-traced action items"
    }
  };
  const assignedSourceOptions = useMemo(
    () => Array.from(new Set(foundationActions.map((action) => action.sourceModule))).sort(),
    [foundationActions]
  );
  const assignedWorkActions = useMemo(
    () =>
      foundationActions.filter((action) => {
        const assigneeMatches =
          assignedFilter === "all" ||
          (assignedFilter === "unassigned" ? !action.assignedTo : action.assignedTo === assignedFilter);
        const statusMatches = workStatusFilter === "all" || action.status === workStatusFilter;
        const priorityMatches = workPriorityFilter === "all" || action.priority === workPriorityFilter;
        const sourceMatches = workSourceFilter === "all" || action.sourceModule === workSourceFilter;
        const dueMatches = dueFilter === "all" || getAssignedWorkDueBucket(action) === dueFilter;
        const specialMatches =
          workSpecialFilter === "all" ||
          (workSpecialFilter === "completed_week" &&
            action.status === "complete" &&
            action.activityHistory.some((event) => event.status === "complete" && event.createdAt && new Date(event.createdAt) >= getWeekStart())) ||
          (workSpecialFilter === "ready" && isFoundationReadyForClosure(action)) ||
          (workSpecialFilter === "high_priority" && action.status !== "complete" && ["high", "urgent"].includes(action.priority.toLowerCase()));
        return assigneeMatches && statusMatches && priorityMatches && sourceMatches && dueMatches && specialMatches;
      }),
    [assignedFilter, dueFilter, foundationActions, workPriorityFilter, workSourceFilter, workSpecialFilter, workStatusFilter]
  );
  const productionPanel = productionVerification ?? {
    environment: "local",
    deploymentUrl: "http://127.0.0.1:3001",
    productionReady: false,
    reason: "Production verification has not been loaded for this workbench session."
  };
  const notificationPanel = useMemo(() => notifications ?? { unreadCount: 0, notifications: [] }, [notifications]);
  const workKpis = useMemo(() => getFoundationWorkKpis(foundationActions, notificationPanel), [foundationActions, notificationPanel]);
  const myAssignee = useMemo(() => {
    const assignedAction = foundationActions.find((action) => action.canUpdate && action.assignedTo);
    return assignedAction?.assignedTo ?? assignees[0]?.id ?? null;
  }, [assignees, foundationActions]);

  function updateField<K extends keyof BioAiInput>(key: K, value: BioAiInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function addSignal() {
    setInput((current) => ({
      ...current,
      signals: [
        ...(current.signals ?? []),
        {
          type: signalType,
          label: signalLabel,
          severity: signalType === "contamination_event" || signalType === "biosafety_event" ? "high" : "medium",
          evidence,
          repeatFinding: signalLabel.toLowerCase().includes("repeat")
        }
      ]
    }));
  }

  async function saveAssessment() {
    setSaveState("saving");
    setSaveMessage("Saving assessment and audit event...");

    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const result = (await response.json()) as { ok: boolean; id?: string; message?: string };

      if (result.ok) {
        setSaveState("saved");
        setSaveMessage(`Saved assessment ${result.id}.`);
        return;
      }

      setSaveState(response.status === 401 ? "blocked" : "error");
      setSaveMessage(
        response.status === 401
          ? "Sign in and finish onboarding to save assessments to Supabase."
          : result.message ?? "Assessment could not be saved."
      );
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Assessment could not be saved.");
    }
  }

  return (
    <div className="page-stack">
      <section className="command-center panel" aria-labelledby="command-center-title">
        <div className="command-center-lane-header command-summary-header">
          <div>
            <p className="section-label">Command Summary</p>
            <h2>Connected operating command center</h2>
            <p className="muted">Move from source intelligence to assigned work, production verification, notifications, and BioRisk review without losing context.</p>
          </div>
          <nav className="command-center-link-strip" aria-label="Workbench command center navigation">
            <Link className="button-primary compact" href="/workbench">
              Command Summary
            </Link>
            <Link className="button-secondary compact" href="/my-work">
              Operating Work
            </Link>
            <Link className="button-secondary compact" href="/foundation">
              Source Intelligence
            </Link>
          </nav>
        </div>
        <div className="command-hero">
          <div>
            <p className="section-label">PredictSafeBIO Command Center</p>
            <h1 id="command-center-title">One platform for biotech safety, compliance, and biosafety operations</h1>
            <p>
              Category status, risk intelligence, action planning, audit readiness, and AI guardrails are gathered here before users move into
              deeper workflows.
            </p>
          </div>
          <div className="command-score">
            <span>{commandSummary.readinessScore}</span>
            <strong>Audit readiness</strong>
            <small>{commandSummary.ownerMode ? "Owner controls enabled" : "Read-only roadmap controls"}</small>
          </div>
        </div>

        <div className="command-card-grid">
          {platformCategories.map((category) => {
            const metric = cardMetrics[category.title];
            return (
              <Link className={`command-card platform-${category.accent}`} href={category.href} key={category.title}>
                <div>
                  <span>{category.number}</span>
                  <strong>{category.title}</strong>
                </div>
                <p>{category.primaryWorkflow}</p>
                <small>
                  {category.statusLabel}: {metric.value}
                </small>
                <em>{metric.detail}</em>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="command-ops-grid" aria-label="Command center operating summary">
        <div className="panel command-action-queue">
          <div className="panel-heading">
            <div>
              <p className="section-label">Action Queue</p>
              <h2>Owner follow-through</h2>
            </div>
            <ClipboardList size={22} />
          </div>
          <div className="action-list">
            {foundationActions.length > 0 ? (
              foundationActions.slice(0, 4).map((action) => (
                <article className="action-row" key={`${action.id}-${action.sourceModule}`}>
                  <div>
                    <strong>{action.title}</strong>
                    <span>
                      {action.priority} / {action.status}
                    </span>
                  </div>
                  <span className={`task-aging-badge ${getWorkbenchTaskAgingClass(action)}`}>{action.operatingState}</span>
                  <p>
                    <Link href={action.sourceHref}>{action.sourceLabel}</Link>
                    {action.reason ? ` - ${action.reason}` : ""}
                  </p>
                  <WorkbenchCloseoutNote action={action} />
                  <details className="source-detail-expander">
                    <summary>Action detail</summary>
                    <div className="action-detail-grid">
                      <dl>
                        <div>
                          <dt>Source</dt>
                          <dd>{action.sourceModule.replace(/_/g, " ")}</dd>
                        </div>
                        <div>
                          <dt>Assignee</dt>
                          <dd>{action.assigneeName ?? "Unassigned"}</dd>
                        </div>
                        <div>
                          <dt>Due date</dt>
                          <dd>{action.dueDate ?? "No due date"}</dd>
                        </div>
                      </dl>
                      <div className="action-next-step">
                        <strong>Next step</strong>
                        <p>{action.nextStep}</p>
                        <Link className="text-link" href={action.sourceDetailHref}>
                          Open source section
                        </Link>
                      </div>
                    </div>
                  </details>
                </article>
              ))
            ) : (
              <p className="muted">No open action-planning items yet. Generate actions from the compliance map when ready.</p>
            )}
          </div>
        </div>

        <div className="panel command-risk-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">BioRisk Score</p>
              <h2>Current workbench signal</h2>
            </div>
            <StatusBadge level={assessment.level} />
          </div>
          <div className="score-wrap compact-score">
            <span className="score">{assessment.score}</span>
            <div>
              <p className="score-label">{assessment.level} BioRisk</p>
              <p className="muted">Confidence: {assessment.confidence}</p>
            </div>
          </div>
          <p className="explanation">{assessment.explanation}</p>
        </div>

        <div className="panel command-guardrail-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">System Reliance</p>
              <h2>AI guardrail summary</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="guardrail-box no-border">
            <CheckCircle2 size={18} />
            <span>{draftAiRecommendationGuardrail}</span>
          </div>
          <div className="workflow-steps">
            <span>Recommend</span>
            <span>Draft</span>
            <span>Analyze gaps</span>
            <span>Human approves</span>
          </div>
        </div>

        <div className="panel command-gap-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Gap Modules</p>
              <h2>Visible next capabilities</h2>
            </div>
            <Gauge size={22} />
          </div>
          <div className="gap-module-list">
            {gapModuleCards.map((module) => (
              <Link href={module.href} key={module.title}>
                <strong>{module.title}</strong>
                <span>{module.category}</span>
              </Link>
            ))}
          </div>
          <div className="summary-strip compact-summary">
            <span>{commandSummary.changePlanItemCount} Change Plan rows</span>
            <span>{commandSummary.changePlanHighPriorityCount} high priority</span>
            <span>{commandSummary.changePlanPersisted ? "Workspace roadmap" : "Starter roadmap"}</span>
          </div>
        </div>

        <div className="panel command-trend-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Dashboard Trends</p>
              <h2>Current movement</h2>
            </div>
            <Gauge size={22} />
          </div>
          <div className="trend-list">
            <article>
              <span>BioRisk trend</span>
              <strong>{commandSummary.bioRiskTrend}</strong>
            </article>
            <article>
              <span>Readiness trend</span>
              <strong>{commandSummary.readinessTrend.replace(/_/g, " ")}</strong>
            </article>
            <article>
              <span>Open actions</span>
              <strong>{commandSummary.openActionTrend}</strong>
            </article>
          </div>
          <div className="critical-signal-list">
            {commandSummary.recentCriticalSignals.length > 0 ? (
              commandSummary.recentCriticalSignals.map((signal) => <span key={signal}>{signal}</span>)
            ) : (
              <span>No recent critical signals</span>
            )}
          </div>
        </div>
      </section>

      <section className="panel production-verification-panel" aria-labelledby="production-verification-title">
        <div className="panel-heading production-verification-heading">
          <div>
            <p className="section-label">Production Verification</p>
            <h2 id="production-verification-title">{productionPanel.productionReady ? "Operating evidence ready" : "Operating evidence pending"}</h2>
            <p className="muted">Latest workflow save, task update, audit event, deployment status, and promotion readiness are tracked here.</p>
          </div>
          <span className={productionPanel.productionReady ? "production-state-badge state-ready" : "production-state-badge state-pending"}>
            {productionPanel.productionReady ? "Ready" : "Blocked"}
          </span>
        </div>
        <ProductionVerificationEvidenceGrid productionPanel={productionPanel} />
        <div className={productionPanel.productionReady ? "verification-pass-box" : "verification-pending-box"}>
          <strong>{productionPanel.productionReady ? "Production-ready evidence present" : "Promotion blocked by missing operating evidence"}</strong>
          <span>{productionPanel.reason}</span>
          <small>
            Operating evidence only. This does not certify compliance, approve documents, close CAPAs, validate systems, or replace human review.
          </small>
        </div>
      </section>

      <FoundationNotificationCenter
        notifications={notificationPanel}
        returnTo="/workbench"
        title="Assigned, blocked, due-soon, overdue, and ready-for-closure alerts keep operating work visible."
      />

      <section className="panel workbench-source-summary" aria-labelledby="source-summary-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">Foundation source summary</p>
            <h2 id="source-summary-title">Workbench-to-Foundation context</h2>
          </div>
          <ShieldCheck size={22} />
        </div>
        <div className="verification-export-grid">
          <article>
            <strong>Readiness</strong>
            <span>
              {commandSummary.readinessScore} / {commandSummary.readinessTrend.replace(/_/g, " ")}
            </span>
          </article>
          <article>
            <strong>Open actions</strong>
            <span>{commandSummary.openActionCount} source-traced task(s)</span>
          </article>
          <article>
            <strong>Latest task evidence</strong>
            <span>{productionPanel.latestTaskUpdate?.summary ?? "No task activity evidence loaded yet."}</span>
          </article>
          <article>
            <strong>Foundation map</strong>
            <Link className="text-link" href="/foundation">
              Open Foundation command center
            </Link>
          </article>
        </div>
      </section>

      <section className="assigned-work-console" id="assigned-work-console" aria-labelledby="assigned-work-title">
        <div className="panel-heading command-center-lane-header">
          <div>
            <p className="section-label">Operating Work</p>
            <h2 id="assigned-work-title">Foundation task lanes</h2>
            <p className="muted">The same task cards used in Foundation and My Work are filtered here for command-center follow-through.</p>
          </div>
          <Link className="button-primary compact" href="/my-work">
            Open My Work
          </Link>
        </div>
        <div className="assigned-work-filter-grid">
          <button type="button" onClick={() => {
            setWorkSpecialFilter("all");
            setDueFilter("overdue");
          }}>
            <strong>{workKpis.overdue}</strong>
            <span>Overdue</span>
          </button>
          <button type="button" onClick={() => {
            setWorkSpecialFilter("all");
            setWorkStatusFilter("blocked");
          }}>
            <strong>{workKpis.blocked}</strong>
            <span>Blocked</span>
          </button>
          <button type="button" onClick={() => {
            setWorkStatusFilter("all");
            setWorkSpecialFilter("completed_week");
          }}>
            <strong>{workKpis.completedThisWeek}</strong>
            <span>Completed this week</span>
          </button>
          <button type="button" onClick={() => {
            setWorkSpecialFilter("all");
            setAssignedFilter("unassigned");
          }}>
            <strong>{workKpis.unassigned}</strong>
            <span>Unassigned</span>
          </button>
          <button type="button" onClick={() => {
            setWorkStatusFilter("all");
            setWorkSpecialFilter("ready");
          }}>
            <strong>{workKpis.readyForClosure}</strong>
            <span>Ready for closure</span>
          </button>
          <button type="button" onClick={() => {
            setWorkPriorityFilter("all");
            setWorkSpecialFilter("high_priority");
          }}>
            <strong>{workKpis.highPriority}</strong>
            <span>High-priority work</span>
          </button>
        </div>
        <div className="quick-filter-row" aria-label="My Work quick filters">
          <button className="button-secondary compact" type="button" onClick={() => setAssignedFilter(myAssignee ?? "all")} disabled={!myAssignee}>
            Assigned to me
          </button>
          <button className="button-secondary compact" type="button" onClick={() => setWorkStatusFilter("blocked")}>
            Blocked
          </button>
          <button className="button-secondary compact" type="button" onClick={() => setDueFilter("overdue")}>
            Overdue
          </button>
          <button
            className="button-secondary compact"
            type="button"
            onClick={() => {
              setAssignedFilter("all");
              setDueFilter("all");
              setWorkStatusFilter("all");
              setWorkPriorityFilter("all");
              setWorkSourceFilter("all");
              setWorkSpecialFilter("all");
            }}
          >
            Reset filters
          </button>
        </div>
        <div className="assigned-work-filter-grid">
          <label>
            Assignee
            <select value={assignedFilter} onChange={(event) => setAssignedFilter(event.target.value)}>
              <option value="all">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due
            <select value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}>
              <option value="all">All due dates</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due soon</option>
              <option value="scheduled">Scheduled</option>
              <option value="unscheduled">No due date</option>
            </select>
          </label>
          <label>
            Status
            <select value={workStatusFilter} onChange={(event) => setWorkStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="complete">Complete</option>
            </select>
          </label>
          <label>
            Priority
            <select value={workPriorityFilter} onChange={(event) => setWorkPriorityFilter(event.target.value)}>
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            Source module
            <select value={workSourceFilter} onChange={(event) => setWorkSourceFilter(event.target.value)}>
              <option value="all">All sources</option>
              {assignedSourceOptions.map((sourceModule) => (
                <option key={sourceModule} value={sourceModule}>
                  {sourceModule.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FoundationReviewActionsPanel
          actions={assignedWorkActions}
          assignees={assignees}
          canManage={canManageFoundationActions}
          canEditAssignment={commandSummary.ownerMode}
          canEditDueDate={commandSummary.ownerMode}
          canEditPriority={commandSummary.ownerMode}
          emptyMessage="No assigned Foundation work matches these filters."
          laneLabel="Operating Work"
          laneDescription="Review generated Foundation tasks by status, priority, due date, assignee, and source trace from the Workbench command center."
          primaryActionHref="/my-work"
          primaryActionLabel="Open My Work"
          returnTo="/workbench"
          title="Filtered Foundation review tasks"
        />
      </section>

      <section className="platform-map panel" aria-labelledby="platform-map-title">
        <div className="platform-map-heading">
          <div>
            <p className="section-label">PredictSafeBIO Intelligence Platform Architecture</p>
            <h1 id="platform-map-title">AI-powered biotech safety, compliance, and biosafety operations platform</h1>
          </div>
          <span className="platform-promise">Connected. Intelligent. Compliant. Audit Ready.</span>
        </div>
        <div className="platform-category-grid">
          {platformCategories.map((category) => (
            <Link className={`platform-category platform-${category.accent}`} href={category.href} key={category.title}>
              <div className="platform-category-title">
                <span>{category.number}</span>
                <strong>{category.title}</strong>
              </div>
              <ul>
                {category.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
        <div className="common-utilities" aria-label="Common utilities across all categories">
          <strong>Common utilities across all categories</strong>
          <div>
            {commonUtilities.map((utility) => (
              <span key={utility}>{utility}</span>
            ))}
          </div>
        </div>
        <div className="promise-grid">
          <div>
            <p className="section-label">Platform Promise</p>
            <strong>AI drafts & recommends</strong>
            <strong>Humans review & approve</strong>
            <strong>Compliance you can prove</strong>
            <strong>Audit ready at all times</strong>
          </div>
          <div>
            <p className="section-label">AI Guardrails</p>
            <strong>AI may recommend, draft, and analyze gaps</strong>
            <strong>AI may not approve documents, certify compliance, close CAPAs, or replace human review</strong>
          </div>
        </div>
      </section>

      <div className="workbench-grid">
        <section className="panel intake-panel command-center-lane" aria-labelledby="intake-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">BioRisk Engine</p>
            <h1 id="intake-title">BioRisk Scoring Engine</h1>
          </div>
          <Beaker size={22} />
        </div>
        {(input.sourceRecords?.length ?? 0) > 0 || (input.referenceRuleIds?.length ?? 0) > 0 ? (
          <div className="source-context">
            <h2>Linked map context</h2>
            <div className="summary-strip">
              <span>{input.sourceRecords?.length ?? 0} source record(s)</span>
              <span>{input.referenceRuleIds?.length ?? 0} reference rule(s)</span>
              <span>Training: {input.trainingStatus ?? "not linked"}</span>
              <span>Documents: {input.documentReadiness ?? "not linked"}</span>
            </div>
          </div>
        ) : null}

        <div className="form-grid">
          <label>
            Site
            <input value={input.siteName ?? ""} onChange={(event) => updateField("siteName", event.target.value)} />
          </label>
          <label>
            Area
            <input value={input.area ?? ""} onChange={(event) => updateField("area", event.target.value)} />
          </label>
          <label>
            Workflow
            <input value={input.workflow ?? ""} onChange={(event) => updateField("workflow", event.target.value)} />
          </label>
          <label>
            Batch or lot
            <input value={input.batchOrLot ?? ""} onChange={(event) => updateField("batchOrLot", event.target.value)} />
          </label>
          <label>
            Control effectiveness
            <select
              value={input.controlEffectiveness ?? "unknown"}
              onChange={(event) => updateField("controlEffectiveness", event.target.value as BioAiInput["controlEffectiveness"])}
            >
              <option value="effective">effective</option>
              <option value="partial">partial</option>
              <option value="ineffective">ineffective</option>
              <option value="missing">missing</option>
              <option value="unknown">unknown</option>
            </select>
          </label>
          <label>
            Data completeness
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={input.dataCompleteness ?? 0}
              onChange={(event) => updateField("dataCompleteness", Number(event.target.value))}
            />
          </label>
        </div>

        <div className="toggle-grid">
          {[
            ["contaminationSuspected", "Contamination suspected"],
            ["patientImpactPotential", "Patient impact potential"],
            ["biosafetyImpactPotential", "Biosafety impact potential"],
            ["regulatoryImpactPotential", "Regulatory impact potential"],
            ["missingRequiredTraining", "Expired critical training"],
            ["unapprovedChange", "Unapproved validated change"],
            ["outOfToleranceEquipment", "Equipment out of tolerance"],
            ["chainOfCustodyGap", "Chain of custody gap"]
          ].map(([key, label]) => (
            <label className="check-row" key={key}>
              <input
                type="checkbox"
                checked={Boolean(input[key as keyof BioAiInput])}
                onChange={(event) => updateField(key as keyof BioAiInput, event.target.checked as never)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="signal-builder">
          <h2>Add signal</h2>
          <select value={signalType} onChange={(event) => setSignalType(event.target.value as BioSignalType)}>
            {signalTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
          <input value={signalLabel} onChange={(event) => setSignalLabel(event.target.value)} />
          <textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} rows={4} />
          <button className="button-secondary" type="button" onClick={addSignal}>
            <ClipboardList size={16} />
            Add signal
          </button>
        </div>
        </section>

        <section className="panel result-panel" aria-labelledby="result-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">Predictive Risk Alerts</p>
            <h2 id="result-title">Risk intelligence result</h2>
          </div>
          <StatusBadge level={assessment.level} />
        </div>
        <div className="score-wrap">
          <span className="score">{assessment.score}</span>
          <div>
            <p className="score-label">Risk score</p>
            <p className="muted">Confidence: {assessment.confidence}</p>
          </div>
        </div>
        <p className="explanation">{assessment.explanation}</p>

        <div className="result-section">
          <h3>Top drivers</h3>
          <ul className="driver-list">
            {assessment.topDrivers.map((driver) => (
              <li key={driver.label}>
                <strong>{driver.label}</strong>
                <span>{driver.explanation}</span>
              </li>
            ))}
          </ul>
        </div>

        {assessment.sourceTrace.sourceRecords.length > 0 ? (
          <div className="result-section">
            <h3>Source traceability</h3>
            <ul className="driver-list">
              {assessment.sourceTrace.sourceRecords.slice(0, 6).map((record) => (
                <li key={`${record.module}-${record.recordId ?? record.label}`}>
                  <strong>{record.module}</strong>
                  <span>{record.label ?? record.recordId ?? "Linked source record"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="split-list">
          <div>
            <h3>Missing information</h3>
            <ul>
              {assessment.missingInformation.slice(0, 6).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Critical gaps</h3>
            <ul>
              {assessment.criticalControlGaps.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        </section>

        <aside className="panel action-panel" aria-label="Human review and audit preview">
        <div className="draft-banner">
          <AlertTriangle size={18} />
          Draft - Human Review Required
        </div>
        <h2>Recommended owner and next steps</h2>
        <div className="action-list">
          {assessment.recommendedActions.map((action) => (
            <article className="action-row" key={action.title}>
              <div>
                <strong>{action.title}</strong>
                <span>{action.ownerRole}</span>
              </div>
              <p>{action.reason}</p>
            </article>
          ))}
        </div>
        <div className="result-section">
          <h3>Action Planning</h3>
          <div className="action-list compact-list">
            {foundationActions.length > 0 ? (
              foundationActions.slice(0, 5).map((action) => (
                <article className="action-row" key={`${action.id}-${action.sourceModule}`}>
                  <div>
                    <strong>{action.title}</strong>
                    <span>
                      {action.priority} / {action.status}
                    </span>
                  </div>
                  <span className={`task-aging-badge ${getWorkbenchTaskAgingClass(action)}`}>{action.operatingState}</span>
                  <p>
                    <Link href={action.sourceHref}>{action.sourceLabel}</Link>
                    {action.reason ? ` - ${action.reason}` : ""}
                  </p>
                  <WorkbenchCloseoutNote action={action} />
                  <details className="source-detail-expander">
                    <summary>Action detail</summary>
                    <div className="action-next-step">
                      <strong>Next step</strong>
                      <p>{action.nextStep}</p>
                      <Link className="text-link" href={action.sourceDetailHref}>
                        Open source section
                      </Link>
                    </div>
                  </details>
                </article>
              ))
            ) : (
              <p className="muted">No generated action-planning items yet.</p>
            )}
          </div>
        </div>
        <div className="audit-preview">
          <h3>Audit preview</h3>
          <p>
            Assessment run would log score {assessment.score}, level {assessment.level}, confidence {assessment.confidence}, and human review
            status.
          </p>
          <button className="button-primary" type="button" onClick={saveAssessment} disabled={saveState === "saving"}>
            <Save size={16} />
            {saveState === "saving" ? "Saving..." : "Save assessment"}
          </button>
          <p className={`save-message save-${saveState}`}>{saveMessage}</p>
          {saveState === "blocked" ? (
            <div className="save-actions" aria-label="Save access actions">
              <Link className="button-secondary compact" href="/login?next=/workbench">
                Sign in
              </Link>
              <Link className="button-primary compact" href="/onboarding">
                Onboarding
              </Link>
            </div>
          ) : null}
        </div>
        <div className="guardrail-box">
          <CheckCircle2 size={18} />
          <span>{draftAiRecommendationGuardrail}</span>
        </div>
        <div className="source-box">
          <Sparkles size={18} />
          <span>Built from local AI Engine artifacts in this workspace.</span>
        </div>
        </aside>
      </div>
    </div>
  );
}

function WorkbenchCloseoutNote({ action }: { action: FoundationReviewActionSummary }) {
  if (action.status !== "complete" || !action.closeoutNote?.trim()) return null;

  return (
    <div className="task-closeout-note">
      <strong>Closeout note</strong>
      <p>{action.closeoutNote}</p>
    </div>
  );
}

function ProductionVerificationEvidenceGrid({ productionPanel }: { productionPanel: FoundationProductionVerificationSummary }) {
  const evidenceRows = [
    {
      label: "Latest workflow save",
      passed: Boolean(productionPanel.latestWorkflowSave),
      state: "evidence" as const,
      eventType: productionPanel.latestWorkflowSave?.eventType,
      timestamp: productionPanel.latestWorkflowSave?.createdAt,
      detail: productionPanel.latestWorkflowSave?.summary ?? "Pending workflow save evidence."
    },
    {
      label: "Latest task update",
      passed: Boolean(productionPanel.latestTaskUpdate),
      state: "evidence" as const,
      eventType: productionPanel.latestTaskUpdate?.eventType,
      timestamp: productionPanel.latestTaskUpdate?.createdAt,
      detail: productionPanel.latestTaskUpdate?.summary ?? "Pending task status, note, or source-refresh evidence."
    },
    {
      label: "Latest audit event",
      passed: Boolean(productionPanel.latestAuditEvent),
      state: "evidence" as const,
      eventType: productionPanel.latestAuditEvent?.eventType,
      timestamp: productionPanel.latestAuditEvent?.createdAt,
      detail: productionPanel.latestAuditEvent?.summary ?? "Pending latest audit event."
    },
    {
      label: "Deployment status",
      passed: Boolean(productionPanel.deploymentUrl),
      state: "deployment" as const,
      eventType: productionPanel.environment,
      timestamp: undefined,
      detail: `${productionPanel.environment} / ${productionPanel.deploymentUrl}`
    },
    {
      label: "Promotion readiness",
      passed: productionPanel.productionReady,
      state: "decision" as const,
      eventType: productionPanel.productionReady ? "promotion_ready" : "promotion_blocked",
      timestamp: undefined,
      detail: productionPanel.productionReady ? "Promotion evidence is present for this operating check." : productionPanel.reason
    }
  ];
  const missingEvidence = evidenceRows.filter((row) => !row.passed && row.state !== "deployment").map((row) => row.label);

  return (
    <>
      <div className="production-evidence-list">
        {evidenceRows.map((row) => (
          <article
            className={[
              "production-evidence-row",
              row.state === "deployment" ? "evidence-deployment" : row.passed ? "evidence-pass" : "evidence-pending"
            ].join(" ")}
            key={row.label}
          >
            <div className="production-evidence-row-header">
              <span>{row.state === "deployment" ? "Live target" : row.passed ? "Pass" : "Pending"}</span>
              <strong>{row.label}</strong>
            </div>
            <p>{row.detail}</p>
            <dl>
              <div>
                <dt>Event</dt>
                <dd>{row.eventType ?? "Pending"}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{row.timestamp ? new Date(row.timestamp).toLocaleString() : "Not captured"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      {!productionPanel.productionReady ? (
        <div className="production-missing-evidence">
          <strong>Missing evidence checklist</strong>
          {missingEvidence.length > 0 ? (
            <ul>
              {missingEvidence.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : (
            <p>Evidence is present, but final promotion readiness is still blocked by the operating decision rule.</p>
          )}
        </div>
      ) : null}
    </>
  );
}

function getWorkbenchTaskAgingClass(action: FoundationReviewActionSummary) {
  if (action.status === "complete") return "task-aging-completed";
  if (action.status === "blocked") return "task-aging-blocked";
  if (!action.dueDate) return "task-aging-no-due-date";
  const due = new Date(`${action.dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "task-aging-overdue";
  if (days <= 3) return "task-aging-due-soon";
  return "task-aging-on-track";
}

function getAssignedWorkDueBucket(action: FoundationReviewActionSummary) {
  return getFoundationDueBucket(action);
}

function getWeekStart() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  return weekStart;
}
