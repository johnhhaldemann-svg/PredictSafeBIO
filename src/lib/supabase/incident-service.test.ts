/**
 * incident-service tests.
 *
 * The service uses server-only imports so direct module import is blocked in
 * vitest. All checks use source-file inspection (the established pattern for
 * server-only service files in this codebase).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  join(process.cwd(), "src", "lib", "supabase", "incident-service.ts"),
  "utf8"
);

// ---------------------------------------------------------------------------
// Label completeness
// ---------------------------------------------------------------------------

describe("incidentStatusLabels completeness", () => {
  const statuses = ["open", "investigating", "contained", "closed"];

  it("has an entry for every status", () => {
    for (const s of statuses) {
      expect(src, `missing label entry for status "${s}"`).toContain(`${s}:`);
    }
  });
});

describe("incidentSeverityLabels completeness", () => {
  const severities = ["low", "medium", "high", "critical"];

  it("has an entry for every severity", () => {
    for (const s of severities) {
      expect(src, `missing label entry for severity "${s}"`).toContain(`${s}:`);
    }
  });
});

describe("incidentTypeLabels completeness", () => {
  const types = [
    "near_miss",
    "first_aid",
    "recordable_injury",
    "exposure_event",
    "property_damage",
    "environmental_release",
  ];

  it("has a label for every incident type", () => {
    // Keys in the label map are unquoted object properties (e.g. `near_miss: "Near Miss"`)
    for (const t of types) {
      expect(src, `missing label entry for type "${t}"`).toContain(`${t}:`);
    }
  });

  it("recordable_injury label contains 'Recordable'", () => {
    const labelBlock = src.slice(
      src.indexOf("incidentTypeLabels"),
      src.indexOf("};", src.indexOf("incidentTypeLabels")) + 2
    );
    expect(labelBlock).toContain("Recordable");
  });
});

// ---------------------------------------------------------------------------
// OSHA recordable scoping
// ---------------------------------------------------------------------------

describe("OSHA_RECORDABLE_TYPES", () => {
  const oshaBlock = src.slice(
    src.indexOf("OSHA_RECORDABLE_TYPES"),
    src.indexOf("];", src.indexOf("OSHA_RECORDABLE_TYPES")) + 2
  );

  it("includes recordable_injury", () => {
    expect(oshaBlock).toContain('"recordable_injury"');
  });

  it("includes exposure_event", () => {
    expect(oshaBlock).toContain('"exposure_event"');
  });

  it("does NOT include near_miss", () => {
    expect(oshaBlock).not.toContain('"near_miss"');
  });

  it("does NOT include first_aid", () => {
    expect(oshaBlock).not.toContain('"first_aid"');
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation — every read query is org-scoped
// ---------------------------------------------------------------------------

describe("tenant isolation", () => {
  it("all Supabase reads on incidents scope to organization_id (≥2 occurrences)", () => {
    const hits = (src.match(/\.eq\("organization_id"/g) ?? []).length;
    expect(hits).toBeGreaterThanOrEqual(2);
  });

  it("createIncident uses context.organizationId, not user-supplied input", () => {
    const block = src.slice(src.indexOf("async function createIncident"));
    expect(block).toContain("context.organizationId");
    expect(block).not.toContain("input.organizationId");
  });

  it("updateIncidentStatus scopes update to both org and incident ID", () => {
    const block = src.slice(src.indexOf("async function updateIncidentStatus"));
    expect(block).toContain('.eq("organization_id", context.organizationId)');
    expect(block).toContain('.eq("id", input.incidentId)');
  });
});

// ---------------------------------------------------------------------------
// Write-guard — auth context checked before any DB write
// ---------------------------------------------------------------------------

describe("write guard", () => {
  it("createIncident checks context before insert", () => {
    const block = src.slice(src.indexOf("async function createIncident"));
    const contextPos = block.indexOf("if (!context)");
    const insertPos = block.indexOf(".insert(");
    expect(contextPos).toBeGreaterThan(-1);
    expect(contextPos).toBeLessThan(insertPos);
  });

  it("updateIncidentStatus checks context before update", () => {
    const block = src.slice(src.indexOf("async function updateIncidentStatus"));
    const contextPos = block.indexOf("if (!context)");
    const updatePos = block.indexOf(".update(");
    expect(contextPos).toBeGreaterThan(-1);
    expect(contextPos).toBeLessThan(updatePos);
  });
});

// ---------------------------------------------------------------------------
// Audit trail — every write records an audit_events row
// ---------------------------------------------------------------------------

describe("audit trail", () => {
  it("createIncident emits an incident_created audit event", () => {
    const block = src.slice(
      src.indexOf("async function createIncident"),
      src.indexOf("async function updateIncidentStatus")
    );
    expect(block).toContain('"incident_created"');
    expect(block).toContain("audit_events");
  });

  it("updateIncidentStatus emits an incident_status_updated audit event", () => {
    const block = src.slice(src.indexOf("async function updateIncidentStatus"));
    expect(block).toContain('"incident_status_updated"');
    expect(block).toContain("audit_events");
  });
});

// ---------------------------------------------------------------------------
// Demo fallback safety
// ---------------------------------------------------------------------------

describe("demo fallback", () => {
  it("demoIncidents does not hardcode a real org ID", () => {
    const demoBlock = src.slice(
      src.indexOf("function demoIncidents"),
      src.indexOf("// ---------------------------------------------------------------------------\n// Read: list")
    );
    expect(demoBlock).toContain('"demo-org"');
    expect(demoBlock).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it("listIncidents falls back to demo data when Supabase is unconfigured", () => {
    const block = src.slice(src.indexOf("async function listIncidents"));
    expect(block).toContain("!isSupabaseConfigured()");
    expect(block).toContain("demoIncidents()");
  });
});

// ---------------------------------------------------------------------------
// Auto-CAPA creation
// ---------------------------------------------------------------------------

describe("auto-CAPA on incident create", () => {
  const block = src.slice(src.indexOf("async function createIncident"));

  it("imports createCapaRecord from capa-service", () => {
    expect(src).toContain('from "./capa-service"');
    expect(src).toContain("createCapaRecord");
  });

  it("calls createCapaRecord after the incident is inserted", () => {
    const insertPos = block.indexOf(".insert(");
    const capaPos   = block.indexOf("createCapaRecord(");
    expect(capaPos).toBeGreaterThan(insertPos);
  });

  it("links the CAPA to the incident via sourceIncidentId", () => {
    expect(block).toContain("sourceIncidentId");
    expect(block).toContain("linkedRecordType");
  });

  it("makes CAPA creation non-fatal with .catch()", () => {
    const capaCall = block.slice(block.indexOf("createCapaRecord("));
    expect(capaCall).toContain(".catch(");
  });
});
