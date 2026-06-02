import { AppShell } from "@/components/AppShell";
import { WorkbenchClient } from "@/components/WorkbenchClient";
import {
  getAuditReadinessConsoleSummary,
  getFoundationAdminAccessSummary,
  getFoundationAssigneeOptions,
  getFoundationNotificationSummary,
  getFoundationProductionVerificationSummary,
  getFoundationReviewActionsSummary,
  getIntelligenceFoundationWorkbenchInput,
  listChangePlanItems,
  listAssessments,
  listDocuments
} from "@/lib/supabase/data";

/** Resolves all fetches in parallel; a single failure returns its fallback
 *  instead of crashing the whole page. */
function safeSettle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export default async function WorkbenchPage() {
  const [
    initialInput,
    foundationActions,
    adminAccess,
    assignees,
    notifications,
    productionVerification,
    assessments,
    documents,
    auditReadiness,
    changePlan
  ] = await Promise.all([
    safeSettle(getIntelligenceFoundationWorkbenchInput(), {
      signals: [],
      area: undefined,
      workflow: undefined
    } as Awaited<ReturnType<typeof getIntelligenceFoundationWorkbenchInput>>),
    safeSettle(getFoundationReviewActionsSummary(), []),
    safeSettle(getFoundationAdminAccessSummary(), {
      configured: false,
      signedIn: false,
      isOwner: false,
      message: "Could not load access summary."
    }),
    safeSettle(getFoundationAssigneeOptions(), []),
    safeSettle(getFoundationNotificationSummary(), { unreadCount: 0, notifications: [] }),
    safeSettle(getFoundationProductionVerificationSummary(), {
      environment: "unknown",
      deploymentUrl: "",
      productionReady: false,
      reason: "Could not load verification summary."
    }),
    safeSettle(listAssessments(), []),
    safeSettle(listDocuments(), []),
    safeSettle(getAuditReadinessConsoleSummary(), {
      latestScore: 0,
      trend: "not_enough_data" as const,
      recentScores: [],
      unresolvedGaps: [],
      generatedActions: [],
      notes: [],
      humanReviewStatus: "Draft - human review required",
      draftOnly: true
    }),
    safeSettle(listChangePlanItems(), {
      items: [],
      canManage: false,
      signedIn: false,
      isFallback: true,
      message: "Could not load change plan."
    })
  ]);

  const commandCenter = {
    assessmentCount: assessments.length,
    criticalRiskCount: assessments.filter((a) => a.level === "critical").length,
    pendingReviewCount: assessments.filter(
      (a) => a.humanReviewStatus === "draft_human_review_required"
    ).length,
    documentCount: documents.length,
    readinessScore: auditReadiness.latestScore,
    readinessTrend: auditReadiness.trend,
    hseSignalCount: initialInput.signals?.length ?? 0,
    openActionCount: foundationActions.length,
    changePlanItemCount: changePlan.items.length,
    changePlanHighPriorityCount: changePlan.items.filter((item) => item.priority === "High").length,
    changePlanPersisted: !changePlan.isFallback,
    bioRiskTrend:
      assessments.length < 2
        ? "not enough data"
        : assessments[0].score > assessments[1].score
          ? "increasing"
          : assessments[0].score < assessments[1].score
            ? "decreasing"
            : "steady",
    openActionTrend: foundationActions.length > 0 ? "active follow-up" : "clear",
    recentCriticalSignals: assessments
      .filter((a) => a.level === "critical" || a.humanReviewRequired)
      .slice(0, 3)
      .map((a) => `${a.workflow} / ${a.level}`),
    ownerMode: adminAccess.isOwner
  };

  return (
    <AppShell>
      <div className="page-stack">
        <WorkbenchClient
          assignees={assignees}
          canManageFoundationActions={adminAccess.signedIn}
          foundationActions={foundationActions}
          initialInput={initialInput}
          notifications={notifications}
          productionVerification={productionVerification}
          commandCenter={commandCenter}
        />
      </div>
    </AppShell>
  );
}
