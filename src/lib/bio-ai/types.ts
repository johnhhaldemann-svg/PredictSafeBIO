export type BioRiskLevel = "low" | "moderate" | "high" | "critical";
export type BioAiConfidence = "low" | "medium" | "high";
export type HumanReviewStatus =
  | "draft_human_review_required"
  | "in_review"
  | "reviewed_needs_action"
  | "reviewed_monitoring"
  | "routine_monitoring";

export type BioSignalType =
  | "deviation"
  | "capa"
  | "change_control"
  | "audit_finding"
  | "training_gap"
  | "sop_gap"
  | "biosafety_event"
  | "contamination_event"
  | "environmental_monitoring"
  | "equipment_event"
  | "ergonomic_risk_signal"
  | "sample_chain_of_custody"
  | "data_integrity"
  | "batch_record"
  | "assay_qc"
  | "supplier_material"
  | "clinical_study"
  | "regulatory_commitment";

export type DriverCategory =
  | "severity"
  | "likelihood"
  | "scope"
  | "controls"
  | "data_integrity"
  | "biosafety"
  | "quality"
  | "regulatory"
  | "training"
  | "equipment"
  | "sample"
  | "pattern";

export type ReviewOwnerRole =
  | "responsible_scientist"
  | "principal_investigator"
  | "qa"
  | "quality_unit"
  | "biosafety_officer"
  | "ehs"
  | "manufacturing_lead"
  | "validation_lead"
  | "regulatory_affairs"
  | "clinical_operations";

export type RecommendedActionType =
  | "hold_or_quarantine_review"
  | "containment_review"
  | "qa_review"
  | "deviation_or_capa"
  | "change_control"
  | "training_review"
  | "equipment_review"
  | "sample_review"
  | "documentation_review"
  | "monitoring";

export type BioSourceModule =
  | "company_profile"
  | "foundation"
  | "biotype_foundation"
  | "biotype_selection"
  | "intake"
  | "applicability_rule"
  | "compliance_program"
  | "compliance_method"
  | "evidence_map"
  | "change_impact"
  | "audit_readiness"
  | "site"
  | "lab"
  | "reference_rule"
  | "document"
  | "training"
  | "biosafety"
  | "incident"
  | "capa"
  | "equipment"
  | "sample"
  | "material"
  | "chemical"
  | "waste"
  | "audit"
  | "task"
  | "inspection"
  | "ergonomic_self_assessment"
  | "ergonomic_advanced_evaluation";

export type BioSourceRecord = {
  module: BioSourceModule;
  recordId?: string | null;
  label?: string | null;
};

export type MapDerivedStatus =
  | "current"
  | "complete"
  | "ready"
  | "partial"
  | "gap"
  | "gaps"
  | "missing"
  | "expired"
  | "out_of_tolerance"
  | "excursion"
  | "open"
  | "repeat"
  | "unknown";

export type IncidentContext = {
  incidentId?: string | null;
  status?: "open" | "investigating" | "contained" | "closed" | "unknown" | null;
  severity?: number | string | null;
  capaRequired?: boolean | null;
  repeatPattern?: boolean | null;
};

export type SampleMaterialContext = {
  sampleId?: string | null;
  materialId?: string | null;
  chainOfCustodyStatus?: MapDerivedStatus | null;
  storageConditionStatus?: MapDerivedStatus | null;
  wasteStatus?: MapDerivedStatus | null;
};

export type FoundationAiContext = {
  applicablePrograms: string[];
  requiredDocuments: string[];
  requiredTraining: string[];
  requiredEvidence: string[];
  evidenceGaps: string[];
  changeImpactSummaries: string[];
  auditReadinessScore: number;
  bioriskRuleDrivers: string[];
  sourceRecords: BioSourceRecord[];
  referenceRuleIds: string[];
};

export type BioTypeContextFields = {
  primaryBioType?: string | null;
  secondaryBioTypes?: string[] | null;
  biotypePrograms?: string[] | null;
  biotypeDocuments?: string[] | null;
  biotypeRecords?: string[] | null;
  biotypeTraining?: string[] | null;
  biotypeRiskDrivers?: string[] | null;
};

