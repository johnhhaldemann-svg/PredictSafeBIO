export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import {
  getAuditReadinessConsoleSummary,
  getAuthSummary,
  getFoundationAdminAccessSummary,
  getIntelligenceFoundationSummary,
} from "@/lib/supabase/data";
import ComplianceMap from "@/components/ComplianceMap";
import { FoundationWorkflowClient } from "./FoundationWorkflowClient";

export const metadata: Metadata = { title: "Compliance Map – PredictSafe" };

function safeSettle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export default async function FoundationPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  const [summary, adminAccess, auditConsole, auth] = await Promise.all([
    safeSettle(getIntelligenceFoundationSummary(), {
      companyName: "Demo Workspace",
      counts: [],
      coreComponents: [],
      biotypes: [],
      biotypeSelection: undefined,
      intake: [],
      programs: [],
      methods: [],
      applicability: [],
      evidence: [],
      changes: [],
      readiness: {
        overallScore: 0,
        documentsScore: 0,
        trainingScore: 0,
        capaScore: 0,
        incidentsScore: 0,
        equipmentScore: 0,
        evidenceScore: 0,
        topGaps: [],
      },
      auditReadinessNotes: [],
      aiWorkflow: [],
      humanValidationWorkflow: [],
      guardrailText: "Draft AI recommendation — human review required.",
      latestAssessmentInput: {},
    } as Awaited<ReturnType<typeof getIntelligenceFoundationSummary>>),

    safeSettle(getFoundationAdminAccessSummary(), {
      configured: false,
      signedIn: false,
      isOwner: false,
      message: "Could not load access summary.",
    }),

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

    safeSettle(getAuthSummary(), { configured: false, signedIn: false, needsOnboarding: false }),
  ]);

  const bioRisk = assessBioRisk(summary.latestAssessmentInput);

  return (
    <ComplianceMap
      summary={summary}
      auditScore={auditConsole.latestScore}
      auditTrend={auditConsole.trend}
      unresolvedGaps={auditConsole.unresolvedGaps}
      bioRisk={{ score: bioRisk.score, level: bioRisk.level, confidence: bioRisk.confidence }}
      auth={{
        isSignedIn: adminAccess.signedIn,
        isOwner: adminAccess.isOwner,
        userEmail: auth.userEmail,
        fullName: auth.fullName,
        role: adminAccess.role,
      }}
      message={params.message}
      adminSection={
        adminAccess.isOwner ? (
          <FoundationWorkflowClient canManage={adminAccess.isOwner} summary={summary} />
        ) : undefined
      }
    />
  );
}
