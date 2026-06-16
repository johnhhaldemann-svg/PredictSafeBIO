export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import {
  getAuthSummary,
  getFoundationAdminAccessSummary,
  getTrainingMatrixSummary,
} from "@/lib/supabase/data";
import TrainingMatrix from "@/components/TrainingMatrix";
import { createTrainingRequirementAction, assignTrainingToEmployeeAction, bulkAssignTrainingAction } from "./actions";

export const metadata: Metadata = { title: "Training Matrix – PredictSafe" };

function safeSettle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export default async function TrainingMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; success?: string }>;
}) {
  const params = await searchParams;

  const [summary, adminAccess, auth] = await Promise.all([
    safeSettle(getTrainingMatrixSummary(), {
      counts: [],
      readinessScore: 0,
      rows: [],
      changeImpacts: [],
      biotypeRequirements: [],
      employees: [],
      guardrailText: "Draft AI recommendation — human review required.",
    }),

    safeSettle(getFoundationAdminAccessSummary(), {
      configured: false,
      signedIn: false,
      isOwner: false,
      message: "",
    }),

    safeSettle(getAuthSummary(), {
      configured: false,
      signedIn: false,
      needsOnboarding: false,
    }),
  ]);

  const message = params.success
    ? `✓ ${params.success}`
    : params.message;

  return (
    <TrainingMatrix
      summary={summary}
      auth={{
        isSignedIn: adminAccess.signedIn,
        isOwner: adminAccess.isOwner,
        userEmail: auth.userEmail,
        fullName: auth.fullName,
        role: adminAccess.role,
      }}
      message={message}
      adminSection={
        adminAccess.isOwner ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <form action={createTrainingRequirementAction} className="stacked-form">
              <p className="section-label" style={{ marginBottom: 12 }}>
                Add training requirement
              </p>
              <label>
                Title
                <input name="title" type="text" placeholder="Annual Biosafety Training" required />
              </label>
              <div className="form-grid">
                <label>
                  Assigned role
                  <input name="roleKey" type="text" placeholder="e.g. Biosafety Officer" />
                </label>
                <label>
                  Frequency (months)
                  <input name="frequencyMonths" type="number" min={1} max={60} placeholder="12" />
                </label>
              </div>
              <button className="button-primary" type="submit">
                Add requirement
              </button>
            </form>

            <div style={{ borderTop: '1px solid var(--cline)', paddingTop: 20 }}>
              <p className="section-label" style={{ marginBottom: 12 }}>
                Assign training to employee
              </p>
              {summary.employees.length === 0 || summary.rows.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--cink3)', fontStyle: 'italic' }}>
                  {summary.employees.length === 0
                    ? 'No team members yet — members appear here once they join the workspace.'
                    : 'No training requirements yet — add one above first.'}
                </p>
              ) : (
                <form action={assignTrainingToEmployeeAction} className="stacked-form">
                  <div className="form-grid">
                    <label>
                      Employee
                      <select name="employeeId" required>
                        <option value="">Select employee…</option>
                        {summary.employees.map(e => (
                          <option key={e.userId} value={e.userId}>{e.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Training requirement
                      <select name="requirementId" required>
                        <option value="">Select training…</option>
                        {summary.rows.map(r => (
                          <option key={r.id} value={r.id}>{r.requirement}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Due date (optional)
                    <input name="dueDate" type="date" />
                  </label>
                  <button className="button-primary" type="submit">
                    Assign training
                  </button>
                </form>
              )}
            </div>

            {summary.employees.length > 0 && summary.rows.length > 0 && (
              <div style={{ borderTop: '1px solid var(--cline)', paddingTop: 20 }}>
                <p className="section-label" style={{ marginBottom: 12 }}>
                  Bulk assign training
                </p>
                <form action={bulkAssignTrainingAction} className="stacked-form">
                  <label>
                    Training requirement
                    <select name="requirementId" required>
                      <option value="">Select training…</option>
                      {summary.rows.map(r => (
                        <option key={r.id} value={r.id}>{r.requirement}</option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--cink3)', marginBottom: 8 }}>Assign to employees</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {summary.employees.map(e => (
                        <label key={e.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                          <input type="checkbox" name="employeeIds[]" value={e.userId} />
                          {e.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label>
                    Due date (optional)
                    <input name="dueDate" type="date" />
                  </label>
                  <button className="button-primary" type="submit">
                    Bulk assign
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : undefined
      }
    />
  );
}
