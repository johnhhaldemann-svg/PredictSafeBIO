"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardCheck, HeartPulse, ShieldCheck } from "lucide-react";
import {
  requestAdvancedEvaluationAction,
  submitErgonomicSelfAssessmentAction,
  type AdvancedEvaluationActionState,
  type ErgonomicAssessmentActionState
} from "@/app/ergonomics/actions";
import {
  ergonomicBodyParts,
  ergonomicDiscomfortLevels,
  ergonomicFrequencies,
  ergonomicLabel,
  ergonomicTaskTypes,
  normalizeBodyParts,
  scoreErgonomicLevel1,
  type ErgonomicBodyPart,
  type ErgonomicDiscomfortLevel,
  type ErgonomicFrequency,
  type ErgonomicTaskType
} from "@/lib/ergonomics/level1";

const initialAssessmentState: ErgonomicAssessmentActionState = { ok: false };
const initialAdvancedState: AdvancedEvaluationActionState = { ok: false };

type DraftInput = {
  taskType: ErgonomicTaskType;
  discomfortLevel: ErgonomicDiscomfortLevel;
  bodyParts: ErgonomicBodyPart[];
  frequency: ErgonomicFrequency;
  comments: string;
  location: string;
  departmentTrade: string;
};

const defaultInput: DraftInput = {
  taskType: "lifting",
  discomfortLevel: "easy",
  bodyParts: ["none"],
  frequency: "rarely",
  comments: "",
  location: "",
  departmentTrade: ""
};

