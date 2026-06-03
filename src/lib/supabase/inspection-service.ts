/**
 * Inspection / Audit management service.
 * Covers the `audits` and `audit_findings` tables.
 */

import { withAuditTrace } from "@/lib/audit-trace";
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { scoreInspectionFinding, resolveRiskCell } from "./continuous-scoring-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InspectionStatus = "planned" | "in_progress" | "completed" | "cancelled";

export type InspectionType =
  // Audit / Program Reviews
  | "internal"           // Internal Audit
  | "external"           // External Audit
  | "regulatory"         // Regulatory / Agency Inspection
  | "supplier"           // Supplier / Vendor Audit
  | "self"               // Self-Inspection
  | "pre_regulatory"     // Pre-Regulatory Mock Inspection
  // Lab & Biosafety
  | "lab_safety"         // Laboratory Safety Walkthrough
  | "biosafety"          // Biosafety Cabinet & BSL Verification
  | "bloodborne_pathogens" // Bloodborne Pathogens Program
  | "chemical_hygiene"   // Chemical Hygiene & Storage
  // Physical Safety — Frequent
  | "eyewash"            // Eyewash Station & Safety Shower
  | "waste_management"   // Hazardous Waste & Satellite Area
  | "fire_safety"        // Fire Safety & Extinguisher Check
  | "emergency_equipment" // Emergency Response Equipment
  | "first_aid"          // First Aid Kit & AED
  | "spill_kit"          // Spill Kit Readiness
  // Physical Safety — Periodic
  | "ppe"                // PPE Condition & Availability
  | "loto"               // Lockout / Tagout
  | "ergonomics"         // Ergonomics Walkthrough
  // Environmental
  | "waste_disposal"     // Hazardous Waste Disposal Review
  | "stormwater"         // Stormwater / SWPPP
  // Equipment & Facility
  | "equipment"          // Equipment & Calibration
  | "facility"           // Facility & Infrastructure
  // Compliance / Admin
  | "training_records"   // Training Records & Compliance
  | "incident_followup"; // Post-Incident Follow-up

export type FindingLevel = "observation" | "minor" | "major" | "critical";
export type FindingStatus = "open" | "in_progress" | "closed";

export type Inspection = {
  id: string;
  organizationId: string;
  title: string;
  auditType: InspectionType;
  status: InspectionStatus;
  scheduledFor?: string | null;
  completedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  findingCount?: number;
  openFindingCount?: number;
};

export type InspectionFinding = {
  id: string;
  organizationId: string;
  auditId: string;
  findingLevel: FindingLevel;
  title: string;
  status: FindingStatus;
  sourceModule?: string | null;
  createdAt?: string;
};

export type InspectionDetail = Inspection & {
  findings: InspectionFinding[];
};

export type InspectionResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const inspectionStatusLabels: Record<InspectionStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled"
};

export const inspectionTypeLabels: Record<InspectionType, string> = {
  // Audit / Program Reviews
  internal: "Internal Audit",
  external: "External Audit",
  regulatory: "Regulatory Inspection",
  supplier: "Supplier / Vendor Audit",
  self: "Self-Inspection",
  pre_regulatory: "Pre-Regulatory Mock Inspection",
  // Lab & Biosafety
  lab_safety: "Laboratory Safety Walkthrough",
  biosafety: "Biosafety Cabinet & BSL Verification",
  bloodborne_pathogens: "Bloodborne Pathogens Program Review",
  chemical_hygiene: "Chemical Hygiene & Storage",
  // Physical Safety — Frequent
  eyewash: "Eyewash Station & Safety Shower Test",
  waste_management: "Hazardous Waste Satellite Area",
  fire_safety: "Fire Safety & Extinguisher Check",
  emergency_equipment: "Emergency Response Equipment Check",
  first_aid: "First Aid Kit & AED Inventory",
  spill_kit: "Chemical Spill Kit Readiness",
  // Physical Safety — Periodic
  ppe: "PPE Condition & Availability",
  loto: "Lockout / Tagout Program Review",
  ergonomics: "Ergonomics Walkthrough",
  // Environmental
  waste_disposal: "Hazardous Waste Disposal Review",
  stormwater: "Stormwater / SWPPP Inspection",
  // Equipment & Facility
  equipment: "Equipment & Calibration Review",
  facility: "Facility & Infrastructure Inspection",
  // Compliance / Admin
  training_records: "Training Records & Compliance Audit",
  incident_followup: "Post-Incident Follow-up Inspection",
};

