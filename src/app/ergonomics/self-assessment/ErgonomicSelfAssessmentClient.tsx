"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Ban,
  BriefcaseMedical,
  CheckCircle2,
  CircleAlert,
  Clock,
  Frown,
  Hand,
  Meh,
  MoreHorizontal,
  MoveUp,
  Package,
  Repeat2,
  ShieldCheck,
  ShoppingCart,
  Smile,
  Sparkles,
  User,
  Users,
  Wrench
} from "lucide-react";
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
  const [draftDirty, setDraftDirty] = useState(false);
  const result = useMemo(() => scoreErgonomicLevel1(draft), [draft]);

  // Hide post-submission banners once the user edits the form again
  const showSubmissionBanners = !draftDirty;

  const markDirty = () => setDraftDirty(true);

  const setBodyPart = (part: ErgonomicBodyPart, checked: boolean) => {
    markDirty();
    setDraft((current) => {
      const nextParts = checked ? [...current.bodyParts, part] : current.bodyParts.filter((item) => item !== part);
      const normalized = normalizeBodyParts(part === "none" && checked ? ["none"] : nextParts.filter((item) => item !== "none"));
      return { ...current, bodyParts: normalized.length > 0 ? normalized : ["none"] };
    });
  };

  return (
    <div className="ergonomic-screening-grid">
      <section className="panel ergonomic-form-panel">
        <form action={submitAction} className="ergonomic-form" onSubmit={() => setDraftDirty(false)}>
          <fieldset>
            <legend>1. What type of work are you doing?</legend>
            <div className="option-grid task-option-grid">
              {ergonomicTaskTypes.map((option) => (
                <label className={`option-tile task-card task-${option.value}`} key={option.value}>
                  <input
                    checked={draft.taskType === option.value}
                    name="taskType"
                    onChange={() => { markDirty(); setDraft((current) => ({ ...current, taskType: option.value })); }}
                    type="radio"
                    value={option.value}
                  />
                  <span className="option-icon option-visual">{taskIcon(option.value)}</span>
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>2. How does this task feel on your body?</legend>
            <div className="option-grid discomfort-grid">
              {ergonomicDiscomfortLevels.map((option) => (
                <label className={`option-tile discomfort-card discomfort-card-${option.value}`} key={option.value}>
                  <input
                    checked={draft.discomfortLevel === option.value}
                    name="discomfortLevel"
                    onChange={() => { markDirty(); setDraft((current) => ({ ...current, discomfortLevel: option.value })); }}
                    type="radio"
                    value={option.value}
                  />
                  <span className={`option-icon option-visual discomfort-${option.value}`}>{discomfortIcon(option.value)}</span>
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>3. Which parts of your body feel the strain?</legend>
            <div className="option-grid body-grid">
              {ergonomicBodyParts.map((option) => (
                <label className="option-tile body-card" key={option.value}>
                  <input
                    checked={draft.bodyParts.includes(option.value)}
                    name="bodyParts"
                    onChange={(event) => setBodyPart(option.value, event.target.checked)}
                    type="checkbox"
                    value={option.value}
                  />
                  <span className="option-icon compact-icon option-visual">{bodyIcon(option.value)}</span>
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>4. How often do you do this task?</legend>
            <div className="option-grid frequency-grid">
              {ergonomicFrequencies.map((option) => (
                <label className="option-tile frequency-card" key={option.value}>
                  <input
                    checked={draft.frequency === option.value}
                    name="frequency"
                    onChange={() => { markDirty(); setDraft((current) => ({ ...current, frequency: option.value })); }}
                    type="radio"
                    value={option.value}
                  />
                  <span className="frequency-label">{option.label}</span>
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
            5. Any additional comments?
            <textarea
              name="comments"
              onChange={(event) => setDraft((current) => ({ ...current, comments: event.target.value }))}
              placeholder="Type your comments here..."
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
            <p className="section-label">Your Results</p>
            <h2>{riskLabel(result.riskLevel)}</h2>
          </div>
          <span className={`risk-shield ${riskClass(result.riskLevel)}`}>
            <ShieldCheck size={24} />
          </span>
        </div>

        <div className={`ergo-risk-card ${riskClass(result.riskLevel)}`}>
          <span className="ergo-risk-score">{result.riskScore}</span>
          <div>
            <p className="score-label">{riskLabel(result.riskLevel)}</p>
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
          <ul className="next-step-list">
            {result.recommendedNextSteps.map((step) => (
              <li key={step}>
                <span>{nextStepIcon(result.riskLevel)}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ul>
        </section>

        {showSubmissionBanners && assessmentState.correctiveActionRecommended ? (
          <div className="draft-banner">
            <AlertTriangle size={18} />
            Corrective-action review was recommended from this Level 1 screening.
          </div>
        ) : null}

        {showSubmissionBanners && assessmentState.level2AutoAssigned ? (
          <div className="draft-banner draft-banner-level2">
            <AlertTriangle size={18} />
            <span>
              <strong>Level 2 auto-assigned.</strong> Risk score exceeded threshold — a qualified evaluator (workspace owner) must complete the Level 2 measurement inspection.
              {assessmentState.level2RequestId ? (
                <>
                  {" "}
                  <Link href={`/ergonomics/advanced-evaluation?requestId=${assessmentState.level2RequestId}`}>
                    Open Level 2 →
                  </Link>
                </>
              ) : null}
            </span>
          </div>
        ) : null}
      </aside>

      <aside className="ergonomic-side-rail" aria-label="SafePredict ergonomic insight and advanced evaluation">
        <section className="panel insight-panel">
          <div className="panel-heading compact-heading">
            <div>
              <p className="section-label">SafePredict AI Insight</p>
              <h2>Pattern signal</h2>
            </div>
            <Sparkles size={20} />
          </div>
          <p>{result.aiInsight}</p>
          <ul className="insight-list">
            <li>
              <CheckCircle2 size={18} />
              Identify patterns and trends across your workforce
            </li>
            <li>
              <CheckCircle2 size={18} />
              Connect similar tasks and discomfort reports
            </li>
            <li>
              <CheckCircle2 size={18} />
              Determine when higher-level ergonomic review is needed
            </li>
          </ul>
        </section>

        <section className="panel advanced-panel">
          <div className="panel-heading compact-heading">
            <div>
              <p className="section-label">Need a deeper evaluation?</p>
              <h2>Level 2 request</h2>
            </div>
            <BriefcaseMedical size={20} />
          </div>
          <p>
            If symptoms continue or the task feels worse, request an advanced ergonomic evaluation with measurements and photos.
            Level 2 is separate from this Level 1 screening and requires a qualified evaluator to complete.
          </p>
          {showSubmissionBanners && assessmentState.level2AutoAssigned && assessmentState.level2RequestId ? (
            <div className="advanced-request-form">
              <p className="save-message save-saved">
                Level 2 already auto-assigned for this screening.
              </p>
              <Link className="button-primary large-action" href={`/ergonomics/advanced-evaluation?requestId=${assessmentState.level2RequestId}`}>
                Open Level 2 Measurement Inspection
              </Link>
            </div>
          ) : showSubmissionBanners && assessmentState.assessmentId ? (
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
              {advancedState.requestId ? (
                <Link className="button-primary large-action" href={`/ergonomics/advanced-evaluation?requestId=${advancedState.requestId}`}>
                  Open Level 2 Measurement Inspection
                </Link>
              ) : null}
            </form>
          ) : (
            <p className="muted">Save the Level 1 screening first to request Level 2.</p>
          )}
          <div className="level-two-note">
            <ShieldCheck size={16} />
            Level 2 requires a qualified evaluator account (workspace owner). It may include measurements, photos, industrial ergonomic equation data points, specialist review, formal recommendations, and corrective actions.
          </div>
        </section>
      </aside>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary large-action" disabled={pending} type="submit">
      <span>
        {pending ? "Saving screening..." : "Submit Assessment"}
        <small>See your results and recommendations</small>
      </span>
      <ArrowRight size={22} />
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

function taskIcon(value: ErgonomicTaskType) {
  if (value === "lifting") return <Package size={30} />;
  if (value === "pushing_pulling") return <ShoppingCart size={30} />;
  if (value === "reaching_overhead") return <MoveUp size={30} />;
  if (value === "repetitive_work") return <Repeat2 size={30} />;
  return <MoreHorizontal size={30} />;
}

function discomfortIcon(value: ErgonomicDiscomfortLevel) {
  if (value === "easy") return <Smile size={34} />;
  if (value === "somewhat_tiring") return <Meh size={34} />;
  if (value === "very_tiring") return <Frown size={34} />;
  return <CircleAlert size={34} />;
}

function bodyIcon(value: ErgonomicBodyPart) {
  if (value === "back") return <User size={20} />;
  if (value === "shoulders") return <Users size={20} />;
  if (value === "neck") return <User size={20} />;
  if (value === "arms") return <Wrench size={20} />;
  if (value === "hands_wrists") return <Hand size={20} />;
  if (value === "legs") return <MoveUp size={20} />;
  return <Ban size={20} />;
}

function nextStepIcon(level: string) {
  if (level === "low") return <CheckCircle2 size={20} />;
  if (level === "moderate") return <Clock size={20} />;
  if (level === "high") return <Wrench size={20} />;
  return <AlertTriangle size={20} />;
}

function riskLabel(level: string) {
  if (level 