import { assessBioRisk } from "@/lib/bio-ai/engine";
import { randomUUID } from "node:crypto";
import { withAuditTrace } from "@/lib/audit-trace";
import type {
  AuditEvent,
  BioAiAssessment,
  BioAiInput,
  BioAiSignal,
  CompanyProfile,
  DocumentMetadata,
  HumanReviewStatus
} from "@/lib/bio-ai/types";
import { demoAuditEvents, demoCompanyProfile, demoDocuments } from "@/lib/demo-data";
import { generateDocumentGapRecommendations, generateDocumentUpdateRecommendations } from "@/lib/documents/recommendations";
import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import {
  applyBioTypeContext,
  buildBioTypeAiContext,
  canonicalBioTypeFoundations,
  normalizeBioTypeKey,
  type BioTypeKey
} from "@/lib/foundation/biotypes";
import {
  isUuid,
  normalizeBioTypeKeys,
  normalizeFoundationDueDate,
  normalizeFoundationTaskPriority,
  normalizeFoundationTaskStatus
} from "@/lib/foundation/action-inputs";
import {
  applyFoundationContext,
  defaultApplicabilityRules,
  foundationMethodNames,
  foundationProgramNames,
  northStarFoundationDemo,
  type FoundationIntakeAnswers
} from "@/lib/foundation/engine";
import {
  aiWorkflowSteps,
  coreComplianceComponents,
  demoIntelligenceFoundationSummary,
  humanValidationWorkflowSteps,
  isFoundationGapStatus,
  programMethodRequired
} from "@/lib/foundation/summary";
import {
  formatDateOnly,
  getFieldReportDueDate
} from "@/lib/foundation/timing";
import {
  createFoundationDueNotifications,
  createFoundationTaskNotificationIfMissing,
  foundationReviewSourceModules,
  getFoundationActionNextStep,
  getFoundationActionOperatingState,
  getFoundationExactSourceHref,
  getFoundationNotificationLabel,
  getFoundationSourceResolution,
  getFoundationSourceTarget,
  getFoundationTaskActivityHistory,
  getFoundationTaskCloseoutNote,
  getFoundationTaskStatusHistory,
  normalizeFoundationReviewSourceModule,
  type FoundationSourceResolutionState
} from "@/lib/foundation/review-actions";
import {
  canEditWorkspaceTaskGovernance,
  canManageWorkspace,
  canUpdateAssignedWorkspaceTask,
  getWorkspaceTaskActorRole,
  normalizeWorkspaceRole
} from "@/lib/role-permissions";
import { createSupabaseServerClient } from "./server";
import { isSupabaseConfigured } from "./env";
import { getAuthSummary, getCompanyProfile } from "./account-service";
import {
  updateFoundationBioTypeSelection,
  updateFoundationEvidenceReadiness,
  updateFoundationIntakeResponse
} from "./foundation-write-service";

// Internal imports from extracted service files — used by functions remaining in this file.
import type { ProfileContext, FoundationActionResult } from "./data-helpers";
import { summarizeJson } from "./data-helpers";
import type { SavedAssessmentSummary, SavedAssessmentDetail } from "./assessment-service";
import { saveDocumentMetadata, persistDocumentRecommendations } from "./document-service";
import type { SaveDocumentMetadataInput } from "./document-service";


export {
  getAccountSummary,
  getAuthSummary,
  getCompanyProfile,
  updateAccountProfile,
  updateCompanyProfile
} from "./account-service";
export {
  updateFoundationBioTypeSelection,
  updateFoundationEvidenceReadiness,
  updateFoundationIntakeResponse
} from "./foundation-write-service";
export type { AccountSummary, AuthSummary } from "./account-service";
export type { FoundationEvidenceStatus } from "@/lib/foundation/action-inputs";
export {
  listChangePlanItems,
  seedDefaultChangePlanItems,
  createChangePlanItem,
  updateChangePlanItem
} from "./change-plan-service";
export type { ChangePlanItem, ChangePlanItemsSummary, ChangePlanItemInput } from "./change-plan-service";
export { getTrainingMatrixSummary } from "./training-matrix-service";
export type { TrainingMatrixRow, TrainingMatrixSummary } from "./training-matrix-service";
export { getMapOperationsSummary, getMapAlignedWorkbenchInput, createMapOperationsBundle } from "./map-operations-service";
export type { MapOperationsBundleInput, MapOperationsSummary } from "./map-operations-service";
export {
  getErgonomicLevel1Summary,
  getErgonomicLevel2LaunchContext,
  saveErgonomicSelfAssessment,
  requestAdvancedErgonomicEvaluation,
  saveErgonomicLevel2Inspection
} from "./ergonomics-service";
export type {
  ErgonomicSelfAssessmentSubmission,
  ErgonomicSelfAssessmentRecord,
  ErgonomicLevel1Summary,
  ErgonomicLevel2LaunchContext
} from "./ergonomics-service";

// ---------------------------------------------------------------------------
// Domain service re-exports — functions extracted to focused service files.
// Consumers importing from "@/lib/supabase/data" continue to work unchanged.
// See docs/data-service-split-plan.md for the remaining extraction roadmap.
// ---------------------------------------------------------------------------
export {
  listAssessments,
  getAssessmentDetail,
  updateAssessmentReview,
  saveAssessment
} from "./assessment-service";
export type {
  SavedAssessmentSummary,
  SavedAssessmentDetail
} from "./assessment-service";

export {
  listDocuments,
  getDocument,
  getDocumentRecommendationHistory,
  saveDocumentMetadata,
  persistDocumentRecommendations
} from "./document-service";
export type {
  DocumentRecommendationRecord,
  DocumentRecommendationRun,
  SaveDocumentMetadataInput
} from "./document-service";



export type IntelligenceFoundationSummary = {
  companyName: string;
  counts: Array<{ label: string; value: number }>;
  coreComponents: Array<{ name: string; purpose: string }>;
  biotypes: Array<{ key: BioTypeKey; name: string; focus: string; role: "primary" | "secondary" | "available"; requirements: string }>;
  biotypeSelection?: {
    id?: string;
    primaryBioType: BioTypeKey;
    secondaryBioTypes: BioTypeKey[];
    status: string;
  };
  intake: Array<{ id?: string; question: string; answer: string; booleanValue: boolean; triggers: string }>;
  programs: Array<{ name: string; status: string; owner: string }>;
  methods: Array<{ name: string; type: string; purpose: string }>;
  applicability: Array<{ rule: string; required: string; reviewer: string }>;
  evidence: Array<{ id?: string; requirement: string; status: string; auditReady: boolean }>;
  changes: Array<{ type: string; summary: string; actions: string }>;
  readiness: {
    id?: string;
    overallScore: number;
    documentsScore: number;
    trainingScore: number;
    capaScore: number;
    incidentsScore: number;
    equipmentScore: number;
    evidenceScore: number;
    topGaps: string[];
  };
  auditReadinessNotes: Array<{ id: string; note: string; noteType: string; createdAt?: string }>;
  aiWorkflow: string[];
  humanValidationWorkflow: string[];
  guardrailText: string;
  latestAssessmentInput: BioAiInput;
};

export type { FoundationActionResult };

export type FoundationAdminAccessSummary = {
  configured: boolean;
  signedIn: boolean;
  isOwner: boolean;
  role?: string;
  message: string;
};

export type FoundationReviewActionSummary = {
  id: string;
  taskId?: string;
  title: string;
  priority: string;
  status: string;
  operatingState: string;
  canUpdate: boolean;
  assignedTo?: string | null;
  assigneeName?: string | null;
  sourceModule: string;
  sourceRecordId?: string;
  sourceLabel: string;
  sourceHref: string;
  sourceDetailHref: string;
  sourceResolutionState: string;
  sourceResolutionDetail: string;
  dueDate?: string | null;
  recommendationId?: string;
  reason?: string;
  nextStep: string;
  closeoutNote?: string | null;
  createdAt?: string;
  statusHistory: Array<{
    eventType: AuditEvent["eventType"];
    summary: string;
    createdAt?: string;
    status?: string;
    previousStatus?: string | null;
    priority?: string | null;
    previousPriority?: string | null;
    note?: string;
    closeoutNote?: string | null;
    actorRole?: string | null;
    previousDueDate?: string | null;
    dueDate?: string | null;
    previousAssignedTo?: string | null;
    assignedTo?: string | null;
    previousAssigneeName?: string | null;
    assigneeName?: string | null;
    resolutionState?: string | null;
    resolutionDetail?: string | null;
    readyForClosureReview?: boolean | null;
  }>;
  activityHistory: Array<{
    eventType: AuditEvent["eventType"];
    summary: string;
    createdAt?: string;
    status?: string;
    previousStatus?: string | null;
    priority?: string | null;
    previousPriority?: string | null;
    note?: string;
    closeoutNote?: string | null;
    actorRole?: string | null;
    previousDueDate?: string | null;
    dueDate?: string | null;
    previousAssignedTo?: string | null;
    assignedTo?: string | null;
    previousAssigneeName?: string | null;
    assigneeName?: string | null;
    resolutionState?: string | null;
    resolutionDetail?: string | null;
    readyForClosureReview?: boolean | null;
  }>;
};

export type FoundationProductionVerificationSummary = {
  latestWorkflowSave?: {
    eventType: AuditEvent["eventType"];
    summary: string;
    createdAt?: string;
  };
  latestTaskUpdate?: {
    eventType: AuditEvent["eventType"];
    summary: string;
    createdAt?: string;
  };
  latestAuditEvent?: {
    eventType: AuditEvent["eventType"];
    summary: string;
    createdAt?: string;
  };
  environment: string;
  deploymentUrl: string;
  productionReady: boolean;
  reason: string;
};

export type FoundationNotificationSummary = {
  unreadCount: number;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    notificationType: string;
    label: string;
    taskId?: string | null;
    createdAt?: string;
    readAt?: string | null;
  }>;
};

export type FoundationAssigneeOption = {
  id: string;
  name: string;
  role?: string | null;
};

export type FoundationDuplicateSkipSummary = {
  title: string;
  sourceModule: string;
  sourceRecordId?: string;
  reason: string;
};

export type FoundationVerificationStatusSummary = {
  checklist: Array<{
    key: string;
    label: string;
    status: "pass" | "pending";
    detail: string;
    eventTypes: AuditEvent["eventType"][];
  }>;
  latestWorkflowSave?: {
    eventType: AuditEvent["eventType"];
    summary: string;
    createdAt?: string;
    sourceModule?: string;
    targetModule?: string;
  };
  latestReviewActionRun?: {
    summary: string;
    createdAt?: string;
    created: number;
    candidateCount: number;
    skippedDuplicates: FoundationDuplicateSkipSummary[];
  };
  latestAuditEvent?: {
    eventType: AuditEvent["eventType"];
    summary: string;
    createdAt?: string;
    sourceModule?: string;
    targetModule?: string;
    draftOnly: boolean;
  };
  latestFinalSignoff?: {
    id: string;
    note: string;
    createdAt?: string;
  };
  allChecklistPassed: boolean;
  productionPromotionAllowed: boolean;
  productionGateReason: string;
};

export type FoundationOperationsDashboardSummary = {
  readinessScore: number;
  openActions: number;
  blockedTasks: number;
  duplicatePreserved: number;
  latestRunSummary?: string;
};

export type FoundationSourceDrilldownSummary = {
  groups: Array<{
    key: string;
    title: string;
    description: string;
    href: string;
    items: Array<{
      id: string;
      label: string;
      status: string;
      detail: string;
      sourceModule: string;
      sourceRecordId?: string;
      recommendedAction: string;
      ownerRole: string;
    }>;
  }>;
};

export type CategoryScores = {
  biosafety: number;
  documents: number;
  training: number;
  evidence: number;
  capa: number;
  incidents: number;
};

export type AuditReadinessConsoleSummary = {
  latestScore: number;
  trend: "improving" | "declining" | "steady" | "not_enough_data";
  recentScores: Array<{ id: string; overallScore: number; generatedAt?: string }>;
  unresolvedGaps: Array<{ label: string; status: string; sourceHref: string }>;
  generatedActions: FoundationReviewActionSummary[];
  notes: Array<{ id: string; note: string; noteType: string; createdAt?: string }>;
  humanReviewStatus: string;
  draftOnly: boolean;
  categoryScores?: CategoryScores;
};

export async function listAuditEvents(filters?: { eventType?: string; sourceModule?: string }): Promise<AuditEvent[]> {
  const context = await getProfileContext();
  if (!context) return filterAuditEvents(demoAuditEvents, filters);

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("audit_events")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (filters?.eventType && filters.eventType !== "all") {
    query = query.eq("event_type", filters.eventType);
  }
  if (filters?.sourceModule && filters.sourceModule !== "all") {
    query = query.contains("payload", { sourceModule: filters.sourceModule });
  }
  const { data, error } = await query;

  if (error || !data) return demoAuditEvents;

  return data.map(mapAuditEvent);
}

