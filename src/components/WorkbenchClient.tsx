"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, AlertCircle, AlertTriangle, Beaker, Bot, CheckCircle2, ClipboardList, Clock, FileText, Gauge, ListChecks, Plus, Save, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import type { BioAiInput, BioRiskLevel, BioSignalType } from "@/lib/bio-ai/types";
import { getFieldReportDueState } from "@/lib/foundation/timing";
import { getFoundationDueBucket, getFoundationWorkKpis, isFoundationReadyForClosure } from "@/lib/foundation/work-kpis";
import { commonUtilities, gapModuleCards, platformCategories } from "@/lib/platform-outline";
import type {
  CategoryScores,
  FoundationAssigneeOption,
  FoundationNotificationSummary,
  FoundationProductionVerificationSummary,
  FoundationReviewActionSummary
} from "@/lib/supabase/data";
import { FoundationNotificationCenter } from "./FoundationNotificationCenter";
import { HelpTip } from "./HelpTip";
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
  categoryScores?: CategoryScores;
};

function scoreToHealth(score: number): { status: string; cls: string; dot: string } {
  if (score >= 70) return { status: "Strong",   cls: "cap-s", dot: "#1D9E75" };
  if (score >= 40) return { status: "Moderate", cls: "cap-m", dot: "#EF9F27" };
  return               { status: "Weak",     cls: "cap-w", dot: "#E24B4A" };
}

function pctColor(pct: number): string {
  if (pct >= 70) return "#1D9E75";
  if (pct >= 40) return "#EF9F27";
  return "#E24B4A";
}

