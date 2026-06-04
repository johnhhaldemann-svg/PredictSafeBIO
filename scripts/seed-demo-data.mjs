import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Load .env.local first or pass the values in the shell environment.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const organizationId = process.env.PREDICTSAFE_DEMO_ORG_ID || "00000000-0000-4000-8000-000000000360";
const linkedUserId = process.env.PREDICTSAFE_DEMO_USER_ID || "";
const actorId = linkedUserId || null;

const companyProfile = {
  company_name: "PredictSafeBIO Demo Biotech",
  primary_site: "Demo Biotech Site",
  operating_areas: ["QC Microbiology Lab", "Cell Therapy Suite", "GMP Warehouse"],
  programs: ["BIO-001", "BIO-002"],
  quality_system_scope: ["SOPs", "Deviations", "CAPA", "Change Control", "Training"],
  biosafety_levels: ["BSL-1", "BSL-2"],
  review_owner_roles: ["qa", "quality_unit", "biosafety_officer", "responsible_scientist"],
  document_families: ["SOP", "Batch record", "Protocol", "Training", "Validation"]
};

const assessmentInput = {
  siteName: "Demo Biotech Site",
  area: "QC Microbiology Lab",
  workflow: "Sterility assay review",
  program: "BIO-001",
  productCandidate: "BIO-001",
  batchOrLot: "LOT-DEMO-001",
  controlEffectiveness: "partial",
  dataCompleteness: 0.68,
  contaminationSuspected: true,
  productQualityImpactPotential: true,
  gxpImpact: true,
  signals: [
    {
      type: "contamination_event",
      label: "Unexpected microbial growth in assay control",
      severity: "high",
      status: "open",
      productQualityImpactPotential: true,
      gxpImpact: true,
      controls: ["Initial lab notification completed"],
      evidence: "Assay control showed unexpected growth; investigation not complete."
    },
    {
      type: "data_integrity",
      label: "Missing second-person review signature",
      severity: "medium",
      status: "open",
      dataIntegrityConcern: 4,
      evidence: "Review signature missing from assay worksheet."
    }
  ]
};

const assessmentOutput = {
  score: 81,
  level: "critical",
  confidence: "low",
  topDrivers: [
    {
      label: "Suspected or confirmed contamination",
      category: "quality",
      impact: "critical",
      explanation: "Suspected or confirmed contamination requires QA/quality unit review before disposition."
    },
    {
      label: "Data integrity concern",
      category: "data_integrity",
      impact: "high",
      explanation: "Missing second-person review reduces confidence in the assessment record."
    }
  ],
  missingInformation: ["QA assessment", "batch/sample impact assessment", "investigation status", "final disposition"],
  criticalControlGaps: ["Contamination / sterility risk: QA review, investigation status, batch impact assessment"],
  recommendedActions: [
    {
      title: "Consider hold or quarantine review",
      priority: "urgent",
      ownerRole: "quality_unit",
      actionType: "hold_or_quarantine_review",
      reason: "Suspected contamination remains critical until assessed by QA or the quality unit."
    }
  ],
  explanation:
    "Based on available data, this is a potential critical biotech risk with low confidence. Human review is required before relying on next steps. This draft assessment does not replace quality, regulatory, biosafety, clinical, validation, or scientific judgment.",
  escalationRequired: true,
  holdOrQuarantineReviewRecommended: true,
  humanReviewRequired: true,
  humanReviewReason: "Critical risk requires immediate human review and possible hold, quarantine, stop-use, or escalation evaluation.",
  actionTimeframe: "immediate",
  doNotClaim: ["release", "approval", "compliance", "diagnosis", "regulatory acceptance"]
};

const documentMetadata = {
  title: "Sterility Assay Review SOP",
  document_type: "sop",
  status: "in_review",
  owner_role: "qa",
  area: "QC Microbiology Lab",
  related_process: "Sterility assay review",
  revision: "0.3",
  next_review_date: "2026-06-30",
  gaps: ["QA assessment timing not explicit", "Batch impact language needs owner review"]
};