export async function getIntelligenceFoundationSummary(): Promise<IntelligenceFoundationSummary> {
  const context = await getProfileContext();
  if (!context) return demoIntelligenceFoundationSummary();

  try {
    const supabase = await createSupabaseServerClient();
    const [
      intakeTemplates,
      intakeResponses,
      programs,
      methods,
      rules,
      evidenceCount,
      changesCount,
      scoresCount,
      biotypeFoundations,
      biotypeSelections,
      biotypeMappings,
      latestScore,
      latestBiotypeSelection,
      biotypeRows,
      programRows,
      methodRows,
      ruleRows,
      evidenceRows,
      changeRows,
      responseRows,
      noteRows
    ] = await Promise.all([
      countRows(supabase, "company_intake_templates", context.organizationId),
      countRows(supabase, "company_intake_responses", context.organizationId),
      countRows(supabase, "compliance_programs", context.organizationId),
      countRows(supabase, "compliance_methods", context.organizationId),
      countRows(supabase, "applicability_rules", context.organizationId),
      countRows(supabase, "compliance_evidence_map", context.organizationId),
      countRows(supabase, "change_impact_events", context.organizationId),
      countRows(supabase, "audit_readiness_scores", context.organizationId),
      countRows(supabase, "biotype_foundations", context.organizationId),
      countRows(supabase, "organization_biotype_selections", context.organizationId),
      countRows(supabase, "biotype_rule_mappings", context.organizationId),
      latestRow(
        supabase,
        "audit_readiness_scores",
        context.organizationId,
        "id,overall_score,documents_score,training_score,capa_score,incidents_score,equipment_score,evidence_score,top_gaps"
      ),
      latestRow(supabase, "organization_biotype_selections", context.organizationId, "id,primary_biotype_key,secondary_biotype_keys,selection_status"),
      latestRows(
        supabase,
        "biotype_foundations",
        context.organizationId,
        "id,biotype_key,display_name,focus,required_documents,required_training,risk_drivers",
        12
      ),
      latestRows(supabase, "compliance_programs", context.organizationId, "id,program_name,status,owner_role", 8),
      latestRows(supabase, "compliance_methods", context.organizationId, "id,method_name,method_type,purpose", 8),
      latestRows(supabase, "applicability_rules", context.organizationId, "id,rule_code,name,required_programs,human_reviewer_role", 8),
      latestRows(supabase, "compliance_evidence_map", context.organizationId, "id,requirement_name,evidence_status,audit_ready", 8),
      latestRows(supabase, "change_impact_events", context.organizationId, "id,change_type,impact_summary,recommended_actions", 5),
      latestRows(supabase, "company_intake_responses", context.organizationId, "id,question_key,answer_value,triggers_programs", 12),
      latestRows(supabase, "audit_readiness_notes", context.organizationId, "id,note,note_type,created_at", 5)
    ]);

    const score = latestScore as Record<string, any> | null;
    const readiness = score
      ? {
          id: score.id,
          overallScore: score.overall_score,
          documentsScore: score.documents_score,
          trainingScore: score.training_score,
          capaScore: score.capa_score,
          incidentsScore: score.incidents_score,
          equipmentScore: score.equipment_score,
          evidenceScore: score.evidence_score,
          topGaps: (Array.isArray(score.top_gaps) ? score.top_gaps : []).map(normalizeReadinessGap)
        }
      : demoIntelligenceFoundationSummary().readiness;

    const demo = northStarFoundationDemo();
    const selection = latestBiotypeSelection as Record<string, any> | null;
    const selectedPrimary = normalizeBioTypeKey(selection?.primary_biotype_key) ?? "rd_biotech";
    const selectedSecondary = normalizeBioTypeKeys(selection?.secondary_biotype_keys).filter((key) => key !== selectedPrimary);
    const biotypeContext = buildBioTypeAiContext(selectedPrimary, selectedSecondary);
    const foundationInput = applyFoundationContext(
      {
        ...demo.aiInput,
        siteName: programs > 0 ? "Live Intelligence Foundation workspace" : "NorthStar BioLabs",
        workflow: changesCount > 0 ? "Foundation change-impact readiness review" : demo.aiInput.workflow
      },
      {
        ...demo.foundationContext,
        auditReadinessScore: readiness.overallScore,
        evidenceGaps: Array.isArray(readiness.topGaps) ? readiness.topGaps : demo.foundationContext.evidenceGaps
      }
    );
    const latestAssessmentInput = applyBioTypeContext(foundationInput, biotypeContext);
    const liveBiotypes = ((biotypeRows as Record<string, any>[]) ?? []).map((row) => ({
      key: row.biotype_key as BioTypeKey,
      name: row.display_name,
      focus: row.focus,
      role:
        row.biotype_key === selectedPrimary
          ? ("primary" as const)
          : selectedSecondary.includes(row.biotype_key)
            ? ("secondary" as const)
            : ("available" as const),
      requirements: summarizeJson([...(row.required_documents ?? []), ...(row.required_training ?? [])].slice(0, 4))
    }));
    const fallbackBiotypes = canonicalBioTypeFoundations.map((foundation) => ({
      key: foundation.key,
      name: foundation.name,
      focus: foundation.focus,
      role:
        foundation.key === selectedPrimary
          ? ("primary" as const)
          : selectedSecondary.includes(foundation.key)
            ? ("secondary" as const)
            : ("available" as const),
      requirements: [...foundation.documents.slice(0, 2), ...foundation.training.slice(0, 2)].join(", ")
    }));

    return {
      companyName: programs > 0 || scoresCount > 0 ? "Live organization workspace" : "NorthStar BioLabs",
      counts: [
        { label: "Intake templates", value: intakeTemplates },
        { label: "Intake responses", value: intakeResponses },
        { label: "Programs", value: programs },
        { label: "Methods", value: methods },
        { label: "Applicability rules", value: rules },
        { label: "Evidence items", value: evidenceCount },
        { label: "Change impacts", value: changesCount },
        { label: "Readiness scores", value: scoresCount },
        { label: "BioTypes", value: biotypeFoundations },
        { label: "BioType selections", value: biotypeSelections },
        { label: "BioType rules", value: biotypeMappings }
      ],
      coreComponents: coreComplianceComponents,
      biotypes: liveBiotypes.length > 0 ? liveBiotypes : fallbackBiotypes,
      biotypeSelection: {
        id: selection?.id,
        primaryBioType: selectedPrimary,
        secondaryBioTypes: selectedSecondary,
        status: selection?.selection_status ?? "draft_human_review_required"
      },
      intake: ((responseRows as Record<string, any>[]) ?? []).map((row) => ({
        id: row.id,
        question: row.question_key,
        answer: summarizeJson(row.answer_value),
        booleanValue: Boolean(row.answer_value?.value),
        triggers: summarizeJson(row.triggers_programs)
      })),
      programs: ((programRows as Record<string, any>[]) ?? []).map((row) => ({
        name: row.program_name,
        status: row.status,
        owner: row.owner_role ?? "unassigned"
      })),
      methods: ((methodRows as Record<string, any>[]) ?? []).map((row) => ({
        name: row.method_name,
        type: row.method_type,
        purpose: row.purpose ?? "Deterministic draft method"
      })),
      applicability: ((ruleRows as Record<string, any>[]) ?? []).map((row) => ({
        rule: `${row.rule_code}: ${row.name}`,
        required: summarizeJson(row.required_programs),
        reviewer: row.human_reviewer_role ?? "human reviewer"
      })),
      evidence: ((evidenceRows as Record<string, any>[]) ?? []).map((row) => ({
        id: row.id,
        requirement: row.requirement_name,
        status: row.evidence_status,
        auditReady: Boolean(row.audit_ready)
      })),
      changes: ((changeRows as Record<string, any>[]) ?? []).map((row) => ({
        type: row.change_type,
        summary: row.impact_summary,
        actions: summarizeJson(row.recommended_actions)
      })),
      readiness,
      auditReadinessNotes: ((noteRows as Record<string, any>[]) ?? []).map((row) => ({
        id: row.id,
        note: row.note,
        noteType: row.note_type,
        createdAt: row.created_at
      })),
      aiWorkflow: aiWorkflowSteps,
      humanValidationWorkflow: humanValidationWorkflowSteps,
      guardrailText: draftAiRecommendationGuardrail,
      latestAssessmentInput
    };
  } catch {
    return demoIntelligenceFoundationSummary();
  }
}

export async function getIntelligenceFoundationWorkbenchInput(): Promise<BioAiInput> {
  return (await getIntelligenceFoundationSummary()).latestAssessmentInput;
}

export async function getFoundationAdminAccessSummary(): Promise<FoundationAdminAccessSummary> {
  const auth = await getAuthSummary();
  const isOwner = canManageWorkspace(auth);

  return {
    configured: auth.configured,
    signedIn: auth.signedIn,
    isOwner,
    role: auth.role,
    message: isOwner
      ? "Owner access active. Foundation edit and demo controls are enabled."
      : auth.signedIn
        ? "Read-only foundation view. Owner access is required for compliance map workflows and demo data seeding."
        : "Read-only demo view. Sign in as an organization owner to use Foundation edit workflows."
  };
}

export async function getFoundationReviewActionsSummary(): Promise<FoundationReviewActionSummary[]> {
  const context = await getProfileContext();
  if (!context) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const [taskRows, recommendationRows, profileRows, auditRows] = await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,priority,status,due_date,assigned_to,source_module,source_record_id,created_at")
        .eq("organization_id", context.organizationId)
        .in("status", ["open", "in_progress", "blocked", "complete"])
        .in("source_module", foundationReviewSourceModules)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("document_recommendations")
        .select("id,title,payload,label,created_at")
        .eq("organization_id", context.organizationId)
        .contains("payload", { actionType: "foundation_review_action" })
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("profiles").select("id,full_name,role").eq("organization_id", context.organizationId).order("full_name"),
      supabase
        .from("audit_events")
        .select("event_type,summary,created_at,payload")
        .eq("organization_id", context.organizationId)
        .in("event_type", [
          "foundation_review_actions_generated",
          "foundation_review_task_status_updated",
          "foundation_review_task_note_added",
          "foundation_source_resolution_refreshed"
        ])
        .order("created_at", { ascending: false })
        .limit(80)
    ]);

    const taskData = (taskRows.data as Record<string, any>[]) ?? [];
    await createFoundationDueNotifications(supabase, context.organizationId, taskData);
    const recommendations = ((recommendationRows.data as Record<string, any>[]) ?? []).filter((row) => row.payload?.draftOnly !== false);
    const profiles = new Map(((profileRows.data as Record<string, any>[]) ?? []).map((row) => [row.id, row]));
    const auditEvents = ((auditRows.data as Record<string, any>[]) ?? []).map((row) => ({
      eventType: row.event_type as AuditEvent["eventType"],
      summary: String(row.summary ?? ""),
      createdAt: row.created_at,
      payload: row.payload ?? {}
    }));
    const sourceResolutionStates = await getFoundationSourceResolutionStates(supabase, context.organizationId, [
      ...taskData.map((row) => ({
        sourceModule: String(row.source_module ?? "foundation"),
        sourceRecordId: row.source_record_id ? String(row.source_record_id) : undefined
      })),
      ...recommendations.map((row) => ({
        sourceModule: String(row.payload?.sourceModule ?? "foundation"),
        sourceRecordId: row.payload?.sourceRecordId ? String(row.payload.sourceRecordId) : undefined
      }))
    ]);
    const recommendationBySource = new Map<string, Record<string, any>>();
    for (const row of recommendations) {
      const key = foundationActionKey(row.payload?.sourceModule, row.payload?.sourceRecordId, row.title);
      if (key) recommendationBySource.set(key, row);
    }

    const actions = new Map<string, FoundationReviewActionSummary>();
    for (const row of taskData) {
      const sourceModule = String(row.source_module ?? "foundation");
      const sourceRecordId = row.source_record_id ? String(row.source_record_id) : undefined;
      const key = foundationActionKey(sourceModule, sourceRecordId, row.title) ?? row.id;
      const recommendation = recommendationBySource.get(key);
      const source = getFoundationSourceTarget(sourceModule);
      const statusHistory = getFoundationTaskStatusHistory(auditEvents, row.id, sourceRecordId, profiles);
      const activityHistory = getFoundationTaskActivityHistory(auditEvents, row.id, sourceRecordId, profiles);
      const sourceResolution = getFoundationSourceResolution(sourceResolutionStates, sourceModule, sourceRecordId);
      actions.set(key, {
        id: row.id,
        taskId: row.id,
        title: row.title,
        priority: row.priority ?? "medium",
        status: row.status ?? "open",
        operatingState: getFoundationActionOperatingState(row.status ?? "open", row.due_date),
        canUpdate: canUpdateAssignedWorkspaceTask(context, row.assigned_to),
        assignedTo: row.assigned_to ?? null,
        assigneeName: profiles.get(row.assigned_to)?.full_name ?? null,
        sourceModule,
        sourceRecordId,
        sourceLabel: source.label,
        sourceHref: getFoundationExactSourceHref(sourceModule, sourceRecordId),
        sourceDetailHref: getFoundationExactSourceHref(sourceModule, sourceRecordId),
        sourceResolutionState: sourceResolution.state,
        sourceResolutionDetail: sourceResolution.detail,
        dueDate: row.due_date,
        recommendationId: recommendation?.id,
        reason: recommendation?.payload?.reason,
        nextStep: getFoundationActionNextStep(row.status ?? "open", row.assigned_to, row.due_date),
        closeoutNote: getFoundationTaskCloseoutNote(statusHistory),
        createdAt: row.created_at,
        statusHistory,
        activityHistory
      });
    }

    for (const row of recommendations) {
      const sourceModule = String(row.payload?.sourceModule ?? "foundation");
      const sourceRecordId = row.payload?.sourceRecordId ? String(row.payload.sourceRecordId) : undefined;
      const key = foundationActionKey(sourceModule, sourceRecordId, row.title) ?? row.id;
      if (actions.has(key)) continue;
      const source = getFoundationSourceTarget(sourceModule);
      const sourceResolution = getFoundationSourceResolution(sourceResolutionStates, sourceModule, sourceRecordId);
      actions.set(key, {
        id: row.id,
        title: row.title,
        priority: "medium",
        status: row.label ?? "Draft - Human Review Required",
        operatingState: "Draft recommendation",
        canUpdate: canManageWorkspace(context),
        sourceModule,
        sourceRecordId,
        sourceLabel: source.label,
        sourceHref: getFoundationExactSourceHref(sourceModule, sourceRecordId),
        sourceDetailHref: getFoundationExactSourceHref(sourceModule, sourceRecordId),
        sourceResolutionState: sourceResolution.state,
        sourceResolutionDetail: sourceResolution.detail,
        recommendationId: row.id,
        reason: row.payload?.reason,
        nextStep: "Create or link a review task before operational follow-through.",
        createdAt: row.created_at,
        statusHistory: [],
        activityHistory: []
      });
    }

    return Array.from(actions.values()).slice(0, 12);
  } catch {
    return [];
  }
}

