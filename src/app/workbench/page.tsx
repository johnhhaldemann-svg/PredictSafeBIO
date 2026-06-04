export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { WorkbenchClient } from "@/components/WorkbenchClient";
import { SuperAdminDashboard } from "@/components/SuperAdminDashboard";
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
import { getPlatformData } from "@/lib/supabase/platform-service";
import { getKnowledgePendingCount } from "@/lib/supabase/knowledge-service";
import { listProviderBiosByStatus, listBioReports } from "@/lib/supabase/moderation-service";

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

  if (auth.role === "superadmin") {
    const fetchedAt = new Date().toISOString();
    const [platform, knowledgePending, pendingBios, pendingReports] = await Promise.all([
      safeSettle(getPlatformData(), {
        metrics: {
          totalOrgs: 0, totalUsers: 0, onboardedUsers: 0,
          totalAssessments: 0, totalDocuments: 0, totalAuditEvents: 0,
          totalTasks: 0, totalTrainingRecords: 0, totalCapaRecords: 0,
          totalInspections: 0, tablesWithRls: 0, tablesWithoutRls: 0, rlsTablesListed: [],
        },
        security: {
          leakedPasswordProtection: "unknown" as const,
          smtpConfigured: false,
          serviceRolePresent: false,
          supabaseConfigured: false,
        },
        orgs: [],
        recentAuditEvents: [],
        checklist: [],
      }),
      safeSettle(getKnowledgePendingCount(auth.organizationId ?? ""), 0),
      safeSettle(listProviderBiosByStatus("pending"), []),
      safeSettle(listBioReports(auth.organizationId ?? "", "pending"), []),
    ]);

    return (
      <AppShell>
        <SuperAdminDashboard
          platform={platform}
          knowledgePending={knowledgePending}
          moderationPending={pendingBios.length}
          moderationReports={pendingReports.length}
          fetchedAt={fetchedAt}
        />
      </AppShell>
    );
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
