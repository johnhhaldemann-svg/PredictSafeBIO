export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import {
  getAuthSummary,
  getFoundationAdminAccessSummary,
  getTrainingMatrixSummary,
} from "@/lib/supabase/data";
import TrainingMatrix from "@/components/TrainingMatrix";
import { createTrainingRequirementAction } from "./actions";

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
        ) : undefined
      }
    />
  );
}