export async function getFoundationAssigneeOptions(): Promise<FoundationAssigneeOption[]> {
  const context = await getProfileContext();
  if (!context) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,role")
      .eq("organization_id", context.organizationId)
      .order("full_name");

    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      name: row.full_name ?? row.role ?? "Workspace user",
      role: row.role
    }));
  } catch {
    return [];
  }
}

export async function getFoundationVerificationStatusSummary(): Promise<FoundationVerificationStatusSummary> {
  const context = await getProfileContext();
  if (!context) return demoFoundationVerificationStatusSummary();

  try {
    const supabase = await createSupabaseServerClient();
    const workflowEvents = [
      "foundation_biotype_selection_updated",
      "foundation_intake_response_updated",
      "foundation_evidence_readiness_updated",
      "foundation_audit_readiness_note_added",
      "foundation_review_task_status_updated"
    ];
    const [saveResult, runResult, latestResult, checklistResult, signoffResult] = await Promise.all([
      supabase
        .from("audit_events")
        .select("event_type,summary,payload,created_at")
        .eq("organization_id", context.organizationId)
        .in("event_type", workflowEvents)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("audit_events")
        .select("event_type,summary,payload,created_at")
        .eq("organization_id", context.organizationId)
        .eq("event_type", "foundation_review_actions_generated")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("audit_events")
        .select("event_type,summary,payload,created_at")
        .eq("organization_id", context.organizationId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("audit_events")
        .select("event_type,summary,payload,created_at")
        .eq("organization_id", context.organizationId)
        .in("event_type", [...workflowEvents, "foundation_review_actions_generated"])
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("audit_readiness_notes")
        .select("id,note,created_at")
        .eq("organization_id", context.organizationId)
        .eq("note_type", "final_preview_signoff")
        .order("created_at", { ascending: false })
        .limit(1)
    ]);

    const checklist = buildFoundationVerificationChecklist((checklistResult.data as Record<string, any>[]) ?? []);
    const latestWorkflowSave = mapFoundationWorkflowSave((saveResult.data?.[0] as Record<string, any> | undefined) ?? null);
    const latestReviewActionRun = mapFoundationReviewRun((runResult.data?.[0] as Record<string, any> | undefined) ?? null);
    const latestAuditEvent = mapFoundationLatestAudit((latestResult.data?.[0] as Record<string, any> | undefined) ?? null);
    const latestFinalSignoff = mapFoundationFinalSignoff((signoffResult.data?.[0] as Record<string, any> | undefined) ?? null);
    const allChecklistPassed = checklist.every((step) => step.status === "pass");
    const productionPromotionAllowed = allChecklistPassed && Boolean(latestFinalSignoff);

    return {
      checklist,
      latestWorkflowSave,
      latestReviewActionRun,
      latestAuditEvent,
      latestFinalSignoff,
      allChecklistPassed,
      productionPromotionAllowed,
      productionGateReason: productionPromotionAllowed
        ? "Owner verification passed and final preview signoff is captured."
        : allChecklistPassed
          ? "Verification checklist passed; final preview signoff is still required."
          : "Production promotion is blocked until every owner verification checklist item passes."
    };
  } catch {
    return demoFoundationVerificationStatusSummary();
  }
}

export async function getFoundationProductionVerificationSummary(): Promise<FoundationProductionVerificationSummary> {
  const context = await getProfileContext();
  const environment = process.env.VERCEL_ENV ?? "local";
  const deploymentUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3001";
  if (!context) {
    return {
      environment,
      deploymentUrl,
      productionReady: false,
      reason: "Sign in to verify production workflow evidence."
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("audit_events")
      .select("event_type,summary,created_at,payload")
      .eq("organization_id", context.organizationId)
      .in("event_type", [
        "foundation_biotype_selection_updated",
        "foundation_intake_response_updated",
        "foundation_evidence_readiness_updated",
        "foundation_audit_readiness_note_added",
        "foundation_review_actions_generated",
        "foundation_review_task_status_updated",
        "foundation_review_task_note_added",
        "foundation_source_resolution_refreshed"
      ])
      .order("created_at", { ascending: false })
      .limit(30);
    const rows = (data as Record<string, any>[] | null) ?? [];
    const latestWorkflowSave = rows.find((row) =>
      ["foundation_biotype_selection_updated", "foundation_intake_response_updated", "foundation_evidence_readiness_updated", "foundation_audit_readiness_note_added"].includes(
        String(row.event_type)
      )
    );
    const latestTaskUpdate = rows.find(
      (row) =>
        row.event_type === "foundation_review_task_status_updated" ||
        row.event_type === "foundation_review_task_note_added" ||
        row.event_type === "foundation_source_resolution_refreshed"
    );
    const latestAuditEvent = rows[0];
    const productionReady = Boolean(latestWorkflowSave && latestTaskUpdate && latestAuditEvent);

    return {
      latestWorkflowSave: latestWorkflowSave ? mapProductionVerificationEvent(latestWorkflowSave) : undefined,
      latestTaskUpdate: latestTaskUpdate ? mapProductionVerificationEvent(latestTaskUpdate) : undefined,
      latestAuditEvent: latestAuditEvent ? mapProductionVerificationEvent(latestAuditEvent) : undefined,
      environment,
      deploymentUrl,
      productionReady,
      reason: productionReady
        ? "Latest workflow save, task activity, and audit event are present. Promotion can be considered after route smoke testing."
        : "Production verification is blocked until workflow save, task activity, and audit evidence are all present."
    };
  } catch {
    return {
      environment,
      deploymentUrl,
      productionReady: false,
      reason: "Production verification could not read the audit trail."
    };
  }
}

export async function getFoundationNotificationSummary(): Promise<FoundationNotificationSummary> {
  const context = await getProfileContext();
  if (!context) return { unreadCount: 0, notifications: [] };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,body,notification_type,task_id,read_at,created_at")
      .eq("organization_id", context.organizationId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error || !data) return { unreadCount: 0, notifications: [] };
    const notifications = data.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body ?? "",
      notificationType: row.notification_type ?? "task",
      label: getFoundationNotificationLabel(row.notification_type ?? "task"),
      taskId: row.task_id,
      createdAt: row.created_at,
      readAt: row.read_at
    }));
    return {
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
      notifications
    };
  } catch {
    return { unreadCount: 0, notifications: [] };
  }
}

export async function updateFoundationNotificationReadState(input: { notificationId: string; read: boolean }): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to update notification state." };

  const notificationId = String(input.notificationId ?? "").trim();
  if (!notificationId) return { ok: false, message: "Choose a notification to update." };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: input.read ? new Date().toISOString() : null })
      .eq("organization_id", context.organizationId)
      .eq("user_id", context.userId)
      .eq("id", notificationId);

    if (error) return { ok: false, message: error.message };
    return { ok: true, message: input.read ? "Notification marked read." : "Notification marked unread." };
  } catch {
    return { ok: false, message: "Notification state could not be updated." };
  }
}

export async function markAllFoundationNotificationsRead(): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to clear notifications." };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("organization_id", context.organizationId)
      .eq("user_id", context.userId)
      .is("read_at", null);

    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Unread notifications marked read." };
  } catch {
    return { ok: false, message: "Notifications could not be cleared." };
  }
}

export async function getFoundationSourceDrilldownSummary(): Promise<FoundationSourceDrilldownSummary> {
  const context = await getProfileContext();
  if (!context) return demoFoundationSourceDrilldownSummary();

  try {
    const supabase = await createSupabaseServerClient();
    const [evidenceRows, trainingRows, equipmentRows, incidentRows, biotypeSelection] = await Promise.all([
      latestRows(supabase, "compliance_evidence_map", context.organizationId, "id,requirement_name,evidence_status,audit_ready,source_table,source_record_id", 8),
      latestRows(supabase, "training_assignments", context.organizationId, "id,status,training_requirement_id", 8),
      latestRows(supabase, "equipment", context.organizationId, "id,equipment_tag,name,status,qualification_status", 8),
      latestRows(supabase, "incidents", context.organizationId, "id,title,status,severity", 8),
      latestRow(supabase, "organization_biotype_selections", context.organizationId, "id,primary_biotype_key,secondary_biotype_keys,selection_status")
    ]);

    const selection = biotypeSelection as Record<string, any> | null;
    const primary = normalizeBioTypeKey(selection?.primary_biotype_key) ?? "rd_biotech";
    const secondary = normalizeBioTypeKeys(selection?.secondary_biotype_keys).filter((key) => key !== primary);

    return {
      groups: [
        {
          key: "evidence_map",
          title: "Evidence gaps",
          description: "Mapped controls that still need audit-ready evidence or human review.",
          href: getFoundationSourceTarget("evidence_map").href,
          items: ((evidenceRows as Record<string, any>[]) ?? [])
            .filter((row) => !row.audit_ready || isFoundationGapStatus(row.evidence_status))
            .map((row) => ({
              id: row.id,
              label: row.requirement_name ?? "Evidence requirement",
              status: row.evidence_status ?? "review_needed",
              detail: `Audit-ready: ${Boolean(row.audit_ready)}. Source table: ${row.source_table ?? "not linked"}.`,
              sourceModule: "evidence_map",
              sourceRecordId: row.id,
              recommendedAction: "Review mapped evidence and update readiness status.",
              ownerRole: "ehs"
            }))
        },
        {
          key: "biotype_selection",
          title: "BioType missing controls",
          description: "Selected BioType branches that drive document, training, record, and evidence checks.",
          href: getFoundationSourceTarget("biotype_selection").href,
          items: selection?.id
            ? [
                {
                  id: selection.id,
                  label: `Primary ${primary}`,
                  status: selection.selection_status ?? "draft_human_review_required",
                  detail: `Secondary BioTypes: ${secondary.length > 0 ? secondary.join(", ") : "none selected"}.`,
                  sourceModule: "biotype_selection",
                  sourceRecordId: selection.id,
                  recommendedAction: "Confirm required BioType controls and evidence map coverage.",
                  ownerRole: "biosafety_officer"
                }
              ]
            : []
        },
        {
          key: "incident",
          title: "Incident/CAPA screening",
          description: "Open incidents that may need CAPA screening, document impact, training impact, or evidence updates.",
          href: getFoundationSourceTarget("incident").href,
          items: ((incidentRows as Record<string, any>[]) ?? [])
            .filter((row) => row.status !== "closed")
            .map((row) => ({
              id: row.id,
              label: row.title ?? "Open incident",
              status: row.status ?? "open",
              detail: `Severity: ${row.severity ?? "unknown"}.`,
              sourceModule: "incident",
              sourceRecordId: row.id,
              recommendedAction: "Complete incident/CAPA screening and link evidence.",
              ownerRole: "ehs"
            }))
        },
        {
          key: "equipment",
          title: "Equipment readiness",
          description: "Equipment records with inactive status, overdue qualification, or readiness impact.",
          href: getFoundationSourceTarget("equipment").href,
          items: ((equipmentRows as Record<string, any>[]) ?? [])
            .filter((row) => row.status !== "active" || row.qualification_status !== "current")
            .map((row) => ({
              id: row.id,
              label: row.equipment_tag ?? row.name ?? "Equipment",
              status: row.status ?? "unknown",
              detail: `Qualification: ${row.qualification_status ?? "unknown"}.`,
              sourceModule: "equipment",
              sourceRecordId: row.id,
              recommendedAction: "Review equipment status, qualification evidence, and impacted workflows.",
              ownerRole: "validation_lead"
            }))
        },
        {
          key: "training_assignment",
          title: "Training readiness",
          description: "Expired or incomplete training assignments that block readiness.",
          href: getFoundationSourceTarget("training_assignment").href,
          items: ((trainingRows as Record<string, any>[]) ?? [])
            .filter((row) => row.status !== "complete" && row.status !== "current")
            .map((row) => ({
              id: row.id,
              label: `Training assignment ${String(row.id).slice(0, 8)}`,
              status: row.status ?? "open",
              detail: `Requirement: ${row.training_requirement_id ?? "not linked"}.`,
              sourceModule: "training_assignment",
              sourceRecordId: row.id,
              recommendedAction: "Review competency evidence and assign follow-up training.",
              ownerRole: "training_owner"
            }))
        }
      ]
    };
  } catch {
    return demoFoundationSourceDrilldownSummary();
  }
}

export async function getAuditReadinessConsoleSummary(): Promise<AuditReadinessConsoleSummary> {
  const context = await getProfileContext();
  if (!context) return demoAuditReadinessConsoleSummary();

  try {
    const supabase = await createSupabaseServerClient();
    const [scoreResult, evidenceRows, noteRows, generatedActions] = await Promise.all([
      supabase
        .from("audit_readiness_scores")
        .select("id,overall_score,documents_score,training_score,capa_score,incidents_score,evidence_score,top_gaps,generated_at")
        .eq("organization_id", context.organizationId)
        .order("generated_at", { ascending: false })
        .limit(5),
      latestRows(supabase, "compliance_evidence_map", context.organizationId, "id,requirement_name,evidence_status,audit_ready", 20),
      latestRows(supabase, "audit_readiness_notes", context.organizationId, "id,note,note_type,created_at", 5),
      getFoundationReviewActionsSummary()
    ]);

    const scores = ((scoreResult.data as Record<string, any>[]) ?? []).map((row) => ({
      id: row.id,
      overallScore: Number(row.overall_score ?? 0),
      generatedAt: row.generated_at
    }));
    const latest = scores[0]?.overallScore ?? demoIntelligenceFoundationSummary().readiness.overallScore;
    const previous = scores[1]?.overallScore;
    const scoreTopGaps = ((scoreResult.data?.[0] as Record<string, any> | undefined)?.top_gaps ?? []) as unknown[];
    const evidenceGaps = ((evidenceRows as Record<string, any>[]) ?? [])
      .filter((row) => !row.audit_ready || isFoundationGapStatus(row.evidence_status))
      .map((row) => ({
        label: row.requirement_name,
        status: row.evidence_status ?? "review_needed",
        sourceHref: getFoundationSourceTarget("evidence_map").href
      }));
    const topGaps = scoreTopGaps.map((gap) => ({
      label: normalizeReadinessGap(gap),
      status: "readiness_gap",
      sourceHref: getFoundationSourceTarget("audit_readiness").href
    }));

    const latestScoreRow = (scoreResult.data?.[0] as Record<string, any> | undefined);
    return {
      latestScore: latest,
      trend: getReadinessTrend(latest, previous),
      recentScores: scores,
      unresolvedGaps: dedupeReadinessGaps([...evidenceGaps, ...topGaps]).slice(0, 8),
      generatedActions: generatedActions.slice(0, 6),
      notes: ((noteRows as Record<string, any>[]) ?? []).map((row) => ({
        id: row.id,
        note: row.note,
        noteType: row.note_type,
        createdAt: row.created_at
      })),
      humanReviewStatus: "Draft - human review required",
      draftOnly: true,
      categoryScores: latestScoreRow ? {
        biosafety: Number(latestScoreRow.overall_score ?? 0),
        documents: Number(latestScoreRow.documents_score ?? 0),
        training:  Number(latestScoreRow.training_score  ?? 0),
        evidence:  Number(latestScoreRow.evidence_score  ?? 0),
        capa:      Number(latestScoreRow.capa_score      ?? 0),
        incidents: Number(latestScoreRow.incidents_score ?? 0),
      } : undefined
    };
  } catch {
    return demoAuditReadinessConsoleSummary();
  }
}

