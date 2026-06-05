/**
 * Continuous Risk Scoring Service
 *
 * Bridges the data modules (inspections, chemicals, training) to the
 * bio-ai engine. Every write path that creates a safety-relevant record
 * calls one of these functions, which:
 *   1. Builds a BioAiInput from the record's data
 *   2. Calls assessBioRisk() to get a scored assessment
 *   3. Upserts the result into risk_cells for the Risk Command Center
 *
 * No circular imports — this file only imports from bio-ai and supabase/server.
 * Service files import FROM here; this file never imports FROM them.
 */

import { assessBioRisk } from "@/lib/bio-ai/engine";
import type { BioAiAssessment, BioAiInput, BioAiSignal, BioSignalType } from "@/lib/bio-ai/types";
import { createSupabaseServerClient } from "./server";

// ---------------------------------------------------------------------------
// Internal severity / cell-type mapping
// ---------------------------------------------------------------------------

type CellSeverity = "low" | "medium" | "high" | "critical";
type CellType =
  | "precursor_cell"
  | "control_cell"
  | "failure_cell"
  | "behavior_cell"
  | "event_cell"
  | "improvement_cell";

function levelToSeverity(level: BioAiAssessment["level"]): CellSeverity {
  if (level === "critical") return "critical";
  if (level === "high") return "high";
  if (level === "moderate") return "medium";
  return "low";
}

function assessmentToCellType(assessment: BioAiAssessment): CellType {
  if (assessment.holdOrQuarantineReviewRecommended) return "failure_cell";
  if (assessment.level === "critical" || assessment.level === "high") return "failure_cell";
  if (assessment.escalationRequired) return "event_cell";
  if (assessment.level === "moderate") return "control_cell";
  return "precursor_cell";
}

// ---------------------------------------------------------------------------
// Core write helper
// ---------------------------------------------------------------------------

/**
 * Run assessBioRisk and upsert the scored result into risk_cells.
 * Idempotent: uses (linked_record_type, linked_record_id) as the upsert key.
 * Safe to call multiple times — will update severity/payload if the record changes.
 */
export async function scoreAndWriteRiskCell(params: {
  organizationId: string;
  label: string;
  linkedRecordType: string;
  linkedRecordId: string;
  input: BioAiInput;
  extraPayload?: Record<string, unknown>;
  createdBy?: string | null;
}): Promise<BioAiAssessment> {
  const assessment = assessBioRisk(params.input);
  const severity = levelToSeverity(assessment.level);
  const cellType = assessmentToCellType(assessment);

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("risk_cells").upsert(
      {
        organization_id: params.organizationId,
        cell_type: cellType,
        label: params.label,
        severity,
        linked_record_type: params.linkedRecordType,
        linked_record_id: params.linkedRecordId,
        payload: {
          ...params.extraPayload,
          // AI assessment metadata stored in payload for the review dashboard
          ai_score: assessment.score,
          ai_level: assessment.level,
          ai_confidence: assessment.confidence,
          ai_action_timeframe: assessment.actionTimeframe,
          ai_human_review_required: assessment.humanReviewRequired,
          ai_human_review_reason: assessment.humanReviewReason,
          ai_escalation_required: assessment.escalationRequired,
          ai_top_drivers: assessment.topDrivers.slice(0, 4).map((d) => d.label),
          ai_recommended_actions: assessment.recommendedActions
            .slice(0, 3)
            .map((a) => ({ title: a.title, owner: a.ownerRole, type: a.actionType })),
          ai_critical_control_gaps: assessment.criticalControlGaps.slice(0, 3),
          ai_explanation: assessment.explanation,
          scored_at: new Date().toISOString(),
        },
        status: "active",
        created_by: params.createdBy ?? null,
      },
      { onConflict: "linked_record_type,linked_record_id" }
    );
  } catch {
    // Never block the parent write operation — scoring is best-effort
  }

  return assessment;
}

/**
 * Resolve a risk cell — called when a finding is closed, training is completed,
 * a chemical is archived, etc.
 */
