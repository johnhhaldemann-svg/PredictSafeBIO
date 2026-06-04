/**
 * Superadmin service — platform ops, AI engine diagnostics, and database visual.
 *
 * Uses the Supabase service-role client (bypasses RLS).
 * Only called from /admin/superadmin, which requires PLATFORM_ADMIN_KEY.
 */

import { getSupabaseAdminClient } from "./admin";
import { isSupabaseConfigured } from "./env";
import { getPlatformData, type PlatformData } from "./platform-service";
import { bioRiskFamilies } from "@/lib/bio-ai/risk-families";
import { doNotClaim, draftAiRecommendationGuardrail, sourceArtifacts } from "@/lib/bio-ai/source-artifacts";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import type { BioAiAssessment, BioSignalType } from "@/lib/bio-ai/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiEngineStatus = {
  engineVersion: string;
  riskFamiliesLoaded: number;
  signalTypesSupported: number;
  guardrailsActive: number;
  sourceArtifactsLinked: number;
  smokeTestResult: "pass" | "fail";
  smokeTestScore: number;
  smokeTestLevel: string;
  smokeTestConfidence: string;
  riskFamilies: { id: string; label: string; signalTypes: string[]; ownerRoles: string[] }[];
  doNotClaim: string[];
};

export type DbTableStat = {
  table: string;
  label: string;
  count: number;
  category: "core" | "compliance" | "ai" | "ops";
};

export type SuperadminData = {
  platform: PlatformData;
  aiEngine: AiEngineStatus;
  dbStats: DbTableStat[];
  fetchedAt: string;
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function getSuperadminData(): Promise<SuperadminData> {
  const [platform, aiEngine, dbStats] = await Promise.all([
    getPlatformData(),
    getAiEngineStatus(),
    getDbStats()
  ]);

  return {
    platform,
    aiEngine,
    dbStats,
    fetchedAt: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// AI Engine diagnostics
// ---------------------------------------------------------------------------

const SIGNAL_TYPES = [
  "deviation", "capa", "change_control", "audit_finding", "training_gap",
  "sop_gap", "biosafety_event", "contamination_event", "environmental_monitoring",
  "equipment_event", "ergonomic_risk_signal", "sample_chain_of_custody",
  "data_integrity", "batch_record", "assay_qc", "supplier_material",
  "clinical_study", "regulatory_commitment"
];

export async function getAiEngineStatus(): Promise<AiEngineStatus> {
  // Run a smoke test assessment to verify the engine is functional
  let smokeTestResult: "pass" | "fail" = "fail";
  let smokeTestScore = 0;
  let smokeTestLevel = "unknown";
  let smokeTestConfidence = "unknown";

  try {
    const result = assessBioRisk({
      area: "QC Lab",
      workflow: "cell culture monitoring",
      signals: [
        {
          type: "contamination_event",
          label: "Smoke test — microbial excursion",
          evidence: "Test signal",
          severity: 4,
          likelihood: 3,
          scope: 3,
          controlGap: 2,
          dataIntegrityConcern: 1
        }
      ],
      controlEffectiveness: "partial",
      dataCompleteness: 0.85
    });

    smokeTestScore = result.score;
    smokeTestLevel = result.level;
    smokeTestConfidence = result.confidence;
    smokeTestResult =
      result.score > 0 &&
      result.level !== undefined &&
      result.doNotClaim.length > 0 &&
      result.humanReviewRequired !== undefined
        ? "pass"
        : "fail";
  } catch {
    smokeTestResult = "fail";
  }

  return {
    engineVersion: "v1.0 — local deterministic engine",
    riskFamiliesLoaded: bioRiskFamilies.length,
    signalTypesSupported: SIGNAL_TYPES.length,
    guardrailsActive: doNotClaim.length + 1, // +1 for draftAiRecommendationGuardrail
    sourceArtifactsLinked: sourceArtifacts.length,
    smokeTestResult,
    smokeTestScore,
    smokeTestLevel,
    smokeTestConfidence,
    riskFamilies: bioRiskFamilies.map((f) => ({
      id: f.id,
      label: f.label,
      signalTypes: f.signalTypes,
      ownerRoles: f.ownerRoles
    })),
    doNotClaim: [...doNotClaim, draftAiRecommendationGuardrail]
  };
}

// ---------------------------------------------------------------------------
// Ad-hoc assessment — run the engine on a custom scenario for debugging
// ---------------------------------------------------------------------------

export type AdHocAssessmentInput = {
  area: string;
  workflow: string;
  signalType: BioSignalType;
  signalLabel: string;
  severity: number;
  likelihood: number;
  scope: number;
  controlGap: number;
  dataIntegrityConcern: number;
  controlEffectiveness: "missing" | "ineffective" | "partial" | "effective" | "unknown";
  dataCompleteness: number;
};

export function runAdHocAssessment(input: AdHocAssessmentInput): BioAiAssessment {
  return assessBioRisk({
    area: input.area,
    workflow: input.workflow,
    controlEffectiveness: input.controlEffectiveness,
    dataCompleteness: input.dataCompleteness,
    signals: [
      {
        type: input.signalType,
        label: input.signalLabel,
        severity: input.severity,
        likelihood: input.likelihood,
        scope: input.scope,
        controlGap: input.controlGap,
        dataIntegrityConcern: input.dataIntegrityConcern
      }
    ]
  });
}

// ---------------------------------------------------------------------------
// Database stats for visual
// ---------------------------------------------------------------------------

const DB_TABLES: { table: string; label: string; category: DbTableStat["category"] }[] = [
  { table: "profiles",            label: "Profiles",            category: "core" },
  { table: "organizations",       label: "Organizations",       category: "core" },
  { table: "assessments",         label: "Assessments",         category: "ai" },
  { table: "document_metadata",   label: "Documents",           category: "compliance" },
  { table: "audit_events",        label: "Audit Events",        category: "ops" },
  { table: "tasks",               label: "Tasks",               category: "ops" },
  { table: "training_assignments",label: "Training Assignments",category: "compliance" },
  { table: "capa_records",        label: "CAPA Records",        category: "compliance" },
  { table: "inspection_records",  label: "Inspections",         category: "compliance" },
  { table: "risk_assessments",    label: "Risk Assessments",    category: "ai" },
  { table: "foundation_records",  label: "Foundation Records",  category: "ai" },
  { table: "vendors",             label: "Vendors",             category: "core" },
  { table: "programs",            label: "Programs",            category: "compliance" },
  { table: "change_controls",     label: "Change Controls",     category: "compliance" },
  { table: "deviations",          label: "Deviations",          category: "compliance" },
  { table: "permits",             label: "Permits",             category: "compliance" },
];

export async function getDbStats(): Promise<DbTableStat[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return DB_TABLES.map((t) => ({ ...t, count: 0 }));
  }

  const admin = getSupabaseAdminClient();

  const results = await Promise.all(
    DB_TABLES.map(async ({ table, label, category }) => {
      try {
        const { count } = await admin
          .from(table as never)
          .select("id", { count: "exact", head: true });
        return { table, label, category, count: count ?? 0 };
      } catch {
        return { table, label, category, count: 0 };
      }
    })
  );

  return results.sort((a, b) => b.count - a.count);
}