export async function getFoundationOperationsDashboardSummary(): Promise<FoundationOperationsDashboardSummary> {
  const context = await getProfileContext();
  if (!context) {
    const demo = demoIntelligenceFoundationSummary();
    return {
      readinessScore: demo.readiness.overallScore,
      openActions: 0,
      blockedTasks: 0,
      duplicatePreserved: 1,
      latestRunSummary: "Demo Foundation action planning has not been verified by an owner."
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const [scoreRow, taskRows, latestRun] = await Promise.all([
      latestRow(supabase, "audit_readiness_scores", context.organizationId, "id,overall_score,generated_at"),
      supabase
        .from("tasks")
        .select("id,status")
        .eq("organization_id", context.organizationId)
        .in("source_module", foundationReviewSourceModules),
      supabase
        .from("audit_events")
        .select("summary,payload,created_at")
        .eq("organization_id", context.organizationId)
        .eq("event_type", "foundation_review_actions_generated")
        .order("created_at", { ascending: false })
        .limit(1)
    ]);
    const tasks = (taskRows.data as Record<string, any>[] | null) ?? [];
    const run = (latestRun.data?.[0] as Record<string, any> | undefined) ?? null;
    return {
      readinessScore: Number((scoreRow as Record<string, any> | null)?.overall_score ?? demoIntelligenceFoundationSummary().readiness.overallScore),
      openActions: tasks.filter((task) => task.status === "open" || task.status === "in_progress").length,
      blockedTasks: tasks.filter((task) => task.status === "blocked").length,
      duplicatePreserved: normalizeSkippedDuplicates(run?.payload?.skippedDuplicates).length,
      latestRunSummary: run?.summary
    };
  } catch {
    const demo = demoIntelligenceFoundationSummary();
    return {
      readinessScore: demo.readiness.overallScore,
      openActions: 0,
      blockedTasks: 0,
      duplicatePreserved: 0,
      latestRunSummary: "Foundation operations dashboard fallback active."
    };
  }
}

export async function createFoundationStarterRecords(): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before creating Foundation starter records." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can create Foundation starter records." };

  const supabase = await createSupabaseServerClient();
  const companyProfile = await getCompanyProfile();
  const demo = northStarFoundationDemo();
  const now = new Date().toISOString();
  let createdIntake = 0;
  let createdEvidence = 0;

  const templateName = "PredictSafeBIO Foundation Starter Intake";
  const { data: existingTemplate } = await supabase
    .from("company_intake_templates")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("name", templateName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let templateId = (existingTemplate as Record<string, any> | null)?.id as string | undefined;
  if (!templateId) {
    const { data: template, error: templateError } = await supabase
      .from("company_intake_templates")
      .insert({
        organization_id: context.organizationId,
        name: templateName,
        version_label: "starter-v1",
        active: true,
        sections: [
          { key: "materials", title: "Materials and samples" },
          { key: "equipment", title: "Equipment and controls" },
          { key: "readiness", title: "Documents, training, incidents, and evidence" }
        ]
      })
      .select("id")
      .single();
    if (templateError || !template) return { ok: false, message: templateError?.message ?? "Could not create starter intake template." };
    templateId = template.id;
  }

  const starterAnswerKeys = (Object.keys(demo.answers) as Array<keyof FoundationIntakeAnswers>).slice(0, 6);
  const { data: existingResponses } = await supabase
    .from("company_intake_responses")
    .select("question_key")
    .eq("organization_id", context.organizationId)
    .in("question_key", starterAnswerKeys);
  const existingQuestionKeys = new Set(((existingResponses as Record<string, any>[] | null) ?? []).map((row) => row.question_key));
  const intakeRows = starterAnswerKeys
    .filter((questionKey) => !existingQuestionKeys.has(questionKey))
    .map((questionKey) => ({
      organization_id: context.organizationId,
      company_profile_id: companyProfile.id ?? null,
      intake_template_id: templateId,
      question_key: questionKey,
      answer_value: { value: Boolean(demo.answers[questionKey]) },
      triggers_documents: demo.applicability.requiredDocuments,
      triggers_programs: demo.applicability.requiredPrograms,
      created_by: context.userId,
      updated_at: now
    }));
  if (intakeRows.length > 0) {
    const { error } = await supabase.from("company_intake_responses").insert(intakeRows);
    if (error) return { ok: false, message: error.message };
    createdIntake = intakeRows.length;
  }

  const starterEvidence = demo.evidence.slice(0, 8);
  const { data: existingEvidence } = await supabase
    .from("compliance_evidence_map")
    .select("requirement_name")
    .eq("organization_id", context.organizationId)
    .in(
      "requirement_name",
      starterEvidence.map((item) => item.requirementName)
    );
  const existingRequirementNames = new Set(((existingEvidence as Record<string, any>[] | null) ?? []).map((row) => row.requirement_name));
  const evidenceRows = starterEvidence
    .filter((item) => !existingRequirementNames.has(item.requirementName))
    .map((item) => ({
      organization_id: context.organizationId,
      requirement_name: item.requirementName,
      control_name: item.controlName,
      evidence_type: item.evidenceType,
      source_table: item.sourceTable,
      required_frequency: "annual or event-driven",
      evidence_status: item.evidenceStatus,
      audit_ready: item.auditReady,
      human_review_required: true,
      created_by: context.userId,
      updated_at: now
    }));
  if (evidenceRows.length > 0) {
    const { error } = await supabase.from("compliance_evidence_map").insert(evidenceRows);
    if (error) return { ok: false, message: error.message };
    createdEvidence = evidenceRows.length;
  }

  if (createdIntake === 0 && createdEvidence === 0) {
    return { ok: true, message: "Foundation starter records already exist. Edit one intake answer and one evidence row to finish verification." };
  }

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_starter_records_created",
    summary: "Foundation starter intake and evidence records created for owner verification.",
    sourceModule: "foundation",
    targetModule: "foundation",
    payload: { createdIntake, createdEvidence }
  });

  return {
    ok: true,
    message: `Created ${createdIntake} intake answer(s) and ${createdEvidence} evidence row(s). Now edit and save one of each to turn the checklist green.`
  };
}

export async function addAuditReadinessNote(input: {
  auditReadinessScoreId?: string | null;
  note: string;
  noteType?: string;
}): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before adding audit readiness notes." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can add Foundation audit readiness notes." };

  const note = input.note.trim();
  if (note.length < 3) return { ok: false, message: "Add a short audit readiness note before saving." };
  const noteType = input.noteType === "final_preview_signoff" ? "final_preview_signoff" : "human_review_note";

  const supabase = await createSupabaseServerClient();
  const score =
    input.auditReadinessScoreId ??
    ((await latestRow(supabase, "audit_readiness_scores", context.organizationId, "id")) as Record<string, any> | null)?.id ??
    null;
  const { data, error } = await supabase
    .from("audit_readiness_notes")
    .insert({
      organization_id: context.organizationId,
      audit_readiness_score_id: score,
      note,
      note_type: noteType,
      draft_only: true,
      human_review_required: true,
      created_by: context.userId
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Audit readiness note could not be saved." };

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_audit_readiness_note_added",
    summary:
      noteType === "final_preview_signoff"
        ? "Final preview signoff note added; production promotion remains subject to verification and deployment review."
        : "Audit readiness note added; this does not approve or certify readiness.",
    sourceModule: "audit_readiness",
    sourceRecordId: score ?? data.id,
    targetModule: "audit_readiness",
    targetRecordId: data.id,
    payload: { noteId: data.id, auditReadinessScoreId: score, noteType }
  });

  return {
    ok: true,
    message:
      noteType === "final_preview_signoff"
        ? "Final preview signoff captured as draft - human review required."
        : "Audit readiness note added as draft - human review required."
  };
}

export async function seedNorthStarWithConfirmation(confirmation: string): Promise<FoundationActionResult> {
  if (confirmation.trim() !== "SEED DEMO DATA") {
    return { ok: false, message: "Type SEED DEMO DATA to create another demo dataset." };
  }

  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before seeding NorthStar." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can seed NorthStar demo data." };

  const result = await seedIntelligenceFoundation();
  if (!result.ok) return result;
  return {
    ok: true,
    message: `${result.seedLabel} created. Draft audit readiness score is ${result.readinessScore}; human review is required.`
  };
}

export async function generateFoundationReviewActions(): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before generating review actions." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can generate Foundation review actions." };

  const supabase = await createSupabaseServerClient();
  const runId = randomUUID();
  const [evidenceRows, trainingRows, equipmentRows, incidentRows, biotypeSelection] = await Promise.all([
    latestRows(
      supabase,
      "compliance_evidence_map",
      context.organizationId,
      "id,requirement_name,evidence_status,audit_ready,source_table,source_record_id",
      50
    ),
    latestRows(supabase, "training_assignments", context.organizationId, "id,status,training_requirement_id", 25),
    latestRows(supabase, "equipment", context.organizationId, "id,equipment_tag,name,status,qualification_status", 25),
    latestRows(supabase, "incidents", context.organizationId, "id,title,status,severity", 25),
    latestRow(supabase, "organization_biotype_selections", context.organizationId, "id,primary_biotype_key,secondary_biotype_keys")
  ]);

  const candidates: FoundationReviewActionCandidate[] = [
    ...((evidenceRows as Record<string, any>[]) ?? [])
      .filter((row) => !row.audit_ready || isFoundationGapStatus(row.evidence_status))
      .map((row) => ({
        sourceModule: "evidence_map",
        sourceRecordId: row.id,
        title: `Review evidence gap - ${row.requirement_name}`,
        priority: (row.evidence_status === "out_of_tolerance" || row.evidence_status === "expired" ? "high" : "medium") as "high" | "medium",
        reason: `Evidence status is ${row.evidence_status}; audit-ready is ${Boolean(row.audit_ready)}.`
      })),
    ...((trainingRows as Record<string, any>[]) ?? [])
      .filter((row) => row.status === "expired")
      .map((row) => ({
        sourceModule: "training_assignment",
        sourceRecordId: row.id,
        title: "Review expired foundation training assignment",
        priority: "high" as const,
        reason: "Training assignment is expired and blocks readiness."
      })),
    ...((equipmentRows as Record<string, any>[]) ?? [])
      .filter((row) => row.status !== "active" || row.qualification_status !== "current")
      .map((row) => ({
        sourceModule: "equipment",
        sourceRecordId: row.id,
        title: `Review equipment readiness - ${row.equipment_tag ?? row.name}`,
        priority: (row.status === "out_of_service" ? "high" : "medium") as "high" | "medium",
        reason: `Equipment status is ${row.status}; qualification is ${row.qualification_status ?? "unknown"}.`
      })),
    ...((incidentRows as Record<string, any>[]) ?? [])
      .filter((row) => row.status !== "closed")
      .map((row) => ({
        sourceModule: "incident",
        sourceRecordId: row.id,
        title: `Review incident/CAPA screening - ${row.title}`,
        priority: (row.severity === "high" || row.severity === "critical" ? "high" : "medium") as "high" | "medium",
        reason: `Incident status is ${row.status}; CAPA screening may be required.`
      }))
  ];

  const selection = biotypeSelection as Record<string, any> | null;
  if (selection?.id) {
    candidates.push({
      sourceModule: "biotype_selection",
      sourceRecordId: selection.id,
      title: "Review BioType missing controls",
      priority: "medium",
      reason: "Primary and secondary BioType selections require document, training, record, and evidence review."
    });
  }

  let created = 0;
  const skippedDuplicates: FoundationDuplicateSkipSummary[] = [];
  for (const candidate of candidates) {
    const [duplicateTask, duplicateRecommendation] = await Promise.all([
      hasOpenFoundationTask(supabase, context.organizationId, candidate.sourceModule, candidate.sourceRecordId, candidate.title),
      hasOpenFoundationRecommendation(supabase, context.organizationId, candidate.sourceModule, candidate.sourceRecordId, candidate.title)
    ]);
    if (duplicateTask || duplicateRecommendation) {
      skippedDuplicates.push({
        title: candidate.title,
        sourceModule: candidate.sourceModule,
        sourceRecordId: candidate.sourceRecordId,
        reason: duplicateTask && duplicateRecommendation ? "Existing open task and draft recommendation" : duplicateTask ? "Existing open task" : "Existing draft recommendation"
      });
      continue;
    }

    const dueDate = formatDateOnly(getFieldReportDueDate(candidate.priority));
    const { data: task } = await supabase
      .from("tasks")
      .insert({
        organization_id: context.organizationId,
        source_module: candidate.sourceModule,
        source_record_id: candidate.sourceRecordId,
        assigned_to: context.userId,
        title: candidate.title,
        status: "open",
        due_date: dueDate,
        priority: candidate.priority,
        created_by: context.userId
      })
      .select("id")
      .single();

    if (!task?.id) continue;
    created += 1;

    await supabase.from("document_recommendations").insert({
      organization_id: context.organizationId,
      recommendation_type: "gap",
      title: candidate.title,
      label: "Draft - Human Review Required",
      human_review_required: true,
      created_by: context.userId,
      payload: withAuditTrace(
        {
          runId,
          actionType: "foundation_review_action",
          sourceModule: candidate.sourceModule,
          sourceRecordId: candidate.sourceRecordId,
          taskId: task.id,
          reason: candidate.reason
        },
        {
          sourceModule: candidate.sourceModule,
          sourceRecordId: candidate.sourceRecordId,
          targetModule: "task",
          targetRecordId: task.id,
          runId,
          draftOnly: true
        }
      )
    });
  }

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_review_actions_generated",
    summary: `Foundation review action generation completed. ${created} new action(s) created.`,
    sourceModule: "foundation",
    sourceRecordId: runId,
    targetModule: "task",
    targetRecordId: runId,
    runId,
    payload: { created, candidateCount: candidates.length, skippedDuplicates }
  });

  return {
    ok: true,
    message:
      created > 0
        ? `${created} review action(s) generated as draft tasks. ${skippedDuplicates.length} duplicate(s) preserved.`
        : `No new review actions needed; ${skippedDuplicates.length} existing open action(s) were preserved.`
  };
}