export async function resolveRiskCell(params: {
  organizationId: string;
  linkedRecordType: string;
  linkedRecordId: string;
  resolveLabel?: string;
}): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const update: Record<string, unknown> = {
      status: "resolved",
      updated_at: new Date().toISOString(),
    };
    if (params.resolveLabel) {
      update.label = params.resolveLabel;
      update.cell_type = "improvement_cell";
    }
    await supabase
      .from("risk_cells")
      .update(update)
      .eq("organization_id", params.organizationId)
      .eq("linked_record_type", params.linkedRecordType)
      .eq("linked_record_id", params.linkedRecordId);
  } catch {
    // Best-effort — never block the parent write
  }
}

// ---------------------------------------------------------------------------
// Inspection Finding Scoring
// ---------------------------------------------------------------------------

export type InspectionFindingScoreParams = {
  finding: {
    id: string;
    findingLevel: "observation" | "minor" | "major" | "critical";
    title: string;
    auditId: string;
  };
  inspection: {
    id: string;
    auditType: string;
    title: string;
  };
  organizationId: string;
  userId?: string | null;
};

/** Map finding level to a 1-5 severity score for the bio-ai engine. */
const findingLevelSeverity: Record<string, number> = {
  observation: 1,
  minor: 2,
  major: 4,
  critical: 5,
};

/** Map inspection type → best-fit BioSignalType. */
function inspectionTypeToSignal(auditType: string): BioSignalType {
  if (["biosafety", "lab_safety", "bloodborne_pathogens", "spill_kit"].includes(auditType))
    return "biosafety_event";
  if (["equipment", "loto"].includes(auditType)) return "equipment_event";
  if (["training_records"].includes(auditType)) return "training_gap";
  if (["chemical_hygiene", "waste_management", "waste_disposal"].includes(auditType))
    return "contamination_event";
  return "audit_finding";
}

export async function scoreInspectionFinding(
  params: InspectionFindingScoreParams
): Promise<void> {
  const { finding, inspection, organizationId, userId } = params;
  const severity = findingLevelSeverity[finding.findingLevel] ?? 2;
  const signalType = inspectionTypeToSignal(inspection.auditType);

  const isBiosafety = signalType === "biosafety_event";
  const isEquipment = signalType === "equipment_event";
  const isTraining = signalType === "training_gap";

  const signal: BioAiSignal = {
    id: finding.id,
    type: signalType,
    label: finding.title,
    severity,
    likelihood: severity,
    controlGap: finding.findingLevel === "critical" ? 5 : finding.findingLevel === "major" ? 4 : 2,
    biosafetyImpactPotential: isBiosafety,
    evidence: finding.title,
    sourceRecords: [{ module: "inspection", recordId: finding.id, label: finding.title }],
  };

  const input: BioAiInput = {
    organizationId,
    area: inspection.title,
    workflow: inspection.auditType,
    biosafetyImpactPotential: isBiosafety,
    outOfToleranceEquipment:
      isEquipment &&
      (finding.findingLevel === "major" || finding.findingLevel === "critical"),
    missingRequiredTraining: isTraining,
    controlEffectiveness:
      finding.findingLevel === "critical"
        ? "missing"
        : finding.findingLevel === "major"
        ? "ineffective"
        : finding.findingLevel === "minor"
        ? "partial"
        : "effective",
    signals: [signal],
    sourceRecords: [{ module: "audit", recordId: inspection.id, label: inspection.title }],
  };

  const levelLabel =
    finding.findingLevel.charAt(0).toUpperCase() + finding.findingLevel.slice(1);

  await scoreAndWriteRiskCell({
    organizationId,
    label: `Inspection [${levelLabel}]: ${finding.title}`,
    linkedRecordType: "audit_findings",
    linkedRecordId: finding.id,
    input,
    extraPayload: {
      audit_id: inspection.id,
      finding_level: finding.findingLevel,
      inspection_type: inspection.auditType,
    },
    createdBy: userId,
  });
}

// ---------------------------------------------------------------------------
// Chemical Record Scoring
// ---------------------------------------------------------------------------

export type ChemicalScoreParams = {
  chemical: {
    id: string;
    chemicalName: string;
    hazardClass?: string | null;
    storageLocation?: string | null;
    ppeRequired?: string[] | null;
    spillResponseNotes?: string | null;
    restricted?: boolean;
    sdsPresent: boolean;
    expired: boolean;
    expiringSoon: boolean;
  };
  organizationId: string;
  userId?: string | null;
};

