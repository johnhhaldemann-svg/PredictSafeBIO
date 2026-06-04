import { withAuditTrace } from "@/lib/audit-trace";
import type { AuditEvent } from "@/lib/bio-ai/types";
import { normalizeBioTypeKey } from "@/lib/foundation/biotypes";
import {
  normalizeBioTypeKeys,
  normalizeFoundationEvidenceStatus
} from "@/lib/foundation/action-inputs";
import { canManageWorkspace, normalizeWorkspaceRole } from "@/lib/role-permissions";
import { getCompanyProfile } from "./account-service";
import { isSupabaseConfigured } from "./env";
import { createSupabaseServerClient } from "./server";
import { logKnowledgeEntry } from "./knowledge-service";

type FoundationWriteContext = {
  userId: string;
  organizationId: string;
  role: string;
};

type FoundationWriteResult = { ok: true; message: string } | { ok: false; message: string };

export async function updateFoundationBioTypeSelection(input: {
  primaryBioType: string;
  secondaryBioTypes: string[];
}): Promise<FoundationWriteResult> {
  const context = await getFoundationWriteContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating BioType selection." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can update Foundation BioType selections." };

  const primaryBioType = normalizeBioTypeKey(input.primaryBioType);
  if (!primaryBioType) return { ok: false, message: "Choose a valid primary BioType." };

  const secondaryBioTypes = normalizeBioTypeKeys(input.secondaryBioTypes).filter((key) => key !== primaryBioType);
  const supabase = await createSupabaseServerClient();
  const companyProfile = await getCompanyProfile();
  const latestSelection = (await latestFoundationWriteRow(
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

  await writeFoundationWriteAuditEvent(supabase, context, {
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
}): Promise<FoundationWriteResult> {
  const context = await getFoundationWriteContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating intake responses." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can update Foundation intake responses." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("company_intake_responses")
    .update({ answer_value: { value: input.answer }, updated_at: new Date().toISOString() })
    .eq("organization_id", context.organizationId)
    .eq("id", input.responseId)
    .select("id,question_key")
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? "Intake response could not be updated." };

  await writeFoundationWriteAuditEvent(supabase, context, {
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
}): Promise<FoundationWriteResult> {
  const context = await getFoundationWriteContext();
  if (!context) return { ok: false, message: "Sign in and finish onboarding before updating evidence readiness." };
  if (!canManageWorkspace(context)) return { ok: false, message: "Only organization owners can update Foundation evidence readiness." };

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

  await writeFoundationWriteAuditEvent(supabase, context, {
    eventType: "foundation_evidence_readiness_updated",
    summary: `Foundation evidence readiness updated for ${data.requirement_name}.`,
    sourceModule: "evidence_map",
    sourceRecordId: data.id,
    targetModule: "audit_readiness",
    targetRecordId: data.id,
    payload: { evidenceId: data.id, requirementName: data.requirement_name, status, auditReady: input.auditReady }
  });

  void logKnowledgeEntry({
    knowledgeType: "evidence_map",
    sourceModule: "evidence_map",
    sourceRecordId: data.id,
    label: `Evidence: ${data.requirement_name}`,
    contentSummary: `Status changed to "${status}" for "${data.requirement_name}". Audit-ready: ${input.auditReady}.`,
    aiHumanReviewRequired: !input.auditReady
  }, context.organizationId).catch(() => {});

  return { ok: true, message: "Evidence readiness updated as draft - human review required." };
}

async function getFoundationWriteContext(): Promise<FoundationWriteContext | null> {
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

async function latestFoundationWriteRow(
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

async function writeFoundationWriteAuditEvent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: FoundationWriteContext,
  input: {
    eventType: AuditEvent["eventType"];
    summary: string;
    sourceModule: string;
    sourceRecordId?: string | null;
    targetModule: string;
    targetRecordId?: string | null;
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
      draftOnly: true
    })
  });
}
