export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTrainingMatrixSummary } from "@/lib/supabase/training-matrix-service";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const summary = await getTrainingMatrixSummary();

  const lines: string[] = [
    ["Employee", "Role", "Training", "Status", "Readiness", "Due Date", "Completed At"].join(","),
  ];

  for (const emp of summary.employees) {
    if (emp.assignments.length === 0) {
      lines.push(
        [csvEscape(emp.name), csvEscape(emp.role), "—", "—", "—", "—", "—"].join(",")
      );
    } else {
      for (const a of emp.assignments) {
        lines.push(
          [
            csvEscape(emp.name),
            csvEscape(emp.role),
            csvEscape(a.requirement),
            csvEscape(a.status),
            csvEscape(a.readiness),
            a.dueDate ? csvEscape(a.dueDate.slice(0, 10)) : "—",
            a.completedAt ? csvEscape(a.completedAt.slice(0, 10)) : "—",
          ].join(",")
        );
      }
    }
  }

  // Also include role-level requirements with no individual assignments
  if (summary.employees.length === 0) {
    for (const row of summary.rows) {
      lines.push(
        [
          csvEscape(row.ownerRole),
          csvEscape(row.ownerRole),
          csvEscape(row.requirement),
          csvEscape(row.assignmentStatus),
          csvEscape(row.readiness),
          row.dueDate ? csvEscape(row.dueDate.slice(0, 10)) : "—",
          "—",
        ].join(",")
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="training-matrix-${today}.csv"`,
    },
  });
}
