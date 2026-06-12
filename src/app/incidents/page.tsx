export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock,
  Eye,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OshaLogExportButton } from "@/components/OshaLogExportButton";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { DataLoadError } from "@/components/DataLoadError";
import {
  listIncidents,
  incidentStatusLabels,
  incidentTypeLabels,
  incidentSeverityLabels,
  incidentTypeOptions,
  incidentSeverityOptions,
  type IncidentStatus,
  type IncidentSeverity,
} from "@/lib/supabase/incident-service";
import { createIncidentAction } from "./actions";

export const metadata: Metadata = { title: "Incident Reporting – PredictSafe" };

const STATUS_CLASS: Record<IncidentStatus, string> = {
  open:          "status-missing",
  investigating: "status-needs-review",
  contained:     "status-needs-review",
  closed:        "status-current",
};

const STATUS_ICON: Record<IncidentStatus, typeof AlertCircle> = {
  open:          AlertCircle,
  investigating: Eye,
  contained:     ShieldAlert,
  closed:        CheckCircle2,
};

const SEVERITY_CLASS: Record<IncidentSeverity, string> = {
  critical: "status-missing",
  high:     "status-missing",
  medium:   "status-needs-review",
  low:      "status-current",
};

type Props = {
  searchParams: Promise<{ message?: string; filter?: string; severity?: string }>;
};

