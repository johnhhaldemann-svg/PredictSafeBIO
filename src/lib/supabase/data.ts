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
  buildErgonomicRiskSignal,
  ergonomicLabel,
  safePredictErgoAiInsight,
  scoreErgonomicLevel1,
  validateErgonomicLevel1,
  type ErgonomicBodyPart,
  type ErgonomicDiscomfortLevel,
  type ErgonomicFrequency,
  type ErgonomicLevel1Input,
  type ErgonomicRiskLevel,
  type ErgonomicTaskType
} from "@/lib/ergonomics/level1";
import {
  evaluateErgonomicLevel2,
  validateErgonomicLevel2,
  type ErgonomicLevel2Input,
  type Level2SourceContext
} from "@/lib/ergonomics/level2";
import {
  applyBioTypeContext,
  buildBioTypeAiContext,
  canonicalBioTypeFoundations,
  normalizeBioTypeKey,
  type BioTypeKey
} from "@/lib/foundation/biotypes";
import {
  applyFoundationContext,
  defaultApplicabilityRules,
  foundationMethodNames,
  foundationProgramNames,
  northStarFoundationDemo
} from "@/lib/foundation/engine";
import {
  changePlanPriorities,
  changePlanRows,
  changePlanStatuses,
  type ChangePlanPriority,
  type ChangePlanRow,
  type ChangePlanStatus
} from "@/lib/platform-outline";
import { createSupabaseServerClient } from "./server";
import { isSupabaseConfigured } from "./env";

export type SavedAssessmentSummary = {
  id: string;
  workflow: string;
  area: string;
  score: number;
  level: BioAiAssessment["level"];
  confidence: BioAiAssessment["confidence"];
  humanReviewRequired: boolean;
  humanReviewStatus: HumanReviewStatus | string;
  reviewedAt?: string | null;
  createdAt?: string;
};

export type SavedAssessmentDetail = SavedAssessmentSummary & {
  input: BioAiInput;
  output: BioAiAssessment;
  signals: BioAiSignal[];
  auditEvents: AuditEvent[];
  humanReviewStatus: HumanReviewStatus | string;
  reviewerNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

export type DocumentRecommendationRecord = {
  id: string;
  recommendationType: "gap" | "draft_update";
  title: string;
  label: string;
  humanReviewRequired: boolean;
  payload: Record<string, unknown>;
  createdBy?: string | null;
  createdAt?: string;
};

export type DocumentRecommendationRun = {
  runKey: string;
  createdAt?: string;
  auditEvent?: AuditEvent;
  recommendations: DocumentRecommendationRecord[];
};

export type SaveDocumentMetadataInput = {
  title: string;
  documentType: DocumentMetadata["documentType"];
  status: DocumentMetadata["status"];
  ownerRole: DocumentMetadata["ownerRole"];
  area?: string | null;
  relatedProcess?: string | null;
  revision?: string | null;
  effectiveDate?: string | null;
  nextReviewDate?: string | null;
  gaps?: string[];
  file?: File | null;
};

type ProfileContext = {
  userId: string;
  organizationId: string;
  role: string;
};

export type AuthSummary = {
  configured: boolean;
  signedIn: boolean;
  userEmail?: string;
  organizationId?: string;
  role?: string;
  needsOnboarding: boolean;
};

export type MapOperationsBundleInput = {
  siteName: string;
  labName: string;
  workflow: string;
  referenceTitle: string;
  documentTitle: string;
  trainingTitle: string;
  incidentTitle: string;
  equipmentTag: string;
  sampleIdentifier: string;
};

export type MapOperationsSummary = {
  counts: Array<{ label: string; value: number }>;
  readiness: Array<{
    module: string;
    title: string;
    status: string;
    detail: string;
  }>;
  latestAssessmentInput: BioAiInput;
};

export type ErgonomicSelfAssessmentSubmission = ErgonomicLevel1Input;

export type ErgonomicSelfAssessmentRecord = {
  id: string;
  taskType: ErgonomicTaskType;
  taskTypeLabel: string;
  discomfortLevel: ErgonomicDiscomfortLevel;
  bodyParts: ErgonomicBodyPart[];
  frequency: ErgonomicFrequency;
  comments?: string | null;
  location?: string | null;
  departmentTrade?: string | null;
  riskScore: number;
  riskLevel: ErgonomicRiskLevel;
  escalationStatus: string;
  repeatedModerateFlag: boolean;
  correctiveActionRecommended: boolean;
  createdAt?: string;
};

export type ErgonomicLevel1Summary = {
  counts: Array<{ label: string; value: number }>;
  recentScreenings: ErgonomicSelfAssessmentRecord[];
  inspectionType: {
    title: string;
    description: string;
    href: string;
  };
  level2InspectionType: {
    title: string;
    description: string;
    href: string;
    gatedLabel: string;
  };
  aiInsight: string;
};

export type ErgonomicLevel2LaunchContext = {
  allowed: boolean;
  sourceContext: Level2SourceContext | null;
  requestId?: string | null;
  sourceSelfAssessmentId?: string | null;
  taskType: ErgonomicTaskType;
  taskDescription: string;
  location?: string | null;
  departmentTrade?: string | null;
  reason: string;
  recentInspections: Array<{
    id: string;
    taskType: string;
    status: string;
    riskSummary: string;
    createdAt?: string;
  }>;
};

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

export type FoundationActionResult = { ok: true; message: string } | { ok: false; message: string };

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
  sourceModule: string;
  sourceRecordId?: string;
  sourceLabel: string;
  sourceHref: string;
  dueDate?: string | null;
  recommendationId?: string;
  reason?: string;
  createdAt?: string;
};