export async function createFoundationReviewActionFromSource(input: {
  sourceModule: string;
  sourceRecordId: string;
  title: string;
  reason: string;
  priority?: string;
}): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before creating Foundation review actions." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can create Foundation review actions." };

  const sourceModule = normalizeFoundationReviewSourceModule(input.sourceModule);
  if (!sourceModule) return { ok: false, message: "Choose a valid Foundation source module." };
  if (!isUuid(input.sourceRecordId)) return { ok: false, message: "Source record must be a saved Foundation record." };

  const candidate: FoundationReviewActionCandidate = {
    sourceModule,
    sourceRecordId: input.sourceRecordId,
    title: input.title.trim().slice(0, 160) || `Review ${sourceModule.replace(/_/g, " ")}`,
    priority: input.priority === "high" ? "high" : "medium",
    reason: input.reason.trim().slice(0, 500) || "Owner-created review action from Foundation source drilldown."
  };

  const supabase = await createSupabaseServerClient();
  const [duplicateTask, duplicateRecommendation] = await Promise.all([
    hasOpenFoundationTask(supabase, context.organizationId, candidate.sourceModule, candidate.sourceRecordId, candidate.title),
    hasOpenFoundationRecommendation(supabase, context.organizationId, candidate.sourceModule, candidate.sourceRecordId, candidate.title)
  ]);
  if (duplicateTask || duplicateRecommendation) {
    return {
      ok: true,
      message: duplicateTask ? "Existing open task preserved for this source." : "Existing draft recommendation preserved for this source."
    };
  }

  const runId = randomUUID();
  const dueDate = formatDateOnly(getFieldReportDueDate(candidate.priority));
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      organization_id: context.organizationId,
      source_module: candidate.sourceModule,
      source_record_id: candidate.sourceRecordId,
      assigned_to: context.userId,
      title: candidate.title,
      status: "open",
      due_date: dueDate,
      priority: candidate.priority,
      created_by: context.userId
    })
    .select("id")
    .single();

  if (taskError || !task?.id) return { ok: false, message: taskError?.message ?? "Foundation review task could not be created." };

  await supabase.from("document_recommendations").insert({
    organization_id: context.organizationId,
    recommendation_type: "gap",
    title: candidate.title,
    label: "Draft - Human Review Required",
    human_review_required: true,
    created_by: context.userId,
    payload: withAuditTrace(
      {
        runId,
        actionType: "foundation_review_action",
        sourceModule: candidate.sourceModule,
        sourceRecordId: candidate.sourceRecordId,
        taskId: task.id,
        reason: candidate.reason
      },
      {
        sourceModule: candidate.sourceModule,
        sourceRecordId: candidate.sourceRecordId,
        targetModule: "task",
        targetRecordId: task.id,
        runId,
        draftOnly: true
      }
    )
  });

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_review_actions_generated",
    summary: `Foundation source review action created: ${candidate.title}.`,
    sourceModule: candidate.sourceModule,
    sourceRecordId: candidate.sourceRecordId,
    targetModule: "task",
    targetRecordId: task.id,
    runId,
    payload: { created: 1, candidateCount: 1, skippedDuplicates: [], sourceCreated: true }
  });

  return { ok: true, message: "Foundation source review action created as a draft task." };
}

export async function updateFoundationReviewTaskStatus(input: {
  taskId: string;
  status: string;
  priority?: string | null;
  dueDate?: string | null;
  assignedTo?: string | null;
  closeoutNote?: string | null;
}): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating Foundation review tasks." };
  const status = normalizeFoundationTaskStatus(input.status);
  if (!status) return { ok: false, message: "Choose a valid Foundation review task status." };
  const hasPriorityInput = Object.prototype.hasOwnProperty.call(input, "priority");
  const hasDueDateInput = Object.prototype.hasOwnProperty.call(input, "dueDate");
  const hasAssignedToInput = Object.prototype.hasOwnProperty.call(input, "assignedTo");
  const closeoutNote = String(input.closeoutNote ?? "").trim();
  if (status === "complete" && closeoutNote.length < 8) {
    return { ok: false, message: "Add a short closeout note before completing this Foundation review task." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("id,title,priority,status,due_date,assigned_to,source_module,source_record_id")
    .eq("organization_id", context.organizationId)
    .eq("id", input.taskId)
    .single();

  if (readError || !task) return { ok: false, message: readError?.message ?? "Foundation review task could not be found." };
  if (!foundationReviewSourceModules.includes(String(task.source_module))) {
    return { ok: false, message: "Only generated Foundation review tasks can be updated from this panel." };
  }
  const actorRole = getWorkspaceTaskActorRole(context);
  const isOwner = canEditWorkspaceTaskGovernance(context);
  if (!canUpdateAssignedWorkspaceTask(context, task.assigned_to)) {
    return { ok: false, message: "Members can update only Foundation review tasks assigned to them." };
  }
  if (!isOwner && (hasAssignedToInput || hasDueDateInput || hasPriorityInput)) {
    return { ok: false, message: "Members can update task status and notes only; priority, assignment, and due dates are owner-only." };
  }

  const priority = isOwner && hasPriorityInput ? normalizeFoundationTaskPriority(input.priority) : task.priority;
  if (isOwner && hasPriorityInput && !priority) return { ok: false, message: "Choose a valid priority for this Foundation review task." };
  const dueDate = isOwner && hasDueDateInput ? normalizeFoundationDueDate(input.dueDate) : task.due_date;
  if (isOwner && input.dueDate && !dueDate) return { ok: false, message: "Choose a valid due date for this Foundation review task." };
  const assignedTo = isOwner && hasAssignedToInput ? (input.assignedTo ? String(input.assignedTo) : null) : task.assigned_to;
  if (assignedTo) {
    const { count, error: assigneeError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organizationId)
      .eq("id", assignedTo);
    if (assigneeError || (count ?? 0) < 1) return { ok: false, message: "Choose a valid assignee from this organization." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status, priority, due_date: dueDate, assigned_to: assignedTo, updated_at: new Date().toISOString() })
    .eq("organization_id", context.organizationId)
    .eq("id", task.id);

  if (error) return { ok: false, message: error.message };

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_review_task_status_updated",
    summary: `Foundation review task status updated to ${status}.`,
    sourceModule: task.source_module ?? "foundation",
    sourceRecordId: task.source_record_id ?? task.id,
    targetModule: "task",
    targetRecordId: task.id,
    payload: {
      taskId: task.id,
      title: task.title,
      previousStatus: task.status,
      status,
      previousPriority: task.priority,
      priority,
      previousDueDate: task.due_date,
      dueDate,
      previousAssignedTo: task.assigned_to,
      assignedTo,
      closeoutNote: closeoutNote || null,
      actorRole
    }
  });

  if (assignedTo && assignedTo !== task.assigned_to) {
    await createFoundationTaskNotificationIfMissing(supabase, context.organizationId, assignedTo, task.id, "foundation_task_assigned", {
      title: "Foundation task assigned",
      body: `${task.title} was assigned to you for human review follow-through.`
    });
  }
  if (status === "blocked") {
    await createFoundationTaskNotificationIfMissing(supabase, context.organizationId, assignedTo, task.id, "foundation_task_blocked", {
      title: "Foundation task blocked",
      body: `${task.title} was marked blocked and needs owner or assigned-review attention.`
    });
  }

  return { ok: true, message: `Foundation review task updated to ${status}.` };
}

export async function updateFoundationReviewTasksStatus(input: { taskIds: string[]; status: string; closeoutNote?: string | null }): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating Foundation review tasks." };
  const status = normalizeFoundationTaskStatus(input.status);
  if (!status) return { ok: false, message: "Choose a valid Foundation review task status." };
  const taskIds = Array.from(new Set(input.taskIds.map(String).filter(isUuid)));
  if (taskIds.length < 1) return { ok: false, message: "Select at least one Foundation review task." };
  const closeoutNote = String(input.closeoutNote ?? "").trim();
  if (status === "complete" && closeoutNote.length < 8) {
    return { ok: false, message: "Add a short closeout note before completing selected Foundation review tasks." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: taskRows, error: readError } = await supabase
    .from("tasks")
    .select("id,title,status,priority,due_date,assigned_to,source_module,source_record_id")
    .eq("organization_id", context.organizationId)
    .in("id", taskIds);

  if (readError) return { ok: false, message: readError.message };
  const tasks = (taskRows as Record<string, any>[] | null) ?? [];
  if (tasks.length !== taskIds.length) return { ok: false, message: "One or more selected Foundation review tasks could not be found." };
  if (tasks.some((task) => !foundationReviewSourceModules.includes(String(task.source_module)))) {
    return { ok: false, message: "Only generated Foundation review tasks can be bulk updated from this panel." };
  }

  const isOwner = canEditWorkspaceTaskGovernance(context);
  if (!isOwner && tasks.some((task) => !canUpdateAssignedWorkspaceTask(context, task.assigned_to))) {
    return { ok: false, message: "Members can bulk update only Foundation review tasks assigned to them." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("organization_id", context.organizationId)
    .in("id", taskIds);

  if (error) return { ok: false, message: error.message };

  const actorRole = getWorkspaceTaskActorRole(context);
  for (const task of tasks) {
    await writeFoundationAuditEvent(supabase, context, {
      eventType: "foundation_review_task_status_updated",
      summary: `Foundation review task bulk updated to ${status}.`,
      sourceModule: task.source_module ?? "foundation",
      sourceRecordId: task.source_record_id ?? task.id,
      targetModule: "task",
      targetRecordId: task.id,
      payload: {
        taskId: task.id,
        title: task.title,
        previousStatus: task.status,
        status,
        previousPriority: task.priority,
        priority: task.priority,
        previousDueDate: task.due_date,
        dueDate: task.due_date,
        previousAssignedTo: task.assigned_to,
        assignedTo: task.assigned_to,
        closeoutNote: closeoutNote || null,
        actorRole,
        bulkUpdate: true
      }
    });
    if (status === "blocked") {
      await createFoundationTaskNotificationIfMissing(supabase, context.organizationId, task.assigned_to, task.id, "foundation_task_blocked", {
        title: "Foundation task blocked",
        body: `${task.title} was marked blocked in a bulk update and needs owner or assigned-review attention.`
      });
    }
  }

  return { ok: true, message: `${tasks.length} Foundation review tasks updated to ${status}.` };
}

export async function addFoundationReviewTaskNote(input: { taskId: string; note: string }): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before adding Foundation task notes." };

  const note = String(input.note ?? "").trim();
  if (note.length < 4) return { ok: false, message: "Add a short activity note before saving." };

  const supabase = await createSupabaseServerClient();
  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("id,title,assigned_to,source_module,source_record_id")
    .eq("organization_id", context.organizationId)
    .eq("id", input.taskId)
    .single();

  if (readError || !task) return { ok: false, message: readError?.message ?? "Foundation review task could not be found." };
  if (!foundationReviewSourceModules.includes(String(task.source_module))) {
    return { ok: false, message: "Only generated Foundation review tasks can receive notes from this panel." };
  }
  if (!canUpdateAssignedWorkspaceTask(context, task.assigned_to)) {
    return { ok: false, message: "Members can add notes only to Foundation review tasks assigned to them." };
  }

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_review_task_note_added",
    summary: `Foundation review task note added for ${task.title}.`,
    sourceModule: task.source_module ?? "foundation",
    sourceRecordId: task.source_record_id ?? task.id,
    targetModule: "task",
    targetRecordId: task.id,
    payload: {
      taskId: task.id,
      title: task.title,
      note,
      actorRole: getWorkspaceTaskActorRole(context),
      draftOnly: true
    }
  });

  return { ok: true, message: "Foundation review task note added." };
}

