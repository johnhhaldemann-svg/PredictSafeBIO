export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OshaLogExportButton } from "@/components/OshaLogExportButton";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { DataLoadError } from "@/components/DataLoadError";
import {
  listIncidents,
  incidentTypeLabels,
  incidentTypeOptions,
  incidentSeverityOptions,
  incidentSeverityLabels,
  type IncidentStatus,
  type IncidentSeverity,
} from "@/lib/supabase/incident-service";
import { createIncidentAction } from "./actions";
import IncidentRegister, { type ViewIncident, type IncidentStat, type IncidentSev } from "@/components/IncidentRegister";

export const metadata: Metadata = { title: "Incident Reporting – PredictSafe" };

type Props = {
  searchParams: Promise<{ message?: string; filter?: string; severity?: string }>;
};

export default async function IncidentReportingPage({ searchParams }: Props) {
  const params = await searchParams;

  const [allRecordsResult, adminAccess] = await Promise.all([
    listIncidents().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  const loadFailed  = allRecordsResult === null;
  const allRecords  = allRecordsResult ?? [];

  const openCount          = allRecords.filter((r) => r.status === "open").length;
  const investigatingCount = allRecords.filter((r) => r.status === "investigating").length;
  const criticalCount      = allRecords.filter((r) => r.severity === "critical" || r.severity === "high").length;
  const oshaCount          = allRecords.filter((r) => r.isOshaRecordable).length;

  // Map to ViewIncident — compute OSHA deadline from occurredAt
  const now = Date.now();
  const viewIncidents: ViewIncident[] = allRecords.map((r) => {
    const ms     = r.occurredAt ? now - new Date(r.occurredAt).getTime() : 0;
    const daysAgo = Math.max(0, Math.floor(ms / 86400000));
    return {
      id:               r.id,
      title:            r.title,
      incidentType:     r.incidentType,
      incidentTypeLabel: incidentTypeLabels[r.incidentType],
      severity:         r.severity,
      status:           r.status,
      isOshaRecordable: r.isOshaRecordable ?? false,
      occurredLabel:    r.occurredAt ? new Date(r.occurredAt).toLocaleDateString() : "—",
      daysAgo,
      summary:          r.summary ?? null,
      oshaDueIn:        r.isOshaRecordable ? Math.max(0, 7 - daysAgo) : null,
    };
  });

  // Honour URL filter params for deep-link backwards-compatibility
  const initialStatus   = (params.filter   as IncidentStat | "all") ?? "all";
  const initialSeverity = (params.severity as IncidentSev  | "all") ?? "all";

  return (
    <AppShell>
      <div className="page-stack">

        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Operate · Incident Reporting</p>
            <h1>Incident Register</h1>
            <p className="muted">
              Log safety incidents within 24 hours. Every report auto-creates a CAPA for root-cause
              investigation.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <OshaLogExportButton incidents={allRecords} />
            <Link className="button-secondary" href="/operations/capa">CAPA Records →</Link>
          </div>
        </header>

        {/* KPI strip */}
        <section className="kpi-grid" aria-label="Incident summary">
          <div className={`kpi-card ${openCount > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
            <div className="kpi-label">Open</div>
            <div className="kpi-value">{openCount}</div>
            <div className="kpi-sub">{openCount > 0 ? "Require action" : "None open"}</div>
          </div>
          <div className={`kpi-card ${investigatingCount > 0 ? "kpi-card--amber" : "kpi-card--green"}`}>
            <div className="kpi-label">Investigating</div>
            <div className="kpi-value">{investigatingCount}</div>
            <div className="kpi-sub">Active RCA underway</div>
          </div>
          <div className={`kpi-card ${criticalCount > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
            <div className="kpi-label">High / Critical</div>
            <div className="kpi-value">{criticalCount}</div>
            <div className="kpi-sub">{criticalCount > 0 ? "Priority response" : "None high/critical"}</div>
          </div>
          <div className={`kpi-card ${oshaCount > 0 ? "kpi-card--purple" : "kpi-card--green"}`}>
            <div className="kpi-label">OSHA Recordable</div>
            <div className="kpi-value">{oshaCount}</div>
            <div className="kpi-sub">300 Log within 7 days</div>
          </div>
        </section>

        {params.message && <p className="form-message">{params.message}</p>}

        {/* Interactive panels: Clock, analytics, filters, incident list */}
        {loadFailed ? (
          <DataLoadError resource="incident records" />
        ) : (
          <IncidentRegister
            incidents={viewIncidents}
            initialStatus={initialStatus}
            initialSeverity={initialSeverity}
          />
        )}

        {/* Report new incident form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Report Incident</p>
                <h2>Log a new incident</h2>
              </div>
              <Plus size={22} />
            </div>
            <p className="muted">
              Report within 24 hours. A CAPA record will be auto-linked for root cause investigation.
              All recordable injuries must be entered on the OSHA 300 Log within 7 days.
            </p>

            <form action={createIncidentAction} className="stacked-form">
              <label>
                Title *
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="Brief description of what happened"
                  maxLength={200}
                />
              </label>

              <div className="form-grid">
                <label>
                  Incident type *
                  <select name="incidentType" required defaultValue="">
                    <option value="" disabled>Select type…</option>
                    {incidentTypeOptions.map((t) => (
                      <option key={t} value={t}>{incidentTypeLabels[t]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Severity *
                  <select name="severity" required defaultValue="medium">
                    {incidentSeverityOptions.map((s) => (
                      <option key={s} value={s}>{incidentSeverityLabels[s]}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Date / time of occurrence
                <input name="occurredAt" type="datetime-local" />
              </label>

              <label>
                Summary
                <textarea
                  name="summary"
                  rows={3}
                  placeholder="What happened, where, who was involved, immediate actions taken…"
                  maxLength={2000}
                />
              </label>

              <button type="submit" className="button-primary">Log Incident</button>
            </form>
          </section>
        )}

        {!adminAccess.signedIn && (
          <section className="panel access-banner access-readonly">
            <strong>Sign in to report incidents</strong>
            <span>
              <Link href="/login">Sign in</Link> to log and manage incident records.
            </span>
          </section>
        )}

        {/* Cross-links */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Linked modules</p>
              <h2>Investigate &amp; respond</h2>
            </div>
            <ShieldAlert size={20} />
          </div>
          <div className="command-center-link-strip">
            <Link href="/operations/capa"      className="button-secondary">CAPA Records →</Link>
            <Link href="/risk-command-center"  className="button-secondary">Risk Monitor →</Link>
            <Link href="/inspections"          className="button-secondary">Inspections →</Link>
            <Link href="/monitoring/exposure"  className="button-secondary">Exposure Monitoring →</Link>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