export type ChangePlanItem = ChangePlanRow & {
  id?: string;
  sortOrder: number;
  persisted: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ChangePlanItemsSummary = {
  items: ChangePlanItem[];
  canManage: boolean;
  signedIn: boolean;
  isFallback: boolean;
  message: string;
};

export type ChangePlanItemInput = {
  id?: string;
  category: string;
  feature: string;
  owner: string;
  priority: string;
  status: string;
  notes: string;
  href: string;
  sortOrder?: number;
};

export type TrainingMatrixRow = {
  id: string;
  requirement: string;
  source: string;
  ownerRole: string;
  documentTitle: string;
  documentHref: string;
  assignmentStatus: string;
  dueDate?: string | null;
  expiryDate?: string | null;
  evidenceLabel: string;
  readiness: "Current" | "Needs review" | "Expired" | "Missing";
};

export type TrainingMatrixSummary = {
  counts: Array<{ label: string; value: number }>;
  readinessScore: number;
  rows: TrainingMatrixRow[];
  changeImpacts: Array<{ id: string; type: string; summary: string; trainingImpacts: string[]; status: string }>;
  biotypeRequirements: Array<{ biotype: string; training: string[] }>;
  guardrailText: string;
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

export type AuditReadinessConsoleSummary = {
  latestScore: number;
  trend: "improving" | "declining" | "steady" | "not_enough_data";
  recentScores: Array<{ id: string; overallScore: number; generatedAt?: string }>;
  unresolvedGaps: Array<{ label: string; status: string; sourceHref: string }>;
  generatedActions: FoundationReviewActionSummary[];
  notes: Array<{ id: string; note: string; noteType: string; createdAt?: string }>;
  humanReviewStatus: string;
  draftOnly: boolean;
};

const foundationEvidenceStatuses = ["current", "ready", "review_needed", "missing", "expired", "open", "out_of_tolerance"] as const;
export type FoundationEvidenceStatus = (typeof foundationEvidenceStatuses)[number];
const foundationReviewSourceModules = ["evidence_map", "training_assignment", "equipment", "incident", "biotype_selection", "audit_readiness", "foundation"];

const coreComplianceComponents = [
  ["Company Profile Intelligence", "Company type, sites, labs, materials, equipment, regulatory scope, roles, and workforce."],
  ["BioType Branching Engine", "Selects one primary and multiple secondary biotech operating profiles."],
  ["Document Gap Engine", "Checks SOPs, forms, templates, revisions, gaps, and draft update needs."],
  ["Training Matrix", "Connects document, role, BioType, and process changes to training impact."],
  ["CAPA Screening", "Screens incidents and findings for corrective and preventive action needs."],
  ["Evidence Tracking", "Links requirements to evidence that proves controls exist."],
  ["Reference Knowledge Base", "Trusted references and company-specific reference mappings."],
  ["Audit Dashboard", "Readiness score built from documents, training, CAPA, incidents, equipment, and evidence."],
  ["Regulatory Mapping", "Determines what programs, documents, records, and controls apply."],
  ["BioRisk Scoring Engine", "Scores risk using exposure, severity, likelihood, compliance impact, training, and missing data."],
  ["Controlled Records Linkage", "Proof records for training, equipment, temperature, incidents, chain-of-custody, and waste."],
  ["Programs & Methods Library", "Biotech safety/compliance programs and deterministic AI decision methods."],
  ["Human Validation Workflow", "AI drafts and recommends; humans review, approve, reject, or request changes."]
].map(([name, purpose]) => ({ name, purpose }));

const aiWorkflowSteps = [
  "Company profile intelligence",
  "BioType branching",
  "Regulatory mapping",
  "BioRisk scoring",
  "Document control",
  "Training matrix",
  "Audit dashboard"
];

const humanValidationWorkflowSteps = [
  "AI draft",
  "Human review",
  "Approve/reject/request changes",
  "Effective controlled output",
  "Training impact",
  "Audit event"
];

export async function getAuthSummary(): Promise<AuthSummary> {
  if (!isSupabaseConfigured()) {
    return { configured: false, signedIn: false, needsOnboarding: false };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { configured: true, signedIn: false, needsOnboarding: false };
    }

    const { data } = await supabase.from("profiles").select("organization_id,role").eq("id", user.id).maybeSingle();
    return {
      configured: true,
      signedIn: true,
      userEmail: user.email ?? undefined,
      organizationId: data?.organization_id ?? undefined,
      role: data?.role ?? undefined,
      needsOnboarding: !data?.organization_id
    };
  } catch {
    return { configured: false, signedIn: false, needsOnboarding: false };
  }
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const context = await getProfileContext();
  if (!context) return demoCompanyProfile;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return demoCompanyProfile;

  return {
    id: data.id,
    organizationId: data.organization_id,
    companyName: data.company_name,
    primarySite: data.primary_site,
    operatingAreas: data.operating_areas ?? [],
    programs: data.programs ?? [],
    qualitySystemScope: data.quality_system_scope ?? [],
    biosafetyLevels: data.biosafety_levels ?? [],
    reviewOwnerRoles: data.review_owner_roles ?? [],
    documentFamilies: data.document_families ?? [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function listAssessments(): Promise<SavedAssessmentSummary[]> {
  const context = await getProfileContext();
  if (!context) {
    return [
      demoAssessmentSummary("demo-critical-contamination", {
        siteName: "Demo Biotech Site",
        area: "QC Microbiology Lab",
        workflow: "Sterility assay review",
        batchOrLot: "LOT-0001",
        controlEffectiveness: "partial",
        contaminationSuspected: true,
        productQualityImpactPotential: true,
        gxpImpact: true,
        signals: [{ type: "contamination_event", label: "Unexpected microbial growth", severity: "high" }]
      }),
      demoAssessmentSummary("demo-training-gap", {
        siteName: "Demo Biotech Site",
        area: "Cell Therapy Suite",
        workflow: "Media change",
        controlEffectiveness: "effective",
        missingRequiredTraining: true,
        signals: [{ type: "training_gap", label: "Expired aseptic technique training", severity: "low" }]
      })
    ];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assessments")
    .select("id,input_snapshot,score,level,confidence,human_review_required,human_review_status,reviewed_at,created_at")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((row) => {
    const input = row.input_snapshot as BioAiInput;
    return {
      id: row.id,
      workflow: input.workflow ?? "Untitled workflow",
      area: input.area ?? "Unassigned area",
      score: row.score,
      level: row.level,
      confidence: row.confidence,
      humanReviewRequired: row.human_review_required,
      humanReviewStatus: row.human_review_status,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at
    };
  });
}

export async function getAssessmentDetail(assessmentId: string): Promise<SavedAssessmentDetail | null> {
  const context = await getProfileContext();
  if (!context) {
    return demoAssessmentDetail(assessmentId);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assessments")
    .select("id,input_snapshot,output_snapshot,score,level,confidence,human_review_required,human_review_status,reviewer_notes,reviewed_by,reviewed_at,created_at")
    .eq("organization_id", context.organizationId)
    .eq("id", assessmentId)
    .maybeSingle();

  if (error || !data) return null;

  const { data: signals } = await supabase
    .from("assessment_signals")
    .select("payload")
    .eq("organization_id", context.organizationId)
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });

  const { data: auditRows } = await supabase
    .from("audit_events")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  const input = data.input_snapshot as BioAiInput;
  const output = data.output_snapshot as BioAiAssessment;
  const auditEvents = (auditRows ?? [])
    .filter((event) => {
      const payload = event.payload as Record<string, unknown> | null;
      return payload?.assessmentId === assessmentId;
    })
    .map(mapAuditEvent);

  return {
    id: data.id,
    workflow: input.workflow ?? "Untitled workflow",
    area: input.area ?? "Unassigned area",
    score: data.score,
    level: data.level,
    confidence: data.confidence,
    humanReviewRequired: data.human_review_required,
    humanReviewStatus: data.human_review_status,
    reviewerNotes: data.reviewer_notes,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    createdAt: data.created_at,
    input,
    output,
    signals: (signals ?? []).map((signal) => signal.payload as BioAiSignal),
    auditEvents
  };
}

export async function updateAssessmentReview(
  assessmentId: string,
  status: HumanReviewStatus,
  reviewerNotes: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in and finish onboarding before updating review status." };
  }

  const supabase = await createSupabaseServerClient();
  const reviewedAt = new Date().toISOString();
  const { data: assessment, error } = await supabase
    .from("assessments")
    .update({
      human_review_status: status,
      reviewer_notes: reviewerNotes || null,
      reviewed_by: context.userId,
      reviewed_at: reviewedAt
    })
    .eq("organization_id", context.organizationId)
    .eq("id", assessmentId)
    .select("id,score,level")
    .single();

  if (error || !assessment) {
    return { ok: false, message: error?.message ?? "Assessment review status could not be updated." };
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "human_review_status_changed",
    summary: `Assessment review status changed to ${status}.`,
    payload: withAuditTrace(
      { assessmentId, status, reviewerNotes, reviewedAt, level: assessment.level, score: assessment.score },
      {
        sourceModule: "assessment",
        sourceRecordId: assessmentId,
        targetModule: "assessment",
        targetRecordId: assessmentId,
        draftOnly: status !== "reviewed_monitoring" && status !== "routine_monitoring"
      }
    )
  });

  return { ok: true };
}

export async function listDocuments(): Promise<DocumentMetadata[]> {
  const context = await getProfileContext();
  if (!context) return demoDocuments;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return data.map(mapDocument);
}

export async function getDocument(documentId: string): Promise<DocumentMetadata | null> {
  const context = await getProfileContext();
  if (!context) {
    return demoDocuments.find((document) => document.id === documentId) ?? demoDocuments[0] ?? null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_metadata")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("id", documentId)
    .maybeSingle();

  if (error || !data) return null;
  return mapDocument(data);
}

export async function getDocumentRecommendationHistory(documentId: string): Promise<DocumentRecommendationRun[]> {
  const context = await getProfileContext();
  if (!context) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_recommendations")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const { data: auditRows } = await supabase
    .from("audit_events")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("event_type", "document_recommendation_generated")
    .order("created_at", { ascending: false })
    .limit(100);

  const audits = (auditRows ?? []).map(mapAuditEvent).filter((event) => {
    const payload = event.payload as Record<string, unknown> | undefined;
    return payload?.documentId === documentId;
  });

  const grouped = new Map<string, DocumentRecommendationRecord[]>();
  for (const row of data) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const runKey = typeof payload.runId === "string" ? payload.runId : row.created_at ?? row.id;
    const record: DocumentRecommendationRecord = {
      id: row.id,
      recommendationType: row.recommendation_type,
      title: row.title,
      label: row.label,
      humanReviewRequired: row.human_review_required,
      payload,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
    grouped.set(runKey, [...(grouped.get(runKey) ?? []), record]);
  }

  return [...grouped.entries()].map(([runKey, recommendations]) => {
    const createdAt = recommendations[0]?.createdAt;
    const auditEvent =
      audits.find((event) => (event.payload as Record<string, unknown> | undefined)?.runId === runKey) ??
      audits.find((event) => event.createdAt === createdAt);
    return { runKey, createdAt, auditEvent, recommendations };
  });
}

export async function listAuditEvents(): Promise<AuditEvent[]> {
  const context = await getProfileContext();
  if (!context) return demoAuditEvents;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return demoAuditEvents;

  return data.map(mapAuditEvent);
}

export async function getMapOperationsSummary(): Promise<MapOperationsSummary> {
  const context = await getProfileContext();
  if (!context) return demoMapOperationsSummary();

  try {
    const supabase = await createSupabaseServerClient();
    const [
      sites,
      labs,
      rules,
      training,
      incidents,
      capas,
      equipmentRows,
      samples,
      audits,
      tasks,
      latestIncident,
      latestEquipment,
      latestSample,
      latestRule
    ] = await Promise.all([
      countRows(supabase, "sites", context.organizationId),
      countRows(supabase, "labs", context.organizationId),
      countRows(supabase, "reference_rule_mappings", context.organizationId),
      countRows(supabase, "training_assignments", context.organizationId),
      countRows(supabase, "incidents", context.organizationId),
      countRows(supabase, "capa_records", context.organizationId),
      countRows(supabase, "equipment", context.organizationId),
      countRows(supabase, "samples", context.organizationId),
      countRows(supabase, "audits", context.organizationId),
      countRows(supabase, "tasks", context.organizationId),
      latestRow(supabase, "incidents", context.organizationId, "id,title,status,severity,lab_id"),
      latestRow(supabase, "equipment", context.organizationId, "id,equipment_tag,name,status,qualification_status"),
      latestRow(supabase, "samples", context.organizationId, "id,sample_identifier,status"),
      latestRow(supabase, "reference_rule_mappings", context.organizationId, "id,rule_key,ai_action_type")
    ]);

    const incident = latestIncident as Record<string, any> | null;
    const equipment = latestEquipment as Record<string, any> | null;
    const sample = latestSample as Record<string, any> | null;
    const rule = latestRule as Record<string, any> | null;
    const latestAssessmentInput: BioAiInput = {
      siteId: undefined,
      labId: typeof incident?.lab_id === "string" ? incident.lab_id : undefined,
      siteName: "Live map-aligned workspace",
      area: "Latest linked lab",
      workflow: typeof incident?.title === "string" ? incident.title : "Map-aligned operational readiness review",
      controlEffectiveness: "partial",
      dataCompleteness: 0.72,
      trainingStatus: training > 0 ? "expired" : "missing",
      documentReadiness: rules > 0 ? "gaps" : "missing",
      equipmentStatus: equipment?.status === "active" ? "partial" : "out_of_tolerance",
      auditReadinessStatus: audits > 0 ? "partial" : "missing",
      incidentContext: incident
        ? {
            incidentId: incident.id,
            status: incident.status ?? "open",
            severity: incident.severity ?? "medium",
            capaRequired: true,
            repeatPattern: tasks > 1
          }
        : { status: "open", capaRequired: true },
      sampleMaterialContext: sample
        ? { sampleId: sample.id, chainOfCustodyStatus: "gap", storageConditionStatus: "unknown" }
        : { chainOfCustodyStatus: "missing" },
      referenceRuleIds: rule?.id ? [rule.id] : [],
      sourceRecords: [
        ...(incident?.id ? [{ module: "incident" as const, recordId: incident.id, label: incident.title ?? "Latest incident" }] : []),
        ...(equipment?.id
          ? [{ module: "equipment" as const, recordId: equipment.id, label: equipment.equipment_tag ?? equipment.name ?? "Equipment" }]
          : []),
        ...(sample?.id ? [{ module: "sample" as const, recordId: sample.id, label: sample.sample_identifier ?? "Sample" }] : []),
        ...(rule?.id ? [{ module: "reference_rule" as const, recordId: rule.id, label: rule.rule_key ?? "Reference rule" }] : [])
      ],
      signals: [
        {
          type: "audit_finding",
          label: "Map-derived readiness review",
          severity: "medium",
          evidence: "Live operations records are linked into the deterministic AI Engine context.",
          referenceRuleIds: rule?.id ? [rule.id] : []
        },
        {
          type: "sample_chain_of_custody",
          label: sample?.sample_identifier ? `Traceability review for ${sample.sample_identifier}` : "Sample/material traceability review",
          severity: "medium",
          evidence: "Sample and material context requires chain-of-custody verification."
        }
      ]
    };

    return {
      counts: [
        { label: "Sites", value: sites },
        { label: "Labs", value: labs },
        { label: "Rules", value: rules },
        { label: "Training", value: training },
        { label: "Incidents", value: incidents },
        { label: "CAPA", value: capas },
        { label: "Equipment", value: equipmentRows },
        { label: "Samples", value: samples },
        { label: "Audits", value: audits },
        { label: "Tasks", value: tasks }
      ],
      readiness: [
        {
          module: "Document + reference rules",
          title: rule?.rule_key ?? "No mapped reference rule yet",
          status: rules > 0 ? "gaps" : "missing",
          detail: "Rules feed document gap recommendations and assessment source traceability."
        },
        {
          module: "Training",
          title: training > 0 ? "Training assignments present" : "Training assignments missing",
          status: training > 0 ? "expired" : "missing",
          detail: "Training context is intentionally surfaced as review-needed until completion evidence exists."
        },
        {
          module: "Incident/CAPA",
          title: incident?.title ?? "No incident bundle yet",
          status: incident?.status ?? "missing",
          detail: "Incidents can trigger CAPA screening, document review, training impact, and audit evidence."
        },
        {
          module: "Equipment/sample traceability",
          title: equipment?.equipment_tag ?? sample?.sample_identifier ?? "No equipment or sample yet",
          status: equipment?.status ?? sample?.status ?? "missing",
          detail: "Equipment and sample records feed impact, storage, and chain-of-custody review."
        }
      ],
      latestAssessmentInput
    };
  } catch {
    return demoMapOperationsSummary();
  }
}

export async function getMapAlignedWorkbenchInput(): Promise<BioAiInput> {
  return (await getMapOperationsSummary()).latestAssessmentInput;
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
          topGaps: score.top_gaps ?? []
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

export async function getTrainingMatrixSummary(): Promise<TrainingMatrixSummary> {
  const context = await getProfileContext();
  if (!context) return demoTrainingMatrixSummary();

  try {
    const supabase = await createSupabaseServerClient();
    const [requirementRows, assignmentRows, documentRows, changeRows, biotypeRows, readinessScore] = await Promise.all([
      latestRows(supabase, "training_requirements", context.organizationId, "id,title,role_key,document_id,frequency_months,required_for,updated_at", 80),
      latestRows(
        supabase,
        "training_assignments",
        context.organizationId,
        "id,training_requirement_id,status,due_date,completed_at,expires_at,evidence_path,updated_at",
        160
      ),
      latestRows(supabase, "document_metadata", context.organizationId, "id,title,status,revision,next_review_date,document_type", 100),
      latestRows(supabase, "change_impact_events", context.organizationId, "id,change_type,impact_summary,training_impacts,status,created_at", 20),
      latestRows(supabase, "biotype_foundations", context.organizationId, "id,display_name,required_training", 12),
      latestRow(supabase, "audit_readiness_scores", context.organizationId, "id,training_score")
    ]);

    const documents = new Map(
      ((documentRows as Record<string, any>[]) ?? []).map((document) => [
        document.id,
        {
          title: document.title ?? "Linked document",
          href: `/documents/${document.id}`
        }
      ])
    );
    const assignmentsByRequirement = new Map<string, Record<string, any>>();
    for (const assignment of ((assignmentRows as Record<string, any>[]) ?? []) as Record<string, any>[]) {
      if (!assignmentsByRequirement.has(assignment.training_requirement_id)) {
        assignmentsByRequirement.set(assignment.training_requirement_id, assignment);
      }
    }

    const rows = ((requirementRows as Record<string, any>[]) ?? []).map((requirement, index) => {
      const assignment = assignmentsByRequirement.get(requirement.id);
      const document = documents.get(requirement.document_id);
      const status = String(assignment?.status ?? "missing");
      const readiness = trainingReadinessFromStatus(status);
      return {
        id: requirement.id ?? `training-${index}`,
        requirement: requirement.title ?? "Training requirement",
        source: requirement.document_id ? "Document linked" : "Role/BioType requirement",
        ownerRole: requirement.role_key ?? summarizeJson(requirement.required_for) ?? "training_owner",
        documentTitle: document?.title ?? "No linked document",
        documentHref: document?.href ?? "/documents",
        assignmentStatus: status,
        dueDate: assignment?.due_date ?? null,
        expiryDate: assignment?.expires_at ?? null,
        evidenceLabel: assignment?.evidence_path ? "Evidence linked" : "Evidence needed",
        readiness
      } satisfies TrainingMatrixRow;
    });

    const biotypeRequirements = ((biotypeRows as Record<string, any>[]) ?? []).map((row) => ({
      biotype: row.display_name ?? "BioType",
      training: Array.isArray(row.required_training) ? row.required_training.slice(0, 5).map(String) : []
    }));
    const changeImpacts = ((changeRows as Record<string, any>[]) ?? []).map((row) => ({
      id: row.id,
      type: row.change_type,
      summary: row.impact_summary,
      trainingImpacts: Array.isArray(row.training_impacts) ? row.training_impacts.map(String).slice(0, 4) : [],
      status: row.status ?? "draft_human_review_required"
    }));
    const expired = rows.filter((row) => row.readiness === "Expired").length;
    const needsReview = rows.filter((row) => row.readiness === "Needs review").length;
    const missing = rows.filter((row) => row.readiness === "Missing").length;
    const current = rows.filter((row) => row.readiness === "Current").length;
    const score = (readinessScore as Record<string, any> | null)?.training_score;

    return {
      counts: [
        { label: "Training requirements", value: rows.length },
        { label: "Current", value: current },
        { label: "Needs review", value: needsReview },
        { label: "Expired", value: expired },
        { label: "Missing", value: missing },
        { label: "Change impacts", value: changeImpacts.length }
      ],
      readinessScore: typeof score === "number" ? score : calculateTrainingMatrixReadiness(rows),
      rows: rows.length > 0 ? rows : demoTrainingMatrixSummary().rows,
      changeImpacts,
      biotypeRequirements,
      guardrailText: "AI may identify training impact and draft recommendations, but training completion and competency remain human-validated."
    };
  } catch {
    return demoTrainingMatrixSummary();
  }
}

export async function getFoundationAdminAccessSummary(): Promise<FoundationAdminAccessSummary> {
  const auth = await getAuthSummary();
  const isOwner = auth.signedIn && !auth.needsOnboarding && auth.role === "owner";

  return {
    configured: auth.configured,
    signedIn: auth.signedIn,
    isOwner,
    role: auth.role,
    message: isOwner
      ? "Owner access active. Foundation edit and demo controls are enabled."
      : auth.signedIn
        ? "Read-only foundation view. Owner access is required for MVP edit workflows and NorthStar seeding."
        : "Read-only demo view. Sign in as an organization owner to use Foundation edit workflows."
  };
}

export async function getFoundationReviewActionsSummary(): Promise<FoundationReviewActionSummary[]> {
  const context = await getProfileContext();
  if (!context) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const [taskRows, recommendationRows] = await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,priority,status,due_date,source_module,source_record_id,created_at")
        .eq("organization_id", context.organizationId)
        .in("status", ["open", "in_progress"])
        .in("source_module", foundationReviewSourceModules)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("document_recommendations")
        .select("id,title,payload,label,created_at")
        .eq("organization_id", context.organizationId)
        .contains("payload", { actionType: "foundation_review_action" })
        .order("created_at", { ascending: false })
        .limit(20)
    ]);

    const recommendations = ((recommendationRows.data as Record<string, any>[]) ?? []).filter((row) => row.payload?.draftOnly !== false);
    const recommendationBySource = new Map<string, Record<string, any>>();
    for (const row of recommendations) {
      const key = foundationActionKey(row.payload?.sourceModule, row.payload?.sourceRecordId, row.title);
      if (key) recommendationBySource.set(key, row);
    }

    const actions = new Map<string, FoundationReviewActionSummary>();
    for (const row of ((taskRows.data as Record<string, any>[]) ?? [])) {
      const sourceModule = String(row.source_module ?? "foundation");
      const sourceRecordId = row.source_record_id ? String(row.source_record_id) : undefined;
      const key = foundationActionKey(sourceModule, sourceRecordId, row.title) ?? row.id;
      const recommendation = recommendationBySource.get(key);
      const source = getFoundationSourceTarget(sourceModule);
      actions.set(key, {
        id: row.id,
        taskId: row.id,
        title: row.title,
        priority: row.priority ?? "medium",
        status: row.status ?? "open",
        sourceModule,
        sourceRecordId,
        sourceLabel: source.label,
        sourceHref: source.href,
        dueDate: row.due_date,
        recommendationId: recommendation?.id,
        reason: recommendation?.payload?.reason,
        createdAt: row.created_at
      });
    }

    for (const row of recommendations) {
      const sourceModule = String(row.payload?.sourceModule ?? "foundation");
      const sourceRecordId = row.payload?.sourceRecordId ? String(row.payload.sourceRecordId) : undefined;
      const key = foundationActionKey(sourceModule, sourceRecordId, row.title) ?? row.id;
      if (actions.has(key)) continue;
      const source = getFoundationSourceTarget(sourceModule);
      actions.set(key, {
        id: row.id,
        title: row.title,
        priority: "medium",
        status: row.label ?? "Draft - Human Review Required",
        sourceModule,
        sourceRecordId,
        sourceLabel: source.label,
        sourceHref: source.href,
        recommendationId: row.id,
        reason: row.payload?.reason,
        createdAt: row.created_at
      });
    }

    return Array.from(actions.values()).slice(0, 12);
  } catch {
    return [];
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
              ownerRole: "quality_unit"
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
              ownerRole: "quality_unit"
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
        .select("id,overall_score,top_gaps,generated_at")
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
      label: String(gap),
      status: "readiness_gap",
      sourceHref: getFoundationSourceTarget("audit_readiness").href
    }));

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
      draftOnly: true
    };
  } catch {
    return demoAuditReadinessConsoleSummary();
  }
}