export async function addFoundationReviewTasksNote(input: { taskIds: string[]; note: string }): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before adding Foundation task notes." };

  const note = String(input.note ?? "").trim();
  if (note.length < 4) return { ok: false, message: "Add a short bulk activity note before saving." };
  const taskIds = Array.from(new Set(input.taskIds.map(String).filter(isUuid)));
  if (taskIds.length < 1) return { ok: false, message: "Select at least one Foundation review task for the bulk note." };

  const supabase = await createSupabaseServerClient();
  const { data: taskRows, error: readError } = await supabase
    .from("tasks")
    .select("id,title,assigned_to,source_module,source_record_id")
    .eq("organization_id", context.organizationId)
    .in("id", taskIds);

  if (readError) return { ok: false, message: readError.message };
  const tasks = (taskRows as Record<string, any>[] | null) ?? [];
  if (tasks.length !== taskIds.length) return { ok: false, message: "One or more selected Foundation review tasks could not be found." };
  if (tasks.some((task) => !foundationReviewSourceModules.includes(String(task.source_module)))) {
    return { ok: false, message: "Only generated Foundation review tasks can receive bulk notes from this panel." };
  }
  if (tasks.some((task) => !canUpdateAssignedWorkspaceTask(context, task.assigned_to))) {
    return { ok: false, message: "Members can bulk note only Foundation review tasks assigned to them." };
  }

  for (const task of tasks) {
    await writeFoundationAuditEvent(supabase, context, {
      eventType: "foundation_review_task_note_added",
      summary: `Foundation review task bulk note added for ${task.title}.`,
      sourceModule: task.source_module ?? "foundation",
      sourceRecordId: task.source_record_id ?? task.id,
      targetModule: "task",
      targetRecordId: task.id,
      payload: {
        taskId: task.id,
        title: task.title,
        note,
        actorRole: getWorkspaceTaskActorRole(context),
        bulkNote: true,
        draftOnly: true
      }
    });
  }

  return { ok: true, message: `Bulk activity note added to ${tasks.length} Foundation review tasks.` };
}

export async function refreshFoundationSourceResolution(input: { taskId: string }): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before refreshing source resolution." };

  const supabase = await createSupabaseServerClient();
  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("id,title,assigned_to,source_module,source_record_id")
    .eq("organization_id", context.organizationId)
    .eq("id", input.taskId)
    .single();

  if (readError || !task) return { ok: false, message: readError?.message ?? "Foundation review task could not be found." };
  if (!foundationReviewSourceModules.includes(String(task.source_module))) {
    return { ok: false, message: "Only generated Foundation review tasks can refresh source resolution." };
  }
  if (!canUpdateAssignedWorkspaceTask(context, task.assigned_to)) {
    return { ok: false, message: "Members can refresh only Foundation review tasks assigned to them." };
  }

  const sourceModule = String(task.source_module ?? "foundation");
  const sourceRecordId = task.source_record_id ? String(task.source_record_id) : undefined;
  const states = await getFoundationSourceResolutionStates(supabase, context.organizationId, [{ sourceModule, sourceRecordId }]);
  const resolution = getFoundationSourceResolution(states, sourceModule, sourceRecordId);
  const readyForClosure = resolution.state === "Source appears resolved";

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_source_resolution_refreshed",
    summary: readyForClosure
      ? `Foundation source resolution refreshed for ${task.title}; ready for closure review.`
      : `Foundation source resolution refreshed for ${task.title}; source still needs review.`,
    sourceModule,
    sourceRecordId: sourceRecordId ?? task.id,
    targetModule: "task",
    targetRecordId: task.id,
    payload: {
      taskId: task.id,
      title: task.title,
      resolutionState: resolution.state,
      resolutionDetail: resolution.detail,
      readyForClosureReview: readyForClosure,
      actorRole: getWorkspaceTaskActorRole(context),
      draftOnly: true
    }
  });

  if (readyForClosure) {
    await createFoundationTaskNotificationIfMissing(
      supabase,
      context.organizationId,
      task.assigned_to,
      task.id,
      "foundation_task_ready_for_closure",
      {
        title: "Foundation task ready for closure review",
        body: `${task.title} source appears resolved. Add a human closeout note before completing the task.`
      }
    );
  }

  return {
    ok: true,
    message: readyForClosure ? "Source refreshed; action is ready for closure review." : "Source refreshed; review is still needed."
  };
}


export async function seedIntelligenceFoundation(): Promise<{ ok: true; seedLabel: string; readinessScore: number } | { ok: false; message: string }> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in and finish onboarding before seeding the Intelligence Foundation." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const seedRunId = randomUUID();
    const seedSuffix = seedRunId.slice(0, 8);
    const seedLabel = `NorthStar BioLabs ${seedSuffix}`;
    const demo = northStarFoundationDemo();
    const companyProfile = await getCompanyProfile();

    const { data: site, error: siteError } = await supabase
      .from("sites")
      .insert({
        organization_id: context.organizationId,
        name: seedLabel,
        location: "Pilot site",
        metadata: { seedRunId, pilot: "NorthStar BioLabs" },
        created_by: context.userId
      })
      .select("id")
      .single();
    if (siteError || !site) return { ok: false, message: siteError?.message ?? "Could not create foundation site." };

    const { data: lab, error: labError } = await supabase
      .from("labs")
      .insert({
        organization_id: context.organizationId,
        site_id: site.id,
        name: "BSL-2 Cell Culture Lab",
        biosafety_level: "BSL-2",
        controlled_area_type: "wet lab",
        storage_path_prefix: `${context.organizationId}/${site.id}/bsl2-cell-culture`,
        metadata: { seedRunId, materials: ["human-derived samples", "sharps", "hazardous chemicals"] },
        created_by: context.userId
      })
      .select("id")
      .single();
    if (labError || !lab) return { ok: false, message: labError?.message ?? "Could not create foundation lab." };

    const { data: template, error: templateError } = await supabase
      .from("company_intake_templates")
      .insert({
        organization_id: context.organizationId,
        name: "PredictSafeBIO Intelligence Foundation Intake",
        version_label: `pilot-${seedSuffix}`,
        active: true,
        sections: [
          { key: "materials", title: "Materials and samples" },
          { key: "equipment", title: "Equipment and controls" },
          { key: "readiness", title: "Documents, training, incidents, and evidence" }
        ]
      })
      .select("id")
      .single();
    if (templateError || !template) return { ok: false, message: templateError?.message ?? "Could not create intake template." };

    await supabase.from("company_intake_responses").insert(
      Object.entries(demo.answers).map(([questionKey, answer]) => ({
        organization_id: context.organizationId,
        company_profile_id: companyProfile.id ?? null,
        intake_template_id: template.id,
        question_key: questionKey,
        answer_value: { value: answer },
        triggers_documents: demo.applicability.requiredDocuments,
        triggers_programs: demo.applicability.requiredPrograms,
        created_by: context.userId
      }))
    );

    const programIds = new Map<string, string>();
    for (const programName of foundationProgramNames) {
      const { data: program } = await supabase
        .from("compliance_programs")
        .insert({
          organization_id: context.organizationId,
          program_name: `${programName} ${seedSuffix}`,
          program_type: "pilot_mvp",
          description: `${programName} pilot program generated from the PredictSafeBIO Intelligence Foundation packet.`,
          owner_role: programName.includes("Biosafety") || programName.includes("Bloodborne") ? "biosafety_officer" : "qa",
          reviewer_role: "ehs",
          status: "draft_human_review_required",
          review_frequency_months: 12,
          linked_documents: demo.applicability.requiredDocuments.filter((document) => document.toLowerCase().includes(programName.split(" ")[0].toLowerCase())),
          linked_training: demo.applicability.requiredTraining,
          linked_methods: foundationMethodNames,
          human_review_required: true,
          created_by: context.userId
        })
        .select("id,program_name")
        .single();
      if (program?.id) programIds.set(programName, program.id);
    }

    const methodIds = new Map<string, string>();
    for (const methodName of foundationMethodNames) {
      const { data: method } = await supabase
        .from("compliance_methods")
        .insert({
          organization_id: context.organizationId,
          method_name: `${methodName} ${seedSuffix}`,
          method_type: "deterministic",
          purpose: `${methodName} draft method for pilot readiness. AI may recommend and draft only.`,
          input_requirements: ["source records", "human-review status", "organization scope"],
          decision_rules: ["deterministic scoring", "source traceability", "draft-only outputs"],
          output_requirements: ["Draft - Human Review Required", "source links", "audit event"],
          ai_allowed_actions: ["recommend", "draft", "summarize", "flag gaps"],
          ai_prohibited_actions: ["approve", "certify compliance", "validate systems", "close CAPA", "mark training complete"],
          human_review_required: true,
          created_by: context.userId
        })
        .select("id,method_name")
        .single();
      if (method?.id) methodIds.set(methodName, method.id);
    }

    const linkRows = Array.from(programIds.entries()).flatMap(([programName, programId]) =>
      Array.from(methodIds.entries())
        .filter(([methodName]) => programMethodRequired(programName, methodName))
        .map(([, methodId]) => ({
          organization_id: context.organizationId,
          program_id: programId,
          method_id: methodId,
          required: true,
          created_by: context.userId
        }))
    );
    if (linkRows.length > 0) await supabase.from("program_method_links").insert(linkRows);

    await supabase.from("applicability_rules").insert(
      defaultApplicabilityRules.map((rule) => ({
        organization_id: context.organizationId,
        rule_code: `${rule.ruleCode}-${seedSuffix}`,
        name: rule.name,
        condition: { any: rule.conditionKeys },
        required_programs: rule.requiredPrograms,
        required_documents: rule.requiredDocuments,
        required_records: rule.requiredRecords,
        required_training: rule.requiredTraining,
        risk_level_if_missing: rule.riskLevelIfMissing,
        human_reviewer_role: rule.humanReviewerRole,
        draft_only: true,
        human_review_required: true,
        created_by: context.userId
      }))
    );

    await supabase.from("biorisk_scoring_rules").insert([
      {
        organization_id: context.organizationId,
        rule_code: `BIORISK-${seedSuffix}`,
        risk_family: "biosafety_exposure_readiness",
        severity_weight: 0.35,
        likelihood_weight: 0.2,
        detectability_weight: 0.1,
        worker_exposure_weight: 0.15,
        compliance_weight: 0.1,
        sample_patient_weight: 0.05,
        environmental_weight: 0.05,
        repeat_issue_multiplier: 1.25,
        missing_data_penalty: 10,
        risk_band_thresholds: { low: 40, moderate: 60, high: 80 },
        draft_only: true,
        human_review_required: true,
        created_by: context.userId
      }
    ]);

    const documentResult = await saveDocumentMetadata({
      title: `${seedLabel} Exposure Control Plan`,
      documentType: "sop",
      status: "in_review",
      ownerRole: "biosafety_officer",
      area: "BSL-2 Cell Culture Lab",
      relatedProcess: "Human-derived sample processing",
      revision: "0.1",
      gaps: ["Sharps safety decision tree needs review", "BBP exposure response owner approval is pending"]
    });

    const { data: trainingRequirement } = await supabase
      .from("training_requirements")
      .insert({
        organization_id: context.organizationId,
        document_id: documentResult.ok ? documentResult.document?.id ?? null : null,
        role_key: "lab_staff",
        title: `${seedLabel} BBP and Biosafety Training`,
        frequency_months: 12,
        required_for: { labId: lab.id, programs: ["Biosafety", "Bloodborne Pathogens"] }
      })
      .select("id")
      .single();
    if (trainingRequirement?.id) {
      const overdue = new Date(Date.now() - 2 * 86400000).toISOString();
      await supabase.from("training_assignments").insert({
        organization_id: context.organizationId,
        training_requirement_id: trainingRequirement.id,
        assigned_user_id: context.userId,
        status: "expired",
        due_date: overdue.slice(0, 10),
        expires_at: overdue
      });
    }

    const { data: biologicalMaterial } = await supabase
      .from("biological_materials")
      .insert({
        organization_id: context.organizationId,
        lab_id: lab.id,
        name: `${seedLabel} human-derived samples`,
        material_type: "human_derived_sample",
        biosafety_level: "BSL-2",
        storage_location: "Freezer-001",
        risk_summary: "Human-derived sample handling requires BBP, sharps, exposure response, and biosafety review.",
        metadata: { seedRunId, chainOfCustodyGap: true }
      })
      .select("id")
      .single();

    const { data: material } = await supabase
      .from("materials")
      .insert({
        organization_id: context.organizationId,
        material_code: `NSB-MAT-${seedSuffix}`,
        name: "Human-derived sample kit",
        material_type: "biological",
        lot_number: seedSuffix.toUpperCase(),
        status: "quarantine",
        storage_location: "Freezer-001",
        metadata: { biologicalMaterialId: biologicalMaterial?.id ?? null }
      })
      .select("id")
      .single();

    const { data: sample } = await supabase
      .from("samples")
      .insert({
        organization_id: context.organizationId,
        sample_identifier: `NSB-SAMPLE-${seedSuffix}`,
        material_id: material?.id ?? null,
        lab_id: lab.id,
        status: "active",
        storage_location: "Freezer-001",
        metadata: { humanDerived: true, chainOfCustodyGap: true }
      })
      .select("id")
      .single();
    if (sample?.id) {
      await supabase.from("sample_chain_of_custody").insert({
        organization_id: context.organizationId,
        sample_id: sample.id,
        transfer_type: "receipt",
        to_location: "Freezer-001",
        transferred_by: context.userId,
        condition_notes: "Receipt logged; second-person verification pending."
      });
    }

    await supabase.from("chemical_inventory").insert({
      organization_id: context.organizationId,
      lab_id: lab.id,
      chemical_name: "Paraformaldehyde pilot stock",
      hazard_class: "toxic irritant",
      quantity: "500 mL",
      storage_location: "Chemical cabinet A"
    });

    const equipmentRows = [
      ["BSC-001", "Class II Biosafety Cabinet", "BSC", "out_of_service"],
      ["AUTO-001", "Steam Autoclave", "autoclave", "active"],
      ["FRZ-001", "Sample Freezer", "freezer", "active"],
      ["INC-001", "Cell Culture Incubator", "incubator", "active"]
    ] as const;
    let bscEventId: string | null = null;
    for (const [equipmentTag, name, equipmentType, status] of equipmentRows) {
      const { data: equipment } = await supabase
        .from("equipment")
        .insert({
          organization_id: context.organizationId,
          lab_id: lab.id,
          equipment_tag: `${equipmentTag}-${seedSuffix}`,
          name,
          equipment_type: equipmentType,
          status,
          qualification_status: equipmentType === "BSC" ? "certification_overdue" : "current",
          metadata: { seedRunId }
        })
        .select("id,equipment_type")
        .single();
      if (equipment?.id && equipmentType === "BSC") {
        const { data: event } = await supabase
          .from("equipment_events")
          .insert({
            organization_id: context.organizationId,
            equipment_id: equipment.id,
            event_type: "certification_overdue",
            status: "open",
            occurred_at: new Date().toISOString(),
            impact_assessment: "BSC certification is overdue; impact review required before use.",
            created_by: context.userId
          })
          .select("id")
          .single();
        bscEventId = event?.id ?? null;
      }
    }

    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .insert({
        organization_id: context.organizationId,
        lab_id: lab.id,
        incident_type: "needlestick_exposure",
        title: `${seedLabel} needlestick exposure`,
        severity: "high",
        status: "investigating",
        occurred_at: new Date().toISOString(),
        reported_by: context.userId,
        summary: "Pilot exposure incident used for CAPA screening, training impact, and evidence mapping.",
        metadata: { seedRunId, sampleId: sample?.id, biologicalMaterialId: biologicalMaterial?.id }
      })
      .select("id")
      .single();
    if (incidentError || !incident) return { ok: false, message: incidentError?.message ?? "Could not create foundation incident." };

    const { data: capa } = await supabase
      .from("capa_records")
      .insert({
        organization_id: context.organizationId,
        source_incident_id: incident.id,
        title: `${seedLabel} CAPA screening`,
        status: "draft_human_review_required",
        owner_role: "ehs",
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        created_by: context.userId
      })
      .select("id")
      .single();

    await supabase.from("compliance_evidence_map").insert(
      demo.evidence.map((item) => ({
        organization_id: context.organizationId,
        site_id: site.id,
        lab_id: lab.id,
        requirement_name: item.requirementName,
        control_name: item.controlName,
        evidence_type: item.evidenceType,
        source_table: item.sourceTable,
        source_record_id:
          item.sourceTable === "document_metadata" && documentResult.ok
            ? documentResult.document?.id ?? null
            : item.sourceTable === "incidents"
              ? incident.id
              : item.sourceTable === "equipment_events"
                ? bscEventId
                : null,
        required_frequency: "annual or event-driven",
        evidence_status: item.evidenceStatus,
        audit_ready: item.auditReady,
        human_review_required: true,
        created_by: context.userId
      }))
    );

    await supabase.from("change_impact_events").insert(
      demo.changes.map((change) => ({
        organization_id: context.organizationId,
        change_type: change.changeType,
        source_table: change.changeType === "incident" ? "incidents" : change.changeType === "equipment_event" ? "equipment_events" : "biological_materials",
        source_record_id: change.changeType === "incident" ? incident.id : change.changeType === "equipment_event" ? bscEventId : biologicalMaterial?.id ?? null,
        impact_summary: change.impactSummary,
        document_impacts: change.documentImpacts,
        training_impacts: change.trainingImpacts,
        risk_impacts: change.riskImpacts,
        equipment_impacts: change.equipmentImpacts,
        recommended_actions: change.recommendedActions,
        status: "draft_human_review_required",
        human_review_required: true,
        created_by: context.userId
      }))
    );

    await supabase.from("audit_readiness_scores").insert({
      organization_id: context.organizationId,
      site_id: site.id,
      lab_id: lab.id,
      overall_score: demo.readiness.overallScore,
      documents_score: demo.readiness.documentsScore,
      training_score: demo.readiness.trainingScore,
      capa_score: demo.readiness.capaScore,
      incidents_score: demo.readiness.incidentsScore,
      equipment_score: demo.readiness.equipmentScore,
      evidence_score: demo.readiness.evidenceScore,
      top_gaps: demo.readiness.topGaps,
      draft_only: true,
      human_review_required: true,
      created_by: context.userId
    });

    const { data: biotypeRows } = await supabase
      .from("biotype_foundations")
      .upsert(
        canonicalBioTypeFoundations.map((foundation) => ({
          organization_id: context.organizationId,
          biotype_key: foundation.key,
          display_name: foundation.name,
          focus: foundation.focus,
          applicable_programs: foundation.programs,
          required_documents: foundation.documents,
          required_records: foundation.records,
          required_training: foundation.training,
          risk_drivers: foundation.riskDrivers,
          common_tools: foundation.commonTools,
          metadata: { source: "PredictSafeBIO_Codex_Reformat_Packet", seedRunId },
          draft_only: true,
          human_review_required: true,
          created_by: context.userId
        })),
        { onConflict: "organization_id,biotype_key" }
      )
      .select("id,biotype_key,display_name,applicable_programs,required_documents,required_records,required_training,risk_drivers");

    const selectedPrimary: BioTypeKey = "rd_biotech";
    const selectedSecondary: BioTypeKey[] = ["cro_lab_services", "academic_university_research"];
    const { data: biotypeSelection } = await supabase
      .from("organization_biotype_selections")
      .insert({
        organization_id: context.organizationId,
        company_profile_id: companyProfile.id ?? null,
        primary_biotype_key: selectedPrimary,
        secondary_biotype_keys: selectedSecondary,
        selection_status: "draft_human_review_required",
        selection_reason: "NorthStar BioLabs pilot combines R&D biotech with sample-handling lab services and academic-style biosafety oversight.",
        human_review_required: true,
        created_by: context.userId
      })
      .select("id")
      .single();

    if (biotypeRows && biotypeRows.length > 0) {
      await supabase.from("biotype_rule_mappings").insert(
        biotypeRows.map((row: Record<string, any>) => ({
          organization_id: context.organizationId,
          biotype_foundation_id: row.id,
          rule_key: `biotype-${row.biotype_key}-${seedSuffix}`,
          source_module: "biotype_selection",
          source_record_id: biotypeSelection?.id ?? null,
          required_programs: row.applicable_programs ?? [],
          required_documents: row.required_documents ?? [],
          required_records: row.required_records ?? [],
          required_training: row.required_training ?? [],
          risk_driver: Array.isArray(row.risk_drivers) ? row.risk_drivers.slice(0, 3).join(", ") : null,
          draft_only: true,
          human_review_required: true,
          created_by: context.userId
        }))
      );
    }

    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "intelligence_foundation_seeded",
      summary: `${seedLabel}: Intelligence Foundation pilot dataset created with intake, programs, methods, applicability, evidence, change impact, and audit readiness records.`,
      payload: withAuditTrace(
        {
          seedRunId,
          seedLabel,
          siteId: site.id,
          labId: lab.id,
          incidentId: incident.id,
          capaId: capa?.id ?? null,
          readinessScore: demo.readiness.overallScore,
          documentId: documentResult.ok ? documentResult.document?.id ?? null : null,
          primaryBioType: selectedPrimary,
          secondaryBioTypes: selectedSecondary,
          biotypeSelectionId: biotypeSelection?.id ?? null
        },
        {
          sourceModule: "foundation",
          sourceRecordId: template.id,
          targetModule: "audit_readiness",
          targetRecordId: lab.id,
          runId: seedRunId,
          draftOnly: true
        }
      )
    });

    return { ok: true, seedLabel, readinessScore: demo.readiness.overallScore };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not seed the Intelligence Foundation." };
  }
}

