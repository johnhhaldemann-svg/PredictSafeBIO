export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, ClipboardCheck, HardHat, Activity, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  getAuditReadinessConsoleSummary,
  getFoundationReviewActionsSummary,
  listAssessments,
} from "@/lib/supabase/data";
import { getAuthSummary } from "@/lib/supabase/account-service";
import { isPlatformRole } from "@/lib/role-permissions";
import { getRiskSummary } from "@/lib/supabase/risk-dashboard-service";
import { getAiInspectionRecommendations } from "@/lib/supabase/inspection-service";
import { listCapaRecords } from "@/lib/supabase/capa-service";

export const metadata: Metadata = { title: "Home – PredictSafeBIO" };

function safeSettle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

type Tone = "ok" | "warn" | "alert" | "neutral";

/** One of the diagram's eight cycle stages, mapped under a live loop stage. */
type SubStage = {
  /** Stage number from the Risk Reduction Cycle diagram (1-8). */
  number: number;
  label: string;
  /** True until the dedicated module ships — shown honestly as "Soon". */
  soon?: boolean;
};

type Stage = {
  number: number;
  key: string;
  title: string;
  question: string;
  icon: React.ElementType;
  value: string;
  unit?: string;
  caption: string;
  detail: string;
  tone: Tone;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** The diagram stages this live stage covers (8 stages mapped across 4). */
  subStages: SubStage[];
};

/** Data that feeds the engine — the diagram's "Key Data Inputs" rail. */
const DATA_INPUTS = [
  "SOPs & policies",
  "SDS & agents",
  "Audit findings",
  "Incidents & near-misses",
  "Training records",
  "Calibration logs",
  "Waste logs",
  "Permits & change control",
];