export const findingLevelLabels: Record<FindingLevel, string> = {
  observation: "Observation",
  minor: "Minor",
  major: "Major",
  critical: "Critical"
};


// ---------------------------------------------------------------------------
// AI Scheduling Rules
// ---------------------------------------------------------------------------

export type InspectionPriority = "overdue" | "due_soon" | "upcoming";

export type InspectionScheduleRule = {
  frequencyDays: number;
  frequencyLabel: string;
  rationale: string;
  category: string;
};

export type AiInspectionRecommendation = {
  inspectionType: InspectionType;
  label: string;
  dueDate: string;         // ISO date string
  lastCompletedDate: string | null;
  daysSinceLast: number | null;
  daysUntilDue: number;    // negative = overdue
  priority: InspectionPriority;
  rationale: string;
  frequencyLabel: string;
  category: string;
};

/**
 * Regulatory & best-practice frequency rules for each inspection type.
 * frequencyDays = how often (in days) this inspection must occur.
 */
export const INSPECTION_SCHEDULE_RULES: Record<InspectionType, InspectionScheduleRule> = {
  // High-frequency (weekly)
  eyewash: {
    frequencyDays: 7,
    frequencyLabel: "Weekly",
    rationale: "ANSI Z358.1 requires eyewash stations to be activated and flushed weekly.",
    category: "Physical Safety"
  },
  waste_management: {
    frequencyDays: 7,
    frequencyLabel: "Weekly",
    rationale: "EPA 40 CFR 262.15 requires weekly satellite accumulation area inspections.",
    category: "Environmental"
  },
  // Monthly
  lab_safety: {
    frequencyDays: 30,
    frequencyLabel: "Monthly",
    rationale: "OSHA Lab Standard (29 CFR 1910.1450) and Cal/OSHA require monthly lab safety walkthroughs.",
    category: "Lab & Biosafety"
  },
  chemical_hygiene: {
    frequencyDays: 30,
    frequencyLabel: "Monthly",
    rationale: "Chemical hygiene plan (29 CFR 1910.1450) requires monthly chemical storage review.",
    category: "Lab & Biosafety"
  },
  fire_safety: {
    frequencyDays: 30,
    frequencyLabel: "Monthly",
    rationale: "NFPA 10 requires monthly visual inspection of portable fire extinguishers.",
    category: "Physical Safety"
  },
  emergency_equipment: {
    frequencyDays: 30,
    frequencyLabel: "Monthly",
    rationale: "OSHA and IFC require monthly emergency equipment readiness verification.",
    category: "Physical Safety"
  },
  first_aid: {
    frequencyDays: 30,
    frequencyLabel: "Monthly",
    rationale: "OSHA 29 CFR 1910.151 requires monthly first aid kit completeness checks.",
    category: "Physical Safety"
  },
  spill_kit: {
    frequencyDays: 30,
    frequencyLabel: "Monthly",
    rationale: "Chemical spill kits must be inventoried monthly to ensure emergency readiness.",
    category: "Lab & Biosafety"
  },
  incident_followup: {
    frequencyDays: 30,
    frequencyLabel: "Within 30 days of incident",
    rationale: "Cal/OSHA and OSHA best practices require follow-up inspection within 30 days of any recordable incident.",
    category: "Compliance"
  },
  // Quarterly
  biosafety: {
    frequencyDays: 90,
    frequencyLabel: "Quarterly",
    rationale: "CDC/NIH Biosafety guidelines recommend quarterly biosafety cabinet certification and BSL compliance checks.",
    category: "Lab & Biosafety"
  },
  ppe: {
    frequencyDays: 90,
    frequencyLabel: "Quarterly",
    rationale: "OSHA 29 CFR 1910.132 requires regular PPE assessment; quarterly review ensures condition and availability.",
    category: "Physical Safety"
  },
  self: {
    frequencyDays: 90,
    frequencyLabel: "Quarterly",
    rationale: "Quarterly self-inspections provide ongoing EHS compliance verification between formal audits.",
    category: "Audit"
  },
  training_records: {
    frequencyDays: 90,
    frequencyLabel: "Quarterly",
    rationale: "OSHA training requirements necessitate quarterly compliance gap checks for all mandatory programs.",
    category: "Compliance"
  },
  facility: {
    frequencyDays: 90,
    frequencyLabel: "Quarterly",
    rationale: "Quarterly facility inspections proactively identify infrastructure deficiencies and housekeeping issues.",
    category: "Facility"
  },
  stormwater: {
    frequencyDays: 90,
    frequencyLabel: "Quarterly",
    rationale: "EPA NPDES SWPPP regulations require qualified personnel to inspect facilities quarterly.",
    category: "Environmental"
  },
  waste_disposal: {
    frequencyDays: 90,
    frequencyLabel: "Quarterly",
    rationale: "EPA RCRA requires quarterly review of hazardous waste disposal records and manifest tracking.",
    category: "Environmental"
  },
  // Semi-annual
  equipment: {
    frequencyDays: 180,
    frequencyLabel: "Semi-annual",
    rationale: "Laboratory equipment calibration and condition review should occur every 6 months per GLP/GMP standards.",
    category: "Facility"
  },
  // Annual
  bloodborne_pathogens: {
    frequencyDays: 365,
    frequencyLabel: "Annual",
    rationale: "OSHA 29 CFR 1910.1030 mandates an annual review of the Exposure Control Plan.",
    category: "Lab & Biosafety"
  },
  loto: {
    frequencyDays: 365,
    frequencyLabel: "Annual",
    rationale: "OSHA 29 CFR 1910.147 requires at least annual LOTO procedure certification and periodic inspections.",
    category: "Physical Safety"
  },
  ergonomics: {
    frequencyDays: 365,
    frequencyLabel: "Annual",
    rationale: "Annual ergonomics walkthroughs reduce MSD risk and support Cal/OSHA ergonomics standard compliance.",
    category: "Physical Safety"
  },
  internal: {
    frequencyDays: 365,
    frequencyLabel: "Annual",
    rationale: "ISO 45001 and GxP best practices require at least one annual internal EHS management system audit.",
    category: "Audit"
  },
  regulatory: {
    frequencyDays: 365,
    frequencyLabel: "Annual",
    rationale: "Annual readiness assessment for regulatory agency inspections (OSHA, EPA, local fire authority).",
    category: "Audit"
  },
  supplier: {
    frequencyDays: 365,
    frequencyLabel: "Annual",
    rationale: "ISO 14001 / ISO 45001 supply chain requirements mandate at least annual supplier EHS audits.",
    category: "Audit"
  },
  pre_regulatory: {
    frequencyDays: 365,
    frequencyLabel: "Annual",
    rationale: "Annual mock regulatory inspection catches gaps before an actual agency visit.",
    category: "Audit"
  },
  // Bi-annual
  external: {
    frequencyDays: 730,
    frequencyLabel: "Every 2 years",
    rationale: "External third-party EHS audits are typically required every 2 years for certified management systems.",
    category: "Audit"
  },
};

