export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  getHazardById,
  hazardTypeLabels,
  hazardStatusLabels,
} from "@/lib/supabase/hazard-service";
import { archiveHazardAction } from "@/app/hazards/actions";

export const metadata: Metadata = { title: "Hazard Detail – PredictSafe" };

const STATUS_COLOR: Record<string, string> = {
  identified:  "var(--status-red, #ef4444)",
  assessed:    "var(--status-amber, #f59e0b)",
  controlled:  "var(--status-green, #22c55e)",
  retired:     "var(--color-text-muted, #94a3b8)",
};

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="hz-detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function HazardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hazard = await getHazardById(id);
  if (!hazard) notFound();

  const statusColor = STATUS_COLOR[hazard.status] ?? "#94a3b8";
  const createdDate = hazard.createdAt
    ? new Date(hazard.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const updatedDate = hazard.updatedAt
    ? new Date(hazard.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <AppShell>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="hz-page">
        {/* Breadcrumb / back */}
        <div className="hz-eyebrow">
          <Link href="/hazards" className="hz-back">← Hazard Register</Link>
          <span>/ {hazard.name}</span>
        </div>

        {/* Header */}
        <div className="hz-head">
          <div>
            <div className="hz-label">● Assess · Stage 3 · Hazard</div>
            <h1>{hazard.name}</h1>
            <div className="hz-chips">
              <span className="hz-chip">{hazardTypeLabels[hazard.hazardType]}</span>
              {hazard.bslLevel && hazard.bslLevel !== "n/a" && (
                <span className="hz-chip">{hazard.bslLevel}</span>
              )}
              <span className="hz-status" style={{ color: statusColor }}>
                ● {hazardStatusLabels[hazard.status]}
              </span>
            </div>
          </div>
          <div className="hz-head-actions">
            <Link href="/hazards/new" className="btn-ghost">＋ Add Hazard</Link>
            <Link href="/hazards" className="btn-ghost">← Back to Register</Link>
          </div>
        </div>

        <div className="hz-body">
          {/* Details card */}
          <div className="hz-card">
            <div className="hz-card-title">Hazard Details</div>
            <dl className="hz-details">
              <DetailRow label="Hazard type"          value={hazardTypeLabels[hazard.hazardType]} />
              <DetailRow label="Status"               value={hazardStatusLabels[hazard.status]} />
              <DetailRow label="BSL level"            value={hazard.bslLevel && hazard.bslLevel !== "n/a" ? hazard.bslLevel : null} />
              <DetailRow label="Location / lab"       value={hazard.location} />
              <DetailRow label="Containment"          value={hazard.containment} />
              <DetailRow label="Associated material"  value={hazard.associatedMaterial} />
              <DetailRow label="Risk family"          value={hazard.riskFamily} />
            </dl>

            {hazard.description && (
              <>
                <div className="hz-divider" />
                <div className="hz-card-title">Description / Notes</div>
                <p className="hz-desc">{hazard.description}</p>
              </>
            )}

            {(createdDate || updatedDate) && (
              <>
                <div className="hz-divider" />
                <div className="hz-meta-row">
                  {createdDate && <span>Created {createdDate}</span>}
                  {updatedDate && createdDate !== updatedDate && <span>· Updated {updatedDate}</span>}
                </div>
              </>
            )}
          </div>

          {/* Actions card */}
          <div className="hz-card hz-actions-card">
            <div className="hz-card-title">Actions</div>
            <Link href="/hazards/new" className="btn-primary hz-action-btn">
              ＋ Add another hazard
            </Link>
            {hazard.status !== "retired" && (
              <form action={archiveHazardAction}>
                <input type="hidden" name="id" value={hazard.id} />
                <button type="submit" className="btn-danger hz-action-btn">
                  Retire this hazard
                </button>
              </form>
            )}
            <div className="hz-ai-note">
              <span className="dot" />
              <p>
                <b>Predictive Engine</b> — this hazard is scored as a leading indicator.
                Retiring it will resolve its associated risk signal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const STYLES = `
.hz-page{padding:0}
.hz-eyebrow{font-size:11px;color:#94a3b8;margin-bottom:14px;display:flex;align-items:center;gap:6px}
.hz-back{color:#2563eb;text-decoration:none;font-weight:600}
.hz-back:hover{text-decoration:underline}
.hz-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}
.hz-label{font-size:10px;letter-spacing:.14em;color:#2563eb;font-weight:700;text-transform:uppercase;margin-bottom:4px}
.hz-page h1{font-size:22px;font-weight:700;letter-spacing:-.01em;color:#0f2647;margin-bottom:8px}
.hz-chips{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.hz-chip{background:#eef2f8;border:1px solid #e2e8f0;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;color:#475569}
.hz-status{font-size:11.5px;font-weight:700}
.hz-head-actions{display:flex;gap:9px;flex-shrink:0}
.btn-ghost{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:500;color:#475569;text-decoration:none;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.btn-ghost:hover{border-color:#2563eb;color:#2563eb}
.btn-primary{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;box-shadow:0 4px 14px rgba(37,99,235,.3);text-decoration:none}
.btn-danger{background:#fff;border:1px solid #fca5a5;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:600;cursor:pointer;color:#ef4444;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;width:100%}
.btn-danger:hover{background:#fef2f2}
.hz-body{display:grid;grid-template-columns:1fr 280px;gap:16px;align-items:start}
@media(max-width:700px){.hz-body{grid-template-columns:1fr}}
.hz-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(15,38,71,.05)}
.hz-card-title{font-size:10.5px;letter-spacing:.08em;color:#94a3b8;text-transform:uppercase;font-weight:700;margin-bottom:14px}
.hz-details{display:flex;flex-direction:column;gap:10px}
.hz-detail-row{display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:baseline}
.hz-detail-row dt{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em}
.hz-detail-row dd{font-size:13px;color:#0f2647;font-weight:500}
.hz-divider{height:1px;background:#e2e8f0;margin:16px 0}
.hz-desc{font-size:13px;color:#475569;line-height:1.6}
.hz-meta-row{font-size:10.5px;color:#94a3b8}
.hz-actions-card{display:flex;flex-direction:column;gap:10px}
.hz-action-btn{width:100%;justify-content:center}
.hz-ai-note{background:linear-gradient(100deg,#1c1740,#0f2647);border:1px solid rgba(168,85,247,.4);border-radius:10px;padding:11px 13px;display:flex;align-items:flex-start;gap:10px;margin-top:4px}
.hz-ai-note .dot{width:8px;height:8px;border-radius:50%;background:#a855f7;box-shadow:0 0 0 3px rgba(168,85,247,.25);flex-shrink:0;margin-top:3px}
.hz-ai-note p{font-size:11px;color:#9fb4d4;line-height:1.5}
.hz-ai-note b{color:#d8b4fe}
`;