export default async function IncidentReportingPage({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = (params.filter as IncidentStatus | "all") ?? "all";
  const filterSeverity = (params.severity as IncidentSeverity | "all") ?? "all";

  const [allRecordsResult, adminAccess] = await Promise.all([
    listIncidents().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  const loadFailed = allRecordsResult === null;
  const allRecords = allRecordsResult ?? [];
  const records = allRecords.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterSeverity !== "all" && r.severity !== filterSeverity) return false;
    return true;
  });

  const openCount          = allRecords.filter((r) => r.status === "open").length;
  const investigatingCount = allRecords.filter((r) => r.status === "investigating").length;
  const criticalCount      = allRecords.filter((r) => r.severity === "critical" || r.severity === "high").length;
  const oshaCount          = allRecords.filter((r) => r.isOshaRecordable).length;
  const closedCount        = allRecords.filter((r) => r.status === "closed").length;

  // Per-status counts for filter badges
  const statusCounts: Record<string, number> = {};
  (["open", "investigating", "contained", "closed"] as const).forEach((s) => {
    statusCounts[s] = allRecords.filter((r) => r.status === s).length;
  });
  const severityCounts: Record<string, number> = {};
  (["critical", "high", "medium", "low"] as const).forEach((s) => {
    severityCounts[s] = allRecords.filter((r) => r.severity === s).length;
  });

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

        {/* Summary cards */}
        <section className="command-card-grid" aria-label="Incident summary">
          <article className={`command-card ${openCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertCircle size={16} /></span><strong>Open</strong></div>
            <small>{openCount}</small>
            <em>{openCount > 0 ? "Require investigation or action." : "No open incidents."}</em>
          </article>
          <article className={`command-card ${investigatingCount > 0 ? "platform-blue" : "platform-green"}`}>
            <div><span><Eye size={16} /></span><strong>Investigating</strong></div>
            <small>{investigatingCount}</small>
            <em>Active RCA underway.</em>
          </article>
          <article className={`command-card ${criticalCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><AlertTriangle size={16} /></span><strong>High / Critical</strong></div>
            <small>{criticalCount}</small>
            <em>{criticalCount > 0 ? "Escalated severity — priority response." : "No high/critical incidents."}</em>
          </article>
          <article className={`command-card ${oshaCount > 0 ? "platform-blue" : "platform-green"}`}>
            <div><span><Clock size={16} /></span><strong>OSHA Recordable</strong></div>
            <small>{oshaCount}</small>
            <em>Must appear on 300 Log within 7 days.</em>
          </article>
          <article className="command-card platform-green">
            <div><span><CheckCircle2 size={16} /></span><strong>Closed</strong></div>
            <small>{closedCount}</small>
            <em>Investigation complete, CAPA verified.</em>
          </article>
        </section>

        {/* OSHA obligation banner */}
        <div className="ai-context-bar ai-context-bar--warning">
          <Clock size={15} />
          <span>
            <strong>OSHA reporting deadlines:</strong> Recordable incidents → 300 Log within{" "}
            <strong>7 days</strong>. Fatalities &amp; hospitalisations → OSHA within{" "}
            <strong>8 hours</strong>. Amputations &amp; eye losses → OSHA within <strong>24 hours</strong>.
          </span>
        </div>

        {criticalCount > 0 && (
          <div className="ai-context-bar ai-context-bar--danger">
            <AlertTriangle size={15} />
            <span>
              <strong>{criticalCount} high/critical incident{criticalCount !== 1 ? "s" : ""} open.</strong>{" "}
              Priority response required.
            </span>
            <Link className="ai-fill-btn ai-fill-btn--danger" href="/incidents?severity=critical">
              View critical
            </Link>
          </div>
        )}

        {params.message && <p className="form-message">{params.message}</p>}

        {/* Status filter */}
        <nav className="command-center-link-strip" aria-label="Incident status filter">
          <Link href="/incidents" className={`button-secondary compact ${filterStatus === "all" && filterSeverity === "all" ? "active-filter" : ""}`}>
            All
            <span className="filter-count-badge">{allRecords.length}</span>
          </Link>
          {(["open", "investigating", "contained", "closed"] as const).map((s) => (
            <Link
              key={s}
              href={`/incidents?filter=${s}`}
              className={`button-secondary compact ${filterStatus === s ? "active-filter" : ""}`}
            >
              {incidentStatusLabels[s]}
              <span className="filter-count-badge">{statusCounts[s] ?? 0}</span>
            </Link>
          ))}
        </nav>

        {/* Severity filter */}
        <nav className="command-center-link-strip" aria-label="Incident severity filter">
          {(["critical", "high", "medium", "low"] as const).map((s) => (
            <Link
              key={`sev-${s}`}
              href={`/incidents?severity=${s}`}
              className={`button-secondary compact ${filterSeverity === s ? "active-filter" : ""}`}
            >
              {incidentSeverityLabels[s as IncidentSeverity]}
              {(severityCounts[s] ?? 0) > 0 && <span className="filter-count-badge">{severityCounts[s]}</span>}
            </Link>
          ))}
        </nav>

        {/* Incident list */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Incident Register</p>
              <h2>
                {records.length === allRecords.length
                  ? `${allRecords.length} record${allRecords.length !== 1 ? "s" : ""}`
                  : `${records.length} of ${allRecords.length} shown`}
              </h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="incident records" />
          ) : records.length === 0 ? (
            <p className="muted">No incidents found. Log one below when an event occurs.</p>
          ) : (
            <div className="action-list">
              {records.map((incident) => {
                const StatusIcon = STATUS_ICON[incident.status];
                return (
                  <article className="action-row" key={incident.id}>
                    <div>
                      <strong>
                        <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
                      </strong>
                      <span className={STATUS_CLASS[incident.status]}>
                        <StatusIcon size={13} style={{ display: "inline", marginRight: 4 }} />
                        {incidentStatusLabels[incident.status]}
                      </span>
                      <span className={SEVERITY_CLASS[incident.severity]}>
                        {incidentSeverityLabels[incident.severity]}
                      </span>
                      {incident.isOshaRecordable && (
                        <span className="status-missing">OSHA Recordable</span>
                      )}
                    </div>
                    <p>
                      {incidentTypeLabels[incident.incidentType]}
                      {incident.occurredAt
                        ? ` · Occurred ${new Date(incident.occurredAt).toLocaleDateString()}`
                        : ""}
                      {incident.summary
                        ? ` · ${incident.summary.slice(0, 80)}${incident.summary.length > 80 ? "…" : ""}`
                        : ""}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

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
                <input
                  name="occurredAt"
                  type="datetime-local"
                />
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

              <button type="submit" className="button-primary">
                Log Incident
              </button>
            </form>
          </section>
        )}

        {!adminAccess.signedIn && (
          <section className={`panel access-banner access-readonly`}>
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
          </div>
          <div className="command-center-link-strip">
            <Link href="/operations/capa" className="button-secondary">CAPA Records →</Link>
            <Link href="/risk-command-center" className="button-secondary">Risk Monitor →</Link>
            <Link href="/inspections" className="button-secondary">Inspections →</Link>
            <Link href="/monitoring/exposure" className="button-secondary">Exposure Monitoring →</Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