export type BioAiSignal = {
  id?: string | null;
  type: BioSignalType;
  label: string;
  area?: string | null;
  program?: string | null;
  productCandidate?: string | null;
  batchOrLot?: string | null;
  sampleId?: string | null;
  assay?: string | null;
  equipmentId?: string | null;
  severity?: number | string | null;
  likelihood?: number | string | null;
  scope?: number | string | null;
  controlGap?: number | string | null;
  dataIntegrityConcern?: number | string | null;
  status?: string | null;
  dueDate?: string | null;
  overdue?: boolean | null;
  repeatFinding?: boolean | null;
  patientImpactPotential?: boolean | null;
  productQualityImpactPotential?: boolean | null;
  biosafetyImpactPotential?: boolean | null;
  regulatoryImpactPotential?: boolean | null;
  gxpImpact?: boolean | null;
  controls?: string[] | null;
  evidence?: string | null;
  sourceRecords?: BioSourceRecord[] | null;
  referenceRuleIds?: string[] | null;
  detectability?: number | string | null;
};

export type BioAiInput = BioTypeContextFields & {
  organizationId?: string | null;
  siteId?: string | null;
  labId?: string | null;
  siteName?: string | null;
  area?: string | null;
  workflow?: string | null;
  program?: string | null;
  productCandidate?: string | null;
  batchOrLot?: string | null;
  studyId?: string | null;
  sampleId?: string | null;
  assay?: string | null;
  equipment?: string[] | null;
  materials?: string[] | null;
  processStage?: string | null;
  controlEffectiveness?: "missing" | "ineffective" | "partial" | "effective" | "unknown" | null;
  dataCompleteness?: number | null;
  missingData?: string[];
  signals?: BioAiSignal[];
  patientImpactPotential?: boolean | null;
  productQualityImpactPotential?: boolean | null;
  biosafetyImpactPotential?: boolean | null;
  regulatoryImpactPotential?: boolean | null;
  gxpImpact?: boolean | null;
  missingRequiredTraining?: boolean | null;
  missingRequiredSop?: boolean | null;
  missingQaReview?: boolean | null;
  missingBiosafetyReview?: boolean | null;
  missingDeviationOrCapa?: boolean | null;
  unapprovedChange?: boolean | null;
  outOfToleranceEquipment?: boolean | null;
  chainOfCustodyGap?: boolean | null;
  contaminationSuspected?: boolean | null;
  sourceRecords?: BioSourceRecord[] | null;
  referenceRuleIds?: string[] | null;
  trainingStatus?: MapDerivedStatus | null;
  equipmentStatus?: MapDerivedStatus | null;
  documentReadiness?: MapDerivedStatus | null;
  incidentContext?: IncidentContext | null;
  sampleMaterialContext?: SampleMaterialContext | null;
  auditReadinessStatus?: MapDerivedStatus | null;
  detectability?: number | string | null;
  foundationContext?: FoundationAiContext | null;
};

export type BioAiAssessment = {
  score: number;
  level: BioRiskLevel;
  confidence: BioAiConfidence;
  topDrivers: Array<{
    label: string;
    category: DriverCategory;
    impact: "low" | "medium" | "high" | "critical";
    explanation: string;
  }>;
  missingInformation: string[];
  criticalControlGaps: string[];
  recommendedActions: Array<{
    title: string;
    priority: "low" | "medium" | "high" | "urgent";
    ownerRole: ReviewOwnerRole;
    actionType: RecommendedActionType;
    reason: string;
    sourceRecords: BioSourceRecord[];
    referenceRuleIds: string[];
  }>;
  sourceTrace: {
    sourceRecords: BioSourceRecord[];
    referenceRuleIds: string[];
  };
  explanation: string;
  escalationRequired: boolean;
  holdOrQuarantineReviewRecommended: boolean;
  humanReviewRequired: boolean;
  humanReviewReason: string | null;
  actionTimeframe: "routine" | "same_day" | "before_continuing" | "immediate";
  doNotClaim: string[];
};