/**
 * AI-driven inspection scheduler.
 *
 * Given a list of all completed inspections, computes which inspection types
 * are overdue, due soon, or upcoming and returns them as prioritised
 * required-task recommendations.
 *
 * Priority rules:
 *  - overdue   : daysUntilDue < 0
 *  - due_soon  : 0 ≤ daysUntilDue ≤ 14
 *  - upcoming  : 15 ≤ daysUntilDue ≤ 30
 *  (types more than 30 days away are suppressed — no action needed yet)
 */
export function computeAiInspectionRecommendations(
  completedInspections: Array<{ auditType: InspectionType; completedAt?: string | null; scheduledFor?: string | null }>
): AiInspectionRecommendation[] {
  const now = new Date();
  const todayMs = now.getTime();

  // Build a map: type → most recent completion date
  const lastCompletionMap = new Map<InspectionType, Date>();
  for (const insp of completedInspections) {
    const dateStr = insp.completedAt ?? insp.scheduledFor;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;
    const existing = lastCompletionMap.get(insp.auditType);
    if (!existing || d > existing) {
      lastCompletionMap.set(insp.auditType, d);
    }
  }

  const recommendations: AiInspectionRecommendation[] = [];

  const scheduleEntries = Object.entries(INSPECTION_SCHEDULE_RULES) as Array<[InspectionType, InspectionScheduleRule]>;
  for (const [type, rule] of scheduleEntries) {
    const lastDate = lastCompletionMap.get(type) ?? null;
    const daysSinceLast = lastDate
      ? Math.floor((todayMs - lastDate.getTime()) / 86400000)
      : null;

    // If never done, treat as if it was due `frequencyDays` ago (immediate)
    const dueDate = lastDate
      ? new Date(lastDate.getTime() + rule.frequencyDays * 86400000)
      : new Date(todayMs - rule.frequencyDays * 86400000);

    const daysUntilDue = Math.floor((dueDate.getTime() - todayMs) / 86400000);

    // Only surface if overdue or due within 30 days
    if (daysUntilDue > 30) continue;

    let priority: InspectionPriority;
    if (daysUntilDue < 0) priority = "overdue";
    else if (daysUntilDue <= 14) priority = "due_soon";
    else priority = "upcoming";

    recommendations.push({
      inspectionType: type,
      label: inspectionTypeLabels[type],
      dueDate: dueDate.toISOString().slice(0, 10),
      lastCompletedDate: lastDate ? lastDate.toISOString().slice(0, 10) : null,
      daysSinceLast,
      daysUntilDue,
      priority,
      rationale: rule.rationale,
      frequencyLabel: rule.frequencyLabel,
      category: rule.category,
    });
  }

  // Sort: overdue first (most overdue at top), then due_soon, then upcoming
  return recommendations.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/**
 * Demo recommendations — used when Supabase is not configured.
 */
function demoAiRecommendations(): AiInspectionRecommendation[] {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const ago = (days: number) => new Date(now.getTime() - days * 86400000);
  const fromNow = (days: number) => new Date(now.getTime() + days * 86400000);

  return [
    {
      inspectionType: "eyewash",
      label: inspectionTypeLabels.eyewash,
      dueDate: fmt(ago(5)),
      lastCompletedDate: fmt(ago(12)),
      daysSinceLast: 12,
      daysUntilDue: -5,
      priority: "overdue",
      rationale: INSPECTION_SCHEDULE_RULES.eyewash.rationale,
      frequencyLabel: INSPECTION_SCHEDULE_RULES.eyewash.frequencyLabel,
      category: INSPECTION_SCHEDULE_RULES.eyewash.category,
    },
    {
      inspectionType: "waste_management",
      label: inspectionTypeLabels.waste_management,
      dueDate: fmt(ago(2)),
      lastCompletedDate: fmt(ago(9)),
      daysSinceLast: 9,
      daysUntilDue: -2,
      priority: "overdue",
      rationale: INSPECTION_SCHEDULE_RULES.waste_management.rationale,
      frequencyLabel: INSPECTION_SCHEDULE_RULES.waste_management.frequencyLabel,
      category: INSPECTION_SCHEDULE_RULES.waste_management.category,
    },
    {
      inspectionType: "fire_safety",
      label: inspectionTypeLabels.fire_safety,
      dueDate: fmt(fromNow(6)),
      lastCompletedDate: fmt(ago(24)),
      daysSinceLast: 24,
      daysUntilDue: 6,
      priority: "due_soon",
      rationale: INSPECTION_SCHEDULE_RULES.fire_safety.rationale,
      frequencyLabel: INSPECTION_SCHEDULE_RULES.fire_safety.frequencyLabel,
      category: INSPECTION_SCHEDULE_RULES.fire_safety.category,
    },
    {
      inspectionType: "lab_safety",
      label: inspectionTypeLabels.lab_safety,
      dueDate: fmt(fromNow(10)),
      lastCompletedDate: fmt(ago(20)),
      daysSinceLast: 20,
      daysUntilDue: 10,
      priority: "due_soon",
      rationale: INSPECTION_SCHEDULE_RULES.lab_safety.rationale,
      frequencyLabel: INSPECTION_SCHEDULE_RULES.lab_safety.frequencyLabel,
      category: INSPECTION_SCHEDULE_RULES.lab_safety.category,
    },
    {
      inspectionType: "biosafety",
      label: inspectionTypeLabels.biosafety,
      dueDate: fmt(fromNow(22)),
      lastCompletedDate: fmt(ago(68)),
      daysSinceLast: 68,
      daysUntilDue: 22,
      priority: "upcoming",
      rationale: INSPECTION_SCHEDULE_RULES.biosafety.rationale,
      frequencyLabel: INSPECTION_SCHEDULE_RULES.biosafety.frequencyLabel,
      category: INSPECTION_SCHEDULE_RULES.biosafety.category,
    },
  ];
}

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoInspections(): Inspection[] {
  const now = new Date();
  const d = (days: number) => new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
  return [
    {
      id: "demo-insp-001",
      organizationId: "demo-org",
      title: "Annual biosafety program internal audit",
      auditType: "internal",
      status: "planned",
      scheduledFor: d(21),
      createdAt: now.toISOString(),
      findingCount: 0,
      openFindingCount: 0
    },
    {
      id: "demo-insp-002",
      organizationId: "demo-org",
      title: "GxP document control review",
      auditType: "internal",
      status: "in_progress",
      scheduledFor: d(-3),
      createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
      findingCount: 3,
      openFindingCount: 2
    },
    {
      id: "demo-insp-003",
      organizationId: "demo-org",
      title: "Q2 EHS self-inspection",
      auditType: "self",
      status: "completed",
      scheduledFor: d(-30),
      completedAt: new Date(now.getTime() - 25 * 86400000).toISOString(),
      createdAt: new Date(now.getTime() - 45 * 86400000).toISOString(),
      findingCount: 2,
      openFindingCount: 0
    },
    {
      id: "demo-insp-004",
      organizationId: "demo-org",
      title: "Monthly fire extinguisher check",
      auditType: "fire_safety",
      status: "completed",
      scheduledFor: d(-24),
      completedAt: new Date(now.getTime() - 22 * 86400000).toISOString(),
      createdAt: new Date(now.getTime() - 25 * 86400000).toISOString(),
      findingCount: 0,
      openFindingCount: 0
    },
    {
      id: "demo-insp-005",
      organizationId: "demo-org",
      title: "Biosafety cabinet certification — BSL-2 labs",
      auditType: "biosafety",
      status: "completed",
      scheduledFor: d(-68),
      completedAt: new Date(now.getTime() - 66 * 86400000).toISOString(),
      createdAt: new Date(now.getTime() - 70 * 86400000).toISOString(),
      findingCount: 1,
      openFindingCount: 0
    },
    {
      id: "demo-insp-006",
      organizationId: "demo-org",
      title: "EPA satellite accumulation area weekly check",
      auditType: "waste_management",
      status: "completed",
      scheduledFor: d(-9),
      completedAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
      createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      findingCount: 0,
      openFindingCount: 0
    }
  ];
}

function demoInspectionDetail(id: string): InspectionDetail | null {
  const record = demoInspections().find((r) => r.id === id);
  if (!record) return null;
  return {
    ...record,
    findings: id === "demo-insp-002"
      ? [
          { id: "demo-finding-1", organizationId: "demo-org", auditId: id, findingLevel: "minor", title: "SOP-GxP-003 not current — revision pending since Q1", status: "open", createdAt: record.createdAt },
          { id: "demo-finding-2", organizationId: "demo-org", auditId: id, findingLevel: "major", title: "Training evidence missing for 2 staff on critical SOP", status: "in_progress", createdAt: record.createdAt },
          { id: "demo-finding-3", organizationId: "demo-org", auditId: id, findingLevel: "observation", title: "Document log missing date-of-approval field", status: "closed", createdAt: record.createdAt }
        ]
      : []
  };
}

// ---------------------------------------------------------------------------
// Read: list
// ---------------------------------------------------------------------------

export async function listInspections(filter?: { status?: InspectionStatus | "all" }): Promise<Inspection[]> {
  if (!isSupabaseConfigured()) return demoInspections();

  const context = await getProfileContext();
  if (!context) return demoInspections();

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("audits")
    .select("id,title,audit_type,status,scheduled_for,completed_at,created_by,created_at,updated_at,organization_id")
    .eq("organization_id", context.organizationId)
    .order("scheduled_for", { ascending: false })
    .limit(100);

  if (filter?.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const ids = data.map((r) => r.id);
  const { data: findingRows } = ids.length
    ? await supabase
        .from("audit_findings")
        .select("audit_id, status")
        .eq("organization_id", context.organizationId)
        .in("audit_id", ids)
    : { data: [] };

  const countMap = new Map<string, { total: number; open: number }>();
  for (const row of findingRows ?? []) {
    const e = countMap.get(row.audit_id) ?? { total: 0, open: 0 };
    e.total++;
    if (row.status !== "closed") e.open++;
    countMap.set(row.audit_id, e);
  }

  return data.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    auditType: row.audit_type as InspectionType,
    status: row.status as InspectionStatus,
    scheduledFor: row.scheduled_for,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    findingCount: countMap.get(row.id)?.total ?? 0,
    openFindingCount: countMap.get(row.id)?.open ?? 0
  }));
}