function fallbackChangePlanItems(): ChangePlanItem[] {
  return changePlanRows.map((row, index) => ({
    ...row,
    sortOrder: index + 1,
    persisted: false
  }));
}

function normalizeChangePlanPriority(priority: string): ChangePlanPriority {
  return changePlanPriorities.includes(priority as ChangePlanPriority) ? (priority as ChangePlanPriority) : "Medium";
}

function normalizeChangePlanStatus(status: string): ChangePlanStatus {
  return changePlanStatuses.includes(status as ChangePlanStatus) ? (status as ChangePlanStatus) : "Planned";
}

function normalizeChangePlanText(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function mapChangePlanItem(row: Record<string, any>): ChangePlanItem {
  return {
    id: row.id,
    category: row.category,
    feature: row.feature,
    owner: row.owner,
    priority: normalizeChangePlanPriority(row.priority),
    status: normalizeChangePlanStatus(row.status),
    notes: row.notes ?? "",
    href: row.href ?? "/change-plan",
    sortOrder: Number(row.sort_order ?? 0),
    persisted: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listChangePlanItems(): Promise<ChangePlanItemsSummary> {
  const fallbackItems = fallbackChangePlanItems();
  const context = await getProfileContext();

  if (!context) {
    return {
      items: fallbackItems,
      canManage: false,
      signedIn: false,
      isFallback: true,
      message: "Public demo mode is showing curated starter roadmap rows."
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("change_plan_items")
      .select("id,category,feature,owner,priority,status,notes,href,sort_order,created_at,updated_at")
      .eq("organization_id", context.organizationId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return {
        items: fallbackItems,
        canManage: context.role === "owner",
        signedIn: true,
        isFallback: true,
        message: "Live Change Plan rows are unavailable; showing curated starter rows."
      };
    }

    if (!data || data.length === 0) {
      return {
        items: fallbackItems,
        canManage: context.role === "owner",
        signedIn: true,
        isFallback: true,
        message: "This workspace has not seeded its Change Plan yet."
      };
    }

    return {
      items: data.map((row) => mapChangePlanItem(row as Record<string, any>)),
      canManage: context.role === "owner",
      signedIn: true,
      isFallback: false,
      message: context.role === "owner" ? "Owner roadmap controls enabled." : "Roadmap editing is owner-only for this workspace."
    };
  } catch {
    return {
      items: fallbackItems,
      canManage: context.role === "owner",
      signedIn: true,
      isFallback: true,
      message: "Live Change Plan rows are unavailable; showing curated starter rows."
    };
  }
}

export async function seedDefaultChangePlanItems(): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before seeding Change Plan rows." };
  if (context.role !== "owner") return { ok: false, message: "Only organization owners can manage Change Plan rows." };

  const supabase = await createSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from("change_plan_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", context.organizationId);

  if (countError) return { ok: false, message: countError.message };
  if ((count ?? 0) > 0) return { ok: true, message: "This workspace already has persisted Change Plan rows." };

  const rows = changePlanRows.map((row, index) => ({
    organization_id: context.organizationId,
    category: row.category,
    feature: row.feature,
    owner: row.owner,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    href: row.href,
    sort_order: index + 1,
    created_by: context.userId
  }));

  const { error } = await supabase.from("change_plan_items").insert(rows);
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Starter Change Plan rows seeded for owner editing." };
}

export async function createChangePlanItem(input: ChangePlanItemInput): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before creating Change Plan rows." };
  if (context.role !== "owner") return { ok: false, message: "Only organization owners can manage Change Plan rows." };

  const category = normalizeChangePlanText(input.category, "System Reliance");
  const feature = normalizeChangePlanText(input.feature, "");
  const owner = normalizeChangePlanText(input.owner, "Platform Owner");
  const notes = normalizeChangePlanText(input.notes, "Roadmap requirement detail pending owner review.");
  const href = normalizeChangePlanText(input.href, "/change-plan");

  if (!feature) return { ok: false, message: "Add a Change Plan feature before saving." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("change_plan_items").insert({
    organization_id: context.organizationId,
    category,
    feature,
    owner,
    priority: normalizeChangePlanPriority(input.priority),
    status: normalizeChangePlanStatus(input.status),
    notes,
    href,
    sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 99,
    created_by: context.userId
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Change Plan item created." };
}

export async function updateChangePlanItem(input: ChangePlanItemInput): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating Change Plan rows." };
  if (context.role !== "owner") return { ok: false, message: "Only organization owners can manage Change Plan rows." };
  if (!input.id) return { ok: false, message: "Choose a persisted Change Plan row to update." };

  const category = normalizeChangePlanText(input.category, "System Reliance");
  const feature = normalizeChangePlanText(input.feature, "");
  const owner = normalizeChangePlanText(input.owner, "Platform Owner");
  const notes = normalizeChangePlanText(input.notes, "Roadmap requirement detail pending owner review.");
  const href = normalizeChangePlanText(input.href, "/change-plan");

  if (!feature) return { ok: false, message: "Add a Change Plan feature before saving." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("change_plan_items")
    .update({
      category,
      feature,
      owner,
      priority: normalizeChangePlanPriority(input.priority),
      status: normalizeChangePlanStatus(input.status),
      notes,
      href,
      sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 99,
      updated_at: new Date().toISOString()
    })
    .eq("organization_id", context.organizationId)
    .eq("id", input.id)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, message: error?.message ?? "Change Plan item could not be updated." };
  return { ok: true, message: "Change Plan item updated." };
}

export async function updateFoundationBioTypeSelection(input: {
  primaryBioType: string;
  secondaryBioTypes: string[];
}): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating BioType selection." };
  if (context.role !== "owner") return { ok: false, message: "Only organization owners can update Foundation BioType selections." };

  const primaryBioType = normalizeBioTypeKey(input.primaryBioType);
  if (!primaryBioType) return { ok: false, message: "Choose a valid primary BioType." };

  const secondaryBioTypes = normalizeBioTypeKeys(input.secondaryBioTypes).filter((key) => key !== primaryBioType);
  const supabase = await createSupabaseServerClient();
  const companyProfile = await getCompanyProfile();
  const latestSelection = (await latestRow(
    supabase,
    "organization_biotype_selections",
    context.organizationId,
    "id"
  )) as Record<string, any> | null;

  const payload = {
    organization_id: context.organizationId,
    company_profile_id: companyProfile.id ?? null,
    primary_biotype_key: primaryBioType,
    secondary_biotype_keys: secondaryBioTypes,
    selection_status: "draft_human_review_required",
    selection_reason: "Updated from PredictSafeBIO Intelligence Foundation MVP edit workflow.",
    human_review_required: true,
    created_by: context.userId
  };

  const query = latestSelection?.id
    ? supabase
        .from("organization_biotype_selections")
        .update(payload)
        .eq("organization_id", context.organizationId)
        .eq("id", latestSelection.id)
        .select("id")
        .single()
    : supabase.from("organization_biotype_selections").insert(payload).select("id").single();

  const { data, error } = await query;
  if (error || !data) return { ok: false, message: error?.message ?? "BioType selection could not be updated." };

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_biotype_selection_updated",
    summary: "Foundation BioType selection updated; human review required.",
    sourceModule: "biotype_selection",
    sourceRecordId: data.id,
    targetModule: "foundation",
    targetRecordId: data.id,
    payload: { primaryBioType, secondaryBioTypes }
  });

  return { ok: true, message: "BioType selection updated as draft - human review required." };
}

export async function updateFoundationIntakeResponse(input: {
  responseId: string;
  answer: boolean;
}): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating intake responses." };
  if (context.role !== "owner") return { ok: false, message: "Only organization owners can update Foundation intake responses." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_intake_responses")
    .update({ answer_value: { value: input.answer }, updated_at: new Date().toISOString() })
    .eq("organization_id", context.organizationId)
    .eq("id", input.responseId)
    .select("id,question_key")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Intake response could not be updated." };

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_intake_response_updated",
    summary: `Foundation intake response updated for ${data.question_key}.`,
    sourceModule: "foundation",
    sourceRecordId: data.id,
    targetModule: "foundation",
    targetRecordId: data.id,
    payload: { responseId: data.id, questionKey: data.question_key, answer: input.answer }
  });

  return { ok: true, message: "Intake answer updated as draft - human review required." };
}

