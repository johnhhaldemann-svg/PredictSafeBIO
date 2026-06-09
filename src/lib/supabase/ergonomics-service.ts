import { withAuditTrace } from "@/lib/audit-trace";
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
import { formatDateOnly, getFieldReportDueDate } from "@/lib/foundation/timing";
import { createSupabaseServerClient } from "./server";
import { countRows, getProfileContext, latestRows, normalizeOptionalText, type ProfileContext } from "./data-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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

  // Level 2 evaluation requires an owner-role (credentialed evaluator) account.
  if (profile.role !== "owner") {
    return {
      ...locked,
      reason: "Level 2 evaluation requires a qualified evaluator account. Contact your workspace owner to have your role upgraded.",
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
      level2AutoAssigned: boolean;
      level2RequestId: string | null;
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
        signal_type: "ergonomic_level_1_screening",
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

    // Auto-assign Level 2 when risk score exceeds 3 (moderate-high threshold).
    let level2AutoAssigned = false;
    let level2RequestId: string | null = null;
    if (result.riskScore > 3) {
      const { data: l2Request } = await supabase
        .from("ergonomic_advanced_evaluation_requests")
        .insert({
          organization_id: context.organizationId,
          self_assessment_id: assessment.id,
          requested_by: context.userId,
          status: "requested",
          request_reason: `Level 2 auto-assigned: score ${result.riskScore}/9 (${result.riskLevel}) from Level 1 screening.`,
          source_payload: signalPayload
        })
        .select("id")
        .single();

      if (l2Request) {
        level2AutoAssigned = true;
        level2RequestId = l2Request.id;

        const l2Priority = result.riskLevel === "severe" ? "urgent" : "high";
        const { data: l2Task } = await supabase
          .from("tasks")
          .insert({
            organization_id: context.organizationId,
            source_module: "ergonomic_advanced_evaluation",
            source_record_id: l2Request.id,
            assigned_to: context.userId,
            title: `Level 2 ergonomic evaluation (auto) - ${ergonomicLabel("task", input.taskType)} [score ${result.riskScore}/9]`,
            status: "open",
            due_date: formatDateOnly(getFieldReportDueDate(l2Priority)),
            priority: l2Priority,
            created_by: context.userId
          })
          .select("id")
          .single();

        await Promise.all([
          supabase
            .from("ergonomic_self_assessments")
            .update({
              level_2_request_id: l2Request.id,
              escalation_status: "advanced_evaluation_requested",
              updated_at: new Date().toISOString()
            })
            .eq("organization_id", context.organizationId)
            .eq("id", assessment.id),
          l2Task?.id
            ? supabase.from("notifications").insert({
                organization_id: context.organizationId,
                user_id: context.userId,
                task_id: l2Task.id,
                notification_type: "task",
                title: "Level 2 ergonomic evaluation auto-assigned",
                body: `Risk score ${result.riskScore}/9 exceeded threshold. A qualified evaluator must complete the Level 2 measurement inspection.`
              })
            : Promise.resolve()
        ]);
      }
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
          level2AutoAssigned,
          level2RequestId,
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

    const autoMsg = level2AutoAssigned
      ? ` Score exceeded threshold — Level 2 evaluation auto-assigned for a qualified evaluator.`
      : "";

    return {
      ok: true,
      assessmentId: assessment.id,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      repeatedModerateFlag,
      correctiveActionRecommended,
      level2AutoAssigned,
      level2RequestId,
      message: correctiveActionRecommended
        ? `Screening saved. SafePredict created a supervisor/corrective-action review task.${autoMsg}`
        : `Screening saved. SafePredict captured the Level 1 ergonomic risk signal.${autoMsg}`
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

    const priority = assessment.risk_level === "severe" ? "urgent" : "high";
    const { data: task } = await supabase
      .from("tasks")
      .insert({
        organization_id: context.organizationId,
        source_module: "ergonomic_advanced_evaluation",
        source_record_id: request.id,
        assigned_to: context.userId,
        title: `Level 2 ergonomic evaluation - ${ergonomicLabel("task", assessment.task_type)}`,
        status: "open",
        due_date: formatDateOnly(getFieldReportDueDate(priority)),
        priority,
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
          due_date: formatDateOnly(getFieldReportDueDate("high")),
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
  const dueDate = formatDateOnly(getFieldReportDueDate(priority));

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