const hazardSeverity: Record<string, number> = {
  explosive: 5,
  toxic: 5,
  corrosive: 4,
  oxidizer: 4,
  flammable: 3,
  compressed_gas: 3,
  health_hazard: 3,
  environmental: 2,
  irritant: 2,
  other: 1,
};

export async function scoreChemicalRecord(params: ChemicalScoreParams): Promise<void> {
  const { chemical, organizationId, userId } = params;
  const hazardScore = hazardSeverity[chemical.hazardClass ?? "other"] ?? 2;
  const hasControlGap = !chemical.sdsPresent;
  const isExpired = chemical.expired;
  const isHighHazard = ["toxic", "explosive", "corrosive", "oxidizer"].includes(
    chemical.hazardClass ?? ""
  );

  const likelihood = isExpired ? hazardScore : hasControlGap ? hazardScore - 1 : 1;
  const controlGap = hasControlGap ? 5 : isExpired ? 4 : 1;

  // Build a label that captures the actual risk condition
  const conditions: string[] = [];
  if (!chemical.sdsPresent) conditions.push("SDS missing");
  if (chemical.expired) conditions.push("expired");
  if (chemical.expiringSoon) conditions.push("expiring soon");
  if (chemical.restricted) conditions.push("restricted");
  const conditionStr = conditions.length > 0 ? ` — ${conditions.join(", ")}` : "";

  const signal: BioAiSignal = {
    id: chemical.id,
    type: isHighHazard ? "biosafety_event" : "contamination_event",
    label: `${chemical.chemicalName}${conditionStr}`,
    severity: hazardScore,
    likelihood,
    controlGap,
    biosafetyImpactPotential: isHighHazard || (chemical.restricted ?? false),
    controls: chemical.ppeRequired ?? [],
    evidence: chemical.spillResponseNotes ?? undefined,
    sourceRecords: [{ module: "chemical", recordId: chemical.id, label: chemical.chemicalName }],
  };

  const input: BioAiInput = {
    organizationId,
    area: chemical.storageLocation ?? undefined,
    workflow: "chemical management",
    biosafetyImpactPotential: isHighHazard || (chemical.restricted ?? false),
    controlEffectiveness: hasControlGap ? "missing" : isExpired ? "ineffective" : "effective",
    missingRequiredSop: !chemical.sdsPresent,
    signals: [signal],
    sourceRecords: [{ module: "chemical", recordId: chemical.id, label: chemical.chemicalName }],
  };

  await scoreAndWriteRiskCell({
    organizationId,
    label: `Chemical: ${chemical.chemicalName}${conditionStr}`,
    linkedRecordType: "chemical_inventory",
    linkedRecordId: chemical.id,
    input,
    extraPayload: {
      chemical_name: chemical.chemicalName,
      hazard_class: chemical.hazardClass,
      storage_location: chemical.storageLocation,
      sds_present: chemical.sdsPresent,
      expired: chemical.expired,
    },
    createdBy: userId,
  });
}

// ---------------------------------------------------------------------------
// Training Gap Scoring
// ---------------------------------------------------------------------------

export type TrainingGapScoreParams = {
  requirementId: string;
  assignmentId: string;
  title: string;
  roleKey?: string | null;
  dueDateStr?: string | null;
  organizationId: string;
  userId?: string | null;
};