export async function updateFoundationEvidenceReadiness(input: {
  evidenceId: string;
  status: string;
  auditReady: boolean;
}): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating evidence readiness." };
  if (context.role !== "owner") return { ok: false, message: "Only organization owners can update Foundation evidence readiness." };

  const status = normalizeFoundationEvidenceStatus(input.status);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_evidence_map")
    .update({
      evidence_status: status,
      audit_ready: input.auditReady,
      human_review_required: true,
      updated_at: new Date().toISOString()
    })
    .eq("organization_id", context.organizationId)
    .eq("id", input.evidenceId)
    .select("id,requirement_name")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Evidence readiness could not be updated." };

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_evidence_readiness_updated",
    summary: `Foundation evidence readiness updated for ${data.requirement_name}.`,
    sourceModule: "evidence_map",
    sourceRecordId: data.id,
    targetModule: "audit_readiness",
    targetRecordId: data.id,
    payload: { evidenceId: data.id, requirementName: data.requirement_name, status, auditReady: input.auditReady }
  });

  return { ok: true, message: "Evidence readiness updated as draft - human review required." };
}

export async function addAuditReadinessNote(input: {
  auditReadinessScoreId?: string | null;
  note: string;
}): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before adding audit readiness notes." };
  if (context.role !== "owner") return { ok: false, message: "Only organization owners can add Foundation audit readiness notes." };

  const note = input.note.trim();
  if (note.length < 3) return { ok: false, message: "Add a short audit readiness note before saving." };

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
      note_type: "human_review_note",
      draft_only: true,
      human_review_required: true,
      created_by: context.userId
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Audit readiness note could not be saved." };

  await writeFoundationAuditEvent(supabase, context, {
    eventType: "foundation_audit_readiness_note_added",
    summary: "Audit readiness note added; this does not approve or certify readiness.",
    sourceModule: "audit_readiness",
    sourceRecordId: score ?? data.id,
    targetModule: "audit_readiness",
    targetRecordId: data.id,
    payload: { noteId: data.id, auditReadinessScoreId: score }
  });

  return { ok: true, message: "Audit readiness note added as draft - human review required." };
}

export async function seedNorthStarWithConfirmation(confirmation: string): Promise<FoundationActionResult> {
  if (confirmation.trim() !== "SEED NORTHSTAR") {
    return { ok: false, message: "Type SEED NORTHSTAR to create another NorthStar demo dataset." };
  }

  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before seeding NorthStar." };
  if (context.role !== "owner") return { ok: false, message: "Only organization owners can seed NorthStar demo data." };

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
  if (context.role !== "owner") return { ok: false, message: "Only organization owners can generate Foundation review actions." };

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
  for (const candidate of candidates) {
    const [duplicateTask, duplicateRecommendation] = await Promise.all([
      hasOpenFoundationTask(supabase, context.organizationId, candidate.sourceModule, candidate.sourceRecordId, candidate.title),
      hasOpenFoundationRecommendation(supabase, context.organizationId, candidate.sourceModule, candidate.sourceRecordId, candidate.title)
    ]);
    if (duplicateTask || duplicateRecommendation) continue;

    const dueDate = new Date(Date.now() + (candidate.priority === "high" ? 7 : 14) * 86400000).toISOString().slice(0, 10);
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
    payload: { created, candidateCount: candidates.length }
  });

  return {
    ok: true,
    message: created > 0 ? `${created} review action(s) generated as draft tasks.` : "No new review actions needed; existing open actions were preserved."
  };
}

export async function updateFoundationReviewTaskStatus(input: {
  taskId: string;
  status: string;
}): Promise<FoundationActionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating Foundation review tasks." };
  if (context.role !== "owner") return { ok: false, message: "Only organization owners can update Foundation review tasks." };

  const status = normalizeFoundationTaskStatus(input.status);
  if (!status) return { ok: false, message: "Choose a valid Foundation review task status." };

  const supabase = await createSupabaseServerClient();
  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("id,title,status,source_module,source_record_id")
    .eq("organization_id", context.organizationId)
    .eq("id", input.taskId)
    .single();

  if (readError || !task) return { ok: false, message: readError?.message ?? "Foundation review task could not be found." };
  if (!foundationReviewSourceModules.includes(String(task.source_module))) {
    return { ok: false, message: "Only generated Foundation review tasks can be updated from this panel." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
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
      status
    }
  });

  return { ok: true, message: `Foundation review task marked ${status}.` };
}

export async function getErgonomicLevel1Summary(): Promise<ErgonomicLevel1Summary> {
  const inspectionType = {
    title: "Hazard & Exposure Screening - Level 1 HSE Signal",
    description: "Worker-facing HSE screening with no measurements or equation fields.",
    href: "/ergonomics/self-assessment"
  };
  const level2InspectionType = {
    title: "Advanced HSE Audit Evaluation - Level 2",
    description: "Specialist/auditor measurement inspection launched from a saved request or audit context.",
    href: "/ergonomics/advanced-evaluation?context=audit",
    gatedLabel: "Requires Level 1 request or audit context"
  };
  const context = await getProfileContext();
  if (!context) {
    return {
      counts: [
        { label: "Level 1 screenings", value: 2 },
        { label: "High or Severe", value: 1 },
        { label: "Level 2 requests", value: 0 },
        { label: "Level 2 inspections", value: 0 }
      ],
      recentScreenings: [
        demoErgonomicRecord("demo-ergo-1", "lifting", "moderate", 5, "Shipping"),
        demoErgonomicRecord("demo-ergo-2", "repetitive_work", "high", 6, "Assembly")
      ],
      inspectionType,
      level2InspectionType,
      aiInsight: safePredictErgoAiInsight
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const [screenings, highOrSevere, requests, level2Inspections, recentRows] = await Promise.all([
      countRows(supabase, "ergonomic_self_assessments", context.organizationId),
      countRiskRows(supabase, context.organizationId, ["high", "severe"]),
      countRows(supabase, "ergonomic_advanced_evaluation_requests", context.organizationId),
      countRows(supabase, "ergonomic_level2_inspections", context.organizationId),
      latestRows(
        supabase,
        "ergonomic_self_assessments",
        context.organizationId,
        "id,task_type,discomfort_level,body_parts,frequency,comments,location,department_trade,risk_score,risk_level,escalation_status,repeated_moderate_flag,corrective_action_recommended,created_at",
        8
      )
    ]);

    return {
      counts: [
        { label: "Level 1 screenings", value: screenings },
        { label: "High or Severe", value: highOrSevere },
        { label: "Level 2 requests", value: requests },
        { label: "Level 2 inspections", value: level2Inspections }
      ],
      recentScreenings: ((recentRows as Record<string, any>[]) ?? []).map(mapErgonomicRecord),
      inspectionType,
      level2InspectionType,
      aiInsight: safePredictErgoAiInsight
    };
  } catch {
    return {
      counts: [
        { label: "Level 1 screenings", value: 0 },
        { label: "High or Severe", value: 0 },
        { label: "Level 2 requests", value: 0 },
        { label: "Level 2 inspections", value: 0 }
      ],
      recentScreenings: [],
      inspectionType,
      level2InspectionType,
      aiInsight: safePredictErgoAiInsight
    };
  }
}

export async function getErgonomicLevel2LaunchContext(params: {
  requestId?: string | null;
  context?: string | null;
}): Promise<ErgonomicLevel2LaunchContext> {
  const sourceContext: Level2SourceContext | null = params.requestId ? "request" : params.context === "audit" ? "audit" : null;
  const locked: ErgonomicLevel2LaunchContext = {
    allowed: false,
    sourceContext,
    taskType: "lifting",
    taskDescription: "",
    reason: "Level 2 requires a saved Level 1 request or an audit/inspection context.",
    recentInspections: []
  };

  const profile = await getProfileContext();
  if (!profile) {
    return {
      allowed: Boolean(sourceContext),
      sourceContext,
      requestId: params.requestId ?? null,
      taskType: "lifting",
      taskDescription: sourceContext === "audit" ? "Audit-triggered ergonomic measurement review" : "Requested ergonomic measurement review",
      location: "Pilot area",
      departmentTrade: "Pilot team",
      reason: sourceContext === "audit" ? "Audit context selected." : "Demo request context selected.",
      recentInspections: []
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const recent = latestRows(
      supabase,
      "ergonomic_level2_inspections",
      profile.organizationId,
      "id,task_type,status,risk_summary,created_at",
      6
    );

    if (params.requestId) {
      const { data: request } = await supabase
        .from("ergonomic_advanced_evaluation_requests")
        .select("id,self_assessment_id,request_reason,source_payload")
        .eq("organization_id", profile.organizationId)
        .eq("id", params.requestId)
        .maybeSingle();
      if (!request) return { ...locked, recentInspections: mapLevel2Recent(await recent) };

      const payload = (request.source_payload ?? {}) as Record<string, any>;
      return {
        allowed: true,
        sourceContext: "request",
        requestId: request.id,
        sourceSelfAssessmentId: request.self_assessment_id,
        taskType: normalizeTaskType(payload.task_type),
        taskDescription: `Level 2 measurement review for ${ergonomicLabel("task", String(payload.task_type ?? "lifting"))}`,
        location: typeof payload.location === "string" ? payload.location : null,
        departmentTrade: typeof payload.department_trade === "string" ? payload.department_trade : null,
        reason: request.request_reason ?? "Level 2 requested from Level 1 screening.",
        recentInspections: mapLevel2Recent(await recent)
      };
    }

    if (params.context === "audit") {
      return {
        allowed: true,
        sourceContext: "audit",
        taskType: "lifting",
        taskDescription: "Audit-triggered ergonomic measurement review",
        reason: "Audit/inspection context selected.",
        recentInspections: mapLevel2Recent(await recent)
      };
    }

    return { ...locked, recentInspections: mapLevel2Recent(await recent) };
  } catch {
    return locked;
  }
}

export async function saveErgonomicSelfAssessment(
  input: ErgonomicSelfAssessmentSubmission
): Promise<
  | {
      ok: true;
      assessmentId: string;
      riskScore: number;
      riskLevel: ErgonomicRiskLevel;
      repeatedModerateFlag: boolean;
      correctiveActionRecommended: boolean;
      message: string;
    }
  | { ok: false; message: string }
> {
  const validationErrors = validateErgonomicLevel1(input);
  if (validationErrors.length > 0) return { ok: false, message: validationErrors.join(" ") };

  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in and finish onboarding before saving an ergonomic self-assessment." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const result = scoreErgonomicLevel1(input);
    const repeatedModerateFlag =
      result.riskLevel === "moderate" ? await hasRepeatedModerateErgoPattern(supabase, context.organizationId, input) : false;
    const correctiveActionRecommended = result.riskLevel === "high" || result.riskLevel === "severe" || repeatedModerateFlag;
    const submittedAt = new Date().toISOString();
    const initialSignalPayload = buildErgonomicRiskSignal(input, result, {
      organizationId: context.organizationId,
      submitterId: context.userId,
      dateTime: submittedAt,
      repeatedModerateFlag
    });

    const { data: inspection, error: inspectionError } = await supabase
      .from("inspection_records")
      .insert({
        organization_id: context.organizationId,
        inspection_type: "ergonomic_level_1_screening",
        title: `Level 1 ergonomic screening - ${ergonomicLabel("task", input.taskType)}`,
        status: "submitted",
        location: input.location || null,
        department_trade: input.departmentTrade || null,
        submitted_by: context.userId,
        submitted_at: submittedAt,
        payload: initialSignalPayload
      })
      .select("id")
      .single();
    if (inspectionError || !inspection) {
      return { ok: false, message: inspectionError?.message ?? "Could not create inspection record." };
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from("ergonomic_self_assessments")
      .insert({
        organization_id: context.organizationId,
        inspection_record_id: inspection.id,
        task_type: input.taskType,
        discomfort_level: input.discomfortLevel,
        body_parts: input.bodyParts,
        frequency: input.frequency,
        comments: input.comments || null,
        location: input.location || null,
        department_trade: input.departmentTrade || null,
        submitter_id: context.userId,
        risk_score: result.riskScore,
        risk_level: result.riskLevel,
        main_risk_drivers: result.mainRiskDrivers,
        recommended_next_steps: result.recommendedNextSteps,
        ai_insight: result.aiInsight,
        escalation_status: result.escalationStatus,
        repeated_moderate_flag: repeatedModerateFlag,
        corrective_action_recommended: correctiveActionRecommended,
        signal_payload: initialSignalPayload
      })
      .select("id")
      .single();
    if (assessmentError || !assessment) {
      return { ok: false, message: assessmentError?.message ?? "Could not save ergonomic self-assessment." };
    }

    const signalPayload = buildErgonomicRiskSignal(input, result, {
      id: assessment.id,
      organizationId: context.organizationId,
      submitterId: context.userId,
      dateTime: submittedAt,
      repeatedModerateFlag
    });

    await Promise.all([
      supabase
        .from("ergonomic_self_assessments")
        .update({ signal_payload: signalPayload, updated_at: new Date().toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("id", assessment.id),
      supabase
        .from("inspection_records")
        .update({
          source_module: "ergonomic_self_assessment",
          source_record_id: assessment.id,
          payload: signalPayload,
          updated_at: new Date().toISOString()
        })
        .eq("organization_id", context.organizationId)
        .eq("id", inspection.id),
      supabase.from("ergonomic_risk_signals").insert({
        organization_id: context.organizationId,
        self_assessment_id: assessment.id,
        payload: signalPayload,
        risk_score: result.riskScore,
        risk_level: result.riskLevel,
        escalation_status: result.escalationStatus
      })
    ]);

    let taskId: string | null = null;
    if (correctiveActionRecommended) {
      taskId = await createErgonomicCorrectiveActionRecommendation(
        supabase,
        context,
        assessment.id,
        input,
        result.riskLevel,
        repeatedModerateFlag
      );
    }

    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "ergonomic_self_assessment_submitted",
      summary: `Level 1 ergonomic screening submitted with ${result.riskLevel} risk (${result.riskScore}/9).`,
      payload: withAuditTrace(
        {
          assessmentId: assessment.id,
          inspectionRecordId: inspection.id,
          taskId,
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          repeatedModerateFlag,
          correctiveActionRecommended,
          signalPayload
        },
        {
          sourceModule: "ergonomic_self_assessment",
          sourceRecordId: assessment.id,
          targetModule: taskId ? "task" : "inspection",
          targetRecordId: taskId ?? inspection.id,
          draftOnly: true
        }
      )
    });

    return {
      ok: true,
      assessmentId: assessment.id,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      repeatedModerateFlag,
      correctiveActionRecommended,
      message: correctiveActionRecommended
        ? "Screening saved. SafePredict created a supervisor/corrective-action review task."
        : "Screening saved. SafePredict captured the Level 1 ergonomic risk signal."
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not save ergonomic screening." };
  }
}

export async function requestAdvancedErgonomicEvaluation(
  selfAssessmentId: string,
  reason?: string
): Promise<{ ok: true; requestId: string; message: string } | { ok: false; message: string }> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in and finish onboarding before requesting a Level 2 ergonomic evaluation." };
  }
  if (!selfAssessmentId) return { ok: false, message: "Save a Level 1 screening before requesting Level 2 evaluation." };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: assessment, error } = await supabase
      .from("ergonomic_self_assessments")
      .select("id,task_type,risk_level,risk_score,signal_payload,location,department_trade")
      .eq("organization_id", context.organizationId)
      .eq("id", selfAssessmentId)
      .maybeSingle();
    if (error || !assessment) return { ok: false, message: error?.message ?? "Could not find the saved Level 1 screening." };

    const { data: request, error: requestError } = await supabase
      .from("ergonomic_advanced_evaluation_requests")
      .insert({
        organization_id: context.organizationId,
        self_assessment_id: selfAssessmentId,
        requested_by: context.userId,
        status: "requested",
        request_reason: reason || `Level 2 requested from ${assessment.risk_level} Level 1 ergonomic screening.`,
        source_payload: assessment.signal_payload ?? {}
      })
      .select("id")
      .single();
    if (requestError || !request) {
      return { ok: false, message: requestError?.message ?? "Could not create Level 2 ergonomic evaluation request." };
    }

    const { data: task } = await supabase
      .from("tasks")
      .insert({
        organization_id: context.organizationId,
        source_module: "ergonomic_advanced_evaluation",
        source_record_id: request.id,
        assigned_to: context.userId,
        title: `Level 2 ergonomic evaluation - ${ergonomicLabel("task", assessment.task_type)}`,
        status: "open",
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        priority: assessment.risk_level === "severe" ? "urgent" : "high",
        created_by: context.userId
      })
      .select("id")
      .single();

    await Promise.all([
      supabase
        .from("ergonomic_self_assessments")
        .update({
          level_2_request_id: request.id,
          escalation_status: "advanced_evaluation_requested",
          updated_at: new Date().toISOString()
        })
        .eq("organization_id", context.organizationId)
        .eq("id", selfAssessmentId),
      task?.id
        ? supabase.from("notifications").insert({
            organization_id: context.organizationId,
            user_id: context.userId,
            task_id: task.id,
            notification_type: "task",
            title: "Level 2 ergonomic evaluation requested",
            body: "The advanced workflow is separate from Level 1 and may include measurements, photos, equation data points, specialist review, recommendations, and corrective actions."
          })
        : Promise.resolve()
    ]);

    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "ergonomic_advanced_evaluation_requested",
      summary: "Level 2 ergonomic evaluation requested from Level 1 screening.",
      payload: withAuditTrace(
        {
          selfAssessmentId,
          requestId: request.id,
          taskId: task?.id ?? null,
          level2Scope: [
            "measurements",
            "photos",
            "industrial ergonomic equation data points",
            "specialist review",
            "formal recommendations",
            "corrective actions"
          ]
        },
        {
          sourceModule: "ergonomic_self_assessment",
          sourceRecordId: selfAssessmentId,
          targetModule: "ergonomic_advanced_evaluation",
          targetRecordId: request.id,
          draftOnly: true
        }
      )
    });

    return { ok: true, requestId: request.id, message: "Level 2 advanced ergonomic evaluation request created." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not request Level 2 ergonomic evaluation." };
  }
}