// ---------------------------------------------------------------------------
// Read: AI inspection recommendations
// ---------------------------------------------------------------------------

export async function getAiInspectionRecommendations(): Promise<AiInspectionRecommendation[]> {
  if (!isSupabaseConfigured()) return demoAiRecommendations();

  const context = await getProfileContext();
  if (!context) return demoAiRecommendations();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("audits")
    .select("audit_type, completed_at, scheduled_for")
    .eq("organization_id", context.organizationId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(500);

  const completed = (data ?? []).map((r) => ({
    auditType: r.audit_type as InspectionType,
    completedAt: r.completed_at,
    scheduledFor: r.scheduled_for,
  }));

  return computeAiInspectionRecommendations(completed);
}

// ---------------------------------------------------------------------------
// Read: detail
// ---------------------------------------------------------------------------

export async function getInspectionDetail(id: string): Promise<InspectionDetail | null> {
  if (!isSupabaseConfigured()) return demoInspectionDetail(id);

  const context = await getProfileContext();
  if (!context) return demoInspectionDetail(id);

  const supabase = await createSupabaseServerClient();
  const [{ data: record }, { data: findings }] = await Promise.all([
    supabase
      .from("audits")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("audit_findings")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("audit_id", id)
      .order("created_at", { ascending: true })
  ]);

  if (!record) return null;

  const mappedFindings: InspectionFinding[] = (findings ?? []).map((f) => ({
    id: f.id,
    organizationId: f.organization_id,
    auditId: f.audit_id,
    findingLevel: f.finding_level as FindingLevel,
    title: f.title,
    status: f.status as FindingStatus,
    sourceModule: f.source_module,
    createdAt: f.created_at
  }));

  return {
    id: record.id,
    organizationId: record.organization_id,
    title: record.title,
    auditType: record.audit_type as InspectionType,
    status: record.status as InspectionStatus,
    scheduledFor: record.scheduled_for,
    completedAt: record.completed_at,
    createdBy: record.created_by,
    createdAt: record.created_at,
    findingCount: mappedFindings.length,
    openFindingCount: mappedFindings.filter((f) => f.status !== "closed").length,
    findings: mappedFindings
  };
}

// ---------------------------------------------------------------------------
// Write: create inspection
// ---------------------------------------------------------------------------

export async function createInspection(input: {
  title: string;
  auditType: InspectionType;
  scheduledFor?: string | null;
}): Promise<InspectionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in before creating an inspection." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audits")
    .insert({
      organization_id: context.organizationId,
      title: input.title.trim(),
      audit_type: input.auditType,
      status: "planned",
      scheduled_for: input.scheduledFor || null,
      created_by: context.userId
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Could not create inspection." };

  await supabase.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    event_type: "intelligence_foundation_evaluated",
    summary: `Inspection scheduled: ${input.title}.`,
    payload: withAuditTrace(
      { inspectionId: data.id, title: input.title, auditType: input.auditType },
      { sourceModule: "audit", sourceRecordId: data.id, targetModule: "audit", draftOnly: false }
    )
  });

  return { ok: true, message: "Inspection scheduled.", id: data.id };
}

