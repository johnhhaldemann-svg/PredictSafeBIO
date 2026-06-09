import { randomUUID } from "node:crypto";
import { withAuditTrace } from "@/lib/audit-trace";
import type { BioAiInput } from "@/lib/bio-ai/types";
import { createSupabaseServerClient } from "./server";
import { countRows, getProfileContext, latestRow } from "./data-helpers";
import { saveDocumentMetadata } from "./document-service";

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
        owner_role: "ehs",
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