export type CompanyProfile = {
  id?: string;
  organizationId?: string;
  companyName: string;
  primarySite: string;
  operatingAreas: string[];
  programs: string[];
  qualitySystemScope: string[];
  biosafetyLevels: string[];
  reviewOwnerRoles: ReviewOwnerRole[];
  documentFamilies: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type DocumentMetadata = {
  id?: string;
  organizationId?: string;
  title: string;
  documentType: "sop" | "batch_record" | "protocol" | "training" | "validation" | "policy" | "other";
  status: "draft" | "in_review" | "approved" | "obsolete" | "unknown";
  ownerRole: ReviewOwnerRole;
  area?: string | null;
  relatedProcess?: string | null;
  revision?: string | null;
  effectiveDate?: string | null;
  nextReviewDate?: string | null;
  lastReviewedAt?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  gaps?: string[];
};

export type DocumentGapRecommendation = {
  documentId?: string;
  title: string;
  severity: BioRiskLevel;
  reason: string;
  recommendedOwner: ReviewOwnerRole;
  draftOnly: true;
  humanReviewRequired: true;
};

export type DocumentUpdateRecommendation = {
  documentId?: string;
  title: string;
  proposedChange: string;
  rationale: string;
  label: "Draft - Human Review Required";
  ownerRole: ReviewOwnerRole;
};

export type AuditEvent = {
  id?: string;
  organizationId?: string;
  actorId?: string | null;
  eventType:
    | "assessment_run"
    | "assessment_saved"
    | "account_profile_updated"
    | "company_profile_updated"
    | "document_metadata_created"
    | "document_metadata_updated"
    | "document_recommendation_generated"
    | "human_review_status_changed"
    | "demo_seed_created"
    | "map_operations_bundle_created"
    | "intelligence_foundation_seeded"
    | "intelligence_foundation_evaluated"
    | "change_impact_generated"
    | "audit_readiness_score_generated"
    | "foundation_biotype_selection_updated"
    | "foundation_intake_response_updated"
    | "foundation_evidence_readiness_updated"
    | "foundation_audit_readiness_note_added"
    | "foundation_review_actions_generated"
    | "foundation_review_task_status_updated"
    | "foundation_review_task_note_added"
    | "foundation_source_resolution_refreshed"
    | "foundation_starter_records_created"
    | "ergonomic_self_assessment_submitted"
    | "ergonomic_advanced_evaluation_requested"
    | "ergonomic_corrective_action_recommended"
    | "ergonomic_level2_inspection_created"
    | "ergonomic_level2_inspection_submitted"
    | "ergonomic_level2_corrective_action_recommended";
  summary: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
};
// ---------------------------------------------------------------------------
// AI Knowledge Review types (ai_knowledge_entries table)
// ---------------------------------------------------------------------------

export type AiKnowledgeType =
  | "assessment_input"
  | "foundation_context"
  | "risk_signal"
  | "biotype_context"
  | "applicability_rule"
  | "evidence_map"
  | "change_impact"
  | "reference_rule"
  | "ergonomic_assessment"
  | "document_analysis"
  | "other";

export type AiKnowledgeQuality =
  | "validated_knowledge"
  | "reasonable_knowledge"
  | "low_quality"
  | "junk";

export type AiKnowledgeReviewStatus = "pending" | "approved" | "flagged" | "rejected";

export type AiKnowledgeReviewDecision = {
  entryId: string;
  reviewStatus: AiKnowledgeReviewStatus;
  qualityClassification?: AiKnowledgeQuality | null;
  reviewNotes?: string | null;
  excludedFromEngine?: boolean;
};

export type AiKnowledgeEntry = {
  id: string;
  organizationId: string;
  knowledgeType: AiKnowledgeType;
  sourceModule?: string | null;
  sourceRecordId?: string | null;
  label: string;
  contentSummary: string;
  contentJson?: Record<string, unknown>;
  aiRiskLevel?: "low" | "moderate" | "high" | "critical" | null;
  aiConfidence?: "low" | "medium" | "high" | null;
  aiHumanReviewRequired: boolean;
  submittedBy?: string | null;
  submittedAt: string;
  reviewStatus: AiKnowledgeReviewStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  qualityClassification?: AiKnowledgeQuality | null;
  excludedFromEngine?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AiKnowledgeReviewSummary = {
  totalEntries: number;
  pendingCount: number;
  approvedCount: number;
  flaggedCount: number;
  rejectedCount: number;
  junkCount: number;
  humanReviewRequiredCount: number;
};