/** What the engine produces — the diagram's "Automated Outputs" rail. */
const AUTOMATED_OUTPUTS = [
  "Risk & exposure alerts",
  "Control recommendations",
  "Inspection schedules",
  "Training reminders",
  "CAPA assignments",
  "Dashboards & trends",
  "Compliance evidence",
  "Executive visibility",
];

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

  // Same guards as the Workbench: a signed-in non-platform user without a
  // company goes to onboarding; superadmins go to the platform console.
  if (auth.configured && auth.signedIn && !auth.organizationId && !isPlatformRole(auth.role)) {
    redirect("/onboarding");
  }
  if (auth.role === "superadmin") {
    redirect("/admin/dashboard");
  }

  const [assessments, readiness, foundationActions, risk, inspectionRecs, capaRecords] =
    await Promise.all([
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
          totalActive: s.totalActive,
          criticalCount: s.criticalCount,
          highCount: s.highCount,
        })),
        { totalActive: 0, criticalCount: 0, highCount: 0 }
      ),
      safeSettle(getAiInspectionRecommendations(), []),
      safeSettle(listCapaRecords(), []),
    ]);

  // ── Assess ────────────────────────────────────────────────────────────────
  const latestScore = assessments.length ? assessments[0].score : null;
  const criticalCount = assessments.filter((a) => a.level === "critical").length;
  const pendingReview = assessments.filter(
    (a) => a.humanReviewStatus === "draft_human_review_required"
  ).length;

  // ── Plan ──────────────────────────────────────────────────────────────────
  const readinessScore = readiness.latestScore;
  const openTasks = foundationActions.length;

  // ── Operate ─────────────────────────────────────────────────────────────
  const overdueInspections = inspectionRecs.filter((r) => r.priority === "overdue").length;
  const openCapa = capaRecords.filter(
    (c) => c.status === "open" || c.status === "in_progress"
  ).length;
  const operateBacklog = overdueInspections + openCapa;
  const operateHref =
    overdueInspections > 0 ? "/inspections" : openCapa > 0 ? "/operations/capa" : "/operations";

  // ── Monitor ─────────────────────────────────────────────────────────────
  const prioritySignals = risk.criticalCount + risk.highCount;

  const stages: Stage[] = [
    {
      number: 1,
      key: "assess",
      title: "Assess",
      question: "What are my risks?",
      icon: ShieldCheck,
      value: latestScore !== null ? String(latestScore) : "—",
      caption: latestScore !== null ? "Latest BioRisk score" : "No assessment yet",
      detail:
        latestScore === null
          ? "Run your first BioRisk assessment to begin."
          : `${pendingReview} awaiting review · ${criticalCount} critical`,
      tone: latestScore === null ? "neutral" : criticalCount > 0 || pendingReview > 0 ? "alert" : "ok",
      ctaLabel: latestScore === null ? "Run an assessment" : "Open BioRisk Workbench",
      ctaHref: "/workbench",
      secondaryLabel: "Hazard Register",
      secondaryHref: "/hazards",
      subStages: [
        { number: 3, label: "Hazard identification" },
        { number: 4, label: "Risk assessment & prioritization" },
      ],
    },
    {
      number: 2,
      key: "plan",
      title: "Plan",
      question: "What do I need to do?",
      icon: ClipboardCheck,
      value: String(readinessScore),
      unit: "%",
      caption: "Audit readiness",
      detail:
        openTasks > 0
          ? `${openTasks} open task${openTasks === 1 ? "" : "s"} to work through`
          : "No open compliance tasks",
      tone:
        readinessScore >= 80 ? "ok" : readinessScore >= 50 ? "warn" : readinessScore > 0 ? "alert" : "neutral",
      ctaLabel: "Open Compliance Map",
      ctaHref: "/foundation",
      secondaryLabel: "My Work",
      secondaryHref: "/my-work",
      subStages: [
        { number: 1, label: "Governance & requirements" },
        { number: 2, label: "Work & exposure mapping" },
        { number: 5, label: "Control selection & planning" },
      ],
    },
    {
      number: 3,
      key: "operate",
      title: "Operate",
      question: "Do the work",
      icon: HardHat,
      value: String(operateBacklog),
      caption: operateBacklog === 1 ? "item needs action" : "items need action",
      detail: `${overdueInspections} overdue inspection${overdueInspections === 1 ? "" : "s"} · ${openCapa} open CAPA`,
      tone: overdueInspections > 0 ? "alert" : openCapa > 0 ? "warn" : "ok",
      ctaLabel: overdueInspections > 0 ? "Review inspections" : openCapa > 0 ? "Work open CAPA" : "Go to Operations",
      ctaHref: operateHref,
      secondaryLabel: "Work Permits",
      secondaryHref: "/permits",
      subStages: [
        { number: 6, label: "Training, authorization & execution" },
      ],
    },
    {
      number: 4,
      key: "monitor",
      title: "Monitor",
      question: "Am I on track?",
      icon: Activity,
      value: String(prioritySignals),
      caption: prioritySignals === 1 ? "priority signal" : "priority signals",
      detail: `${risk.criticalCount} critical · ${risk.highCount} high · ${risk.totalActive} active`,
      tone: risk.criticalCount > 0 ? "alert" : risk.highCount > 0 ? "warn" : "ok",
      ctaLabel: "Open Risk Monitor",
      ctaHref: "/risk-command-center",
      secondaryLabel: "Predictive Engine",
      secondaryHref: "/predictive-engine",
      subStages: [
        { number: 7, label: "Monitoring, inspections & event response" },
        { number: 8, label: "CAPA, reporting & continuous learning" },
      ],
    },
  ];

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">PredictSafeBIO</p>
          <h1>Safety &amp; compliance loop</h1>
          <p className="muted">
            Your safety <strong>data inputs</strong> feed an <strong>AI engine</strong> that scores
            risk and drafts <strong>actions</strong> — alerts, schedules, CAPA, and audit-ready
            evidence. People stay accountable for every decision.
          </p>
        </header>

        <section className="loopmap-band" aria-label="How the system works">
          <div className="loopmap-rail">
            <span className="loopmap-rail-label">Key data inputs</span>
            <span className="loopmap-rail-title">What you already track</span>
            <ul className="loopmap-list">
              {DATA_INPUTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="loopmap-rail loopmap-rail--engine">
            <span className="loopmap-rail-label">AI engine</span>
            <span className="loopmap-rail-title">Predictive AI Safety Engine</span>
            <span className="loopmap-rail-sub">
              Ingests your data, scores risk, triggers actions, tracks closure, and learns from
              outcomes across the eight-stage cycle below.
            </span>
            <span className="loopmap-engine-note">
              Supports decisions — your team remains accountable.
            </span>
          </div>

          <div className="loopmap-rail">
            <span className="loopmap-rail-label">Automated outputs</span>
            <span className="loopmap-rail-title">What the engine returns</span>
            <ul className="loopmap-list">
              {AUTOMATED_OUTPUTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <ol className="lifecycle-grid" aria-label="Safety lifecycle stages">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <li key={stage.key} className={`lifecycle-card lifecycle-card--${stage.tone}`}>
                <div className="lifecycle-card-head">
                  <span className="lifecycle-number" aria-hidden="true">{stage.number}</span>
                  <span className="lifecycle-icon" aria-hidden="true"><Icon size={16} /></span>
                  <div className="lifecycle-titles">
                    <strong>{stage.title}</strong>
                    <span className="lifecycle-question">{stage.question}</span>
                  </div>
                </div>

                <div className="lifecycle-metric">
                  <span className="lifecycle-value">
                    {stage.value}{stage.unit ? <em>{stage.unit}</em> : null}
                  </span>
                  <span className="lifecycle-caption">{stage.caption}</span>
                </div>

                <p className="lifecycle-detail">{stage.detail}</p>

                <ul className="lifecycle-substages" aria-label={`${stage.title} cycle stages`}>
                  {stage.subStages.map((sub) => (
                    <li
                      key={sub.number}
                      className={`lifecycle-substage${sub.soon ? " lifecycle-substage--soon" : ""}`}
                    >
                      <span className="lifecycle-substage-num" aria-hidden="true">{sub.number}</span>
                      <span>{sub.label}</span>
                      {sub.soon && <span className="lifecycle-substage-soon-tag">Soon</span>}
                    </li>
                  ))}
                </ul>

                <div className="lifecycle-actions">
                  <Link href={stage.ctaHref} className="button-primary compact">
                    {stage.ctaLabel} <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                  {stage.secondaryLabel && stage.secondaryHref && (
                    <Link href={stage.secondaryHref} className="button-secondary compact">
                      {stage.secondaryLabel}
                    </Link>
                  )}
                </div>

                {i < stages.length - 1 && (
                  <span className="lifecycle-arrow" aria-hidden="true"><ArrowRight size={16} /></span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </AppShell>
  );
}
