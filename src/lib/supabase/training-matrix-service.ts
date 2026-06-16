import { canonicalBioTypeFoundations } from "@/lib/foundation/biotypes";
import { demoIntelligenceFoundationSummary } from "@/lib/foundation/summary";
import { createSupabaseServerClient } from "./server";
import { getProfileContext, latestRow, latestRows, summarizeJson } from "./data-helpers";

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
  readiness: "Current" | "Needs review" | "Overdue" | "Expired" | "Missing";
};

export type EmployeeTrainingAssignment = {
  assignmentId: string;
  requirementId: string;
  requirement: string;
  status: string;
  readiness: TrainingMatrixRow["readiness"];
  dueDate?: string | null;
  completedAt?: string | null;
};

export type EmployeeTrainingSummary = {
  userId: string;
  name: string;
  role: string;
  assignments: EmployeeTrainingAssignment[];
};

export type TrainingMatrixSummary = {
  counts: Array<{ label: string; value: number }>;
  readinessScore: number;
  rows: TrainingMatrixRow[];
  changeImpacts: Array<{ id: string; type: string; summary: string; trainingImpacts: string[]; status: string }>;
  biotypeRequirements: Array<{ biotype: string; training: string[] }>;
  employees: EmployeeTrainingSummary[];
  guardrailText: string;
};

function trainingReadinessFromStatus(status: string, dueDate?: string | null): TrainingMatrixRow["readiness"] {
  if (status === "completed" || status === "waived") return "Current";
  if (status === "expired") return "Expired";
  if (status === "assigned") {
    if (dueDate && new Date(dueDate) < new Date()) return "Overdue";
    return "Needs review";
  }
  return "Missing";
}

function calculateTrainingMatrixReadiness(rows: TrainingMatrixRow[]) {
  if (rows.length === 0) return 0;
  const total = rows.reduce((sum, row) => {
    if (row.readiness === "Current") return sum + 100;
    if (row.readiness === "Needs review") return sum + 60;
    if (row.readiness === "Overdue") return sum + 20;
    if (row.readiness === "Expired") return sum + 25;
    return sum;
  }, 0);
  return Math.round(total / rows.length);
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

  const employees: EmployeeTrainingSummary[] = [
    {
      userId: "demo-user-1",
      name: "J. Smith",
      role: "biosafety_officer",
      assignments: [
        { assignmentId: "demo-a1", requirementId: "demo-training-biosafety", requirement: "Annual Biosafety Training", status: "expired", readiness: "Expired", dueDate: "2026-05-15", completedAt: null },
        { assignmentId: "demo-a5", requirementId: "demo-training-chain", requirement: "Sample Chain-of-Custody Training", status: "completed", readiness: "Current", dueDate: null, completedAt: "2026-03-10" },
      ],
    },
    {
      userId: "demo-user-2",
      name: "A. Chen",
      role: "responsible_scientist",
      assignments: [
        { assignmentId: "demo-a2", requirementId: "demo-training-aseptic", requirement: "Aseptic Technique Training", status: "assigned", readiness: "Overdue", dueDate: "2026-06-01", completedAt: null },
        { assignmentId: "demo-a6", requirementId: "demo-training-chain", requirement: "Sample Chain-of-Custody Training", status: "assigned", readiness: "Needs review", dueDate: "2026-07-01", completedAt: null },
      ],
    },
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
    employees,
    guardrailText: "AI may identify training impact and draft recommendations, but training completion and competency remain human-validated."
  };
}

