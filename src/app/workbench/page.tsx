import { AppShell } from "@/components/AppShell";
import { WorkbenchClient } from "@/components/WorkbenchClient";
import {
  getAuditReadinessConsoleSummary,
  getFoundationAdminAccessSummary,
  getFoundationReviewActionsSummary,
  getIntelligenceFoundationWorkbenchInput,
  listChangePlanItems,
  listAssessments,
  listDocuments
} from "@/lib/supabase/data";

export default async function WorkbenchPage() {
  const [initialInput, foundationActions, adminAccess, assessments, documents, auditReadiness, changePlan] = await Promise.all([
    getIntelligenceFoundationWorkbenchInput(),
    getFoundationReviewActionsSummary(),
    getFoundationAdminAccessSummary(),
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
    ownerMode: adminAccess.isOwner
  };

  return (
    <AppShell>
      <div className="page-stack">
        <WorkbenchClient foundationActions={foundationActions} initialInput={initialInput} commandCenter={commandCenter} />
      </div>
    </AppShell>
  );
}