export function ErgonomicSelfAssessmentClient() {
  const [assessmentState, submitAction] = useActionState(submitErgonomicSelfAssessmentAction, initialAssessmentState);
  const [advancedState, requestAction] = useActionState(requestAdvancedEvaluationAction, initialAdvancedState);
  const [draft, setDraft] = useState<DraftInput>(defaultInput);
  const result = useMemo(() => scoreErgonomicLevel1(draft), [draft]);

  const setBodyPart = (part: ErgonomicBodyPart, checked: boolean) => {
    setDraft((current) => {
      const nextParts = checked ? [...current.bodyParts, part] : current.bodyParts.filter((item) => item !== part);
      const normalized = normalizeBodyParts(part === "none" && checked ? ["none"] : nextParts.filter((item) => item !== "none"));
      return { ...current, bodyParts: normalized.length > 0 ? normalized : ["none"] };
    });
  };

  return (
    <div className="ergonomic-screening-grid">
      <section className="panel ergonomic-form-panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Ergonomic Self-Assessment - Level 1 Screening</p>
            <h2>Basic worker screening</h2>
            <p className="muted">No measurements are needed. Advanced equation work belongs in Level 2 after review.</p>
          </div>
          <HeartPulse size={24} />
        </div>

        <form action={submitAction} className="ergonomic-form">
          <fieldset>
            <legend>Task type</legend>
            <div className="option-grid">
              {ergonomicTaskTypes.map((option) => (
                <label className="option-tile" key={option.value}>
                  <input
                    checked={draft.taskType === option.value}
                    name="taskType"
                    onChange={() => setDraft((current) => ({ ...current, taskType: option.value }))}
                    type="radio"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>How does this task feel on your body?</legend>
            <div className="option-grid single-column">
              {ergonomicDiscomfortLevels.map((option) => (
                <label className="option-tile" key={option.value}>
                  <input
                    checked={draft.discomfortLevel === option.value}
                    name="discomfortLevel"
                    onChange={() => setDraft((current) => ({ ...current, discomfortLevel: option.value }))}
                    type="radio"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Which body parts feel the strain?</legend>
            <div className="option-grid">
              {ergonomicBodyParts.map((option) => (
                <label className="option-tile" key={option.value}>
                  <input
                    checked={draft.bodyParts.includes(option.value)}
                    name="bodyParts"
                    onChange={(event) => setBodyPart(option.value, event.target.checked)}
                    type="checkbox"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>How often do you do this task?</legend>
            <div className="option-grid single-column">
              {ergonomicFrequencies.map((option) => (
                <label className="option-tile" key={option.value}>
                  <input
                    checked={draft.frequency === option.value}
                    name="frequency"
                    onChange={() => setDraft((current) => ({ ...current, frequency: option.value }))}
                    type="radio"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="form-grid">
            <label>
              Location, if available
              <input
                name="location"
                onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                placeholder="Work area, site, vehicle, room"
                value={draft.location}
              />
            </label>
            <label>
              Department / trade, if available
              <input
                name="departmentTrade"
                onChange={(event) => setDraft((current) => ({ ...current, departmentTrade: event.target.value }))}
                placeholder="Warehouse, lab, maintenance"
                value={draft.departmentTrade}
              />
            </label>
          </div>

          <label>
            Additional comments
            <textarea
              name="comments"
              onChange={(event) => setDraft((current) => ({ ...current, comments: event.target.value }))}
              placeholder="Optional"
              rows={4}
              value={draft.comments}
            />
          </label>

          <div className="form-actions">
            <SubmitButton />
            {assessmentState.message ? (
              <p className={assessmentState.ok ? "save-message save-saved" : "save-message save-error"}>{assessmentState.message}</p>
            ) : null}
          </div>
        </form>
      </section>

      <aside className="panel ergonomic-result-panel" aria-label="Ergonomic Level 1 result">
        <div className="panel-heading">
          <div>
            <p className="section-label">Level 1 Result</p>
            <h2>{riskLabel(result.riskLevel)}</h2>
          </div>
          <span className={`status-badge ${riskClass(result.riskLevel)}`}>{result.riskLevel}</span>
        </div>

        <div className="score-wrap">
          <span className="score">{result.riskScore}</span>
          <div>
            <p className="score-label">Level 1 score / 9</p>
            <p className="muted">{result.meaning}</p>
          </div>
        </div>

        <section className="result-section">
          <h3>Main risk drivers</h3>
          <ul>
            {result.mainRiskDrivers.map((driver) => (
              <li key={driver}>{driver}</li>
            ))}
          </ul>
        </section>

        <section className="result-section">
          <h3>Recommended next steps</h3>
          <ul>
            {result.recommendedNextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>

        <div className="guardrail-box">
          <ShieldCheck size={18} />
          <span>{result.aiInsight}</span>
        </div>

        {assessmentState.correctiveActionRecommended ? (
          <div className="draft-banner">
            <AlertTriangle size={18} />
            Corrective-action review was recommended from this Level 1 screening.
          </div>
        ) : null}

        {assessmentState.assessmentId ? (
          <form action={requestAction} className="advanced-request-form">
            <input name="assessmentId" type="hidden" value={assessmentState.assessmentId} />
            <input
              name="reason"
              type="hidden"
              value={`Level 2 requested from ${riskLabel((assessmentState.riskLevel ?? result.riskLevel).toString())} Level 1 ergonomic screening.`}
            />
            <AdvancedRequestButton />
            {advancedState.message ? (
              <p className={advancedState.ok ? "save-message save-saved" : "save-message save-error"}>{advancedState.message}</p>
            ) : null}
          </form>
        ) : (
          <div className="source-context">
            <h2>Request Advanced Evaluation</h2>
            <p className="muted">Save the Level 1 screening first. Level 2 is separate and may include measurements, photos, equation data points, specialist review, formal recommendations, and corrective actions.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary large-action" disabled={pending} type="submit">
      <ClipboardCheck size={18} />
      {pending ? "Saving screening..." : "Submit Level 1 Screening"}
    </button>
  );
}

function AdvancedRequestButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button-secondary large-action" disabled={pending} type="submit">
      <ArrowUpRight size={18} />
      {pending ? "Requesting..." : "Request Advanced Evaluation"}
    </button>
  );
}

function riskLabel(level: string) {
  if (level === "low") return "Low Risk";
  if (level === "moderate") return "Moderate Risk";
  if (level === "high") return "High Risk";
  if (level === "severe") return "Severe Risk";
  return ergonomicLabel("task", level);
}

function riskClass(level: string) {
  if (level === "low") return "status-low";
  if (level === "moderate") return "status-moderate";
  if (level === "high") return "status-high";
  return "status-critical";
}