export async function getTrainingMatrixSummary(): Promise<TrainingMatrixSummary> {
  const context = await getProfileContext();
  if (!context) return demoTrainingMatrixSummary();

  try {
    const supabase = await createSupabaseServerClient();
    const [requirementRows, assignmentRows, documentRows, changeRows, biotypeRows, readinessScore, profileRows] = await Promise.all([
      latestRows(supabase, "training_requirements", context.organizationId, "id,title,role_key,document_id,frequency_months,required_for,updated_at", 80),
      latestRows(
        supabase,
        "training_assignments",
        context.organizationId,
        "id,training_requirement_id,assigned_user_id,status,due_date,completed_at,expires_at,evidence_path,updated_at",
        200
      ),
      latestRows(supabase, "document_metadata", context.organizationId, "id,title,status,revision,next_review_date,document_type", 100),
      latestRows(supabase, "change_impact_events", context.organizationId, "id,change_type,impact_summary,training_impacts,status,created_at", 20),
      latestRows(supabase, "biotype_foundations", context.organizationId, "id,display_name,required_training", 12),
      latestRow(supabase, "audit_readiness_scores", context.organizationId, "id,training_score"),
      latestRows(supabase, "profiles", context.organizationId, "id,full_name,role", 50),
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

    const typedAssignments = (assignmentRows as Record<string, any>[]) ?? [];

    const assignmentsByRequirement = new Map<string, Record<string, any>>();
    const assignmentsByUser = new Map<string, Record<string, any>[]>();
    for (const assignment of typedAssignments) {
      if (!assignmentsByRequirement.has(assignment.training_requirement_id)) {
        assignmentsByRequirement.set(assignment.training_requirement_id, assignment);
      }
      const uid = assignment.assigned_user_id as string | null;
      if (uid) {
        if (!assignmentsByUser.has(uid)) assignmentsByUser.set(uid, []);
        assignmentsByUser.get(uid)!.push(assignment);
      }
    }

    const requirementTitles = new Map<string, string>();
    for (const req of (requirementRows as Record<string, any>[]) ?? []) {
      requirementTitles.set(req.id as string, (req.title as string) ?? "Training requirement");
    }

    const employees: EmployeeTrainingSummary[] = ((profileRows as Record<string, any>[]) ?? [])
      .filter((p: Record<string, any>) => p.id)
      .map((profile: Record<string, any>) => {
        const userAssignments = assignmentsByUser.get(profile.id as string) ?? [];
        return {
          userId: profile.id as string,
          name: (profile.full_name as string) ?? "Team member",
          role: (profile.role as string) ?? "member",
          assignments: userAssignments.map((a: Record<string, any>) => {
            const status = String(a.status ?? "missing");
            const dueDate = (a.due_date as string | null) ?? null;
            return {
              assignmentId: a.id as string,
              requirementId: a.training_requirement_id as string,
              requirement: requirementTitles.get(a.training_requirement_id as string) ?? "Training requirement",
              status,
              readiness: trainingReadinessFromStatus(status, dueDate),
              dueDate,
              completedAt: (a.completed_at as string | null) ?? null,
            };
          }),
        };
      });

    const rows = ((requirementRows as Record<string, any>[]) ?? []).map((requirement, index) => {
      const assignment = assignmentsByRequirement.get(requirement.id);
      const document = documents.get(requirement.document_id);
      const status = String(assignment?.status ?? "missing");
      const dueDate = (assignment?.due_date as string | null) ?? null;
      const readiness = trainingReadinessFromStatus(status, dueDate);
      return {
        id: requirement.id ?? `training-${index}`,
        requirement: requirement.title ?? "Training requirement",
        source: requirement.document_id ? "Document linked" : "Role/BioType requirement",
        ownerRole: requirement.role_key ?? summarizeJson(requirement.required_for) ?? "training_owner",
        documentTitle: document?.title ?? "No linked document",
        documentHref: document?.href ?? "/documents",
        assignmentStatus: status,
        dueDate,
        expiryDate: (assignment?.expires_at as string | null) ?? null,
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
    const overdue = rows.filter((row) => row.readiness === "Overdue").length;
    const missing = rows.filter((row) => row.readiness === "Missing").length;
    const current = rows.filter((row) => row.readiness === "Current").length;
    const score = (readinessScore as Record<string, any> | null)?.training_score;

    return {
      counts: [
        { label: "Training requirements", value: rows.length },
        { label: "Current", value: current },
        { label: "Needs review", value: needsReview },
        { label: "Overdue", value: overdue },
        { label: "Expired", value: expired },
        { label: "Missing", value: missing },
        { label: "Change impacts", value: changeImpacts.length }
      ],
      readinessScore: typeof score === "number" ? score : calculateTrainingMatrixReadiness(rows),
      rows: rows.length > 0 ? rows : demoTrainingMatrixSummary().rows,
      changeImpacts,
      biotypeRequirements,
      employees,
      guardrailText: "AI may identify training impact and draft recommendations, but training completion and competency remain human-validated."
    };
  } catch {
    return demoTrainingMatrixSummary();
  }
}