export async function seedDemoWorkspace(): Promise<
  { ok: true; assessmentId: string; documentId: string; seedLabel: string } | { ok: false; message: string }
> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in and finish onboarding before seeding demo records." };
  }
  if (!canManageWorkspace(context)) {
    return { ok: false, message: "Only organization owners can seed demo records." };
  }

  const supabase = await createSupabaseServerClient();
  const seedRunId = randomUUID();
  const seedLabel = `Demo seed ${seedRunId.slice(0, 8)}`;
  const input: BioAiInput = {
    siteName: "PredictSafeBIO Demo Biotech",
    area: "QC Microbiology Lab",
    workflow: `${seedLabel} sterility assay review`,
    batchOrLot: seedLabel.toUpperCase().replace(/\s+/g, "-"),
    controlEffectiveness: "partial",
    contaminationSuspected: true,
    signals: [{ type: "contamination_event", label: "Seeded unexpected microbial growth", severity: "high" }]
  };
  const assessment = assessBioRisk(input);
  const { data: assessmentRow, error: assessmentError } = await supabase
    .from("assessments")
    .insert({
      organization_id: context.organizationId,
      created_by: context.userId,
      input_snapshot: input,
      output_snapshot: assessment,
      score: assessment.score,
      level: assessment.level,
      confidence: assessment.confidence,
      human_review_required: assessment.humanReviewRequired,
      human_review_status: "draft_human_review_required"
    })
    .select("id")
    .single();

  if (assessmentError || !assessmentRow) {
    return { ok: false, message: assessmentError?.message ?? "Could not seed demo assessment." };
  }

  await supabase.from("assessment_signals").insert(
    (input.signals ?? []).map((signal) => ({
      organization_id: context.organizationId,
      assessment_id: assessmentRow.id,
      signal_type: signal.type,
      label: signal.label,
      payload: signal
    }))
  );

  const documentInput: SaveDocumentMetadataInput = {
    title: `${seedLabel} Sterility Assay Review SOP`,
    documentType: "sop",
    status: "in_review",
    ownerRole: "qa",
    area: "QC Microbiology Lab",
    relatedProcess: `${seedLabel} sterility assay review`,
    revision: "0.1",
    gaps: [`${seedLabel} batch impact wording needs owner review`, `${seedLabel} QA timing is not explicit`]
  };
  const documentResult = await saveDocumentMetadata(documentInput);
  if (!documentResult.ok || !documentResult.document?.id) {
    return { ok: false, message: documentResult.message ?? "Could not seed demo document." };
  }
  await persistDocumentRecommendations(documentResult.document);

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "demo_seed_created",
    summary: `${seedLabel}: demo assessment, document metadata, draft recommendations, and audit trail were seeded.`,
    payload: withAuditTrace(
      { assessmentId: assessmentRow.id, documentId: documentResult.document.id, seedRunId, seedLabel },
      {
        sourceModule: "demo_seed",
        sourceRecordId: assessmentRow.id,
        targetModule: "document",
        targetRecordId: documentResult.document.id,
        runId: seedRunId,
        draftOnly: true
      }
    )
  });

  return { ok: true, assessmentId: assessmentRow.id, documentId: documentResult.document.id, seedLabel };
}

async function getProfileContext(): Promise<ProfileContext | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase.from("profiles").select("organization_id,role").eq("id", user.id).maybeSingle();
    if (!data?.organization_id) return null;

    return { userId: user.id, organizationId: data.organization_id, role: normalizeWorkspaceRole(data.role) };
  } catch {
    return null;
  }
}


type FoundationReviewActionCandidate = {
  sourceModule: string;
  sourceRecordId: string;
  title: string;
  priority: "medium" | "high";
  reason: string;
};

function foundationActionKey(sourceModule?: string | null, sourceRecordId?: string | null, title?: string | null) {
  if (!sourceModule || !sourceRecordId || !title) return null;
  return `${sourceModule}:${sourceRecordId}:${title}`;
}

async function getFoundationSourceResolutionStates(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  refs: Array<{ sourceModule: string; sourceRecordId?: string }>
): Promise<Map<string, FoundationSourceResolutionState>> {
  const states = new Map<string, FoundationSourceResolutionState>();
  const refsByModule = new Map<string, string[]>();
  for (const ref of refs) {
    if (!ref.sourceRecordId) continue;
    refsByModule.set(ref.sourceModule, [...(refsByModule.get(ref.sourceModule) ?? []), ref.sourceRecordId]);
  }

  const evidenceIds = Array.from(new Set(refsByModule.get("evidence_map") ?? []));
  const trainingIds = Array.from(new Set(refsByModule.get("training_assignment") ?? []));
  const equipmentIds = Array.from(new Set(refsByModule.get("equipment") ?? []));
  const incidentIds = Array.from(new Set(refsByModule.get("incident") ?? []));

  const [evidenceRows, trainingRows, equipmentRows, incidentRows] = await Promise.all([
    evidenceIds.length > 0
      ? supabase
          .from("compliance_evidence_map")
          .select("id,evidence_status,audit_ready,human_review_required")
          .eq("organization_id", organizationId)
          .in("id", evidenceIds)
      : Promise.resolve({ data: [] }),
    trainingIds.length > 0
      ? supabase
          .from("training_assignments")
          .select("id,status,completed_at,expires_at")
          .eq("organization_id", organizationId)
          .in("id", trainingIds)
      : Promise.resolve({ data: [] }),
    equipmentIds.length > 0
      ? supabase
          .from("equipment")
          .select("id,status,qualification_status")
          .eq("organization_id", organizationId)
          .in("id", equipmentIds)
      : Promise.resolve({ data: [] }),
    incidentIds.length > 0
      ? supabase
          .from("incidents")
          .select("id,status,severity")
          .eq("organization_id", organizationId)
          .in("id", incidentIds)
      : Promise.resolve({ data: [] })
  ]);

  for (const row of ((evidenceRows.data as Record<string, any>[]) ?? [])) {
    const resolved = row.audit_ready === true && row.evidence_status === "current";
    states.set(`evidence_map:${row.id}`, {
      state: resolved ? "Source appears resolved" : "Source still needs evidence review",
      detail: `Evidence status ${row.evidence_status ?? "unknown"}; audit ready ${row.audit_ready ? "yes" : "no"}; human review ${row.human_review_required ? "required" : "not flagged"}.`
    });
  }
  for (const row of ((trainingRows.data as Record<string, any>[]) ?? [])) {
    const resolved = row.status === "completed" && Boolean(row.completed_at);
    states.set(`training_assignment:${row.id}`, {
      state: resolved ? "Source appears resolved" : "Training source still needs review",
      detail: `Training status ${row.status ?? "unknown"}${row.expires_at ? `; expires ${row.expires_at}` : ""}.`
    });
  }
  for (const row of ((equipmentRows.data as Record<string, any>[]) ?? [])) {
    const resolved = row.status === "active" && ["qualified", "current", "ready"].includes(String(row.qualification_status ?? "").toLowerCase());
    states.set(`equipment:${row.id}`, {
      state: resolved ? "Source appears resolved" : "Equipment source still needs review",
      detail: `Equipment status ${row.status ?? "unknown"}; qualification ${row.qualification_status ?? "not recorded"}.`
    });
  }
  for (const row of ((incidentRows.data as Record<string, any>[]) ?? [])) {
    const resolved = row.status === "closed";
    states.set(`incident:${row.id}`, {
      state: resolved ? "Source appears resolved" : "Incident source still needs review",
      detail: `Incident status ${row.status ?? "unknown"}; severity ${row.severity ?? "not recorded"}.`
    });
  }

  return states;
}