// ---------------------------------------------------------------------------
// Write: update status
// ---------------------------------------------------------------------------

export async function updateInspectionStatus(input: {
  inspectionId: string;
  status: InspectionStatus;
}): Promise<InspectionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to update an inspection." };

  const supabase = await createSupabaseServerClient();
  const completedAt = input.status === "completed" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("audits")
    .update({ status: input.status, completed_at: completedAt, updated_at: new Date().toISOString() })
    .eq("id", input.inspectionId)
    .eq("organization_id", context.organizationId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Inspection marked ${inspectionStatusLabels[input.status]}.` };
}

// ---------------------------------------------------------------------------
// Write: add finding
// ---------------------------------------------------------------------------

export async function addInspectionFinding(input: {
  inspectionId: string;
  findingLevel: FindingLevel;
  title: string;
}): Promise<InspectionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to add a finding." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_findings")
    .insert({
      organization_id: context.organizationId,
      audit_id: input.inspectionId,
      finding_level: input.findingLevel,
      title: input.title.trim(),
      status: "open"
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Could not add finding." };

  // Score via bio-ai — fetch parent inspection for its type, then write to risk_cells.
  // Fire-and-forget: never blocks the HTTP response.
  const findingId = data.id;
  const orgId = context.organizationId;
  const userId = context.userId;
  void (async () => {
    try {
      const sb = await createSupabaseServerClient();
      const { data: insp } = await sb
        .from("audits")
        .select("id, audit_type, title")
        .eq("id", input.inspectionId)
        .eq("organization_id", orgId)
        .maybeSingle();

      await scoreInspectionFinding({
        finding: {
          id: findingId,
          findingLevel: input.findingLevel,
          title: input.title.trim(),
          auditId: input.inspectionId,
        },
        inspection: {
          id: insp?.id ?? input.inspectionId,
          auditType: (insp?.audit_type as string) ?? "internal",
          title: (insp?.title as string) ?? input.title.trim(),
        },
        organizationId: orgId,
        userId,
      });
    } catch {
      // Best-effort — never surface scoring errors to the user
    }
  })();

  return { ok: true, message: "Finding recorded.", id: data.id };
}

// ---------------------------------------------------------------------------
// Write: close finding
// ---------------------------------------------------------------------------

export async function closeInspectionFinding(input: {
  findingId: string;
  inspectionId: string;
}): Promise<InspectionResult> {
  const context = await getProfileContext();
  if (!context) return { ok: false, message: "Sign in to close a finding." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("audit_findings")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", input.findingId)
    .eq("organization_id", context.organizationId);

  if (error) return { ok: false, message: error.message };

  // Resolve the risk cell so it leaves the active Risk Command Center queue
  void resolveRiskCell({
    organizationId: context.organizationId,
    linkedRecordType: "audit_findings",
    linkedRecordId: input.findingId,
  });

  return { ok: true, message: "Finding closed." };
}
