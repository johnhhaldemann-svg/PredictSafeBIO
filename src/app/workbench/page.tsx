export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
  listDocuments,
} from "@/lib/supabase/data";
import { getAuthSummary } from "@/lib/supabase/account-service";
import { isPlatformRole } from "@/lib/role-permissions";

export const metadata: Metadata = { title: "Workbench – PredictSafeBIO" };

function safeSettle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export default async function WorkbenchPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params?.tab === "risk-register" ? "risk-register" : "command-center";
  const auth = await safeSettle(getAuthSummary(), {
    configured: false,
    signedIn: false,
    needsOnboarding: false,
    userId: undefined,
    userEmail: undefined,
    organizationId: undefined,
    role: undefined,
  });

  // A signed-in user who is not platform staff must belong to a company to see
  // the workspace. No company → send them to onboarding (create or accept an
  // invite) rather than showing sample data. Platform staff are exempt. Logged-
  // out visitors still get the sample-data preview (auth.signedIn is false).
  if (auth.configured && auth.signedIn && !auth.organizationId && !isPlatformRole(auth.role)) {
    redirect("/onboarding");
  }

  // Superadmins manage the platform from /admin, not the workbench.
  if (auth.role === "superadmin") {
    redirect("/admin/organizations");
  }

  // Standard workbench for all other roles
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
    changePlan,
  ] = await Promise.all([
    safeSettle(getIntelligenceFoundationWorkbenchInput(), {
      signals: [],
      area: undefined,
      workflow: undefined,
    } as Awaited<ReturnType<typeof getIntelligenceFoundationWorkbenchInput>>),
    safeSettle(getFoundationReviewActionsSummary(), []),
    safeSettle(getFoundationAdminAccessSummary(), {
      configured: false,
      signedIn: false,
      isOwner: false,
      message: "Could not load access summary.",
    }),
    safeSettle(getFoundationAssigneeOptions(), []),
    safeSettle(getFoundationNotificationSummary(), { unreadCount: 0, notifications: [] }),
    safeSettle(getFoundationProductionVerificationSummary(), {
      environment: "unknown",
      deploymentUrl: "",
      productionReady: false,
      reason: "Could not load verification summary.",
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
      draftOnly: true,
    }),
    safeSettle(listChangePlanItems(), {
      items: [],
      canManage: false,
      signedIn: false,
      isFallback: true,
      message: "Could not load change plan.",
    }),
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
    ownerMode: adminAccess.isOwner,
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
          assessments={assessments}
          initialTab={initialTab}
        />
      </div>
    </AppShell>
  );
}
