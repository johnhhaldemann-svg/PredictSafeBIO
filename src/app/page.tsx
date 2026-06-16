export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getAuditReadinessConsoleSummary,
  getFoundationReviewActionsSummary,
  getFoundationAdminAccessSummary,
  listAssessments,
} from "@/lib/supabase/data";
import { getAuthSummary } from "@/lib/supabase/account-service";
import { resolvePack } from "@/lib/foundation/vertical-registry";
import { isPlatformRole } from "@/lib/role-permissions";
import { getRiskSummary } from "@/lib/supabase/risk-dashboard-service";
import { getAiInspectionRecommendations } from "@/lib/supabase/inspection-service";
import { listCapaRecords } from "@/lib/supabase/capa-service";
import { listPermits, permitTypeLabels, type PermitRecord } from "@/lib/supabase/permits-service";
import { listChemicals, type ChemicalRecord } from "@/lib/supabase/chemical-service";
import OperatingPicture, {
  type FeedItem,
  type ViewKpi,
  type ViewStage,
} from "@/components/OperatingPicture";

export const metadata: Metadata = { title: "Operating Picture – PredictSafe" };

function safeSettle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

/* ─── Feed synthesis ────────────────────────────────────────────────────── */

function buildFeed(data: {
  permits:          PermitRecord[];
  inspectionRecs:   Awaited<ReturnType<typeof getAiInspectionRecommendations>>;
  chemicals:        ChemicalRecord[];
  capaRecords:      Awaited<ReturnType<typeof listCapaRecords>>;
  openTaskCount:    number;
  readinessGapCount: number;
}): FeedItem[] {
  const feed: FeedItem[] = [];
  const now = new Date().getTime();

  // ── Critical ──────────────────────────────────────────────────────────

  const gated = data.permits.filter(
    (p) =>
      p.closeoutStatus === "active" &&
      !p.isolationVerified &&
      (p.requiredControls?.length ?? 0) > 0
  );
  for (const p of gated.slice(0, 2)) {
    const where = p.location ? ` (${p.location})` : "";
    feed.push({
      severity: "critical",
      text: `${permitTypeLabels[p.permitType]}${where} permit is active with required safety controls not verified — work should not continue`,
      page: "Work Permits",
      href: "/permits",
    });
  }

  const overdueInspections = data.inspectionRecs.filter((r) => r.priority === "overdue");
  if (overdueInspections.length > 0) {
    const labels = overdueInspections
      .slice(0, 2)
      .map((r) => r.label)
      .join(" and ");
    const more = overdueInspections.length > 2 ? ` and ${overdueInspections.length - 2} more` : "";
    feed.push({
      severity: "critical",
      text: `${overdueInspections.length} required inspection${overdueInspections.length > 1 ? "s" : ""} overdue — ${labels}${more}`,
      page: "Inspections",
      href: "/inspections",
    });
  }

  // ── High ──────────────────────────────────────────────────────────────

  const missingSds = data.chemicals.filter((c) => !c.sdsPresent);
  for (const c of missingSds.slice(0, 2)) {
    const where = c.storageLocation ? ` (${c.storageLocation})` : "";
    feed.push({
      severity: "high",
      text: `${c.chemicalName}${where} is missing its SDS`,
      page: "Chemical & SDS",
      href: "/chemical-inventory",
    });
  }

  const expiredRestricted = data.chemicals.filter((c) => c.expired && c.restricted);
  for (const c of expiredRestricted.slice(0, 2)) {
    const hazard = c.hazardClass ? ` (${c.hazardClass.replace(/_/g, " ")})` : "";
    feed.push({
      severity: "high",
      text: `${c.chemicalName} expired${hazard}, restricted — route to hazardous-waste disposal`,
      page: "Chemical & SDS",
      href: "/chemical-inventory",
    });
  }

  const pastDueCapa = data.capaRecords.filter(
    (c) =>
      (c.status === "open" || c.status === "in_progress" || c.status === "draft_human_review_required") &&
      c.dueDate != null &&
      new Date(c.dueDate).getTime() < now
  );
  for (const c of pastDueCapa.slice(0, 2)) {
    feed.push({
      severity: "high",
      text: `"${c.title}" CAPA is past its target date${c.status === "open" ? " with no action plan defined" : ""}`,
      page: "CAPA",
      href: "/operations/capa",
    });
  }

  // ── Medium ────────────────────────────────────────────────────────────

  if (data.openTaskCount > 0) {
    feed.push({
      severity: "medium",
      text: `${data.openTaskCount} open compliance task${data.openTaskCount > 1 ? "s" : ""} awaiting action across safety programs`,
      page: "Compliance Map",
      href: "/foundation",
    });
  }

  if (data.readinessGapCount > 0) {
    feed.push({
      severity: "medium",
      text: `${data.readinessGapCount} unresolved compliance gap${data.readinessGapCount > 1 ? "s" : ""} — review required`,
      page: "Compliance Map",
      href: "/foundation",
    });
  }

  return feed;
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const auth = await safeSettle(getAuthSummary(), {
    configured: false,
    signedIn: false,
    needsOnboarding: false,
    userId: undefined,
    userEmail: undefined,
    organizationId: undefined,
    role: undefined,
  });

  if (auth.configured && auth.signedIn && !auth.organizationId && !isPlatformRole(auth.role)) {
    redirect("/onboarding");
  }
  if (auth.role === "superadmin") {
    redirect("/admin/dashboard");
  }

  const pack = resolvePack(auth.vertical);

  const [
    assessments,
    readiness,
    foundationActions,
    risk,
    inspectionRecs,
    capaRecords,
    permitsResult,
    chemicalsResult,
    adminAccess,
  ] = await Promise.all([
    safeSettle(listAssessments(), []),
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
    safeSettle(getFoundationReviewActionsSummary(), []),
    safeSettle(
      getRiskSummary().then((s) => ({
        totalActive:   s.totalActive,
        criticalCount: s.criticalCount,
        highCount:     s.highCount,
      })),
      { totalActive: 0, criticalCount: 0, highCount: 0 }
    ),
    safeSettle(getAiInspectionRecommendations(), []),
    safeSettle(listCapaRecords(), []),
    safeSettle(listPermits(), []),
    safeSettle(listChemicals(), []),
    safeSettle(getFoundationAdminAccessSummary(), {
      configured: false, signedIn: false, isOwner: false, message: "",
    }),
  ]);

  // ── Derived metrics ──────────────────────────────────────────────────
  const latestScore    = assessments.length ? assessments[0].score : null;
  const criticalCount  = assessments.filter((a) => a.level === "critical").length;
  const pendingReview  = assessments.filter(
    (a) => a.humanReviewStatus === "draft_human_review_required"
  ).length;
  const readinessScore = readiness.latestScore;
  const openTasks      = foundationActions.length;
  const prioritySignals = risk.criticalCount + risk.highCount;

  const overdueInspectionCount = inspectionRecs.filter((r) => r.priority === "overdue").length;
  const openCapaCount          = capaRecords.filter(
    (c) => c.status === "open" || c.status === "in_progress"
  ).length;
  const operateBacklog = overdueInspectionCount + openCapaCount;
  const operateHref    =
    overdueInspectionCount > 0 ? "/inspections" : openCapaCount > 0 ? "/operations/capa" : "/operations";

  // ── Feed ──────────────────────────────────────────────────────────────
  const feed = auth.signedIn
    ? buildFeed({
        permits:           permitsResult,
        inspectionRecs,
        chemicals:         chemicalsResult,
        capaRecords,
        openTaskCount:     openTasks,
        readinessGapCount: readiness.unresolvedGaps?.length ?? 0,
      })
    : undefined; // component shows demo when undefined

  // ── KPIs ──────────────────────────────────────────────────────────────
  const kpis: ViewKpi[] | undefined = auth.signedIn
    ? [
        {
          label:      `${pack.scoreLabel}`,
          value:      latestScore !== null ? String(latestScore) : "—",
          sub:        latestScore === null
            ? "No assessment yet"
            : `${criticalCount > 0 ? "critical" : "not critical"} · ${pendingReview} awaiting review`,
          accent:     latestScore !== null && criticalCount > 0 ? "#ef4444" : "#60a5fa",
          valueColor: latestScore !== null && criticalCount > 0 ? "#fca5a5" : undefined,
        },
        {
          label:      "Audit Readiness",
          value:      `${readinessScore}%`,
          sub:        openTasks > 0 ? `${openTasks} open task${openTasks === 1 ? "" : "s"}` : "No open tasks",
          accent:     readinessScore >= 80 ? "#22c55e" : readinessScore >= 50 ? "#f59e0b" : "#ef4444",
          valueColor: readinessScore < 50 ? "#fcd34d" : undefined,
        },
        {
          label:      "Needs Action",
          value:      String(operateBacklog),
          sub:        `${overdueInspectionCount} overdue inspection${overdueInspectionCount === 1 ? "" : "s"} · ${openCapaCount} open CAPA`,
          accent:     operateBacklog > 0 ? "#f97316" : "#22c55e",
          valueColor: operateBacklog > 0 ? "#fdba74" : undefined,
        },
        {
          label: "Priority Signals",
          value: String(prioritySignals),
          sub:   `${risk.criticalCount} critical · ${risk.highCount} high · ${risk.totalActive} active`,
          accent: "#60a5fa",
        },
      ]
    : undefined;

  // ── Stages ────────────────────────────────────────────────────────────
  const stages: ViewStage[] | undefined = auth.signedIn
    ? [
        {
          number:     1,
          title:      "Assess",
          question:   "What are my risks?",
          color:      criticalCount > 0 || pendingReview > 0 ? "#ef4444" : "#22c55e",
          value:      latestScore !== null ? String(latestScore) : "—",
          valueLabel: latestScore !== null ? `Latest ${pack.scoreLabel}` : "No assessment yet",
          note:       latestScore === null
            ? "Run your first assessment to begin."
            : `${pendingReview} awaiting review · ${criticalCount} critical`,
          subStages: [
            { num: 3, label: "Hazard identification" },
            { num: 4, label: "Risk assessment & prioritization" },
          ],
          cta:       { label: latestScore === null ? "Run an assessment" : "Open Workbench", href: "/workbench" },
          secondary: { label: "Hazard Register", href: "/hazards" },
        },
        {
          number:     2,
          title:      "Plan",
          question:   "What do I need to do?",
          color:      readinessScore >= 80 ? "#22c55e" : readinessScore >= 50 ? "#f59e0b" : "#ef4444",
          value:      `${readinessScore}%`,
          valueLabel: "Audit readiness",
          note:       openTasks > 0
            ? `${openTasks} open task${openTasks === 1 ? "" : "s"} to work through`
            : "No open compliance tasks",
          subStages: [
            { num: 1, label: "Governance & requirements" },
            { num: 2, label: "Work & exposure mapping" },
            { num: 5, label: "Control selection & planning" },
          ],
          cta:       { label: "Open Compliance Map", href: "/foundation" },
          secondary: { label: "My Work", href: "/my-work" },
        },
        {
          number:     3,
          title:      "Operate",
          question:   "Do the work",
          color:      overdueInspectionCount > 0 ? "#ef4444" : openCapaCount > 0 ? "#a855f7" : "#22c55e",
          value:      String(operateBacklog),
          valueLabel: operateBacklog === 1 ? "item needs action" : "items need action",
          note:       `${overdueInspectionCount} overdue inspection${overdueInspectionCount === 1 ? "" : "s"} · ${openCapaCount} open CAPA`,
          subStages: [{ num: 6, label: "Training, authorization & execution" }],
          cta:       {
            label: overdueInspectionCount > 0 ? "Review inspections" : openCapaCount > 0 ? "Work open CAPA" : "Go to Operations",
            href: operateHref,
          },
          secondary: { label: "Work Permits", href: "/permits" },
        },
        {
          number:     4,
          title:      "Monitor",
          question:   "Am I on track?",
          color:      risk.criticalCount > 0 ? "#ef4444" : risk.highCount > 0 ? "#f59e0b" : "#22c55e",
          value:      String(prioritySignals),
          valueLabel: prioritySignals === 1 ? "priority signal" : "priority signals",
          note:       `${risk.criticalCount} critical · ${risk.highCount} high · ${risk.totalActive} active`,
          subStages: [
            { num: 7, label: "Monitoring & event response" },
            { num: 8, label: "CAPA, reporting & learning" },
          ],
          cta:       { label: "Open Risk Monitor", href: "/risk-command-center" },
          secondary: { label: "Predictive Engine", href: "/predictive-engine" },
        },
      ]
    : undefined;

  return (
    <OperatingPicture
      feed={feed}
      kpis={kpis}
      stages={stages}
      auth={{
        isSignedIn: adminAccess.signedIn,
        isOwner:    adminAccess.isOwner,
        userEmail:  auth.userEmail ?? null,
      }}
    />
  );
}