export async function scoreTrainingGap(params: TrainingGapScoreParams): Promise<void> {
  const { requirementId, assignmentId, title, roleKey, dueDateStr, organizationId, userId } =
    params;

  const now = new Date();
  const isOverdue = dueDateStr ? new Date(dueDateStr) < now : false;

  const signal: BioAiSignal = {
    id: requirementId,
    type: "training_gap",
    label: `Training gap: ${title}`,
    severity: isOverdue ? 4 : 2,
    likelihood: isOverdue ? 3 : 2,
    overdue: isOverdue,
    sourceRecords: [{ module: "training", recordId: requirementId, label: title }],
  };

  const input: BioAiInput = {
    organizationId,
    workflow: "training compliance",
    area: roleKey ?? undefined,
    missingRequiredTraining: true,
    trainingStatus: isOverdue ? "expired" : "gap",
    controlEffectiveness: isOverdue ? "ineffective" : "partial",
    signals: [signal],
    sourceRecords: [{ module: "training", recordId: requirementId, label: title }],
  };

  await scoreAndWriteRiskCell({
    organizationId,
    label: `Training: ${title}${isOverdue ? " — overdue" : " — assigned, not complete"}`,
    linkedRecordType: "training_assignments",
    linkedRecordId: assignmentId,
    input,
    extraPayload: {
      requirement_id: requirementId,
      role_key: roleKey,
      due_date: dueDateStr,
      is_overdue: isOverdue,
    },
    createdBy: userId,
  });
}


// ---------------------------------------------------------------------------
// Waste Record Scoring
// ---------------------------------------------------------------------------

export type WasteScoreParams = {
  record: {
    id: string;
    wasteType: string;
    containerLabel?: string | null;
    fillLevel?: number | null;
    labelStatus: string;
    pickupScheduledDate?: string | null;
    incidentFlag: boolean;
    disposalVendor?: string | null;
  };
  organizationId: string;
  userId?: string | null;
};

const wasteTypeSeverity: Record<string, number> = {
  biological: 5,
  radioactive: 5,
  sharps: 5,
  chemical: 4,
  pharmaceutical: 3,
  mixed: 3,
  liquid: 2,
  solid: 2,
  universal: 2,
  other: 1,
};

export async function scoreWasteRecord(params: WasteScoreParams): Promise<void> {
  const { record, organizationId, userId } = params;

  const fill = record.fillLevel ?? 0;
  const isIncident = record.incidentFlag;
  const isLabelDamaged = record.labelStatus === "damaged";
  const isUnlabeled = record.labelStatus === "unlabeled";
  const hazardScore = wasteTypeSeverity[record.wasteType] ?? 2;

  const pickupOverdue = record.pickupScheduledDate
    ? new Date(record.pickupScheduledDate) < new Date()
    : false;

  const isBiohazard = ["biological", "sharps"].includes(record.wasteType);
  const isHighHazard = ["biological", "radioactive", "sharps", "chemical"].includes(record.wasteType);

  // Severity driven by fill level + hazard class
  const fillSeverity = fill >= 100 ? 5 : fill >= 80 ? 4 : fill >= 60 ? 3 : 2;
  const severity = Math.max(hazardScore, isIncident ? 5 : 1, fillSeverity);
  const controlGap = isLabelDamaged ? 5 : isUnlabeled ? 4 : pickupOverdue ? 4 : 1;

  const conditions: string[] = [];
  if (fill >= 80) conditions.push(`${fill}% full`);
  if (isIncident) conditions.push("incident flagged");
  if (isLabelDamaged) conditions.push("label damaged");
  if (isUnlabeled) conditions.push("unlabeled");
  if (pickupOverdue) conditions.push("pickup overdue");
  const conditionStr = conditions.length > 0 ? ` — ${conditions.join(", ")}` : "";

  const signal: BioAiSignal = {
    id: record.id,
    type: isBiohazard ? "biosafety_event" : "contamination_event",
    label: `${record.containerLabel ?? record.wasteType} waste${conditionStr}`,
    severity,
    likelihood: fillSeverity,
    controlGap,
    biosafetyImpactPotential: isBiohazard || isIncident,
    evidence: conditionStr || undefined,
    controls: record.disposalVendor ? [`disposal vendor: ${record.disposalVendor}`] : [],
    sourceRecords: [{ module: "waste", recordId: record.id, label: record.containerLabel ?? record.wasteType }],
  };

  const input: BioAiInput = {
    organizationId,
    workflow: "waste management",
    biosafetyImpactPotential: isBiohazard || isIncident,
    contaminationSuspected: isIncident,
    controlEffectiveness: isLabelDamaged || isUnlabeled ? "missing" : pickupOverdue ? "ineffective" : "effective",
    signals: [signal],
    sourceRecords: [{ module: "waste", recordId: record.id, label: record.containerLabel ?? record.wasteType }],
  };

  await scoreAndWriteRiskCell({
    organizationId,
    label: `Waste: ${record.containerLabel ?? record.wasteType}${conditionStr}`,
    linkedRecordType: "waste_records",
    linkedRecordId: record.id,
    input,
    extraPayload: {
      waste_type: record.wasteType,
      fill_level: fill,
      label_status: record.labelStatus,
      incident_flag: isIncident,
      pickup_overdue: pickupOverdue,
    },
    createdBy: userId,
  });
}