function getReadinessTrend(latest: number, previous?: number) {
  if (typeof previous !== "number") return "not_enough_data" as const;
  if (latest > previous) return "improving" as const;
  if (latest < previous) return "declining" as const;
  return "steady" as const;
}

// audit_readiness_scores.top_gaps may be stored as plain strings (demo/seed data)
// or as { gap, severity } objects (scoring engine output). The rest of the
// pipeline — foundationContext.evidenceGaps → input.missingData →
// assessment.missingInformation, which is rendered directly in JSX — assumes
// string[]. Coerce every element to a string here so an object never reaches a
// React child (which throws "Objects are not valid as a React child").
function normalizeReadinessGap(gap: unknown): string {
  if (typeof gap === "string") return gap;
  if (gap && typeof gap === "object") {
    const record = gap as Record<string, unknown>;
    for (const key of ["gap", "label", "description", "summary", "title"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
  }
  return String(gap);
}

function dedupeReadinessGaps(gaps: Array<{ label: string; status: string; sourceHref: string }>) {
  const seen = new Set<string>();
  return gaps.filter((gap) => {
    const key = `${gap.label}:${gap.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterAuditEvents(events: AuditEvent[], filters?: { eventType?: string; sourceModule?: string }) {
  return events.filter((event) => {
    const eventMatches = !filters?.eventType || filters.eventType === "all" || event.eventType === filters.eventType;
    const sourceMatches =
      !filters?.sourceModule ||
      filters.sourceModule === "all" ||
      String((event.payload as Record<string, unknown> | undefined)?.sourceModule ?? "") === filters.sourceModule;
    return eventMatches && sourceMatches;
  });
}

function mapFoundationWorkflowSave(row: Record<string, any> | null): FoundationVerificationStatusSummary["latestWorkflowSave"] {
  if (!row) return undefined;
  return {
    eventType: row.event_type,
    summary: row.summary,
    createdAt: row.created_at,
    sourceModule: row.payload?.sourceModule,
    targetModule: row.payload?.targetModule
  };
}

function mapProductionVerificationEvent(row: Record<string, any>) {
  return {
    eventType: row.event_type as AuditEvent["eventType"],
    summary: String(row.summary ?? ""),
    createdAt: row.created_at
  };
}

function mapFoundationReviewRun(row: Record<string, any> | null): FoundationVerificationStatusSummary["latestReviewActionRun"] {
  if (!row) return undefined;
  return {
    summary: row.summary,
    createdAt: row.created_at,
    created: Number(row.payload?.created ?? 0),
    candidateCount: Number(row.payload?.candidateCount ?? 0),
    skippedDuplicates: normalizeSkippedDuplicates(row.payload?.skippedDuplicates)
  };
}

function mapFoundationLatestAudit(row: Record<string, any> | null): FoundationVerificationStatusSummary["latestAuditEvent"] {
  if (!row) return undefined;
  return {
    eventType: row.event_type,
    summary: row.summary,
    createdAt: row.created_at,
    sourceModule: row.payload?.sourceModule,
    targetModule: row.payload?.targetModule,
    draftOnly: row.payload?.draftOnly !== false
  };
}

function mapFoundationFinalSignoff(row: Record<string, any> | null): FoundationVerificationStatusSummary["latestFinalSignoff"] {
  if (!row) return undefined;
  return {
    id: row.id,
    note: row.note,
    createdAt: row.created_at
  };
}

function buildFoundationVerificationChecklist(rows: Record<string, any>[]): FoundationVerificationStatusSummary["checklist"] {
  const steps: Array<{
    key: string;
    label: string;
    eventTypes: AuditEvent["eventType"][];
  }> = [
    { key: "biotypes", label: "BioTypes saved", eventTypes: ["foundation_biotype_selection_updated"] },
    { key: "intake", label: "Intake edited", eventTypes: ["foundation_intake_response_updated"] },
    { key: "evidence", label: "Evidence readiness updated", eventTypes: ["foundation_evidence_readiness_updated"] },
    { key: "note", label: "Audit note added", eventTypes: ["foundation_audit_readiness_note_added"] },
    { key: "actions", label: "Action plan generated", eventTypes: ["foundation_review_actions_generated"] },
    { key: "taskStatus", label: "Task status updated", eventTypes: ["foundation_review_task_status_updated"] }
  ];
  return steps.map((step) => {
    const match = rows.find((row) => step.eventTypes.includes(row.event_type));
    return {
      ...step,
      status: match ? ("pass" as const) : ("pending" as const),
      detail: match?.created_at ? `Last seen ${new Date(match.created_at).toLocaleString()}` : "Pending owner verification"
    };
  });
}

function normalizeSkippedDuplicates(value: unknown): FoundationDuplicateSkipSummary[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      title: String(row.title ?? "Duplicate review action"),
      sourceModule: String(row.sourceModule ?? "foundation"),
      sourceRecordId: row.sourceRecordId ? String(row.sourceRecordId) : undefined,
      reason: String(row.reason ?? "Existing open action")
    };
  });
}

function demoAuditReadinessConsoleSummary(): AuditReadinessConsoleSummary {
  const demo = demoIntelligenceFoundationSummary();
  return {
    latestScore: demo.readiness.overallScore,
    trend: "not_enough_data",
    recentScores: demo.readiness.id ? [{ id: demo.readiness.id, overallScore: demo.readiness.overallScore }] : [],
    unresolvedGaps: demo.readiness.topGaps.slice(0, 5).map((gap) => ({
      label: gap,
      status: "readiness_gap",
      sourceHref: "/foundation#audit-readiness-console"
    })),
    generatedActions: [],
    notes: [],
    humanReviewStatus: "Draft - human review required",
    draftOnly: true,
    categoryScores: {
      biosafety: demo.readiness.overallScore,
      documents: 62,
      training:  55,
      evidence:  48,
      capa:      70,
      incidents: 80,
    }
  };
}

function demoFoundationVerificationStatusSummary(): FoundationVerificationStatusSummary {
  const checklist = buildFoundationVerificationChecklist([]);
  return {
    checklist,
    latestWorkflowSave: {
      eventType: "foundation_evidence_readiness_updated",
      summary: "Demo evidence readiness update available for owner verification.",
      createdAt: undefined,
      sourceModule: "evidence_map",
      targetModule: "compliance_evidence_map"
    },
    latestReviewActionRun: {
      summary: "Demo action planning run. Draft outputs require human review.",
      createdAt: undefined,
      created: 0,
      candidateCount: 2,
      skippedDuplicates: [
        {
          title: "Review evidence gap - Biosafety Manual acknowledgement",
          sourceModule: "evidence_map",
          sourceRecordId: "demo-evidence-0",
          reason: "Existing open task"
        }
      ]
    },
    latestAuditEvent: {
      eventType: "foundation_review_actions_generated",
      summary: "Demo action generation audit event.",
      createdAt: undefined,
      sourceModule: "foundation",
      targetModule: "task",
      draftOnly: true
    },
    latestFinalSignoff: undefined,
    allChecklistPassed: false,
    productionPromotionAllowed: false,
    productionGateReason: "Production promotion is blocked until owner verification and final preview signoff are captured."
  };
}

function demoFoundationSourceDrilldownSummary(): FoundationSourceDrilldownSummary {
  const demo = demoIntelligenceFoundationSummary();
  return {
    groups: [
      {
        key: "evidence_map",
        title: "Evidence gaps",
        description: "Mapped controls that still need audit-ready evidence or human review.",
        href: "/foundation#evidence-map",
        items: demo.evidence
          .filter((item) => !item.auditReady || isFoundationGapStatus(item.status))
          .slice(0, 4)
          .map((item, index) => ({
            id: item.id ?? `demo-evidence-${index}`,
            label: item.requirement,
            status: item.status,
            detail: `Audit-ready: ${item.auditReady}.`,
            sourceModule: "evidence_map",
            sourceRecordId: item.id ?? `demo-evidence-${index}`,
            recommendedAction: "Review mapped evidence and update readiness status.",
            ownerRole: "ehs"
          }))
      },
      {
        key: "biotype_selection",
        title: "BioType missing controls",
        description: "Selected BioType branches that drive document, training, record, and evidence checks.",
        href: "/foundation#foundation-workflows",
        items: [
          {
            id: demo.biotypeSelection?.id ?? "demo-biotype-selection",
            label: `Primary ${demo.biotypeSelection?.primaryBioType ?? "rd_biotech"}`,
            status: demo.biotypeSelection?.status ?? "draft_human_review_required",
            detail: `Secondary BioTypes: ${demo.biotypeSelection?.secondaryBioTypes.join(", ") ?? "none selected"}.`,
            sourceModule: "biotype_selection",
            sourceRecordId: demo.biotypeSelection?.id ?? "demo-biotype-selection",
            recommendedAction: "Confirm required BioType controls and evidence map coverage.",
            ownerRole: "biosafety_officer"
          }
        ]
      },
      {
        key: "incident",
        title: "Incident/CAPA screening",
        description: "Open incidents that may need CAPA screening, document impact, training impact, or evidence updates.",
        href: "/foundation#incident-drilldown",
        items: []
      },
      {
        key: "equipment",
        title: "Equipment readiness",
        description: "Equipment records with inactive status, overdue qualification, or readiness impact.",
        href: "/foundation#equipment-drilldown",
        items: []
      },
      {
        key: "training_assignment",
        title: "Training readiness",
        description: "Expired or incomplete training assignments that block readiness.",
        href: "/foundation#training-drilldown",
        items: []
      }
    ]
  };
}

async function hasOpenFoundationTask(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  sourceModule: string,
  sourceRecordId: string,
  title: string
) {
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("source_module", sourceModule)
    .eq("source_record_id", sourceRecordId)
    .eq("title", title)
    .in("status", ["open", "in_progress"]);

  if (error) return false;
  return (count ?? 0) > 0;
}

async function hasOpenFoundationRecommendation(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  sourceModule: string,
  sourceRecordId: string,
  title: string
) {
  const { count, error } = await supabase
    .from("document_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("title", title)
    .contains("payload", {
      actionType: "foundation_review_action",
      sourceModule,
      sourceRecordId
    });

  if (error) return false;
  return (count ?? 0) > 0;
}

async function writeFoundationAuditEvent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: ProfileContext,
  input: {
    eventType: AuditEvent["eventType"];
    summary: string;
    sourceModule: string;
    sourceRecordId?: string | null;
    targetModule: string;
    targetRecordId?: string | null;
    runId?: string;
    payload?: Record<string, unknown>;
  }
) {
  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: input.eventType,
    summary: input.summary,
    payload: withAuditTrace(input.payload ?? {}, {
      sourceModule: input.sourceModule,
      sourceRecordId: input.sourceRecordId ?? undefined,
      targetModule: input.targetModule,
      targetRecordId: input.targetRecordId ?? undefined,
      runId: input.runId,
      draftOnly: true
    })
  });
}

async function countRows(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, table: string, organizationId: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) return 0;
  return count ?? 0;
}

async function latestRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  organizationId: string,
  columns: string
) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function latestRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  organizationId: string,
  columns: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}



function demoAssessmentSummary(id: string, input: BioAiInput): SavedAssessmentSummary {
  const assessment = assessBioRisk(input);
  return {
    id,
    workflow: input.workflow ?? "Untitled workflow",
    area: input.area ?? "Unassigned area",
    score: assessment.score,
    level: assessment.level,
    confidence: assessment.confidence,
    humanReviewRequired: assessment.humanReviewRequired,
    humanReviewStatus: assessment.humanReviewRequired ? "draft_human_review_required" : "routine_monitoring",
    reviewedAt: null
  };
}

function demoAssessmentDetail(id: string): SavedAssessmentDetail | null {
  const demoInputs: Record<string, BioAiInput> = {
    "demo-critical-contamination": {
      siteName: "Demo Biotech Site",
      area: "QC Microbiology Lab",
      workflow: "Sterility assay review",
      batchOrLot: "LOT-0001",
      controlEffectiveness: "partial",
      contaminationSuspected: true,
      signals: [{ type: "contamination_event", label: "Unexpected microbial growth", severity: "high" }]
    },
    "demo-training-gap": {
      siteName: "Demo Biotech Site",
      area: "Cell Therapy Suite",
      workflow: "Media change",
      controlEffectiveness: "effective",
      missingRequiredTraining: true,
      signals: [{ type: "training_gap", label: "Expired aseptic technique training", severity: "low" }]
    }
  };

  const input = demoInputs[id];
  if (!input) return null;

  const output = assessBioRisk(input);
  return {
    ...demoAssessmentSummary(id, input),
    input,
    output,
    signals: input.signals ?? [],
    auditEvents: demoAuditEvents,
    humanReviewStatus: output.humanReviewRequired ? "draft_human_review_required" : "routine_monitoring"
  };
}


function mapDocument(document: Record<string, any>): DocumentMetadata {
  return {
    id: document.id,
    organizationId: document.organization_id,
    title: document.title,
    documentType: document.document_type,
    status: document.status,
    ownerRole: document.owner_role,
    area: document.area,
    relatedProcess: document.related_process,
    revision: document.revision,
    effectiveDate: document.effective_date,
    nextReviewDate: document.next_review_date,
    lastReviewedAt: document.last_reviewed_at,
    storageBucket: document.storage_bucket,
    storagePath: document.storage_path,
    gaps: document.gaps ?? []
  };
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "";
}

function mapAuditEvent(event: Record<string, any>): AuditEvent {
  return {
    id: event.id,
    organizationId: event.organization_id,
    actorId: event.actor_id,
    eventType: event.event_type,
    summary: event.summary,
    payload: event.payload,
    createdAt: event.created_at
  };
}