export async function saveErgonomicLevel2Inspection(
  input: ErgonomicLevel2Input
): Promise<{ ok: true; inspectionId: string; message: string } | { ok: false; message: string }> {
  const errors = validateErgonomicLevel2(input);
  if (errors.length > 0) return { ok: false, message: errors.join(" ") };

  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before saving a Level 2 ergonomic inspection." };

  try {
    const supabase = await createSupabaseServerClient();
    let sourceSelfAssessmentId: string | null = null;
    let requestPayload: Record<string, any> = {};

    if (input.sourceContext === "request") {
      if (!input.requestId) return { ok: false, message: "A Level 2 request ID is required for request-based evaluations." };
      const { data: request, error: requestError } = await supabase
        .from("ergonomic_advanced_evaluation_requests")
        .select("id,self_assessment_id,source_payload")
        .eq("organization_id", context.organizationId)
        .eq("id", input.requestId)
        .maybeSingle();
      if (requestError || !request) return { ok: false, message: requestError?.message ?? "Could not verify the Level 2 request." };
      sourceSelfAssessmentId = request.self_assessment_id;
      requestPayload = (request.source_payload ?? {}) as Record<string, any>;
    }

    const evaluation = evaluateErgonomicLevel2(input);
    const measurementPayload = {
      measuredLoadLbs: input.measuredLoadLbs,
      horizontalReachIn: input.horizontalReachIn,
      verticalHandHeightIn: input.verticalHandHeightIn,
      travelDistanceIn: input.travelDistanceIn,
      frequencyPerMinute: input.frequencyPerMinute,
      taskDurationMinutes: input.taskDurationMinutes,
      asymmetryDegrees: input.asymmetryDegrees ?? null,
      gripQuality: input.gripQuality,
      postureNotes: input.postureNotes ?? null,
      measurementSummary: evaluation.measurementSummary,
      equationCalculated: false,
      equationNote: "Guided Level 2 measurement capture only; no industrial ergonomic equation score is calculated in this workflow."
    };
    const photoEvidence = {
      evidenceLabel: input.photoEvidenceLabel ?? null,
      storagePending: true
    };

    const { data: inspectionRecord, error: inspectionError } = await supabase
      .from("inspection_records")
      .insert({
        organization_id: context.organizationId,
        inspection_type: "ergonomic_level_2_advanced_evaluation",
        title: `Level 2 ergonomic evaluation - ${ergonomicLabel("task", input.taskType)}`,
        status: "submitted",
        source_module: "ergonomic_advanced_evaluation",
        location: input.location || null,
        department_trade: input.departmentTrade || null,
        submitted_by: context.userId,
        submitted_at: new Date().toISOString(),
        payload: {
          sourceContext: input.sourceContext,
          requestId: input.requestId ?? null,
          sourceSelfAssessmentId,
          measurementPayload,
          photoEvidence,
          requestPayload
        }
      })
      .select("id")
      .single();
    if (inspectionError || !inspectionRecord) {
      return { ok: false, message: inspectionError?.message ?? "Could not create Level 2 inspection record." };
    }

    const { data: inspection, error } = await supabase
      .from("ergonomic_level2_inspections")
      .insert({
        organization_id: context.organizationId,
        advanced_evaluation_request_id: input.requestId || null,
        inspection_record_id: inspectionRecord.id,
        source_self_assessment_id: sourceSelfAssessmentId,
        evaluator_id: context.userId,
        source_context: input.sourceContext,
        status: "submitted_for_review",
        task_type: input.taskType,
        task_description: input.taskDescription,
        location: input.location || null,
        department_trade: input.departmentTrade || null,
        measurement_payload: measurementPayload,
        photo_evidence: photoEvidence,
        specialist_notes: input.specialistNotes,
        formal_recommendations: input.formalRecommendations,
        corrective_action_recommended: input.correctiveActionRecommended,
        risk_summary: evaluation.riskSummary
      })
      .select("id")
      .single();
    if (error || !inspection) return { ok: false, message: error?.message ?? "Could not save Level 2 ergonomic inspection." };

    await supabase
      .from("inspection_records")
      .update({ source_record_id: inspection.id, updated_at: new Date().toISOString() })
      .eq("organization_id", context.organizationId)
      .eq("id", inspectionRecord.id);

    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "ergonomic_level2_inspection_created",
      summary: "Level 2 ergonomic measurement inspection record created.",
      payload: withAuditTrace(
        {
          inspectionId: inspection.id,
          inspectionRecordId: inspectionRecord.id,
          requestId: input.requestId ?? null,
          sourceContext: input.sourceContext
        },
        {
          sourceModule: "ergonomic_advanced_evaluation",
          sourceRecordId: inspection.id,
          targetModule: "inspection",
          targetRecordId: inspectionRecord.id,
          draftOnly: true
        }
      )
    });

    let taskId: string | null = null;
    if (input.correctiveActionRecommended) {
      const { data: task } = await supabase
        .from("tasks")
        .insert({
          organization_id: context.organizationId,
          source_module: "ergonomic_advanced_evaluation",
          source_record_id: inspection.id,
          assigned_to: context.userId,
          title: `Level 2 ergonomic corrective action - ${ergonomicLabel("task", input.taskType)}`,
          status: "open",
          due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          priority: "high",
          created_by: context.userId
        })
        .select("id")
        .single();
      taskId = task?.id ?? null;

      await supabase.from("audit_events").insert({
        organization_id: context.organizationId,
        actor_id: context.userId,
        event_type: "ergonomic_level2_corrective_action_recommended",
        summary: "Level 2 ergonomic inspection recommended corrective-action review.",
        payload: withAuditTrace(
          { inspectionId: inspection.id, taskId, riskSummary: evaluation.riskSummary },
          {
            sourceModule: "ergonomic_advanced_evaluation",
            sourceRecordId: inspection.id,
            targetModule: taskId ? "task" : "ergonomic_advanced_evaluation",
            targetRecordId: taskId ?? inspection.id,
            draftOnly: true
          }
        )
      });
    }

    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "ergonomic_level2_inspection_submitted",
      summary: "Level 2 ergonomic measurement inspection submitted for review.",
      payload: withAuditTrace(
        {
          inspectionId: inspection.id,
          inspectionRecordId: inspectionRecord.id,
          requestId: input.requestId ?? null,
          sourceContext: input.sourceContext,
          measurementPayload,
          photoEvidence,
          correctiveActionRecommended: input.correctiveActionRecommended,
          taskId
        },
        {
          sourceModule: "ergonomic_advanced_evaluation",
          sourceRecordId: inspection.id,
          targetModule: "inspection",
          targetRecordId: inspectionRecord.id,
          draftOnly: true
        }
      )
    });

    return { ok: true, inspectionId: inspection.id, message: "Level 2 ergonomic measurement inspection saved for review." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not save Level 2 ergonomic inspection." };
  }
}

