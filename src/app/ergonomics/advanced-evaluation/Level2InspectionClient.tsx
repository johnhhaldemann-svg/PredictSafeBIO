"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ClipboardCheck, Ruler, ShieldCheck } from "lucide-react";
import { submitLevel2InspectionAction, type Level2InspectionActionState } from "@/app/ergonomics/actions";
import { ergonomicTaskTypes } from "@/lib/ergonomics/level1";
import { gripQualityOptions } from "@/lib/ergonomics/level2";
import type { ErgonomicLevel2LaunchContext } from "@/lib/supabase/data";

const initialState: Level2InspectionActionState = { ok: false };

export function Level2InspectionClient({ context }: { context: ErgonomicLevel2LaunchContext }) {
  const [state, action] = useActionState(submitLevel2InspectionAction, initialState);

  if (!context.allowed || !context.sourceContext) {
    return (
      <section className="panel level2-locked-panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Level 2 locked</p>
            <h2>Request or audit context required</h2>
            <p className="muted">{context.reason}</p>
          </div>
          <ShieldCheck size={22} />
        </div>
      </section>
    );
  }

  return (
    <section className="panel level2-form-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Guided Level 2 inspection</p>
          <h2>Measurement capture</h2>
          <p className="muted">This specialist/auditor workflow captures measurements only after a request or audit context.</p>
        </div>
        <Ruler size={24} />
      </div>

      <form action={action} className="level2-form">
        <input name="sourceContext" type="hidden" value={context.sourceContext} />
        <input name="requestId" type="hidden" value={context.requestId ?? ""} />

        <div className="form-grid">
          <label>
            Task type
            <select name="taskType" defaultValue={context.taskType}>
              {ergonomicTaskTypes.map((task) => (
                <option key={task.value} value={task.value}>
                  {task.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Grip quality
            <select name="gripQuality" defaultValue="fair">
              {gripQualityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Task description
          <input name="taskDescription" defaultValue={context.taskDescription} placeholder="Describe the measured task" />
        </label>

        <div className="form-grid">
          <label>
            Location
            <input name="location" defaultValue={context.location ?? ""} placeholder="Work area, room, site" />
          </label>
          <label>
            Department / trade
            <input name="departmentTrade" defaultValue={context.departmentTrade ?? ""} placeholder="Warehouse, lab, maintenance" />
          </label>
        </div>

        <div className="measurement-grid">
          <label>
            Load or force (lb)
            <input min="0" name="measuredLoadLbs" placeholder="Required" step="0.1" type="number" />
          </label>
          <label>
            Horizontal reach (in)
            <input min="0" name="horizontalReachIn" placeholder="Required" step="0.1" type="number" />
          </label>
          <label>
            Vertical hand height (in)
            <input min="0" name="verticalHandHeightIn" placeholder="Required" step="0.1" type="number" />
          </label>
          <label>
            Travel distance (in)
            <input min="0" name="travelDistanceIn" placeholder="Optional" step="0.1" type="number" />
          </label>
          <label>
            Frequency (reps/min)
            <input min="0" name="frequencyPerMinute" placeholder="Required" step="0.1" type="number" />
          </label>
          <label>
            Duration (minutes)
            <input min="0" name="taskDurationMinutes" placeholder="Required" step="1" type="number" />
          </label>
          <label>
            Asymmetry angle (degrees)
            <input min="0" name="asymmetryDegrees" placeholder="Optional" step="1" type="number" />
          </label>
          <label>
            Photo/evidence reference
            <input name="photoEvidenceLabel" placeholder="Photo set, file name, or note" />
          </label>
        </div>

        <label>
          Posture notes
          <textarea name="postureNotes" placeholder="Observed posture, reach, grip, twisting, floor conditions" rows={3} />
        </label>
        <label>
          Specialist review notes
          <textarea name="specialistNotes" placeholder="Required specialist/auditor notes" rows={4} />
        </label>
        <label>
          Formal recommendations
          <textarea name="formalRecommendations" placeholder="One recommendation per line" rows={4} />
        </label>

        <label className="check-row level2-check-row">
          <input name="correctiveActionRecommended" type="checkbox" />
          Recommend corrective-action review
        </label>

        <div className="form-actions">
          <SubmitLevel2Button />
          {state.message ? <p className={state.ok ? "save-message save-saved" : "save-message save-error"}>{state.message}</p> : null}
        </div>
      </form>
    </section>
  );
}

function SubmitLevel2Button() {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary large-action" disabled={pending} type="submit">
      <ClipboardCheck size={18} />
      {pending ? "Saving Level 2..." : "Submit Level 2 Inspection"}
    </button>
  );
}
