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

export const metadata: Metadata = { title: "Incident Reporting – PredictSafeBIO" };

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

  const [recordsResult, adminAccess] = await Promise.all([
    listIncidents(
      filterStatus !== "all" || filterSeverity !== "all"
        ? {
            status: filterStatus !== "all" ? filterStatus : undefined,
            severity: filterSeverity !== "all" ? filterSeverity : undefined,
          }
        : undefined
    ).catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  const loadFailed = recordsResult === null;
  const records = recordsResult ?? [];

  const openCount      = records.filter((r) => r.status === "open").length;
  const investigatingCount = records.filter((r) => r.status === "investigating").length;
  const criticalCount  = records.filter((r) => r.severity === "critical" || r.severity === "high").length;
  const oshaCount      = records.filter((r) => r.isOshaRecordable).length;
  const closedCount    = records.filter((r) => r.status === "closed").length;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Operate · Incident Reporting</p>
          <h1>Incident Register</h1>
          <p className="muted">
            Log safety incidents within 24 hours. Every report auto-creates a CAPA entry for root
            cause investigation and feeds trend data into the Predictive Engine.
          </p>
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
        <div style={{
          background: "#fef3c7",
          border: "1px solid #fbbf24",
          borderRadius: "8px",
          padding: "14px 18px",
          fontSize: ".83rem",
          color: "#78350f",
          lineHeight: 1.6,
        }}>
          <strong>⏱ OSHA reporting deadlines:</strong> Recordable incidents → 300 Log within{" "}
          <strong>7 days</strong>. Fatalities & in-patient hospitalisations → OSHA within{" "}
          <strong>8 hours</strong>. Amputations & eye losses → OSHA within <strong>24 hours</strong>.
        </div>

        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Incident status filter">
          {(["all", "open", "investigating", "contained", "closed"] as const).map((s) => (
            <Link
              key={s}
              href={s === "all" ? "/incidents" : `/incidents?filter=${s}`}
              className={`button-secondary compact ${filterStatus === s ? "active-filter" : ""}`}
            >
              {s === "all" ? "All" : incidentStatusLabels[s]}
            </Link>
          ))}
          <span style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
          {(["all", "critical", "high", "medium", "low"] as const).map((s) => (
            <Link
              key={`sev-${s}`}
              href={s === "all" ? "/incidents" : `/incidents?severity=${s}`}
              className={`button-secondary compact ${filterSeverity === s ? "active-filter" : ""}`}
            >
              {s === "all" ? "All severities" : incidentSeverityLabels[s as IncidentSeverity]}
            </Link>
          ))}
        </nav>

        {/* Incident list */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Incident Register</p>
              <h2>{records.length} record{records.length !== 1 ? "s" : ""}</h2>
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
                      <span className={SEVERITY_CLASS[incident.severity]}
                        style={{ marginLeft: 6 }}
                      >
                        {incidentSeverityLabels[incident.severity]}
                      </span>
                      {incident.isOshaRecordable && (
                        <span className="status-missing" style={{ marginLeft: 6 }}>OSHA Recordable</span>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
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
