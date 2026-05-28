"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Beaker, CheckCircle2, ClipboardList, Save, Sparkles } from "lucide-react";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import type { BioAiInput, BioSignalType } from "@/lib/bio-ai/types";
import { StatusBadge } from "./StatusBadge";

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

export function WorkbenchClient({ initialInput = starterInput }: { initialInput?: BioAiInput }) {
  const [input, setInput] = useState<BioAiInput>(initialInput);
  const [signalType, setSignalType] = useState<BioSignalType>("contamination_event");
  const [signalLabel, setSignalLabel] = useState("Unexpected microbial growth in assay control");
  const [evidence, setEvidence] = useState("Assay control showed unexpected growth; investigation not complete.");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "blocked" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("Assessment has not been saved yet.");
  const assessment = useMemo(() => assessBioRisk(input), [input]);

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
    <div className="workbench-grid">
      <section className="panel intake-panel" aria-labelledby="intake-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">AI Engine Workbench</p>
            <h1 id="intake-title">Biotech risk intake</h1>
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
            <p className="section-label">Deterministic result</p>
            <h2 id="result-title">Risk assessment</h2>
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
  );
}