async function upsertSingle(table, payload, conflict = "id") {
  const { data, error } = await supabase.from(table).upsert(payload, { onConflict: conflict }).select("*").single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function insert(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

const organization = await upsertSingle("organizations", {
  id: organizationId,
  name: "PredictSafeBIO Demo Organization"
});

if (linkedUserId) {
  await upsertSingle("profiles", {
    id: linkedUserId,
    organization_id: organization.id,
    full_name: "PredictSafeBIO Demo Owner",
    role: "owner",
    updated_at: new Date().toISOString()
  });
}

const company = await insert("company_profiles", {
  organization_id: organization.id,
  ...companyProfile,
  created_by: actorId
});

const assessment = await insert("assessments", {
  organization_id: organization.id,
  created_by: actorId,
  input_snapshot: assessmentInput,
  output_snapshot: assessmentOutput,
  score: assessmentOutput.score,
  level: assessmentOutput.level,
  confidence: assessmentOutput.confidence,
  human_review_required: true,
  human_review_status: "draft_human_review_required"
});

await supabase.from("assessment_signals").insert(
  assessmentInput.signals.map((signal) => ({
    organization_id: organization.id,
    assessment_id: assessment.id,
    signal_type: signal.type,
    label: signal.label,
    payload: signal
  }))
);

const document = await insert("document_metadata", {
  organization_id: organization.id,
  ...documentMetadata,
  created_by: actorId
});

const recommendations = [
  {
    organization_id: organization.id,
    document_id: document.id,
    recommendation_type: "gap",
    title: "Resolve documented gap: QA assessment timing not explicit",
    payload: {
      documentId: document.id,
      title: "Resolve documented gap: QA assessment timing not explicit",
      severity: "moderate",
      reason: "A recorded gap should be reviewed and either remediated or linked to an approved quality workflow.",
      recommendedOwner: "qa",
      draftOnly: true,
      humanReviewRequired: true
    },
    created_by: actorId
  },
  {
    organization_id: organization.id,
    document_id: document.id,
    recommendation_type: "draft_update",
    title: "Draft update for QA assessment timing",
    payload: {
      documentId: document.id,
      title: "Draft update for QA assessment timing",
      proposedChange:
        "Add or revise the QA assessment timing section of the Sterility Assay Review SOP. Draft - Human Review Required.",
      rationale: "Generated from document metadata for demo use only.",
      label: "Draft - Human Review Required",
      ownerRole: "qa"
    },
    created_by: actorId
  }
];

await supabase.from("document_recommendations").insert(recommendations);

await supabase.from("audit_events").insert([
  {
    organization_id: organization.id,
    actor_id: actorId,
    event_type: "company_profile_updated",
    summary: "Demo organization and company profile seeded.",
    payload: { organizationId: organization.id, companyProfileId: company.id }
  },
  {
    organization_id: organization.id,
    actor_id: actorId,
    event_type: "assessment_saved",
    summary: `Demo assessment saved with ${assessmentOutput.level} risk and score ${assessmentOutput.score}.`,
    payload: { assessmentId: assessment.id, level: assessmentOutput.level, score: assessmentOutput.score }
  },
  {
    organization_id: organization.id,
    actor_id: actorId,
    event_type: "document_recommendation_generated",
    summary: `Generated draft document recommendations for ${document.title}.`,
    payload: { documentId: document.id, count: recommendations.length }
  }
]);

console.log("PredictSafeBIO demo seed completed.");
console.log(`Organization: ${organization.id}`);
console.log(`Assessment: ${assessment.id}`);
console.log(`Document: ${document.id}`);
console.log(linkedUserId ? `Linked user: ${linkedUserId}` : "No user linked. Set PREDICTSAFE_DEMO_USER_ID to expose the data to a signed-in demo user.");
