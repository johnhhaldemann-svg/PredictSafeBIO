'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export type IncidentSev  = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStat = 'open' | 'investigating' | 'contained' | 'closed';

export interface ViewIncident {
  id: string;
  title: string;
  incidentType: string;       // raw key e.g. "near_miss"
  incidentTypeLabel: string;  // display e.g. "Near Miss"
  severity: IncidentSev;
  status: IncidentStat;
  isOshaRecordable: boolean;
  occurredLabel: string;
  daysAgo: number;
  summary: string | null;
  oshaDueIn: number | null;   // null when not recordable
}

/* ─── Reference ─────────────────────────────────────────────────────────────── */

const STAT_CLS: Record<IncidentStat, string> = {
  open: 'status-overdue', investigating: 'status-needs-review',
  contained: 'status-chip', closed: 'status-ok',
};
const STAT_LABEL: Record<IncidentStat, string> = {
  open: 'Open', investigating: 'Investigating', contained: 'Contained', closed: 'Closed',
};
const SEV_CLS: Record<IncidentSev, string> = {
  critical: 'status-overdue', high: 'status-overdue',
  medium: 'status-needs-review', low: 'status-ok',
};
const SEV_LABEL: Record<IncidentSev, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
};

/* ─── Component ─────────────────────────────────────────────────────────────── */

interface Props {
  incidents: ViewIncident[];
  initialStatus?: IncidentStat | 'all';
  initialSeverity?: IncidentSev | 'all';
}

