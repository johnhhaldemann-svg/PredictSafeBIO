import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import {
  applyBioTypeContext,
  buildBioTypeAiContext,
  canonicalBioTypeFoundations,
  type BioTypeKey
} from "@/lib/foundation/biotypes";
import {
  defaultApplicabilityRules,
  foundationMethodNames,
  foundationProgramNames,
  northStarFoundationDemo
} from "@/lib/foundation/engine";
import type { IntelligenceFoundationSummary } from "@/lib/supabase/data";

export const coreComplianceComponents = [
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

export const aiWorkflowSteps = [
  "Company profile intelligence",
  "BioType branching",
  "Regulatory mapping",
  "BioRisk scoring",
  "Document control",
  "Training matrix",
  "Audit dashboard"
];

export const humanValidationWorkflowSteps = [
  "AI draft",
  "Human review",
  "Approve/reject/request changes",
  "Effective controlled output",
  "Training impact",
  "Audit event"
];

export function programMethodRequired(programName: string, methodName: string) {
  if (["AI Guardrail", "Audit Evidence", "Change Impact"].includes(methodName)) return true;
  if (programName.includes("Training")) return ["Training Gap", "Control Verification"].includes(methodName);
  if (programName.includes("CAPA") || programName.includes("Incident")) return ["Incident Screening", "CAPA Screening"].includes(methodName);
  if (programName.includes("Equipment")) return ["Risk Assessment", "Control Verification"].includes(methodName);
  if (programName.includes("Document")) return ["Document Gap", "Control Verification"].includes(methodName);
  return ["Risk Assessment", "Document Gap", "Training Gap"].includes(methodName);
}

export function isFoundationGapStatus(status: unknown) {
  return ["review_needed", "missing", "expired", "open", "out_of_tolerance", "gap", "gaps"].includes(String(status ?? "").toLowerCase());
}

export function demoIntelligenceFoundationSummary(): IntelligenceFoundationSummary {
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
      primaryBioType: "rd_biotech" as BioTypeKey,
      secondaryBioTypes: ["diagnostics_clinical_lab", "academic_university_research"] as BioTypeKey[],
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
