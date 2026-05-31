import { AppShell } from "@/components/AppShell";
import { WorkbenchClient } from "@/components/WorkbenchClient";
import {
  getAuditReadinessConsoleSummary,
  getFoundationAdminAccessSummary,
  getFoundationAssigneeOptions,
  getFoundationProductionVerificationSummary,
  getFoundationReviewActionsSummary,
  getIntelligenceFoundationWorkbenchInput,
  listChangePlanItems,
  listAssessments,
  listDocuments
} from "@/lib/supabase/data";

export default async function WorkbenchPage() {
  const [initialInput, foundationActions, adminAccess, assignees, productionVerification, assessments, documents, auditReadiness, changePlan] = await Promise.all([
    getIntelligenceFoundationWorkbenchInput(),
    getFoundationReviewActionsSummary(),
    getFoundationAdminAccessSummary(),
    getFoundationAssigneeOptions(),
    getFoundationProductionVerificationSummary(),
    listAssessments(),
    listDocuments(),
    getAuditReadinessConsoleSummary(),
    listChangePlanItems()
  ]);
  const commandCenter = {
    assessmentCount: assessments.length,
    criticalRiskCount: assessments.filter((assessment) => assessment.level === "critical").length,
    pendingReviewCount: assessments.filter((assessment) => assessment.humanReviewStatus === "draft_human_review_required").length,
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
      .filter((assessment) => assessment.level === "critical" || assessment.humanReviewRequired)
      .slice(0, 3)
      .map((assessment) => `${assessment.workflow} / ${assessment.level}`),
    ownerMode: adminAccess.isOwner
  };

  return (
    <AppShell>
      <div className="page-stack">
        <WorkbenchClient
          assignees={assignees}
          canManageFoundationActions={adminAccess.isOwner}
          foundationActions={foundationActions}
          initialInput={initialInput}
          productionVerification={productionVerification}
          commandCenter={commandCenter}
        />
      </div>
    </AppShell>
  );
}