export default function IncidentRegister({
  incidents,
  initialStatus  = 'all',
  initialSeverity = 'all',
}: Props) {
  const [statusFilter, setStatusFilter] = useState<IncidentStat | 'all'>(initialStatus);
  const [sevFilter,    setSevFilter]    = useState<IncidentSev   | 'all'>(initialSeverity);

  const sc = useMemo(() => ({
    open:          incidents.filter((i) => i.status === 'open').length,
    investigating: incidents.filter((i) => i.status === 'investigating').length,
    contained:     incidents.filter((i) => i.status === 'contained').length,
    closed:        incidents.filter((i) => i.status === 'closed').length,
  }), [incidents]);

  const vc = useMemo(() => ({
    critical: incidents.filter((i) => i.severity === 'critical').length,
    high:     incidents.filter((i) => i.severity === 'high').length,
    medium:   incidents.filter((i) => i.severity === 'medium').length,
    low:      incidents.filter((i) => i.severity === 'low').length,
  }), [incidents]);

  const recordable    = useMemo(() => incidents.filter((i) => i.isOshaRecordable), [incidents]);
  const nearMissCount = useMemo(() => incidents.filter((i) => i.incidentType === 'near_miss').length, [incidents]);
  const nearMissPct   = incidents.length > 0 ? Math.round((nearMissCount / incidents.length) * 100) : 0;
  const lastRec       = recordable[0];

  const highCritOpen = useMemo(() =>
    incidents.filter((i) => (i.severity === 'high' || i.severity === 'critical') && i.status !== 'closed').length,
  [incidents]);

  const rows = useMemo(() => incidents.filter((i) =>
    (statusFilter === 'all' || i.status === statusFilter) &&
    (sevFilter    === 'all' || i.severity === sevFilter),
  ), [incidents, statusFilter, sevFilter]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: IR_STYLES }} />

      {/* ── Regulatory Reporting Clock ── */}
      <div className="panel ir-clock">
        <div className="ir-clock-hd">
          <div>
            <p className="section-label">Regulatory Reporting Clock</p>
            <h2>OSHA reporting deadlines</h2>
          </div>
          <div className="ir-rules">
            <span className="ir-rule">
              <b>8 hr</b> Fatality / hospitalisation <em className="ir-ok">0 active</em>
            </span>
            <span className="ir-rule">
              <b>24 hr</b> Amputation / eye loss <em className="ir-ok">0 active</em>
            </span>
            <span className={`ir-rule ${recordable.length > 0 ? 'ir-rule--active' : ''}`}>
              <b>7 day</b> Recordable → 300 Log{' '}
              {recordable.length > 0
                ? <em className="ir-hot-txt">{recordable.length} active</em>
                : <em className="ir-ok">0 active</em>}
            </span>
          </div>
        </div>
        {recordable.length === 0 ? (
          <p className="muted">No active OSHA reporting deadlines.</p>
        ) : (
          <div className="ir-clockrows">
            {recordable.map((i) => (
              <div className="ir-clockrow" key={i.id}>
                <div>
                  <p className="ir-clk-title">{i.title}</p>
                  <p className="ir-clk-rule">OSHA 300 Log — within 7 days of occurrence</p>
                </div>
                <div className="ir-clk-r">
                  <div className={`ir-clk-count ${(i.oshaDueIn ?? 99) <= 2 ? 'ir-hot' : 'ir-warn'}`}>
                    {i.oshaDueIn} days left
                  </div>
                  <div className="ir-clk-occ">Occurred {i.occurredLabel}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Critical alert ── */}
      {highCritOpen > 0 && (
        <div className="ir-alert">
          <span className="ir-alert-dot" />
          <div>
            <b>{highCritOpen} high/critical incident{highCritOpen !== 1 ? 's' : ''} open.</b>{' '}
            Priority response required.
          </div>
          <button
            className="ir-alert-link"
            onClick={() => { setStatusFilter('open'); setSevFilter('high'); }}
          >
            View critical →
          </button>
        </div>
      )}

      {/* ── Analytics strip ── */}
      <div className="panel">
        <p className="section-label">Incident Analytics · last 90 days</p>
        <h2 className="ir-perf-h2">Leading indicators</h2>
        <div className="ir-tiles">
          <div className="ir-tile">
            <div className="ir-tile-num">{lastRec?.daysAgo ?? '—'}</div>
            <div className="ir-tile-lbl">Days since last recordable</div>
            <div className="ir-tile-sub">
              {lastRec
                ? (lastRec.title.length > 36 ? lastRec.title.slice(0, 36) + '…' : lastRec.title)
                : 'No recordables'}
            </div>
          </div>
          <div className="ir-tile">
            <div className="ir-tile-num ir-green">{nearMissPct}%</div>
            <div className="ir-tile-lbl">Near-miss reporting rate</div>
            <div className="ir-tile-sub">{nearMissCount} of {incidents.length} reports</div>
          </div>
          <div className="ir-tile">
            <div className="ir-tile-num">{incidents.length}</div>
            <div className="ir-tile-lbl">Incidents (90 d)</div>
            <div className="ir-tile-sub">H {vc.high} · M {vc.medium} · L {vc.low}</div>
          </div>
          <div className="ir-tile">
            <div className="ir-tile-num ir-amber">{recordable.length}</div>
            <div className="ir-tile-lbl">Recordables YTD</div>
            <div className="ir-tile-sub">300 Log entries</div>
          </div>
        </div>
        {lastRec && (
          <p className="ir-insight">
            ▲ Reporting is active — the only recordable is{' '}
            <strong>{lastRec.daysAgo} day{lastRec.daysAgo !== 1 ? 's' : ''}</strong> old and its
            300-Log clock is running. Verify the deadline with your EHS team.
          </p>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div className="ir-ftabs">
        {(['all', 'open', 'investigating', 'contained', 'closed'] as const).map((s) => (
          <button
            key={s}
            className={`ir-ftab ${statusFilter === s ? 'ir-ftab--on' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : STAT_LABEL[s]}
            <span className="ir-cnt">{s === 'all' ? incidents.length : sc[s]}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="ir-sevtabs">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((v) => (
            <button
              key={v}
              className={`ir-svtab ${sevFilter === v ? 'ir-svtab--on' : ''}`}
              onClick={() => setSevFilter(v)}
            >
              {v === 'all' ? 'All sev.' : SEV_LABEL[v]}
              {v !== 'all' && <span className="ir-vc">{vc[v]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Incident list ── */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Incident Register</p>
            <h2>{rows.length} record{rows.length !== 1 ? 's' : ''}</h2>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="muted">No incidents match the current filter.</p>
        ) : (
          <div className="ir-list">
            {rows.map((i) => (
              <article className="ir-row" key={i.id}>
                <div className="ir-row-top">
                  <Link href={`/incidents/${i.id}`} className="ir-row-title">{i.title}</Link>
                  <div className="ir-row-chips">
                    <span className={STAT_CLS[i.status]}>{STAT_LABEL[i.status]}</span>
                    <span className={SEV_CLS[i.severity]}>{SEV_LABEL[i.severity]}</span>
                    {i.isOshaRecordable && <span className="ir-rec">OSHA Recordable</span>}
                  </div>
                </div>
                <p className="ir-row-meta">
                  {i.incidentTypeLabel} · Occurred {i.occurredLabel}
                  {i.daysAgo > 0 ? ` · ${i.daysAgo} day${i.daysAgo !== 1 ? 's' : ''} ago` : ''}
                </p>
                {i.summary && <p className="ir-row-desc">{i.summary}</p>}
                <div className="ir-row-foot">
                  <span className="ir-tag">↻ CAPA auto-created</span>
                  {i.isOshaRecordable && i.oshaDueIn !== null && (
                    <span className="ir-tag ir-tag--clk">⏱ 300 Log due in {i.oshaDueIn}d</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ─── Scoped styles (light theme, app CSS vars) ──────────────────────────── */

const IR_STYLES = `
/* Clock */
.ir-clock-hd { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 12px; flex-wrap: wrap; }
.ir-clock h2 { font-size: 14px; font-weight: 700; color: var(--text); margin-top: 2px; }
.ir-rules { display: flex; gap: 8px; flex-wrap: wrap; }
.ir-rule { font-size: 9.5px; font-weight: 500; color: var(--text2); background: var(--panel-soft); border: 1px solid var(--bdr); border-radius: 7px; padding: 5px 9px; display: flex; align-items: center; gap: 6px; }
.ir-rule b { color: var(--text); font-size: 10.5px; }
.ir-rule--active { border-color: var(--amber); }
.ir-rule em { font-style: normal; font-weight: 700; }
.ir-ok { color: var(--green); }
.ir-hot-txt { color: var(--amber); }
.ir-clockrows { display: flex; flex-direction: column; gap: 8px; }
.ir-clockrow { display: flex; justify-content: space-between; align-items: center; gap: 14px; background: var(--panel-soft); border: 1px solid var(--bdr); border-left: 3px solid var(--amber); border-radius: 9px; padding: 11px 14px; }
.ir-clk-title { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
.ir-clk-rule { font-size: 10px; color: var(--muted); }
.ir-clk-r { text-align: right; flex-shrink: 0; }
.ir-clk-count { font-size: 15px; font-weight: 800; }
.ir-hot { color: var(--red); }
.ir-warn { color: var(--amber); }
.ir-clk-occ { font-size: 9.5px; color: var(--muted); margin-top: 2px; }
/* Alert */
.ir-alert { display: flex; align-items: center; gap: 11px; background: var(--red-bg); border: 1px solid var(--red); border-radius: 10px; padding: 11px 15px; }
.ir-alert-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--red); flex-shrink: 0; }
.ir-alert > div { font-size: 11.5px; color: var(--text); line-height: 1.45; flex: 1; }
.ir-alert-link { font-size: 10px; font-weight: 700; color: var(--red); white-space: nowrap; cursor: pointer; background: none; border: none; padding: 0; text-decoration: underline; }
/* Analytics */
.ir-perf-h2 { font-size: 14px; font-weight: 700; color: var(--text); margin-top: 2px; margin-bottom: 12px; }
.ir-tiles { display: grid; grid-template-columns: repeat(4,1fr); gap: 11px; margin-bottom: 11px; }
.ir-tile { background: var(--panel-soft); border: 1px solid var(--bdr); border-radius: 10px; padding: 11px 13px; }
.ir-tile-num { font-size: 23px; font-weight: 800; line-height: 1; color: var(--text); margin-bottom: 5px; }
.ir-tile-lbl { font-size: 10.5px; font-weight: 700; color: var(--text2); }
.ir-tile-sub { font-size: 9.5px; color: var(--muted); margin-top: 2px; }
.ir-green { color: var(--green); }
.ir-amber { color: var(--amber); }
.ir-insight { font-size: 11px; color: var(--text2); background: var(--amber-bg); border: 1px solid var(--amber); border-radius: 8px; padding: 9px 12px; line-height: 1.5; }
/* Filters */
.ir-ftabs { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.ir-ftab { background: var(--panel); border: 1px solid var(--bdr); border-radius: 7px; padding: 7px 11px; font-size: 11px; font-weight: 600; color: var(--text2); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: border-color .12s, color .12s; }
.ir-ftab:hover { border-color: var(--blue-mid); color: var(--blue); }
.ir-ftab--on { background: var(--blue); border-color: var(--blue); color: #fff; }
.ir-ftab--on .ir-cnt { background: rgba(255,255,255,.25); color: #fff; }
.ir-cnt { background: var(--blue-xs); color: var(--text2); border-radius: 5px; padding: 0 5px; font-size: 10px; font-weight: 700; }
.ir-sevtabs { display: flex; gap: 6px; flex-wrap: wrap; }
.ir-svtab { background: var(--panel); border: 1px solid var(--bdr); border-radius: 7px; padding: 7px 10px; font-size: 11px; font-weight: 600; color: var(--text2); cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: border-color .12s; }
.ir-svtab:hover { border-color: var(--blue-mid); }
.ir-svtab--on { background: var(--navy); border-color: var(--navy); color: #fff; }
.ir-vc { background: var(--panel-soft); border-radius: 5px; padding: 0 5px; font-size: 10px; }
.ir-svtab--on .ir-vc { background: rgba(255,255,255,.2); color: #fff; }
/* Incident rows */
.ir-list { display: flex; flex-direction: column; }
.ir-row { padding: 13px 0; border-bottom: 1px solid var(--bdr); }
.ir-row:last-child { border-bottom: none; }
.ir-row-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 5px; }
.ir-row-title { font-size: 12.5px; font-weight: 700; color: var(--text); line-height: 1.3; text-decoration: none; }
.ir-row-title:hover { color: var(--blue); }
.ir-row-chips { display: flex; gap: 5px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
.ir-row-meta { font-size: 10.5px; color: var(--muted); margin-bottom: 5px; }
.ir-row-desc { font-size: 11px; color: var(--text2); line-height: 1.55; margin-bottom: 8px; }
.ir-row-foot { display: flex; gap: 6px; flex-wrap: wrap; }
.ir-tag { font-size: 9.5px; color: var(--text2); background: var(--panel-soft); border: 1px solid var(--bdr); border-radius: 6px; padding: 3px 8px; }
.ir-tag--clk { color: var(--amber); border-color: var(--amber); font-weight: 700; }
.ir-rec { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; padding: 2px 7px; border-radius: 6px; background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
@media (max-width: 640px) {
  .ir-tiles { grid-template-columns: repeat(2,1fr); }
  .ir-ftabs { flex-direction: column; align-items: stretch; }
  .ir-sevtabs { flex-wrap: wrap; }
}
`;