export async function createMapOperationsBundle(
  input: MapOperationsBundleInput
): Promise<{ ok: true; incidentId: string; taskId: string; bundleLabel: string } | { ok: false; message: string }> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in and finish onboarding before creating map-aligned operations records." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const bundleId = randomUUID();
    const bundleLabel = `Map bundle ${bundleId.slice(0, 8)}`;

    const { data: site, error: siteError } = await supabase
      .from("sites")
      .insert({
        organization_id: context.organizationId,
        name: input.siteName,
        location: "Pilot site",
        metadata: { bundleId, bundleLabel },
        created_by: context.userId
      })
      .select("id")
      .single();
    if (siteError || !site) return { ok: false, message: siteError?.message ?? "Could not create site." };

    const { data: lab, error: labError } = await supabase
      .from("labs")
      .insert({
        organization_id: context.organizationId,
        site_id: site.id,
        name: input.labName,
        biosafety_level: "BSL-2",
        controlled_area_type: "controlled lab",
        storage_path_prefix: `${context.organizationId}/${site.id}`,
        metadata: { bundleId, bundleLabel },
        created_by: context.userId
      })
      .select("id")
      .single();
    if (labError || !lab) return { ok: false, message: labError?.message ?? "Could not create lab." };

    const { data: source, error: sourceError } = await supabase
      .from("reference_sources")
      .insert({
        organization_id: context.organizationId,
        title: input.referenceTitle,
        source_type: "biosafety_guidance",
        publisher: "Pilot reference",
        status: "active",
        metadata: { bundleId, bundleLabel }
      })
      .select("id")
      .single();
    if (sourceError || !source) return { ok: false, message: sourceError?.message ?? "Could not create reference source." };

    const { data: section, error: sectionError } = await supabase
      .from("reference_sections")
      .insert({
        organization_id: context.organizationId,
        reference_source_id: source.id,
        section_key: `biosafety-${bundleId.slice(0, 8)}`,
        title: "Biosafety and training controls",
        category: "biosafety",
        content_summary: "Map-derived controls for PPE, SOP review, training impact, and incident escalation.",
        metadata: { bundleId, bundleLabel }
      })
      .select("id")
      .single();
    if (sectionError || !section) return { ok: false, message: sectionError?.message ?? "Could not create reference section." };

    const { data: rule, error: ruleError } = await supabase
      .from("reference_rule_mappings")
      .insert({
        organization_id: context.organizationId,
        reference_section_id: section.id,
        rule_key: `rule-${bundleId.slice(0, 8)}`,
        trigger_conditions: { trainingStatus: "expired", incidentStatus: "open", documentReadiness: "gaps" },
        ai_action_type: "document_training_capa_review",
        risk_driver_category: "biosafety",
        recommended_owner_role: "biosafety_officer",
        document_family: "biosafety_sop",
        draft_only: true,
        human_review_required: true
      })
      .select("id")
      .single();
    if (ruleError || !rule) return { ok: false, message: ruleError?.message ?? "Could not create reference rule." };

    const documentResult = await saveDocumentMetadata({
      title: input.documentTitle,
      documentType: "sop",
      status: "in_review",
      ownerRole: "biosafety_officer",
      area: input.labName,
      relatedProcess: input.workflow,
      revision: "0.1",
      gaps: ["Reference rule mapping needs human review", "Training impact needs owner confirmation"]
    });
    if (!documentResult.ok || !documentResult.document?.id) {
      return { ok: false, message: documentResult.message ?? "Could not create document metadata." };
    }

    await supabase.from("document_library_catalog").insert({
      organization_id: context.organizationId,
      catalog_key: `catalog-${bundleId.slice(0, 8)}`,
      title: input.documentTitle,
      document_family: "biosafety_sop",
      baseline_template_label: "Pilot biosafety SOP template",
      required_for: { labId: lab.id, workflow: input.workflow },
      reference_rule_ids: [rule.id]
    });
    await supabase.from("document_versions").insert({
      organization_id: context.organizationId,
      document_id: documentResult.document.id,
      version_label: "0.1",
      change_summary: "Initial map-aligned draft version.",
      created_by: context.userId
    });
    await supabase.from("document_approvals").insert({
      organization_id: context.organizationId,
      document_id: documentResult.document.id,
      approval_status: "pending",
      reviewer_role: "biosafety_officer",
      reviewer_id: context.userId,
      notes: "Human review required before controlled use."
    });

    const { data: trainingRequirement } = await supabase
      .from("training_requirements")
      .insert({
        organization_id: context.organizationId,
        document_id: documentResult.document.id,
        role_key: "lab_staff",
        title: input.trainingTitle,
        frequency_months: 12,
        required_for: { labId: lab.id, documentId: documentResult.document.id }
      })
      .select("id")
      .single();
    if (trainingRequirement?.id) {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { data: assignment } = await supabase
        .from("training_assignments")
        .insert({
          organization_id: context.organizationId,
          training_requirement_id: trainingRequirement.id,
          assigned_user_id: context.userId,
          status: "expired",
          due_date: yesterday.slice(0, 10),
          expires_at: yesterday
        })
        .select("id")
        .single();
      if (assignment?.id) {
        await supabase.from("competency_assessments").insert({
          organization_id: context.organizationId,
          training_assignment_id: assignment.id,
          assessor_id: context.userId,
          status: "pending",
          notes: "Hands-on competency pending human verification."
        });
      }
    }

    const { data: material } = await supabase
      .from("materials")
      .insert({
        organization_id: context.organizationId,
        material_code: `MAT-${bundleId.slice(0, 8)}`,
        name: "Pilot reagent lot",
        material_type: "reagent",
        lot_number: bundleId.slice(0, 8).toUpperCase(),
        status: "quarantine",
        storage_location: input.labName
      })
      .select("id")
      .single();

    const { data: sample } = await supabase
      .from("samples")
      .insert({
        organization_id: context.organizationId,
        sample_identifier: input.sampleIdentifier,
        material_id: material?.id ?? null,
        lab_id: lab.id,
        status: "active",
        storage_location: input.labName,
        metadata: { bundleId, bundleLabel }
      })
      .select("id")
      .single();
    if (sample?.id) {
      await supabase.from("sample_chain_of_custody").insert({
        organization_id: context.organizationId,
        sample_id: sample.id,
        transfer_type: "receipt",
        to_location: input.labName,
        transferred_by: context.userId,
        condition_notes: "Receipt recorded; second-person verification pending."
      });
    }

    const { data: equipment } = await supabase
      .from("equipment")
      .insert({
        organization_id: context.organizationId,
        lab_id: lab.id,
        equipment_tag: input.equipmentTag,
        name: "Pilot biosafety cabinet",
        equipment_type: "BSC",
        status: "out_of_service",
        qualification_status: "impact_review_required",
        metadata: { bundleId, bundleLabel }
      })
      .select("id")
      .single();
    if (equipment?.id) {
      await supabase.from("equipment_events").insert({
        organization_id: context.organizationId,
        equipment_id: equipment.id,
        event_type: "certification_gap",
        status: "open",
        occurred_at: new Date().toISOString(),
        impact_assessment: "Certification impact review required before use.",
        created_by: context.userId
      });
      await supabase.from("temperature_logs").insert({
        organization_id: context.organizationId,
        equipment_id: equipment.id,
        measured_at: new Date().toISOString(),
        value: 9.2,
        unit: "C",
        status: "excursion"
      });
    }

    await supabase.from("chemical_inventory").insert({
      organization_id: context.organizationId,
      lab_id: lab.id,
      chemical_name: "Pilot disinfectant",
      hazard_class: "irritant",
      quantity: "1 L",
      storage_location: input.labName
    });
    await supabase.from("waste_records").insert({
      organization_id: context.organizationId,
      lab_id: lab.id,
      waste_type: "biohazard",
      status: "open",
      container_label: `BIOWASTE-${bundleId.slice(0, 8)}`
    });

    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .insert({
        organization_id: context.organizationId,
        lab_id: lab.id,
        incident_type: "biosafety_deviation",
        title: input.incidentTitle,
        severity: "high",
        status: "investigating",
        occurred_at: new Date().toISOString(),
        reported_by: context.userId,
        summary: "Map-aligned incident created to exercise document, training, CAPA, and audit workflows.",
        metadata: { bundleId, bundleLabel, sampleId: sample?.id, equipmentId: equipment?.id }
      })
      .select("id")
      .single();
    if (incidentError || !incident) return { ok: false, message: incidentError?.message ?? "Could not create incident." };

    await supabase.from("incident_evidence").insert({
      organization_id: context.organizationId,
      incident_id: incident.id,
      evidence_type: "statement",
      notes: "Initial statement captured; formal investigation pending.",
      created_by: context.userId
    });
    await supabase.from("incident_investigation_steps").insert({
      organization_id: context.organizationId,
      incident_id: incident.id,
      step_type: "root_cause",
      status: "in_progress",
      owner_id: context.userId,
      notes: "Root-cause review opened by map bundle.",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    });

    const { data: capa } = await supabase
      .from("capa_records")
      .insert({
        organization_id: context.organizationId,
        source_incident_id: incident.id,
        title: `CAPA screening for ${input.incidentTitle}`,
        status: "draft_human_review_required",
        owner_role: "quality_unit",
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        created_by: context.userId
      })
      .select("id")
      .single();
    if (capa?.id) {
      await supabase.from("capa_actions").insert({
        organization_id: context.organizationId,
        capa_record_id: capa.id,
        action_type: "preventive",
        title: "Confirm SOP, training, and equipment impact",
        status: "open",
        owner_id: context.userId,
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
      });
    }

    const { data: audit } = await supabase
      .from("audits")
      .insert({
        organization_id: context.organizationId,
        title: `${bundleLabel} readiness audit`,
        audit_type: "internal",
        status: "in_progress",
        scheduled_for: new Date().toISOString().slice(0, 10),
        created_by: context.userId
      })
      .select("id")
      .single();
    if (audit?.id) {
      const { data: finding } = await supabase
        .from("audit_findings")
        .insert({
          organization_id: context.organizationId,
          audit_id: audit.id,
          finding_level: "major",
          title: "Evidence package requires completion",
          status: "open",
          source_module: "incident",
          source_record_id: incident.id
        })
        .select("id")
        .single();
      await supabase.from("audit_evidence").insert({
        organization_id: context.organizationId,
        audit_id: audit.id,
        audit_finding_id: finding?.id ?? null,
        source_module: "document",
        source_record_id: documentResult.document.id,
        notes: "Draft document metadata linked as evidence; human review pending.",
        created_by: context.userId
      });
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        organization_id: context.organizationId,
        source_module: "incident",
        source_record_id: incident.id,
        assigned_to: context.userId,
        title: `Review ${bundleLabel} AI readiness`,
        status: "open",
        due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        priority: "urgent",
        created_by: context.userId
      })
      .select("id")
      .single();
    if (taskError || !task) return { ok: false, message: taskError?.message ?? "Could not create task." };

    await supabase.from("notifications").insert({
      organization_id: context.organizationId,
      user_id: context.userId,
      task_id: task.id,
      notification_type: "task",
      title: `${bundleLabel} needs review`,
      body: "Map-aligned source records are ready for deterministic AI review."
    });

    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "map_operations_bundle_created",
      summary: `${bundleLabel}: map-aligned operations bundle created across site, lab, reference, document, training, incident, CAPA, equipment, sample, audit, and task modules.`,
      payload: withAuditTrace(
        {
          bundleId,
          bundleLabel,
          siteId: site.id,
          labId: lab.id,
          ruleId: rule.id,
          documentId: documentResult.document.id,
          incidentId: incident.id,
          taskId: task.id
        },
        {
          sourceModule: "incident",
          sourceRecordId: incident.id,
          targetModule: "task",
          targetRecordId: task.id,
          runId: bundleId,
          draftOnly: true
        }
      )
    });

    return { ok: true, incidentId: incident.id, taskId: task.id, bundleLabel };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not create map-aligned operations bundle." };
  }
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
          reviewer_role: "quality_unit",
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
        owner_role: "quality_unit",
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
    const selectedSecondary: BioTypeKey[] = ["diagnostics_clinical_lab", "academic_university_research"];
    const { data: biotypeSelection } = await supabase
      .from("organization_biotype_selections")
      .insert({
        organization_id: context.organizationId,
        company_profile_id: companyProfile.id ?? null,
        primary_biotype_key: selectedPrimary,
        secondary_biotype_keys: selectedSecondary,
        selection_status: "draft_human_review_required",
        selection_reason: "NorthStar BioLabs pilot combines R&D biotech with diagnostics/sample handling and academic-style biosafety oversight.",
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

export async function saveAssessment(input: BioAiInput) {
  const context = await getProfileContext();
  if (!context) {
    return {
      ok: false,
      status: 401,
      message: isSupabaseConfigured()
        ? "Sign in and create a profile with an organization before saving assessments."
        : "Supabase environment variables are not configured; assessment can run locally but cannot be saved yet."
    };
  }

  const supabase = await createSupabaseServerClient();
  const assessment = assessBioRisk(input);
  const { data, error } = await supabase
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
      human_review_status: assessment.humanReviewRequired ? "draft_human_review_required" : "routine_monitoring"
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, message: error?.message ?? "Could not save assessment." };
  }

  const signals = input.signals ?? [];
  if (signals.length > 0) {
    await supabase.from("assessment_signals").insert(
      signals.map((signal) => ({
        organization_id: context.organizationId,
        assessment_id: data.id,
        signal_type: signal.type,
        label: signal.label,
        payload: signal
      }))
    );
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "assessment_saved",
    summary: `Assessment saved with ${assessment.level} risk and score ${assessment.score}.`,
    payload: withAuditTrace(
      { assessmentId: data.id, level: assessment.level, score: assessment.score, sourceTrace: assessment.sourceTrace },
      {
        sourceModule: "assessment",
        sourceRecordId: data.id,
        targetModule: "assessment",
        targetRecordId: data.id,
        draftOnly: assessment.humanReviewRequired
      }
    )
  });

  return { ok: true, status: 201, id: data.id, assessment };
}