// ---------------------------------------------------------------------------
// Permit Scoring
// ---------------------------------------------------------------------------

export type PermitScoreParams = {
  permit: {
    id: string;
    permitType: string;
    taskDescription?: string | null;
    location?: string | null;
    hazards?: string[];
    requiredControls?: string[];
    isolationVerified: boolean;
    closeoutStatus: string;
    startTime?: string | null;
  };
  organizationId: string;
  userId?: string | null;
};

const permitTypeSeverity: Record<string, number> = {
  confined_space: 5,
  hot_work: 5,
  loto: 4,
  line_break: 4,
  chemical_transfer: 4,
  utility_shutdown: 3,
  cleanroom: 3,
  contractor: 2,
};

export async function scorePermitRecord(params: PermitScoreParams): Promise<void> {
  const { permit, organizationId, userId } = params;

  const hazardScore = permitTypeSeverity[permit.permitType] ?? 2;
  const isHighRisk = ["confined_space", "hot_work", "loto", "line_break"].includes(permit.permitType);
  const isBiosafety = ["cleanroom", "contractor"].includes(permit.permitType);

  const hoursOpen = permit.startTime
    ? (Date.now() - new Date(permit.startTime).getTime()) / 3600000
    : 0;
  const isOverdue = hoursOpen > 24;

  const missingIsolation = !permit.isolationVerified && ["loto", "confined_space", "line_break"].includes(permit.permitType);
  const isActive = ["active", "approved"].includes(permit.closeoutStatus);

  const conditions: string[] = [];
  if (isOverdue) conditions.push("open > 24 hrs");
  if (missingIsolation) conditions.push("isolation not verified");
  if (!isActive) conditions.push(permit.closeoutStatus);
  const conditionStr = conditions.length > 0 ? ` — ${conditions.join(", ")}` : "";

  const severity = Math.max(hazardScore, isOverdue ? 4 : 1, missingIsolation ? 5 : 1);

  const signal: BioAiSignal = {
    id: permit.id,
    type: isHighRisk ? "biosafety_event" : isBiosafety ? "biosafety_event" : "change_control",
    label: `${permit.permitType.replace(/_/g, " ")} permit${conditionStr}`,
    severity,
    likelihood: isActive ? 3 : 1,
    controlGap: missingIsolation ? 5 : isOverdue ? 4 : 1,
    biosafetyImpactPotential: isBiosafety || isHighRisk,
    controls: permit.requiredControls ?? [],
    evidence: permit.taskDescription ?? undefined,
    sourceRecords: [{ module: "inspection", recordId: permit.id, label: permit.permitType }],
  };

  const input: BioAiInput = {
    organizationId,
    area: permit.location ?? undefined,
    workflow: "controlled work permit",
    biosafetyImpactPotential: isBiosafety || isHighRisk,
    outOfToleranceEquipment: missingIsolation,
    unapprovedChange: permit.closeoutStatus === "draft",
    controlEffectiveness: missingIsolation ? "missing" : isOverdue ? "ineffective" : isActive ? "partial" : "effective",
    signals: [signal],
    sourceRecords: [{ module: "inspection", recordId: permit.id, label: permit.permitType }],
  };

  await scoreAndWriteRiskCell({
    organizationId,
    label: `Permit: ${permit.permitType.replace(/_/g, " ")}${permit.location ? ` — ${permit.location}` : ""}${conditionStr}`,
    linkedRecordType: "controlled_work_permits",
    linkedRecordId: permit.id,
    input,
    extraPayload: {
      permit_type: permit.permitType,
      location: permit.location,
      closeout_status: permit.closeoutStatus,
      hours_open: Math.round(hoursOpen),
      isolation_verified: permit.isolationVerified,
    },
    createdBy: userId,
  });
}
