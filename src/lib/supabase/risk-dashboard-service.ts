/**
 * Risk Command Center service.
 * Queries the `risk_cells` table to power the AI Risk dashboard.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CellType =
  | "precursor_cell"
  | "control_cell"
  | "failure_cell"
  | "behavior_cell"
  | "event_cell"
  | "improvement_cell";

export type CellSeverity = "low" | "medium" | "high" | "critical";
export type CellStatus = "active" | "resolved" | "acknowledged";

export type RiskCell = {
  id: string;
  organizationId: string;
  cellType: CellType;
  label: string;
  severity: CellSeverity;
  linkedRecordType?: string | null;
  linkedRecordId?: string | null;
  payload?: Record<string, unknown> | null;
  status: CellStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type RiskSummary = {
  totalActive: number;
  criticalCount: number;
  highCount: number;
  byType: Record<CellType, number>;
  bySeverity: Record<CellSeverity, number>;
  recentCells: RiskCell[];
  topFailures: RiskCell[];
  topPrecursors: RiskCell[];
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const cellTypeLabels: Record<CellType, string> = {
  precursor_cell: "Precursor",
  control_cell: "Control",
  failure_cell: "Failure",
  behavior_cell: "Behavior",
  event_cell: "Event",
  improvement_cell: "Improvement"
};

export const cellTypeDescriptions: Record<CellType, string> = {
  precursor_cell: "Early warning signals before a bigger event",
  control_cell: "Required controls that should be in place",
  failure_cell: "Where the control system broke down",
  behavior_cell: "Human behavior patterns by team or area",
  event_cell: "Something that actually happened",
  improvement_cell: "What worked and should be reused"
};

export const severityClass: Record<CellSeverity, string> = {
  low: "status-current",
  medium: "status-needs-review",
  high: "status-overdue",
  critical: "status-overdue"
};

export const linkedRecordRoutes: Record<string, string> = {
  chemical_inventory: "/chemical-inventory",
  waste_records: "/waste-management",
  capa_records: "/operations/capa",
  controlled_work_permits: "/permits",
  pesticide_disinfectant_records: "/pesticide",
  biosafety_risk_assessments: "/assessments",
  audit_findings: "/inspections",
  assessment_signals: "/assessments",
  ergonomic_risk_signals: "/ergonomics/self-assessment"
};

// ---------------------------------------------------------------------------
// Demo fallbacks
// ---------------------------------------------------------------------------

function demoSummary(): RiskSummary {
  const demo: RiskCell[] = [
    {
      id: "d1", organizationId: "demo", cellType: "failure_cell",
      label: "Chemical: Sodium Azide — SDS not yet uploaded",
      severity: "high", linkedRecordType: "chemical_inventory",
      linkedRecordId: "demo-chem-003", status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "d2", organizationId: "demo", cellType: "control_cell",
      label: "Waste: CHW-2024-001 — 85% full",
      severity: "medium", linkedRecordType: "waste_records",
      linkedRecordId: "demo-waste-001", status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "d3", organizationId: "demo", cellType: "failure_cell",
      label: "Permit: Hot Work — Open >24 hrs",
      severity: "critical", linkedRecordType: "controlled_work_permits",
      linkedRecordId: "demo-permit-001", status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "d4", organizationId: "demo", cellType: "precursor_cell",
      label: "Observation: Ergonomic signal — back strain repeated",
      severity: "medium", linkedRecordType: "ergonomic_risk_signals",
      linkedRecordId: null, status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "d5", organizationId: "demo", cellType: "failure_cell",
      label: "Pesticide deviation: Catchmaster — placed outside approved area",
      severity: "high", linkedRecordType: "pesticide_disinfectant_records",
      linkedRecordId: "demo-pest-002", status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "d6", organizationId: "demo", cellType: "improvement_cell",
      label: "CAPA closed: Sterility assay deviation — verified effective",
      severity: "low", linkedRecordType: "capa_records",
      linkedRecordId: "demo-capa-001", status: "resolved",
      createdAt: new Date().toISOString()
    }
  ];

  return buildSummary(demo);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSummary(cells: RiskCell[]): RiskSummary {
  const active = cells.filter((c) => c.status === "active");

  const byType = {
    precursor_cell: 0, control_cell: 0, failure_cell: 0,
    behavior_cell: 0, event_cell: 0, improvement_cell: 0
  } as Record<CellType, number>;

  const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 } as Record<CellSeverity, number>;

  for (const c of active) {
    byType[c.cellType] = (byType[c.cellType] ?? 0) + 1;
    bySeverity[c.severity] = (bySeverity[c.severity] ?? 0) + 1;
  }

  const sorted = [...active].sort((a, b) => {
    const order: CellSeverity[] = ["critical", "high", "medium", "low"];
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });

  return {
    totalActive: active.length,
    criticalCount: bySeverity.critical,
    highCount: bySeverity.high,
    byType,
    bySeverity,
    recentCells: sorted.slice(0, 10),
    topFailures: sorted.filter((c) => c.cellType === "failure_cell").slice(0, 5),
    topPrecursors: sorted.filter((c) => c.cellType === "precursor_cell").slice(0, 5)
  };
}

function mapRow(row: Record<string, unknown>): RiskCell {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    cellType: (row.cell_type as CellType) ?? "control_cell",
    label: (row.label as string) ?? "",
    severity: (row.severity as CellSeverity) ?? "low",
    linkedRecordType: row.linked_record_type as string | null,
    linkedRecordId: row.linked_record_id as string | null,
    payload: row.payload as Record<string, unknown> | null,
    status: (row.status as CellStatus) ?? "active",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getRiskSummary(): Promise<RiskSummary> {
  if (!isSupabaseConfigured()) return demoSummary();

  try {
    const ctx = await getProfileContext();
    if (!ctx) return demoSummary();

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("risk_cells")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return buildSummary((data ?? []).map(mapRow));
  } catch {
    return demoSummary();
  }
}

export async function getActiveCells(filters?: {
  cellType?: CellType;
  severity?: CellSeverity;
  status?: CellStatus;
}): Promise<RiskCell[]> {
  if (!isSupabaseConfigured()) return demoSummary().recentCells;

  try {
    const ctx = await getProfileContext();
    if (!ctx) return [];

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("risk_cells")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (filters?.cellType) query = query.eq("cell_type", filters.cellType);
    if (filters?.severity) query = query.eq("severity", filters.severity);
    if (filters?.status) {
      query = query.eq("status", filters.status);
    } else {
      query = query.eq("status", "active");
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    return [];
  }
}