export async function persistDocumentRecommendations(document: DocumentMetadata) {
  const context = await getProfileContext();
  const gapRecommendations = generateDocumentGapRecommendations(document);
  const updateRecommendations = generateDocumentUpdateRecommendations(document);

  if (!context || !document.id) {
    return { ok: false, gapRecommendations, updateRecommendations };
  }

  const supabase = await createSupabaseServerClient();
  const rows = [
    ...gapRecommendations.map((recommendation) => ({
      organization_id: context.organizationId,
      document_id: document.id,
      recommendation_type: "gap",
      title: recommendation.title,
      payload: recommendation,
      created_by: context.userId
    })),
    ...updateRecommendations.map((recommendation) => ({
      organization_id: context.organizationId,
      document_id: document.id,
      recommendation_type: "draft_update",
      title: recommendation.title,
      payload: recommendation,
      created_by: context.userId
    }))
  ];

  if (rows.length > 0) {
    const runId = randomUUID();
    const generatedAt = new Date().toISOString();
    await supabase.from("document_recommendations").insert(
      rows.map((row) => ({
        ...row,
        payload: { ...(row.payload as Record<string, unknown>), runId, generatedAt }
      }))
    );
    await supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "document_recommendation_generated",
      summary: `Generated draft document recommendations for ${document.title}.`,
      payload: withAuditTrace(
        { documentId: document.id, count: rows.length, runId, generatedAt },
        {
          sourceModule: "document",
          sourceRecordId: document.id,
          targetModule: "document_recommendation",
          targetRecordId: document.id,
          runId,
          draftOnly: true
        }
      )
    });
  }

  return { ok: true, gapRecommendations, updateRecommendations };
}

export async function seedDemoWorkspace(): Promise<
  { ok: true; assessmentId: string; documentId: string; seedLabel: string } | { ok: false; message: string }
> {
  const context = await getProfileContext();
  if (!context) {
    return { ok: false, message: "Sign in and finish onboarding before seeding demo records." };
  }
  if (context.role !== "owner") {
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
    productQualityImpactPotential: true,
    gxpImpact: true,
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

export async function saveDocumentMetadata(input: SaveDocumentMetadataInput) {
  const context = await getProfileContext();
  if (!context) {
    return {
      ok: false,
      status: 401,
      message: isSupabaseConfigured()
        ? "Sign in and finish onboarding before saving document metadata."
        : "Supabase environment variables are not configured; document metadata cannot be saved yet."
    };
  }

  const supabase = await createSupabaseServerClient();
  const uploadFile = input.file && input.file.size > 0 ? input.file : null;
  const { data, error } = await supabase
    .from("document_metadata")
    .insert({
      organization_id: context.organizationId,
      title: input.title,
      document_type: input.documentType,
      status: input.status,
      owner_role: input.ownerRole,
      area: input.area || null,
      related_process: input.relatedProcess || null,
      revision: input.revision || null,
      effective_date: input.effectiveDate || null,
      next_review_date: input.nextReviewDate || null,
      gaps: input.gaps ?? [],
      created_by: context.userId
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, status: 500, message: error?.message ?? "Could not save document metadata." };
  }

  let uploadWarning: string | undefined;
  let storageBucket: string | null = null;
  let storagePath: string | null = null;

  if (uploadFile) {
    storageBucket = "biotech-documents";
    const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
    storagePath = `${context.organizationId}/${data.id}/${safeName}`;
    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, buffer, {
      contentType: uploadFile.type || "application/octet-stream",
      upsert: false
    });

    if (uploadError) {
      uploadWarning = `Metadata saved, but file upload failed: ${uploadError.message}`;
      storageBucket = null;
      storagePath = null;
    } else {
      await supabase
        .from("document_metadata")
        .update({ storage_bucket: storageBucket, storage_path: storagePath, updated_at: new Date().toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("id", data.id);
    }
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "document_metadata_created",
    summary: `Document metadata created for ${input.title}.`,
    payload: withAuditTrace(
      { documentId: data.id, title: input.title, documentType: input.documentType, storageBucket, storagePath },
      {
        sourceModule: "document",
        sourceRecordId: data.id,
        targetModule: "document",
        targetRecordId: data.id,
        draftOnly: input.status !== "approved"
      }
    )
  });

  return {
    ok: true,
    status: 201,
    document: mapDocument({ ...data, storage_bucket: storageBucket, storage_path: storagePath }),
    message: uploadWarning
  };
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

    return { userId: user.id, organizationId: data.organization_id, role: data.role ?? "member" };
  } catch {
    return null;
  }
}

async function countRiskRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  riskLevels: ErgonomicRiskLevel[]
) {
  const { count, error } = await supabase
    .from("ergonomic_self_assessments")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("risk_level", riskLevels);

  if (error) return 0;
  return count ?? 0;
}

async function hasRepeatedModerateErgoPattern(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  input: ErgonomicLevel1Input
) {
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("ergonomic_self_assessments")
    .select("id,location,department_trade")
    .eq("organization_id", organizationId)
    .eq("task_type", input.taskType)
    .eq("risk_level", "moderate")
    .gte("created_at", cutoff)
    .limit(10);

  if (error || !data) return false;
  const normalizedLocation = normalizeOptionalText(input.location);
  const normalizedDepartment = normalizeOptionalText(input.departmentTrade);
  const sameContext = data.filter((row) => {
    const rowLocation = normalizeOptionalText((row as Record<string, unknown>).location);
    const rowDepartment = normalizeOptionalText((row as Record<string, unknown>).department_trade);
    const locationMatches = normalizedLocation ? rowLocation === normalizedLocation : true;
    const departmentMatches = normalizedDepartment ? rowDepartment === normalizedDepartment : true;
    return locationMatches && departmentMatches;
  });
  return sameContext.length >= 2;
}

async function createErgonomicCorrectiveActionRecommendation(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: ProfileContext,
  selfAssessmentId: string,
  input: ErgonomicLevel1Input,
  riskLevel: ErgonomicRiskLevel,
  repeatedModerateFlag: boolean
) {
  const priority = riskLevel === "severe" ? "urgent" : riskLevel === "high" ? "high" : "medium";
  const title = repeatedModerateFlag
    ? `Review repeated moderate ergonomic reports - ${ergonomicLabel("task", input.taskType)}`
    : `Corrective action review - ${ergonomicLabel("task", input.taskType)} ergonomic task`;
  const dueDate = new Date(Date.now() + (priority === "urgent" ? 2 : 7) * 86400000).toISOString().slice(0, 10);

  const { data: capa } = await supabase
    .from("capa_records")
    .insert({
      organization_id: context.organizationId,
      title,
      status: "draft_human_review_required",
      owner_role: "ehs",
      due_date: dueDate,
      created_by: context.userId
    })
    .select("id")
    .single();

  if (capa?.id) {
    await supabase.from("capa_actions").insert({
      organization_id: context.organizationId,
      capa_record_id: capa.id,
      action_type: "corrective",
      title: "Review work technique, break schedule, tools, workstation setup, and Level 2 need",
      status: "open",
      owner_id: context.userId,
      due_date: dueDate
    });
  }

  const { data: task } = await supabase
    .from("tasks")
    .insert({
      organization_id: context.organizationId,
      source_module: "ergonomic_self_assessment",
      source_record_id: selfAssessmentId,
      assigned_to: context.userId,
      title,
      status: "open",
      due_date: dueDate,
      priority,
      created_by: context.userId
    })
    .select("id")
    .single();

  if (task?.id) {
    await supabase.from("notifications").insert({
      organization_id: context.organizationId,
      user_id: context.userId,
      task_id: task.id,
      notification_type: "task",
      title: "Ergonomic corrective action review",
      body: repeatedModerateFlag
        ? "Repeated moderate ergonomic screenings for the same task/context were flagged for review."
        : "High or Severe Level 1 ergonomic screening generated a corrective-action review task."
    });
  }

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "ergonomic_corrective_action_recommended",
    summary: "Ergonomic corrective-action review recommended from Level 1 screening.",
    payload: withAuditTrace(
      {
        selfAssessmentId,
        taskId: task?.id ?? null,
        capaRecordId: capa?.id ?? null,
        riskLevel,
        repeatedModerateFlag
      },
      {
        sourceModule: "ergonomic_self_assessment",
        sourceRecordId: selfAssessmentId,
        targetModule: task?.id ? "task" : "capa",
        targetRecordId: task?.id ?? capa?.id ?? selfAssessmentId,
        draftOnly: true
      }
    )
  });

  return task?.id ?? null;
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

function getFoundationSourceTarget(sourceModule: string) {
  const targets: Record<string, { label: string; href: string }> = {
    evidence_map: { label: "Evidence map", href: "/foundation#evidence-map" },
    training_assignment: { label: "Training readiness", href: "/foundation#training-drilldown" },
    equipment: { label: "Equipment readiness", href: "/foundation#equipment-drilldown" },
    incident: { label: "Incident/CAPA screening", href: "/foundation#incident-drilldown" },
    biotype_selection: { label: "BioType controls", href: "/foundation#foundation-workflows" },
    audit_readiness: { label: "Audit readiness", href: "/foundation#audit-readiness-console" },
    foundation: { label: "Foundation", href: "/foundation" }
  };

  return targets[sourceModule] ?? { label: sourceModule.replace(/_/g, " "), href: "/foundation" };
}

function getReadinessTrend(latest: number, previous?: number) {
  if (typeof previous !== "number") return "not_enough_data" as const;
  if (latest > previous) return "improving" as const;
  if (latest < previous) return "declining" as const;
  return "steady" as const;
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
    draftOnly: true
  };
}