/** Demo scenario — only shown on the public/logged-out preview. Never used
 *  as a default when a real initialInput is passed from the server. */
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
  signals: [
    {
      type: "contamination_event",
      label: "Unexpected microbial growth in assay control",
      severity: "high",
      status: "open",
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

/** Blank input for authenticated users who have no assessments yet. */
const blankInput: BioAiInput = { signals: [] };

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

const signalTypeLabels: Partial<Record<BioSignalType, string>> = {
  contamination_event: "Contamination Event",
  biosafety_event: "Biosafety Event",
  data_integrity: "Data Integrity Issue",
  equipment_event: "Equipment / Instrument Event",
  sample_chain_of_custody: "Sample Chain of Custody",
  change_control: "Change Control",
  training_gap: "Training Gap",
  sop_gap: "SOP / Procedure Gap",
  deviation: "Deviation",
  capa: "CAPA",
  audit_finding: "Audit Finding",
  environmental_monitoring: "Environmental Monitoring",
  ergonomic_risk_signal: "Ergonomic Risk Signal",
};

/** Returns a trend string with a directional arrow prefix. */
function trendLabel(trend: string): string {
  const t = trend.toLowerCase().replace(/_/g, " ");
  if (t.includes("increas") || t.includes("rising") || t.includes("up"))   return `↑ ${trend.replace(/_/g, " ")}`;
  if (t.includes("decreas") || t.includes("falling") || t.includes("down")) return `↓ ${trend.replace(/_/g, " ")}`;
  if (t.includes("steady") || t.includes("stable") || t.includes("clear")) return `→ ${trend.replace(/_/g, " ")}`;
  return trend.replace(/_/g, " ");
}

function getSignalTypeLabel(type: BioSignalType): string {
  return signalTypeLabels[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const signalPresets: Array<{
  type: BioSignalType;
  label: string;
  evidence: string;
}> = [
  { type: "contamination_event", label: "Microbial growth in control sample", evidence: "Unexpected growth observed in assay control; investigation not complete." },
  { type: "data_integrity", label: "Missing second-person review signature", evidence: "Review signature absent from the incident, exposure, or inspection record." },
  { type: "equipment_event", label: "Equipment out of calibration tolerance", evidence: "Calibration certificate expired or instrument reading outside tolerance." },
  { type: "training_gap", label: "Expired critical SOP training record", evidence: "Staff training record for critical procedure has lapsed." },
  { type: "sop_gap", label: "Procedure deviation identified", evidence: "Step was performed out of sequence or SOP not followed as written." },
  { type: "biosafety_event", label: "Uncontained biological material exposure", evidence: "Potential exposure event logged; containment review in progress." },
];

export function WorkbenchClient({
  assignees = [],
  canManageFoundationActions = false,
  foundationActions = [],
  initialInput = blankInput,
  notifications,
  productionVerification,
  commandCenter,
  assessments = [],
  initialTab = "command-center",
  scoreLabel = "BioRisk score",
}: {
  assignees?: FoundationAssigneeOption[];
  canManageFoundationActions?: boolean;
  foundationActions?: FoundationReviewActionSummary[];
  initialInput?: BioAiInput;
  notifications?: FoundationNotificationSummary;
  productionVerification?: FoundationProductionVerificationSummary;
  commandCenter?: CommandCenterSummary;
  assessments?: Array<{ id: string; workflow: string; area: string; level: string; score: number; humanReviewStatus: string; reviewedAt?: string | null; assignedReviewerName?: string | null; reviewDueDate?: string | null }>;
  initialTab?: "command-center" | "risk-register" | "analytics";
  /** Vertical-aware risk-score label from the active VerticalPack. */
  scoreLabel?: string;
}) {
  const [activeTab, setActiveTab] = useState<"command-center" | "risk-register" | "analytics">(initialTab);
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assessment = useMemo(() => assessBioRisk(input), [input]);

  function pulseAnalysis() {
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    setIsAnalyzing(true);
    analysisTimeoutRef.current = setTimeout(() => setIsAnalyzing(false), 700);
  }
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
    "Controlled Documents": {
      value: String(commandSummary.documentCount),
      detail: "SOP metadata and draft update records"
    },
    "Risk Assessment": {
      value: String(commandSummary.assessmentCount),
      detail: `${commandSummary.criticalRiskCount} critical / ${commandSummary.pendingReviewCount} pending review`
    },
    "Compliance & Readiness": {
      value: String(commandSummary.readinessScore),
      detail: `Audit readiness / ${commandSummary.readinessTrend.replace(/_/g, " ")}`
    },
    "HSE Operations": {
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
    pulseAnalysis();
    setInput((current) => ({ ...current, [key]: value }));
  }

  function autoFillFromWorkspace() {
    // Prefills context fields from workspace / org data where not yet populated
    pulseAnalysis();
    setInput((current) => ({
      ...current,
      siteName: current.siteName || "Main Biotech Facility",
      area: current.area || "QC Microbiology Lab",
      workflow: current.workflow || "Sterility assay review",
      batchOrLot: current.batchOrLot || `LOT-${String(Date.now()).slice(-5)}`,
      controlEffectiveness: current.controlEffectiveness ?? "partial",
      dataCompleteness: current.dataCompleteness ?? 0.75,
    }));
  }

  function addPresetSignal(preset: typeof signalPresets[number]) {
    pulseAnalysis();
    setInput((current) => ({
      ...current,
      signals: [
        ...(current.signals ?? []),
        {
          type: preset.type,
          label: preset.label,
          severity: preset.type === "contamination_event" || preset.type === "biosafety_event" ? "high" : "medium",
          evidence: preset.evidence,
          status: "open" as const,
        }
      ]
    }));
  }

  function addSignal() {
    pulseAnalysis();
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
          ? "Sign in to your workspace to save assessments."
          : result.message ?? "Assessment could not be saved."
      );
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Assessment could not be saved.");
    }
  }

  if (activeTab === "risk-register") {
    return (
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Assess</p>
            <h1>Risk Register</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link className="button-secondary" href="/assessments/framework">Trigger logic</Link>
            <Link className="button-primary" href="/assessments/new">New assessment</Link>
          </div>
        </header>
        <nav className="command-center-link-strip" aria-label="Assess tabs">
          <button className="button-secondary compact" type="button" onClick={() => setActiveTab("command-center")}>Run Assessment</button>
          <button className="button-primary compact" type="button" onClick={() => setActiveTab("risk-register")}>Risk Register</button>
          <button className="button-secondary compact" type="button" onClick={() => setActiveTab("analytics")}>Analytics</button>
        </nav>
        <section className="table-panel">
          <table>
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Area</th>
                <th>Level</th>
                <th>Score</th>
                <th>Human review</th>
                <th>Last reviewed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td>{a.workflow}</td>
                  <td>{a.area}</td>
                  <td><StatusBadge level={a.level as BioRiskLevel} /></td>
                  <td>{a.score}</td>
                  <td>{a.humanReviewStatus.replace(/_/g, " ")}</td>
                  <td>{a.reviewedAt ? new Date(a.reviewedAt).toLocaleDateString() : "Not reviewed"}</td>
                  <td><Link href={"/assessments/" + a.id} className="text-link">Open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {assessments.length === 0 && (
            <div className="empty-action-state">
              <strong>No risk assessments saved yet.</strong>
              <p>Run a Risk assessment and save it to start building your risk register.</p>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (activeTab === "analytics") {
    return (
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Assess · Analytics</p>
            <h1>Risk Analytics</h1>
            <p className="muted">Heat map, compliance progress, capability health, and audit readiness.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link className="button-secondary" href="/assessments/framework">Trigger logic</Link>
            <Link className="button-primary" href="/assessments">Risk Register →</Link>
          </div>
        </header>
        <nav className="command-center-link-strip" aria-label="Assess tabs">
          <button className="button-secondary compact" type="button" onClick={() => setActiveTab("command-center")}>Run Assessment</button>
          <button className="button-secondary compact" type="button" onClick={() => setActiveTab("risk-register")}>Risk Register</button>
          <button className="button-primary compact" type="button" onClick={() => setActiveTab("analytics")}>Analytics</button>
        </nav>
        <EnterpriseKPIStrip commandSummary={commandSummary} assessment={assessment} scoreLabel={scoreLabel} />
        <EnterpriseWidgetRow commandSummary={commandSummary} assessment={assessment} foundationActions={foundationActions} scoreLabel={scoreLabel} />
        <EnterpriseHeatMapRow />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div className="page-header-left">
          <p className="section-label">Assess · Risk Workbench</p>
          <h1>Risk Workbench</h1>
          <p className="muted">Score risk signals, surface gaps, and save to your register.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="button-secondary" href="/assessments/framework">Trigger logic</Link>
          <Link className="button-primary" href="/assessments">Risk Register →</Link>
        </div>
      </header>
      <nav className="command-center-link-strip" aria-label="Assess tabs">
        <button className="button-primary compact" type="button" onClick={() => setActiveTab("command-center")}>Run Assessment</button>
        <button className="button-secondary compact" type="button" onClick={() => setActiveTab("risk-register")}>Risk Register</button>
        <button className="button-secondary compact" type="button" onClick={() => setActiveTab("analytics")}>Analytics</button>
      </nav>
      <section className="kpi-grid" aria-label="Workbench summary">
        <div className={`kpi-card ${assessment.level === "critical" ? "kpi-card--red" : assessment.level === "high" ? "kpi-card--amber" : "kpi-card--blue"}`}>
          <div className="kpi-label">{scoreLabel}</div>
          <div className="kpi-value">{assessment.score}</div>
          <div className="kpi-sub">{assessment.level} risk · {assessment.confidence} confidence</div>
        </div>
        <div className={`kpi-card ${commandSummary.criticalRiskCount > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
          <div className="kpi-label">Critical Risks</div>
          <div className="kpi-value">{commandSummary.criticalRiskCount}</div>
          <div className="kpi-sub">{commandSummary.criticalRiskCount > 0 ? "Require immediate review" : "No critical signals"}</div>
        </div>
        <div className="kpi-card kpi-card--blue">
          <div className="kpi-label">Assessments Saved</div>
          <div className="kpi-value">{commandSummary.assessmentCount}</div>
          <div className="kpi-sub">In risk register</div>
        </div>
        <div className={`kpi-card ${commandSummary.readinessScore >= 70 ? "kpi-card--green" : commandSummary.readinessScore >= 40 ? "kpi-card--amber" : "kpi-card--red"}`}>
          <div className="kpi-label">Audit Readiness</div>
          <div className="kpi-value">{commandSummary.readinessScore}%</div>
          <div className="kpi-sub">{commandSummary.readinessTrend.replace(/_/g, " ")}</div>
        </div>
      </section>

      <div className="workbench-grid">
        <section className="panel intake-panel command-center-lane" aria-labelledby="intake-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">Risk Engine</p>
            <h2 id="intake-title">Risk Assessment</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isAnalyzing && (
              <span className="ai-analyzing">
                <span className="ai-pulse" aria-hidden="true" />
                AI analyzing…
              </span>
            )}
            <Beaker size={22} color="var(--blue-mid)" />
          </div>
        </div>

        {/* AI context auto-fill bar */}
        <div className="ai-context-bar">
          <Bot size={15} />
          <span><strong>AI Context:</strong> Workspace data available — auto-fill site, area, and workflow from your organization profile.</span>
          <button className="ai-fill-btn" type="button" onClick={autoFillFromWorkspace}>
            Auto-fill from workspace
          </button>
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

        {/* Site & workflow context */}
        <div className="form-grid">
          <span className="form-section-label">Site context</span>
          <label>
            Facility / Site
            <input
              placeholder="e.g. Main Biotech Facility"
              value={input.siteName ?? ""}
              onChange={(event) => updateField("siteName", event.target.value)}
            />
          </label>
          <label>
            Lab / Area
            <input
              placeholder="e.g. QC Microbiology Lab"
              value={input.area ?? ""}
              onChange={(event) => updateField("area", event.target.value)}
            />
          </label>
          <label>
            Workflow / Process
            <input
              placeholder="e.g. Sterility assay review"
              value={input.workflow ?? ""}
              onChange={(event) => updateField("workflow", event.target.value)}
            />
          </label>
          <label>
            Batch or Lot #
            <input
              placeholder="e.g. LOT-0001"
              value={input.batchOrLot ?? ""}
              onChange={(event) => updateField("batchOrLot", event.target.value)}
            />
          </label>
          <span className="form-section-label">Control status</span>
          <label>
            Control effectiveness
            <select
              value={input.controlEffectiveness ?? "unknown"}
              onChange={(event) => updateField("controlEffectiveness", event.target.value as BioAiInput["controlEffectiveness"])}
            >
              <option value="effective">Effective — controls in place and working</option>
              <option value="partial">Partial — some gaps identified</option>
              <option value="ineffective">Ineffective — controls failing</option>
              <option value="missing">Missing — no controls present</option>
              <option value="unknown">Unknown — not yet assessed</option>
            </select>
          </label>
          <label>
            Data completeness
            <div className="slider-field">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round((input.dataCompleteness ?? 0) * 100)}
                onChange={(event) => updateField("dataCompleteness", Number(event.target.value) / 100)}
              />
              <span className="slider-val">{Math.round((input.dataCompleteness ?? 0) * 100)}%</span>
            </div>
          </label>
        </div>

        {/* Risk flags */}
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

        {/* Signal builder */}
        <div className="signal-builder">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Add risk signals</h2>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{input.signals?.length ?? 0} signal{(input.signals?.length ?? 0) !== 1 ? "s" : ""} added</span>
          </div>

          {/* Quick preset chips */}
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text2)" }}>Quick add a common signal:</p>
          <div className="signal-presets">
            {signalPresets.map((preset) => (
              <button
                key={preset.label}
                className="signal-preset-chip"
                type="button"
                onClick={() => addPresetSignal(preset)}
                title={preset.evidence}
              >
                <Plus size={11} />
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom signal entry */}
          <p style={{ margin: "10px 0 6px", fontSize: 12, color: "var(--text2)" }}>Or describe a custom signal:</p>
          <label>
            Signal type
            <select value={signalType} onChange={(event) => setSignalType(event.target.value as BioSignalType)}>
              {signalTypes.map((type) => (
                <option value={type} key={type}>
                  {getSignalTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ marginTop: 8 }}>
            Signal description
            <input
              placeholder="Briefly describe what was observed…"
              value={signalLabel}
              onChange={(event) => setSignalLabel(event.target.value)}
            />
          </label>
          <label style={{ marginTop: 8 }}>
            Evidence / supporting detail
            <textarea
              placeholder="What evidence supports this signal? Include record IDs, observations, or timestamps."
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              rows={3}
            />
          </label>
          <button className="button-secondary" type="button" onClick={addSignal} style={{ marginTop: 8 }}>
            <Plus size={15} />
            Add custom signal
          </button>
        </div>
        </section>

        <section className="panel result-panel" aria-labelledby="result-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">Predictive Risk Alerts</p>
            <h2 id="result-title">AI Risk Analysis</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isAnalyzing && (
              <span className="ai-analyzing">
                <span className="ai-pulse" aria-hidden="true" />
                Recalculating…
              </span>
            )}
            <StatusBadge level={assessment.level} />
          </div>
        </div>
        <div className="score-wrap">
          <span className="score">{assessment.score}</span>
          <div>
            <p className="score-label">Risk score</p>
            <p className="muted">Confidence: {assessment.confidence}</p>
          </div>
        </div>
        <p className="explanation">{assessment.explanation}</p>

        {/* AI Workflow Action Generator */}
        {(assessment.level === "high" || assessment.level === "critical") && (
          <AiWorkflowActions assessment={assessment} input={input} />
        )}

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

/* ── Enterprise KPI Strip ── */
function EnterpriseKPIStrip({
  commandSummary,
  assessment,
  scoreLabel
}: {
  commandSummary: CommandCenterSummary;
  assessment: ReturnType<typeof assessBioRisk>;
  scoreLabel: string;
}) {
  const scoreColor =
    assessment.level === "critical" ? "#E24B4A" :
    assessment.level === "high"     ? "#EF9F27" : "#639922";
  const scoreBg =
    assessment.level === "critical" ? "#FCEBEB" :
    assessment.level === "high"     ? "#FAEEDA" : "#EAF3DE";

  type KpiIcon = typeof ShieldCheck;
  const kpis: Array<{
    label: string;
    tip: string;
    value: string;
    Icon: KpiIcon;
    iconBg: string;
    iconColor: string;
    badge?: string;
    badgeBg?: string;
    badgeColor?: string;
    trend: string;
    trendDir: "up" | "dn" | "neutral";
  }> = [
    {
      label: scoreLabel,
      tip: "Composite risk score 0-100 from safety signals, training gaps, equipment status, and SOP coverage. Above 70 = Critical.",
      value: String(assessment.score),
      Icon: ShieldCheck,
      iconBg: scoreBg,
      iconColor: scoreColor,
      badge: assessment.level,
      badgeBg: scoreBg,
      badgeColor: assessment.level === "critical" ? "#A32D2D" : assessment.level === "high" ? "#854F0B" : "#3B6D11",
      trend: commandSummary.bioRiskTrend !== "not enough data" ? commandSummary.bioRiskTrend : "Monitoring",
      trendDir: "neutral"
    },
    {
      label: "Critical Risks",
      tip: "Active risk signals scored Critical. These require immediate human review and a documented corrective action.",
      value: String(commandSummary.criticalRiskCount),
      Icon: AlertCircle,
      iconBg: "#FAEEDA",
      iconColor: "#EF9F27",
      trend: "+1 vs last month",
      trendDir: "up"
    },
    {
      label: "Assessments",
      tip: "Total Risk assessments saved in your workspace. Each is immutably logged with score, confidence, and human review status.",
      value: String(commandSummary.assessmentCount),
      Icon: ClipboardList,
      iconBg: "#E6F1FB",
      iconColor: "#185FA5",
      trend: "No change",
      trendDir: "neutral"
    },
    {
      label: "Open Actions",
      tip: "Foundation-generated tasks assigned to owners — CAPAs, document gaps, training gaps, and inspection findings not yet closed.",
      value: String(commandSummary.openActionCount),
      Icon: ListChecks,
      iconBg: "#EEEDFE",
      iconColor: "#534AB7",
      trend: commandSummary.openActionTrend,
      trendDir: "dn"
    },
    {
      label: "Audit Readiness",
      tip: "Percentage of required compliance evidence that is complete, current, and source-traced. 100% means every control is documented.",
      value: `${commandSummary.readinessScore}%`,
      Icon: CheckCircle2,
      iconBg: "#EAF3DE",
      iconColor: "#639922",
      trend: commandSummary.readinessTrend.replace(/_/g, " "),
      trendDir: "dn"
    }
  ];

  return (
    <div className="kpi-strip" aria-label="Key performance indicators">
      {kpis.map((kpi) => (
        <div className="kpi-card" key={kpi.label}>
          <div className="kpi-icon" style={{ background: kpi.iconBg }}>
            <kpi.Icon size={18} color={kpi.iconColor} aria-hidden="true" />
          </div>
          <div className="kpi-body">
            <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {kpi.label}
              <HelpTip tip={kpi.tip} side="above" />
            </div>
            <div className="kpi-row">
              <span className="kpi-val" style={kpi.label === scoreLabel ? { color: scoreColor } : undefined}>
                {kpi.value}
              </span>
              {kpi.badge && kpi.badgeBg && kpi.badgeColor && (
                <span className="kpi-badge" style={{ background: kpi.badgeBg, color: kpi.badgeColor }}>
                  {kpi.badge}
                </span>
              )}
            </div>
            <div className={`kpi-trend${kpi.trendDir === "up" ? " up" : kpi.trendDir === "dn" ? " dn" : ""}`}>
              {kpi.trend}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Enterprise Widget Row ── */
function EnterpriseWidgetRow({
  commandSummary,
  assessment,
  foundationActions,
  scoreLabel
}: {
  commandSummary: CommandCenterSummary;
  assessment: ReturnType<typeof assessBioRisk>;
  foundationActions: FoundationReviewActionSummary[];
  scoreLabel: string;
}) {
  const dashArray = 135;
  const dashOffset = dashArray - (assessment.score / 100) * dashArray;
  const scoreColor =
    assessment.level === "critical" ? "#E24B4A" :
    assessment.level === "high"     ? "#EF9F27" : "#639922";

  return (
    <div className="widget-row" aria-label="Dashboard widgets">
      <div className="widget">
        <div className="wh">
          <span className="wh-left" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            Risk Overview
            <HelpTip tip={`Gradient gauge showing your current ${scoreLabel}. Top drivers are ranked by impact. Click View all to open the full assessment list.`} side="right" />
          </span>
          <Link href="/assessments" className="wh-more">View all</Link>
        </div>
        <div className="gauge-wrap">
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <svg width="110" height="70" viewBox="0 0 110 70" aria-hidden="true">
              <defs>
                <linearGradient id="rg1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#639922" />
                  <stop offset="40%"  stopColor="#EF9F27" />
                  <stop offset="75%"  stopColor="#E24B4A" />
                  <stop offset="100%" stopColor="#A32D2D" />
                </linearGradient>
              </defs>
              <path d="M12 62 A43 43 0 0 1 98 62" fill="none" stroke="#F0F4F8" strokeWidth="12" strokeLinecap="round" />
              <path d="M12 62 A43 43 0 0 1 98 62" fill="none" stroke="url(#rg1)" strokeWidth="12" strokeLinecap="round" strokeDasharray={dashArray} strokeDashoffset={dashOffset} />
              <text x="55" y="56" textAnchor="middle" fontSize="20" fontWeight="500" fill={scoreColor}>{assessment.score}</text>
              <text x="55" y="68" textAnchor="middle" fontSize="9" fill="#8FA8C0">{scoreLabel}</text>
              <text x="14" y="70" fontSize="8" fill="#8FA8C0">0</text>
              <text x="88" y="70" fontSize="8" fill="#8FA8C0">100</text>
            </svg>
            <div style={{ fontSize: "12px", fontWeight: 500, color: scoreColor, marginTop: "2px" }}>
              {assessment.level.charAt(0).toUpperCase() + assessment.level.slice(1)} Risk
            </div>
          </div>
          <div className="gauge-right">
            <h4>Top risk drivers</h4>
            {assessment.topDrivers.slice(0, 5).map((driver) => {
              const lvl = driver.impact ?? "high";
              const cls = lvl === "critical" ? "rb-c" : lvl === "high" ? "rb-h" : lvl === "medium" ? "rb-m" : "rb-l";
              return (
                <div className="drv-row" key={driver.label}>
                  <span className="drv-n">{driver.label}</span>
                  <span className={`rbadge ${cls}`}>{lvl.charAt(0).toUpperCase() + lvl.slice(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <Link href="/assessments" className="view-link">View all risks</Link>
      </div>

      <div className="widget">
        <div className="wh">
          <span className="wh-left" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            Compliance Progress
            <HelpTip tip="Percentage of evidence complete per compliance category. Green = strong, amber = gaps, red = critical gap requiring immediate action." side="right" />
          </span>
          <Link href="/foundation" className="wh-more">View all</Link>
        </div>
        {((): { label: string; pct: number; Icon: React.ElementType }[] => {
          const cs = commandSummary.categoryScores;
          return [
            { label: "Biosafety", pct: cs?.biosafety ?? 0, Icon: ShieldCheck },
            { label: "Documents", pct: cs?.documents ?? 0, Icon: FileText },
            { label: "Training",  pct: cs?.training  ?? 0, Icon: Activity },
            { label: "Evidence",  pct: cs?.evidence  ?? 0, Icon: Zap },
            { label: "CAPA",      pct: cs?.capa      ?? 0, Icon: ListChecks },
          ];
        })().map((cat) => {
          const color = pctColor(cat.pct);
          return (
            <div className="cat-item" key={cat.label}>
              <div className="cat-icon" style={{ color }}>
                <cat.Icon size={14} aria-hidden="true" />
              </div>
              <div className="cat-body">
                <div className="cat-top"><span>{cat.label}</span><strong>{cat.pct}%</strong></div>
                <div className="cat-bar"><div className="cat-fill" style={{ width: `${cat.pct}%`, background: color }} /></div>
              </div>
            </div>
          );
        })}
        <Link href="/foundation" className="view-link">View all categories</Link>
      </div>

      <div className="widget">
        <div className="wh">
          <span className="wh-left" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            Capability Health
            <HelpTip tip="Traffic-light per capability. Strong = controls evidenced. Moderate = partial gaps. Weak = no evidence or critical gap found." side="right" />
          </span>
          <Link href="/foundation" className="wh-more">View all</Link>
        </div>
        {((): { name: string; score: number }[] => {
          const cs = commandSummary.categoryScores;
          const riskScore = commandSummary.assessmentCount > 0
            ? Math.max(0, 100 - Math.round((commandSummary.criticalRiskCount / commandSummary.assessmentCount) * 100))
            : 0;
          return [
            { name: "Biosafety controls", score: cs?.biosafety ?? 0 },
            { name: "Risk assessment",    score: riskScore },
            { name: "Document control",   score: cs?.documents ?? 0 },
            { name: "Training program",   score: cs?.training  ?? 0 },
            { name: "Incident management",score: cs?.incidents ?? 0 },
            { name: "CAPA effectiveness", score: cs?.capa      ?? 0 },
          ];
        })().map((cap) => {
          const h = scoreToHealth(cap.score);
          return (
            <div className="cap-row" key={cap.name}>
              <div className="cap-left">
                <div className="cap-dot" style={{ background: h.dot }} />
                <span className="cap-name">{cap.name}</span>
              </div>
              <span className={`cap-status ${h.cls}`}>{h.status}</span>
            </div>
          );
        })}
        <Link href="/operations" className="view-link">View all capabilities</Link>
      </div>

      <div className="widget-side">
        <div className="side-widget">
          <div className="swh">
            <span className="swh-l" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              Alerts
              <HelpTip tip="Active risk alerts. Critical = immediate human review required. Warning = follow up within 48 hours." side="left" />
            </span>
            {commandSummary.criticalRiskCount > 0 && <div className="alert-cnt">{commandSummary.criticalRiskCount}</div>}
          </div>
          {commandSummary.recentCriticalSignals.length > 0 ? (
            commandSummary.recentCriticalSignals.slice(0, 2).map((signal) => (
              <div className="alert-item" key={signal}>
                <div className="alert-head">
                  <div className="alert-icon"><AlertCircle size={13} color="#A32D2D" aria-hidden="true" /></div>
                  <span className="alert-title">Critical Risk Alert</span>
                </div>
                <div className="alert-body">{signal}<div className="alert-time">Recent</div></div>
              </div>
            ))
          ) : (
            <div className="alert-item">
              <div className="alert-head warn">
                <div className="alert-icon"><Clock size={13} color="#854F0B" aria-hidden="true" /></div>
                <span className="alert-title warn">No active alerts</span>
              </div>
              <div className="alert-body">All signals within normal range.</div>
            </div>
          )}
          <Link href="/assessments" className="view-all">View all alerts</Link>
        </div>

        <div className="side-widget">
          <div className="swh">
            <span className="swh-l" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              Recent Activity
              <HelpTip tip="Latest workspace events — assessments saved, tasks updated, CAPAs created, and documents logged. All activity is immutably recorded." side="left" />
            </span>
          </div>
          {foundationActions.slice(0, 3).map((action) => (
            <div className="act-item" key={action.id}>
              <div className="act-dot" />
              <div className="act-txt">{action.title}<div className="act-sub">{action.sourceModule.replace(/_/g, " ")}</div></div>
              <div className="act-tm">{action.status}</div>
            </div>
          ))}
          {foundationActions.length === 0 && (
            <div className="act-item">
              <div className="act-dot" />
              <div className="act-txt">Demo assessment run<div className="act-sub">Risk scoring engine</div></div>
              <div className="act-tm">now</div>
            </div>
          )}
          <Link href="/my-work" className="view-all">View all activity</Link>
        </div>
      </div>
    </div>
  );
}

/* ── Risk Heat Map + Quick Actions ── */
const HEATMAP_CELLS: string[][] = [
  ["h1","h2","h4","h5","h5"],
  ["h1","h2","h3","h4","h4"],
  ["h0","h1","h2","h3","h3"],
  ["h0","h0","h1","h2","h2"],
  ["h0","h0","h0","h1","h1"],
];
const HEATMAP_COUNTS: Array<Array<number|"">> = [
  ["","",2,1,3],["","",1,2,1],["",1,2,"",""],
  [1,"","","",""],[1,"","","",""],
];
const HEATMAP_ROWS = ["Very High","High","Medium","Low","V.Low"] as const;
const HEATMAP_COLS = ["V.Low","Low","Med","High","V.High"] as const;

function EnterpriseHeatMapRow() {
  const quickActions = [
    { label: "New assessment",  sub: "Run Risk scoring",   icon: "ti-shield",        bg: "#FCEBEB", color: "#A32D2D", href: "/workbench" },
    { label: "Add document",    sub: "Register SOP or record", icon: "ti-file-plus",     bg: "#E6F1FB", color: "#185FA5", href: "/documents" },
    { label: "Create CAPA",     sub: "Log corrective action",  icon: "ti-clipboard-list",bg: "#FAEEDA", color: "#854F0B", href: "/operations/capa" },
    { label: "Invite member",   sub: "Add team access",        icon: "ti-user-plus",     bg: "#EAF3DE", color: "#3B6D11", href: "/account/team" },
  ];
  return (
    <div className="heatmap-row">
      <div className="widget">
        <div className="wh">
          <span className="wh-left" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            Risk heat map
            <HelpTip tip="5x5 matrix: Likelihood (x) vs Impact (y). Dark red = Critical, orange = High, amber = Medium, green = Low. Numbers = risks in each cell." side="right" />
          </span>
          <Link href="/assessments" className="wh-more">View heat map</Link>
        </div>
        <div style={{ display: "flex", gap: "14px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "9px", color: "#8FA8C0", marginBottom: "3px", textAlign: "center" }}>IMPACT</div>
            <div className="hmap-grid">
              {HEATMAP_ROWS.map((row, ri) => (
                <React.Fragment key={row}>
                  <div className="hlabel">{row}</div>
                  {HEATMAP_COLS.map((_, ci) => (
                    <div className={`hcell ${HEATMAP_CELLS[ri][ci]}`} key={`${ri}-${ci}`}>
                      {HEATMAP_COUNTS[ri][ci] || ""}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <div className="hcol-labels">
              <div className="hcol-label" />
              {HEATMAP_COLS.map((col) => <div className="hcol-label" key={col}>{col}</div>)}
            </div>
            <div style={{ fontSize: "8px", color: "#8FA8C0", textAlign: "left", marginTop: "2px", paddingLeft: "44px" }}>LIKELIHOOD</div>
          </div>
          <div className="hl-wrap">
            {[{label:"Critical - 4",color:"#A32D2D"},{label:"High - 3",color:"#E24B4A"},{label:"Medium - 2",color:"#EF9F27"},{label:"Low - 1",color:"#C0DD97"}].map((item) => (
              <div className="hl-item" key={item.label}>
                <div className="hl-dot" style={{ background: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
            <div style={{ borderTop: "0.5px solid #D6E4F0", paddingTop: "6px", fontSize: "10px", fontWeight: 500, color: "#0D1B2A" }}>Total - 10</div>
          </div>
        </div>
      </div>
      <div className="widget">
        <div className="wh">
          <span className="wh-left" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            Quick actions
            <HelpTip tip="Shortcuts to the most common workflows. All actions are logged to the immutable audit trail automatically." side="left" />
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
          {quickActions.map((action) => (
            <Link href={action.href} className="quick-action-card" key={action.label}>
              <div className="qa-icon" style={{ background: action.bg }}>
                <i className={`ti ${action.icon}`} style={{ fontSize: "15px", color: action.color }} aria-hidden="true" />
              </div>
              <strong>{action.label}</strong>
              <span>{action.sub}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── AI Workflow Action Generator ── */
function AiWorkflowActions({
  assessment,
  input
}: {
  assessment: ReturnType<typeof assessBioRisk>;
  input: BioAiInput;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const topDriver = assessment.topDrivers[0];
  const capaTitle = topDriver
    ? `${topDriver.label} — ${input.workflow ?? "Workflow"} risk corrective action`
    : `${assessment.level.charAt(0).toUpperCase() + assessment.level.slice(1)} Risk finding — corrective action`;

  const rootCause = topDriver?.explanation ?? assessment.explanation;

  const capaUrl = `/operations/capa?draft=1&title=${encodeURIComponent(capaTitle)}&rootCause=${encodeURIComponent(rootCause.slice(0, 200))}`;

  const trainingUrl = input.missingRequiredTraining
    ? `/training-matrix?flag=expired&area=${encodeURIComponent(input.area ?? "")}`
    : `/training-matrix`;

  const foundationUrl = `/foundation?signal=${encodeURIComponent(assessment.level)}&area=${encodeURIComponent(input.area ?? "")}`;

  function copyBrief() {
    const brief = [
      `Risk Assessment Brief`,
      `Score: ${assessment.score} (${assessment.level})`,
      `Confidence: ${assessment.confidence}`,
      `Site: ${input.siteName ?? "—"} | Area: ${input.area ?? "—"} | Workflow: ${input.workflow ?? "—"}`,
      ``,
      `Top driver: ${topDriver?.label ?? "—"}`,
      assessment.topDrivers.slice(1, 3).map((d) => `  - ${d.label}`).join("\n"),
      ``,
      `AI summary: ${assessment.explanation}`,
      ``,
      `Action timeframe: ${assessment.actionTimeframe.replace(/_/g, " ")}`,
      `Human review required: ${assessment.humanReviewRequired ? "Yes" : "No"}`,
    ].join("\n");
    navigator.clipboard.writeText(brief).then(() => {
      setCopied("brief");
      setTimeout(() => setCopied(null), 2500);
    });
  }

  return (
    <div className="ai-workflow-actions">
      <div className="ai-workflow-header">
        <Sparkles size={14} />
        <span>AI-generated next steps — review and act</span>
        <span className={`ai-workflow-level level-${assessment.level}`}>
          {assessment.actionTimeframe.replace(/_/g, " ")}
        </span>
      </div>
      <div className="ai-workflow-grid">
        <Link className="ai-workflow-btn" href={capaUrl}>
          <ClipboardList size={15} />
          <div>
            <strong>Create CAPA draft</strong>
            <span>Pre-filled from top driver</span>
          </div>
        </Link>
        <Link className="ai-workflow-btn" href={foundationUrl}>
          <ShieldCheck size={15} />
          <div>
            <strong>Log to compliance map</strong>
            <span>Add gap to Foundation</span>
          </div>
        </Link>
        {input.missingRequiredTraining && (
          <Link className="ai-workflow-btn ai-workflow-btn--warn" href={trainingUrl}>
            <Activity size={15} />
            <div>
              <strong>Schedule training review</strong>
              <span>Expired training detected</span>
            </div>
          </Link>
        )}
        <button className="ai-workflow-btn" type="button" onClick={copyBrief}>
          <FileText size={15} />
          <div>
            <strong>{copied === "brief" ? "Copied!" : "Copy assessment brief"}</strong>
            <span>Paste into email or report</span>
          </div>
        </button>
      </div>
      <p className="ai-workflow-guardrail">
        AI drafts actions for human review. These do not create records, approve documents, or certify compliance.
      </p>
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
      label: "Connected workspace",
      passed: Boolean(productionPanel.deploymentUrl),
      state: "deployment" as const,
      eventType: productionPanel.environment,
      timestamp: undefined,
      detail: productionPanel.deploymentUrl || "Workspace URL not configured"
    },
    {
      label: "Overall status",
      passed: productionPanel.productionReady,
      state: "decision" as const,
      eventType: productionPanel.productionReady ? "active" : "pending",
      timestamp: undefined,
      detail: productionPanel.productionReady ? "Your workspace has recent activity across all tracked areas." : "Complete your first workflow steps to mark this workspace active."
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
          <strong>Getting started</strong>
          {missingEvidence.length > 0 ? (
            <ul>
              {missingEvidence.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : (
            <p>All activity areas are covered. Your workspace status will update shortly.</p>
          )}
        </div>
      ) : null}
    </>
  );
}

function getWorkbenchTaskAgingClass(action: FoundationReviewActionSummary) {
  if (action.status === "complete") return "task-aging-completed";
  if (action.status === "blocked") return "task-aging-blocked";
  const dueState = getFieldReportDueState(action.dueDate);
  if (dueState === "unscheduled") return "task-aging-no-due-date";
  if (dueState === "overdue") return "task-aging-overdue";
  if (dueState === "due_soon") return "task-aging-due-soon";
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
