import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import {
  getIncident,
  incidentStatusLabels,
  incidentTypeLabels,
  incidentSeverityLabels,
  type IncidentStatus,
} from "@/lib/supabase/incident-service";
import { updateIncidentStatusAction } from "../actions";

export const metadata: Metadata = { title: "Incident Detail – PredictSafeBIO" };

const STATUS_ICON: Record<IncidentStatus, typeof AlertCircle> = {
  open:          AlertCircle,
  investigating: Eye,
  contained:     ShieldAlert,
  closed:        CheckCircle2,
};

const STATUS_CLASS: Record<IncidentStatus, string> = {
  open:          "status-missing",
  investigating: "status-needs-review",
  contained:     "status-needs-review",
  closed:        "status-current",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
};

export default async function IncidentDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const [incident, adminAccess] = await Promise.all([
    getIncident(id).catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  if (!incident) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <p className="section-label">Operate</p>
            <h1>Incident not found</h1>
          </header>
          <Link href="/incidents" className="button-secondary">Back to Incident Register</Link>
        </div>
      </AppShell>
    );
  }

  const StatusIcon = STATUS_ICON[incident.status];
  const isActive = incident.status !== "closed";

  const NEXT_STATUSES: Record<IncidentStatus, IncidentStatus[]> = {
    open:          ["investigating", "contained", "closed"],
    investigating: ["contained", "closed"],
    contained:     ["closed"],
    closed:        [],
  };

  const nextStatuses = NEXT_STATUSES[incident.status];

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">
            <Link href="/incidents">Incident Register</Link> / Detail
          </p>
          <h1>{incident.title}</h1>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
            <span className={STATUS_CLASS[incident.status]}>
              <StatusIcon size={13} style={{ display: "inline", marginRight: 4 }} />
              {incidentStatusLabels[incident.status]}
            </span>
            <span className={incident.severity === "critical" || incident.severity === "high" ? "status-missing" : "status-needs-review"}>
              {incidentSeverityLabels[incident.severity]}
            </span>
            {incident.isOshaRecordable && (
              <span className="status-missing">OSHA Recordable</span>
            )}
          </div>
        </header>

        {sp.message && <p className="form-message">{sp.message}</p>}

        {/* Incident details */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Incident Details</p>
              <h2>{incidentTypeLabels[incident.incidentType]}</h2>
            </div>
            <FileText size={20} />
          </div>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: ".85rem" }}>
            <div>
              <dt style={{ fontWeight: 700, color: "var(--muted)", marginBottom: "2px" }}>Type</dt>
              <dd>{incidentTypeLabels[incident.incidentType]}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 700, color: "var(--muted)", marginBottom: "2px" }}>Severity</dt>
              <dd>{incidentSeverityLabels[incident.severity]}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 700, color: "var(--muted)", marginBottom: "2px" }}>Status</dt>
              <dd>{incidentStatusLabels[incident.status]}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 700, color: "var(--muted)", marginBottom: "2px" }}>Occurred</dt>
              <dd>
                {incident.occurredAt
                  ? new Date(incident.occurredAt).toLocaleString()
                  : "Not recorded"}
              </dd>
            </div>
            <div>
              <dt style={{ fontWeight: 700, color: "var(--muted)", marginBottom: "2px" }}>Reported</dt>
              <dd>{incident.createdAt ? new Date(incident.createdAt).toLocaleString() : "—"}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 700, color: "var(--muted)", marginBottom: "2px" }}>OSHA Recordable</dt>
              <dd>{incident.isOshaRecordable ? "Yes — must appear on 300 Log within 7 days" : "No"}</dd>
            </div>
          </dl>
          {incident.summary && (
            <div style={{ marginTop: "16px", padding: "14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <p style={{ fontWeight: 700, fontSize: ".8rem", color: "var(--muted)", marginBottom: "6px" }}>SUMMARY</p>
              <p style={{ fontSize: ".88rem", lineHeight: 1.6 }}>{incident.summary}</p>
            </div>
          )}
        </section>

        {/* Status advancement */}
        {adminAccess.signedIn && isActive && nextStatuses.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Update Status</p>
                <h2>Advance investigation</h2>
              </div>
              <Clock size={20} />
            </div>
            <p className="muted">Move this incident through the investigation workflow.</p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
              {nextStatuses.map((s) => {
                const Icon = STATUS_ICON[s];
                return (
                  <form action={updateIncidentStatusAction} key={s}>
                    <input type="hidden" name="incidentId" value={incident.id} />
                    <input type="hidden" name="status" value={s} />
                    <input type="hidden" name="returnTo" value={`/incidents/${incident.id}`} />
                    <button type="submit" className="button-secondary compact">
                      <Icon size={13} style={{ display: "inline", marginRight: 4 }} />
                      Mark as {incidentStatusLabels[s]}
                    </button>
                  </form>
                );
              })}
            </div>
          </section>
        )}

        {/* CAPA link */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Investigation &amp; Corrective Action</p>
              <h2>CAPA</h2>
            </div>
          </div>
          <p className="muted">
            Open a CAPA record to document root cause analysis, corrective actions, and effectiveness
            verification for this incident.
          </p>
          <div className="command-center-link-strip" style={{ marginTop: "12px" }}>
            <Link
              href={`/operations/capa?message=Create a CAPA linked to incident: ${encodeURIComponent(incident.title)}`}
              className="button-primary"
            >
              Open CAPA for this incident →
            </Link>
            <Link href="/operations/capa" className="button-secondary">
              View all CAPAs
            </Link>
          </div>
        </section>

        {/* Footer nav */}
        <Link href="/incidents" className="button-secondary" style={{ alignSelf: "flex-start" }}>
          ← Back to Incident Register
        </Link>
      </div>
    </AppShell>
  );
}
