"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle2, ChevronLeft, Plus, Save, Sparkles
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import type { BioAiInput, BioSignalType } from "@/lib/bio-ai/types";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const emptyInput: BioAiInput = {
  siteName: "",
  area: "",
  workflow: "",
  controlEffectiveness: "unknown",
  dataCompleteness: 0.75,
  signals: [],
};

const signalTypes: BioSignalType[] = [
  "contamination_event",
  "biosafety_event",
  "data_integrity",
  "equipment_event",
  "sample_chain_of_custody",
  "change_control",
  "training_gap",
  "sop_gap",
];

const signalTypeLabels: Partial<Record<BioSignalType, string>> = {
  contamination_event:    "Contamination Event",
  biosafety_event:        "Biosafety Event",
  data_integrity:         "Data Integrity Issue",
  equipment_event:        "Equipment / Instrument Event",
  sample_chain_of_custody:"Sample Chain of Custody",
  change_control:         "Change Control",
  training_gap:           "Training Gap",
  sop_gap:                "SOP / Procedure Gap",
};

function signalLabel(type: BioSignalType) {
  return signalTypeLabels[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const signalPresets = [
  { type: "contamination_event"  as BioSignalType, label: "Microbial growth in control sample",          evidence: "Unexpected growth observed in assay control; investigation not complete." },
  { type: "data_integrity"       as BioSignalType, label: "Missing second-person review signature",      evidence: "Review signature absent from the incident, exposure, or inspection record." },
  { type: "equipment_event"      as BioSignalType, label: "Equipment out of calibration tolerance",      evidence: "Calibration certificate expired or instrument reading outside tolerance." },
  { type: "training_gap"         as BioSignalType, label: "Expired critical SOP training record",        evidence: "Staff training record for critical procedure has lapsed." },
  { type: "sop_gap"              as BioSignalType, label: "Procedure deviation identified",              evidence: "Step was performed out of sequence or SOP not followed as written." },
  { type: "biosafety_event"      as BioSignalType, label: "Uncontained biological material exposure",    evidence: "Potential exposure event logged; containment review in progress." },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewAssessmentClient() {
  const router = useRouter();
  const [input, setInput] = useState<BioAiInput>(emptyInput);
  const [signalType, setSignalType] = useState<BioSignalType>("contamination_event");
  const [customLabel, setCustomLabel] = useState("");
  const [customEvidence, setCustomEvidence] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "blocked" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assessment = useMemo(() => assessBioRisk(input), [input]);

  function pulseAnalysis() {
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    setIsAnalyzing(true);
    analysisTimeoutRef.current = setTimeout(() => setIsAnalyzing(false), 600);
  }

  function set<K extends keyof BioAiInput>(key: K, value: BioAiInput[K]) {
    pulseAnalysis();
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function addPreset(preset: typeof signalPresets[number]) {
    pulseAnalysis();
    setInput((prev) => ({
      ...prev,
      signals: [
        ...(prev.signals ?? []),
        {
          type: preset.type,
          label: preset.label,
          severity: preset.type === "contamination_event" || preset.type === "biosafety_event" ? "high" : "medium",
          evidence: preset.evidence,
          status: "open" as const,
        },
      ],
    }));
  }

  function addCustomSignal() {
    if (!customLabel.trim()) return;
    pulseAnalysis();
    setInput((prev) => ({
      ...prev,
      signals: [
        ...(prev.signals ?? []),
        {
          type: signalType,
          label: customLabel.trim(),
          severity: signalType === "contamination_event" || signalType === "biosafety_event" ? "high" : "medium",
          evidence: customEvidence.trim(),
          status: "open" as const,
        },
      ],
    }));
    setCustomLabel("");
    setCustomEvidence("");
  }

  function removeSignal(index: number) {
    pulseAnalysis();
    setInput((prev) => ({
      ...prev,
      signals: (prev.signals ?? []).filter((_, i) => i !== index),
    }));
  }

  async function saveAssessment() {
    setSaveState("saving");
    setSaveMessage("Saving…");
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { ok: boolean; id?: string; message?: string };

      if (data.ok && data.id) {
        setSaveState("saved");
        setSaveMessage("Saved. Redirecting…");
        router.push(`/assessments/${data.id}`);
        return;
      }

      setSaveState(res.status === 401 ? "blocked" : "error");
      setSaveMessage(
        res.status === 401
          ? "Sign in to save assessments."
          : data.message ?? "Could not save assessment."
      );
    } catch (err) {
      setSaveState("error");
      setSaveMessage(err instanceof Error ? err.message : "Could not save assessment.");
    }
  }

  return (
    <div className="page-stack">

        {/* Header */}
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Assess</p>
            <h1>New BioRisk Assessment</h1>
          </div>
          <Link className="button-secondary" href="/assessments">
            <ChevronLeft size={15} />
            Back to Risk Register
          </Link>
        </header>

        {/* Draft banner */}
        <div className="draft-banner">
          <AlertTriangle size={16} />
          Draft — Human Review Required. AI may recommend; EHS personnel must review and approve.
        </div>

        <div className="workbench-grid">

          {/* ── Left: Input form ── */}
          <section className="panel intake-panel" aria-labelledby="intake-title">
            <div className="panel-heading">
              <div>
                <p className="section-label">BioRisk Engine</p>
                <h2 id="intake-title">Assessment Details</h2>
              </div>
              {isAnalyzing && (
                <span className="ai-analyzing">
                  <span className="ai-pulse" aria-hidden="true" />
                  AI analyzing…
                </span>
              )}
            </div>

            {/* Context fields */}
            <div className="form-grid">
              <span className="form-section-label">Site context</span>
              <label>
                Facility / Site
                <input
                  placeholder="e.g. Main Biotech Facility"
                  value={input.siteName ?? ""}
                  onChange={(e) => set("siteName", e.target.value)}
                />
              </label>
              <label>
                Lab / Area
                <input
                  placeholder="e.g. QC Microbiology Lab"
                  value={input.area ?? ""}
                  onChange={(e) => set("area", e.target.value)}
                />
              </label>
              <label>
                Workflow / Process
                <input
                  placeholder="e.g. Aseptic work and containment review"
                  value={input.workflow ?? ""}
                  onChange={(e) => set("workflow", e.target.value)}
                />
              </label>

              <span className="form-section-label">Control status</span>
              <label>
                Control effectiveness
                <select
                  value={input.controlEffectiveness ?? "unknown"}
                  onChange={(e) => set("controlEffectiveness", e.target.value as BioAiInput["controlEffectiveness"])}
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
                    type="range" min="0" max="100" step="5"
                    value={Math.round((input.dataCompleteness ?? 0) * 100)}
                    onChange={(e) => set("dataCompleteness", Number(e.target.value) / 100)}
                  />
                  <span className="slider-val">{Math.round((input.dataCompleteness ?? 0) * 100)}%</span>
                </div>
              </label>
            </div>

            {/* Risk flags */}
            <div className="toggle-grid">
              {([
                ["contaminationSuspected",       "Contamination / release suspected"],
                ["biosafetyImpactPotential",      "Biosafety impact potential"],
                ["regulatoryImpactPotential",     "Regulatory impact potential"],
                ["missingRequiredTraining",       "Expired critical training"],
                ["unapprovedChange",              "Unapproved validated change"],
                ["outOfToleranceEquipment",       "Equipment out of tolerance"],
                ["chainOfCustodyGap",             "Chain of custody gap"],
              ] as [keyof BioAiInput, string][]).map(([key, labelText]) => (
                <label className="check-row" key={key}>
                  <input
                    type="checkbox"
                    checked={Boolean(input[key])}
                    onChange={(e) => set(key, e.target.checked as never)}
                  />
                  <span>{labelText}</span>
                </label>
              ))}
            </div>

            {/* Signal builder */}
            <div className="signal-builder">
              <div className="panel-heading">
                <h2>Add risk signals</h2>
                <span className="signal-count muted">
                  {input.signals?.length ?? 0} added
                </span>
              </div>

              {/* Quick presets */}
              <p className="muted">Quick add:</p>
              <div className="signal-presets">
                {signalPresets.map((p) => (
                  <button key={p.label} className="signal-preset-chip" type="button" onClick={() => addPreset(p)} title={p.evidence}>
                    <Plus size={11} />
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom signal */}
              <p className="muted">Or describe a custom signal:</p>
              <label>
                Signal type
                <select value={signalType} onChange={(e) => setSignalType(e.target.value as BioSignalType)}>
                  {signalTypes.map((t) => <option value={t} key={t}>{signalLabel(t)}</option>)}
                </select>
              </label>
              <label>
                Description
                <input
                  placeholder="What was observed…"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                />
              </label>
              <label>
                Evidence
                <textarea
                  placeholder="Supporting detail, record IDs, timestamps…"
                  value={customEvidence}
                  onChange={(e) => setCustomEvidence(e.target.value)}
                  rows={2}
                />
              </label>
              <button className="button-secondary" type="button" onClick={addCustomSignal} disabled={!customLabel.trim()}>
                <Plus size={15} /> Add signal
              </button>

              {/* Signal list */}
              {(input.signals?.length ?? 0) > 0 && (
                <ul className="signal-list">
                  {input.signals?.map((sig, i) => (
                    <li key={i} className="signal-item">
                      <div className="signal-item-body">
                        <strong>{sig.label}</strong>
                        <span className="muted"> · {signalLabel(sig.type)}</span>
                      </div>
                      <button type="button" onClick={() => removeSignal(i)} className="signal-remove-btn" aria-label="Remove signal">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ── Right: Live result ── */}
          <section className="panel result-panel" aria-labelledby="result-title">
            <div className="panel-heading">
              <div>
                <p className="section-label">Predictive Risk Alerts</p>
                <h2 id="result-title">AI Risk Analysis</h2>
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
                {assessment.topDrivers.map((d) => (
                  <li key={d.label}>
                    <strong>{d.label}</strong>
                    <span>{d.explanation}</span>
                  </li>
                ))}
              </ul>
            </div>

            {assessment.criticalControlGaps.length > 0 && (
              <div className="result-section">
                <h3>Critical gaps</h3>
                <ul>
                  {assessment.criticalControlGaps.slice(0, 5).map((g) => <li key={g}>{g}</li>)}
                </ul>
              </div>
            )}

            {assessment.recommendedActions.length > 0 && (
              <div className="result-section">
                <h3>Recommended actions</h3>
                <div className="action-list compact-list">
                  {assessment.recommendedActions.slice(0, 4).map((a) => (
                    <article className="action-row" key={a.title}>
                      <div>
                        <strong>{a.title}</strong>
                        <span>{a.ownerRole}</span>
                      </div>
                      <p>{a.reason}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Save */}
            <div className="audit-preview">
              <h3>Save to Risk Register</h3>
              <p className="muted">
                Saves score {assessment.score} ({assessment.level}), confidence {assessment.confidence}, and logs an audit event.
              </p>
              <button
                className="button-primary"
                type="button"
                onClick={saveAssessment}
                disabled={saveState === "saving" || saveState === "saved"}
              >
                <Save size={16} />
                {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved!" : "Save assessment"}
              </button>

              {saveMessage && (
                <p className={`save-message save-${saveState}`}>{saveMessage}</p>
              )}

              {saveState === "blocked" && (
                <div className="save-actions">
                  <Link className="button-secondary compact" href="/login?next=/assessments/new">Sign in</Link>
                  <Link className="button-primary compact" href="/onboarding">Onboarding</Link>
                </div>
              )}
            </div>

            {/* Guardrail */}
            <div className="guardrail-box">
              <CheckCircle2 size={18} />
              <span>{draftAiRecommendationGuardrail}</span>
            </div>
            <div className="source-box">
              <Sparkles size={18} />
              <span>AI analysis is a draft. Severity classification and corrective action decisions require qualified EHS review.</span>
            </div>
          </section>
        </div>
    </div>
  );
}
