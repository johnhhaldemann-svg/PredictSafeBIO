"use client";

import { Download } from "lucide-react";
import type { Incident, IncidentType } from "@/lib/supabase/incident-service";

const TYPE_LABELS: Record<IncidentType, string> = {
  near_miss: "Near Miss",
  first_aid: "First Aid Case",
  recordable_injury: "Recordable Injury",
  exposure_event: "Exposure Event",
  property_damage: "Property Damage",
  environmental_release: "Environmental Release",
};

function csv(value: string | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function classifyCase(incident: Incident): string {
  if (incident.incidentType === "recordable_injury" && incident.severity === "critical") return "Days Away from Work";
  if (incident.incidentType === "recordable_injury") return "Job Transfer / Restriction";
  return "Other Recordable";
}

export function OshaLogExportButton({ incidents }: { incidents: Incident[] }) {
  const recordable = incidents.filter((i) => i.isOshaRecordable);

  function downloadOsha300() {
    const header = [
      "Case No.",
      "Date of Injury / Illness",
      "Employee Name",       // must be completed manually
      "Job Title",           // must be completed manually
      "Department",          // must be completed manually
      "Location Where Event Occurred",
      "Description of Injury / Illness",
      "Incident Type",
      "Severity",
      "Status",
      "Classification (29 CFR 1904)",
      "Days Away from Work", // must be completed manually
      "Days Restricted / Transferred", // must be completed manually
      "Reported By",
      "Record ID",
    ].join(",");

    const rows = recordable.map((inc, i) => {
      const caseNo = String(i + 1).padStart(4, "0");
      const dateStr = inc.occurredAt
        ? new Date(inc.occurredAt).toLocaleDateString("en-US")
        : "";
      return [
        caseNo,
        dateStr,
        "",                           // employee name
        "",                           // job title
        "",                           // department
        "",                           // location
        csv(inc.summary ?? inc.title),
        TYPE_LABELS[inc.incidentType] ?? inc.incidentType,
        inc.severity,
        inc.status,
        classifyCase(inc),
        "",                           // days away
        "",                           // days restricted
        csv(inc.reportedBy),
        inc.id,
      ].join(",");
    });

    const disclaimer =
      "# OSHA 300 Log – exported from PredictSafe. " +
      "Columns marked 'must be completed manually' are left blank. " +
      "Review all entries before filing.";

    const content = [disclaimer, header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osha-300-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      className="button-secondary"
      onClick={downloadOsha300}
      type="button"
      disabled={recordable.length === 0}
      title={
        recordable.length === 0
          ? "No OSHA recordable incidents"
          : `Export ${recordable.length} recordable incident${recordable.length !== 1 ? "s" : ""} as OSHA 300 Log`
      }
    >
      <Download size={15} style={{ display: "inline", marginRight: 5 }} />
      OSHA 300 Log ({recordable.length})
    </button>
  );
}
