import type { BioAiInput } from "@/lib/bio-ai/types";
import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import {
  applyBioTypeContext,
  buildBioTypeAiContext,
  canonicalBioTypeFoundations,
  normalizeBioTypeKey,
  type BioTypeKey
} from "@/lib/foundation/biotypes";
import { normalizeBioTypeKeys } from "@/lib/foundation/action-inputs";
import { applyFoundationContext, northStarFoundationDemo } from "@/lib/foundation/engine";
import {
  aiWorkflowSteps,
  coreComplianceComponents,
  demoIntelligenceFoundationSummary,
  humanValidationWorkflowSteps
} from "@/lib/foundation/summary";
import { createSupabaseServerClient } from "./server";
import {
  countRows,
  getProfileContext,
  latestRow,
  latestRows,
  normalizeReadinessGap,
  summarizeJson
} from "./data-helpers";

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