function demoTrainingMatrixSummary(): TrainingMatrixSummary {
  const demo = demoIntelligenceFoundationSummary();
  const biotypeRequirements = canonicalBioTypeFoundations.slice(0, 4).map((foundation) => ({
    biotype: foundation.name,
    training: foundation.training.slice(0, 4)
  }));
  const rows = [
    {
      id: "demo-training-biosafety",
      requirement: "Annual Biosafety Training",
      source: "BioType requirement",
      ownerRole: "biosafety_officer",
      documentTitle: "Biosafety Manual",
      documentHref: "/documents/doc-sterility-001",
      assignmentStatus: "expired",
      dueDate: "2026-05-15",
      expiryDate: "2026-05-15T00:00:00.000Z",
      evidenceLabel: "Evidence needed",
      readiness: "Expired" as const
    },
    {
      id: "demo-training-aseptic",
      requirement: "Aseptic Technique Training",
      source: "Document change impact",
      ownerRole: "qa",
      documentTitle: "Sterility Assay Review SOP",
      documentHref: "/documents/doc-sterility-001",
      assignmentStatus: "assigned",
      dueDate: "2026-06-15",
      expiryDate: null,
      evidenceLabel: "Evidence needed",
      readiness: "Needs review" as const
    },
    {
      id: "demo-training-chain",
      requirement: "Sample Chain-of-Custody Training",
      source: "Controlled record linkage",
      ownerRole: "responsible_scientist",
      documentTitle: "Critical Sample Chain of Custody",
      documentHref: "/documents/doc-chain-001",
      assignmentStatus: "completed",
      dueDate: null,
      expiryDate: "2026-12-31T00:00:00.000Z",
      evidenceLabel: "Evidence linked",
      readiness: "Current" as const
    }
  ];

  return {
    counts: [
      { label: "Training requirements", value: rows.length },
      { label: "Current", value: 1 },
      { label: "Needs review", value: 1 },
      { label: "Expired", value: 1 },
      { label: "Missing", value: 0 },
      { label: "Change impacts", value: demo.changes.length }
    ],
    readinessScore: demo.readiness.trainingScore,
    rows,
    changeImpacts: demo.changes.slice(0, 4).map((change, index) => ({
      id: `demo-change-${index}`,
      type: change.type,
      summary: change.summary,
      trainingImpacts: change.actions.split(", ").filter(Boolean).slice(0, 3),
      status: "draft_human_review_required"
    })),
    biotypeRequirements,
    guardrailText: "AI may identify training impact and draft recommendations, but training completion and competency remain human-validated."
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
            ownerRole: "quality_unit"
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

function normalizeFoundationEvidenceStatus(status: string): FoundationEvidenceStatus {
  return foundationEvidenceStatuses.includes(status as FoundationEvidenceStatus) ? (status as FoundationEvidenceStatus) : "review_needed";
}

function normalizeFoundationTaskStatus(status: string) {
  return ["in_progress", "complete", "blocked"].includes(status) ? (status as "in_progress" | "complete" | "blocked") : null;
}

function isFoundationGapStatus(status: unknown) {
  return ["review_needed", "missing", "expired", "open", "out_of_tolerance", "gap", "gaps"].includes(String(status ?? "").toLowerCase());
}

function trainingReadinessFromStatus(status: string): TrainingMatrixRow["readiness"] {
  if (status === "completed" || status === "waived") return "Current";
  if (status === "expired") return "Expired";
  if (status === "assigned") return "Needs review";
  return "Missing";
}

function calculateTrainingMatrixReadiness(rows: TrainingMatrixRow[]) {
  if (rows.length === 0) return 0;
  const total = rows.reduce((sum, row) => {
    if (row.readiness === "Current") return sum + 100;
    if (row.readiness === "Needs review") return sum + 60;
    if (row.readiness === "Expired") return sum + 25;
    return sum;
  }, 0);
  return Math.round(total / rows.length);
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

function summarizeJson(value: unknown) {
  if (Array.isArray(value)) return value.slice(0, 3).join(", ") || "none";
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 3);
    return entries.map(([key, item]) => `${key}: ${String(item)}`).join(", ");
  }
  if (value == null) return "none";
  return String(value);
}

function normalizeBioTypeKeys(value: unknown): BioTypeKey[] {
  const rawValues = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return rawValues.map((item) => normalizeBioTypeKey(String(item))).filter((item): item is BioTypeKey => Boolean(item));
}

function normalizeTaskType(value: unknown): ErgonomicTaskType {
  const allowed: ErgonomicTaskType[] = ["lifting", "pushing_pulling", "reaching_overhead", "repetitive_work", "other"];
  return allowed.includes(value as ErgonomicTaskType) ? (value as ErgonomicTaskType) : "lifting";
}

function mapLevel2Recent(rows: unknown[]) {
  return ((rows as Record<string, any>[]) ?? []).map((row) => ({
    id: row.id,
    taskType: ergonomicLabel("task", row.task_type ?? "other"),
    status: row.status,
    riskSummary: row.risk_summary,
    createdAt: row.created_at
  }));
}

function programMethodRequired(programName: string, methodName: string) {
  if (["AI Guardrail", "Audit Evidence", "Change Impact"].includes(methodName)) return true;
  if (programName.includes("Training")) return ["Training Gap", "Control Verification"].includes(methodName);
  if (programName.includes("CAPA") || programName.includes("Incident")) return ["Incident Screening", "CAPA Screening"].includes(methodName);
  if (programName.includes("Equipment")) return ["Risk Assessment", "Control Verification"].includes(methodName);
  if (programName.includes("Document")) return ["Document Gap", "Control Verification"].includes(methodName);
  return ["Risk Assessment", "Document Gap", "Training Gap"].includes(methodName);
}

function demoIntelligenceFoundationSummary(): IntelligenceFoundationSummary {
  const demo = northStarFoundationDemo();
  const biotypeContext = buildBioTypeAiContext("rd_biotech", ["diagnostics_clinical_lab", "academic_university_research"]);
  const assessmentInput = applyBioTypeContext(demo.aiInput, biotypeContext);

  return {
    companyName: "NorthStar BioLabs",
    counts: [
      { label: "Intake templates", value: 1 },
      { label: "Intake responses", value: Object.keys(demo.answers).length },
      { label: "Programs", value: foundationProgramNames.length },
      { label: "Methods", value: foundationMethodNames.length },
      { label: "Applicability rules", value: defaultApplicabilityRules.length },
      { label: "Evidence items", value: demo.evidence.length },
      { label: "Change impacts", value: demo.changes.length },
      { label: "Readiness scores", value: 1 },
      { label: "BioTypes", value: canonicalBioTypeFoundations.length },
      { label: "BioType selections", value: 1 },
      { label: "BioType rules", value: canonicalBioTypeFoundations.length }
    ],
    coreComponents: coreComplianceComponents,
    biotypes: canonicalBioTypeFoundations.map((foundation) => ({
      key: foundation.key,
      name: foundation.name,
      focus: foundation.focus,
      role:
        foundation.key === "rd_biotech"
          ? "primary"
          : ["diagnostics_clinical_lab", "academic_university_research"].includes(foundation.key)
            ? "secondary"
            : "available",
      requirements: [...foundation.documents.slice(0, 2), ...foundation.training.slice(0, 2)].join(", ")
    })),
    biotypeSelection: {
      primaryBioType: "rd_biotech",
      secondaryBioTypes: ["diagnostics_clinical_lab", "academic_university_research"],
      status: "draft_human_review_required"
    },
    intake: [
      { question: "hazardousChemicals", answer: "true", booleanValue: true, triggers: "Chemical Hygiene, Waste Management" },
      { question: "biologicalMaterials", answer: "true", booleanValue: true, triggers: "Biosafety, Waste Management" },
      { question: "humanDerivedSamples", answer: "true", booleanValue: true, triggers: "Bloodborne Pathogens, Incident/Exposure Response" },
      { question: "bscUsed", answer: "true", booleanValue: true, triggers: "Equipment/Calibration, Biosafety" }
    ],
    programs: foundationProgramNames.slice(0, 8).map((name) => ({
      name,
      status: "draft_human_review_required",
      owner: name.includes("Biosafety") || name.includes("Bloodborne") ? "biosafety_officer" : "qa"
    })),
    methods: foundationMethodNames.slice(0, 8).map((name) => ({
      name,
      type: "deterministic",
      purpose: `${name} method keeps AI outputs draft-only and source-backed.`
    })),
    applicability: demo.applicability.triggeredRules.map((rule) => ({
      rule: `${rule.ruleCode}: ${rule.name}`,
      required: rule.requiredPrograms.join(", "),
      reviewer: rule.humanReviewerRole
    })),
    evidence: demo.evidence.slice(0, 8).map((item) => ({
      requirement: item.requirementName,
      status: item.evidenceStatus,
      auditReady: item.auditReady
    })),
    changes: demo.changes.map((change) => ({
      type: change.changeType,
      summary: change.impactSummary,
      actions: change.recommendedActions.slice(0, 3).join(", ")
    })),
    readiness: {
      overallScore: demo.readiness.overallScore,
      documentsScore: demo.readiness.documentsScore,
      trainingScore: demo.readiness.trainingScore,
      capaScore: demo.readiness.capaScore,
      incidentsScore: demo.readiness.incidentsScore,
      equipmentScore: demo.readiness.equipmentScore,
      evidenceScore: demo.readiness.evidenceScore,
      topGaps: demo.readiness.topGaps
    },
    auditReadinessNotes: [],
    aiWorkflow: aiWorkflowSteps,
    humanValidationWorkflow: humanValidationWorkflowSteps,
    guardrailText: draftAiRecommendationGuardrail,
    latestAssessmentInput: assessmentInput
  };
}

function demoMapOperationsSummary(): MapOperationsSummary {
  const latestAssessmentInput: BioAiInput = {
    siteId: "demo-site",
    labId: "demo-lab",
    siteName: "Demo Biotech Site",
    area: "QC Microbiology Lab",
    workflow: "Map-aligned biosafety readiness review",
    controlEffectiveness: "partial",
    dataCompleteness: 0.72,
    trainingStatus: "expired",
    documentReadiness: "gaps",
    equipmentStatus: "out_of_tolerance",
    auditReadinessStatus: "missing",
    incidentContext: {
      incidentId: "demo-incident",
      status: "investigating",
      severity: "high",
      capaRequired: true,
      repeatPattern: true
    },
    sampleMaterialContext: {
      sampleId: "demo-sample",
      chainOfCustodyStatus: "gap",
      storageConditionStatus: "unknown"
    },
    referenceRuleIds: ["demo-reference-rule"],
    sourceRecords: [
      { module: "lab", recordId: "demo-lab", label: "QC Microbiology Lab" },
      { module: "reference_rule", recordId: "demo-reference-rule", label: "BBP/SOP review rule" },
      { module: "incident", recordId: "demo-incident", label: "Demo biosafety deviation" },
      { module: "equipment", recordId: "demo-equipment", label: "BSC-001" },
      { module: "sample", recordId: "demo-sample", label: "SAMPLE-001" }
    ],
    signals: [
      {
        type: "biosafety_event",
        label: "Demo map-derived biosafety deviation",
        severity: "high",
        evidence: "Demo incident links SOP, training, equipment, sample, CAPA, and audit evidence review.",
        referenceRuleIds: ["demo-reference-rule"]
      },
      {
        type: "equipment_event",
        label: "Demo equipment certification impact",
        severity: "medium",
        evidence: "Equipment status is mapped as out-of-tolerance until human review."
      },
      {
        type: "sample_chain_of_custody",
        label: "Demo sample traceability gap",
        severity: "medium",
        evidence: "Sample chain-of-custody verification is incomplete."
      }
    ]
  };

  return {
    counts: [
      { label: "Sites", value: 1 },
      { label: "Labs", value: 1 },
      { label: "Rules", value: 1 },
      { label: "Training", value: 1 },
      { label: "Incidents", value: 1 },
      { label: "CAPA", value: 1 },
      { label: "Equipment", value: 1 },
      { label: "Samples", value: 1 },
      { label: "Audits", value: 1 },
      { label: "Tasks", value: 1 }
    ],
    readiness: [
      {
        module: "Document + reference rules",
        title: "BBP/SOP review rule",
        status: "gaps",
        detail: "Demo reference rule triggers document and training review."
      },
      {
        module: "Training",
        title: "Annual biosafety training",
        status: "expired",
        detail: "Demo training is intentionally expired to exercise AI readiness logic."
      },
      {
        module: "Incident/CAPA",
        title: "Demo biosafety deviation",
        status: "investigating",
        detail: "Demo incident triggers CAPA screening and audit evidence review."
      },
      {
        module: "Equipment/sample traceability",
        title: "BSC-001 / SAMPLE-001",
        status: "out_of_tolerance",
        detail: "Demo equipment and sample records feed impact and traceability context."
      }
    ],
    latestAssessmentInput
  };
}

function demoErgonomicRecord(
  id: string,
  taskType: ErgonomicTaskType,
  riskLevel: ErgonomicRiskLevel,
  riskScore: number,
  location: string
): ErgonomicSelfAssessmentRecord {
  return {
    id,
    taskType,
    taskTypeLabel: ergonomicLabel("task", taskType),
    discomfortLevel: riskLevel === "high" ? "very_tiring" : "somewhat_tiring",
    bodyParts: riskLevel === "high" ? ["shoulders", "hands_wrists"] : ["back"],
    frequency: riskLevel === "high" ? "often" : "sometimes",
    comments: "Demo ergonomic Level 1 screening.",
    location,
    departmentTrade: "Pilot team",
    riskScore,
    riskLevel,
    escalationStatus: riskLevel === "high" ? "supervisor_review_recommended" : "monitor",
    repeatedModerateFlag: false,
    correctiveActionRecommended: riskLevel === "high",
    createdAt: new Date().toISOString()
  };
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
    humanReviewStatus: assessment.humanReviewRequired ? "draft_human_review_required" : "reviewed_monitoring",
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
      productQualityImpactPotential: true,
      gxpImpact: true,
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

function mapErgonomicRecord(row: Record<string, any>): ErgonomicSelfAssessmentRecord {
  return {
    id: row.id,
    taskType: row.task_type,
    taskTypeLabel: ergonomicLabel("task", row.task_type),
    discomfortLevel: row.discomfort_level,
    bodyParts: row.body_parts ?? [],
    frequency: row.frequency,
    comments: row.comments,
    location: row.location,
    departmentTrade: row.department_trade,
    riskScore: row.risk_score,
    riskLevel: row.risk_level,
    escalationStatus: row.escalation_status,
    repeatedModerateFlag: Boolean(row.repeated_moderate_flag),
    correctiveActionRecommended: Boolean(row.corrective_action_recommended),
    createdAt: row.created_at
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
