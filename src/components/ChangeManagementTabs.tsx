'use client';

/**
 * ChangeManagementTabs — inline Change Plan + MOC view, used by /change-management.
 * Receives pre-fetched data as props (server parent handles all DB calls).
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';

/* ─── Types (also exported for the server page to build props) ─────────────── */

export type CMStage = 'planned' | 'review' | 'implementing' | 'verifying' | 'done';
export type CMPriority = 'high' | 'medium' | 'low';

export interface ViewChangePlanItem {
  id: string;
  title: string;
  priority: CMPriority;
  stage: CMStage;
  affects: string[];
  owner: string;
  progress: number;
}

export interface ViewMocItem {
  id: string;
  type: string;       // changeType or 'detected'
  title: string;
  affects: string[];
  revalidation: string[];
  status: string;     // 'detected' | MocStatus
}

/* ─── Reference ─────────────────────────────────────────────────────────────── */

const STAGE_ORDER: CMStage[] = ['planned', 'review', 'implementing', 'verifying', 'done'];

const STAGE_META: Record<CMStage, { label: string }> = {
  planned:      { label: 'Planned' },
  review:       { label: 'Under Review' },
  implementing: { label: 'Implementing' },
  verifying:    { label: 'Verifying' },
  done:         { label: 'Done' },
};

const PRIORITY_LABEL: Record<CMPriority, string> = {
  high: 'High', medium: 'Medium', low: 'Low',
};

const TYPE_LABEL: Record<string, string> = {
  incident:         'Incident',
  equipment_event:  'Equipment Event',
  new_material:     'New Material',
  process_change:   'Process Change',
  equipment_change: 'Equipment Change',
  detected:         'Detected',
  other:            'Other',
};

function stageColor(s: CMStage): string {
  return ({
    planned: '#94a3b8', review: '#60a5fa', implementing: '#f59e0b',
    verifying: '#a855f7', done: '#22c55e',
  } as Record<CMStage, string>)[s];
}

/* ─── Sample MOC impacts (shown in demo / when no real records exist) ─────── */

const SAMPLE_MOC: ViewMocItem[] = [
  {
    id: 'mi-1', type: 'incident', status: 'detected',
    title: 'Needlestick exposure during cell injection',
    affects: ['BBP SOP', 'Sharps training', 'Needle Stick control'],
    revalidation: ['Re-verify needle-guard control', 'Refresh BBP training', 'Recalculate residual risk'],
  },
  {
    id: 'mi-2', type: 'equipment_event', status: 'detected',
    title: 'BSC certification overdue',
    affects: ['Class II BSC control', 'Biosafety Manual'],
    revalidation: ['Re-certify BSC (engineering control)', 'Recalculate aerosol-hazard residual'],
  },
  {
    id: 'mi-3', type: 'new_material', status: 'detected',
    title: 'Human-derived samples introduced',
    affects: ['Biosafety Risk Assessment', 'BBP', 'Biohazardous Waste SOP'],
    revalidation: ['Open biosafety review', 'Map new controls + training', 'Update evidence map'],
  },
];

/* ─── Component ─────────────────────────────────────────────────────────────── */

interface Props {
  planItems: ViewChangePlanItem[];
  mocItems: ViewMocItem[];  // real MOC records; falls back to SAMPLE_MOC if empty
}

export default function ChangeManagementTabs({ planItems, mocItems }: Props) {
  const [view, setView] = useState<'plan' | 'moc'>('plan');

  const displayedMoc = mocItems.length > 0 ? mocItems : SAMPLE_MOC;
  const isDemo = mocItems.length === 0;

  const funnel = useMemo(
    () => STAGE_ORDER.map((s) => ({ stage: s, n: planItems.filter((p) => p.stage === s).length })),
    [planItems],
  );

  const highCount    = planItems.filter((p) => p.priority === 'high').length;
  const mocAwaiting  = mocItems.filter((m) => m.status === 'in_review').length;
  const detectedCount = displayedMoc.filter((m) => m.status === 'detected').length;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CM_STYLES }} />

      {/* KPI strip */}
      <section className="kpi-grid" aria-label="Change management summary">
        <div className={`kpi-card ${highCount > 0 ? 'kpi-card--red' : 'kpi-card--blue'}`}>
          <div className="kpi-label">High-Priority Items</div>
          <div className="kpi-value">{highCount}</div>
          <div className="kpi-sub">{highCount > 0 ? 'Flagged high priority' : 'No high-priority items'}</div>
        </div>
        <div className={`kpi-card ${mocAwaiting > 0 ? 'kpi-card--amber' : 'kpi-card--green'}`}>
          <div className="kpi-label">MOC Awaiting Review</div>
          <div className="kpi-value">{mocAwaiting}</div>
          <div className="kpi-sub">{mocAwaiting > 0 ? 'Routed to reviewers' : 'None pending'}</div>
        </div>
        <div className={`kpi-card ${detectedCount > 0 ? 'kpi-card--amber' : 'kpi-card--green'}`}>
          <div className="kpi-label">Detected Impacts</div>
          <div className="kpi-value">{detectedCount}</div>
          <div className="kpi-sub">{detectedCount > 0 ? 'Require MOC intake' : 'None outstanding'}</div>
        </div>
        <div className="kpi-card kpi-card--purple">
          <div className="kpi-label">Active Plan Items</div>
          <div className="kpi-value">{planItems.length}</div>
          <div className="kpi-sub">In-progress improvements</div>
        </div>
      </section>

      {/* Lane switcher */}
      <div className="cm-lanes">
        <button
          className={`cm-lane ${view === 'plan' ? 'cm-lane--on' : ''}`}
          onClick={() => setView('plan')}
          aria-pressed={view === 'plan'}
        >
          <span className="cm-lane-ic">📋</span>
          <div>
            <div className="cm-lane-title">
              Change Plan
              <span className="cm-lane-count">{planItems.length}</span>
            </div>
            <div className="cm-lane-desc">Strategic improvement roadmap — track changes, prioritise by impact, monitor progress.</div>
          </div>
        </button>
        <button
          className={`cm-lane ${view === 'moc' ? 'cm-lane--on' : ''}`}
          onClick={() => setView('moc')}
          aria-pressed={view === 'moc'}
        >
          <span className="cm-lane-ic">🔄</span>
          <div>
            <div className="cm-lane-title">
              Management of Change
              <span className={`cm-lane-count ${detectedCount ? 'cm-lane-count--warn' : ''}`}>
                {detectedCount} detected
              </span>
            </div>
            <div className="cm-lane-desc">Operational change control — materials, processes, equipment. Auto-routes to reviewers.</div>
          </div>
        </button>
      </div>

      {/* ── CHANGE PLAN ── */}
      {view === 'plan' && (
        <div className="cm-section">
          {/* Pipeline funnel */}
          <div className="cm-funnel panel">
            <span className="cm-funnel-title section-label">Pipeline</span>
            {funnel.map((f) => (
              <div className="cm-fstage" key={f.stage}>
                <div className="cm-fbar" style={{ background: stageColor(f.stage), opacity: f.n > 0 ? 1 : 0.25 }} />
                <div className="cm-fn" style={{ color: f.n > 0 ? stageColor(f.stage) : 'var(--muted)' }}>{f.n}</div>
                <div className="cm-fl">{STAGE_META[f.stage].label}</div>
              </div>
            ))}
          </div>

          {/* Plan table */}
          {planItems.length === 0 ? (
            <div className="panel empty-state-card">
              <p className="empty-state-title">No change plan items</p>
              <p className="muted">Add items in the Change Plan to track strategic improvements.</p>
              <Link href="/change-plan" className="button-secondary compact" style={{ marginTop: 10, display: 'inline-flex' }}>
                Open Change Plan →
              </Link>
            </div>
          ) : (
            <div className="panel cm-plan-table" role="table" aria-label="Change plan items">
              <div className="cm-thead" role="row">
                <div>Change</div>
                <div>Priority</div>
                <div>Stage</div>
                <div>Affects</div>
                <div>Owner</div>
                <div>Progress</div>
              </div>
              {planItems.map((c) => (
                <div className="cm-trow" role="row" key={c.id}>
                  <div className="cm-title">{c.title}</div>
                  <div>
                    <span className={`cm-prio cm-prio--${c.priority}`}>{PRIORITY_LABEL[c.priority]}</span>
                  </div>
                  <div>
                    <span className="cm-stage" style={{ background: `${stageColor(c.stage)}20`, color: stageColor(c.stage) }}>
                      {STAGE_META[c.stage].label}
                    </span>
                  </div>
                  <div className="cm-affects">
                    {c.affects.map((a) => <span className="cm-pill" key={a}>{a}</span>)}
                  </div>
                  <div className="cm-owner">{c.owner}</div>
                  <div className="cm-prog">
                    <div className="cm-progbar"><i style={{ width: `${c.progress}%` }} /></div>
                    <span className="cm-progn">{c.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MANAGEMENT OF CHANGE ── */}
      {view === 'moc' && (
        <div className="cm-section">
          {detectedCount > 0 && (
            <div className="cm-alert">
              <span className="cm-alert-dot" />
              <div>
                <strong>{detectedCount} change impact{detectedCount !== 1 ? 's' : ''} detected</strong>
                {isDemo && <span className="cm-demo-tag">sample data</span>}
                {' '}— operational changes flagged by incidents, equipment events, or new materials.
                Each requires formal change control and control revalidation before the change is considered managed.
              </div>
            </div>
          )}

          <div className="cm-moc-hd">
            <p className="section-label">Detected · awaiting MOC intake</p>
            <h2>Changes requiring revalidation</h2>
          </div>

          {displayedMoc.map((m) => (
            <div className="cm-moc panel" key={m.id}>
              <div className="cm-moc-left">
                <div className="cm-moc-top">
                  <span className={`cm-itype cm-itype--${m.type}`}>{TYPE_LABEL[m.type] ?? m.type}</span>
                  <span className="cm-moc-title">{m.title}</span>
                </div>
                {m.affects.length > 0 && (
                  <div className="cm-moc-aff">
                    Affects:
                    {m.affects.map((a) => <span className="cm-pill" key={a}>{a}</span>)}
                  </div>
                )}
              </div>
              <div className="cm-moc-right">
                <div className="cm-reval-hd">Revalidation required</div>
                {m.revalidation.map((r) => (
                  <div className="cm-reval" key={r}><span className="cm-reval-ic">↻</span>{r}</div>
                ))}
                <Link href="/operate/management-of-change" className="button-primary compact cm-moc-btn">
                  Create MOC →
                </Link>
              </div>
            </div>
          ))}

          {!isDemo && mocItems.filter((m) => m.status !== 'detected').length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p className="section-label">Formal MOC records</p>
              {mocItems.filter((m) => m.status !== 'detected').map((m) => (
                <div className="cm-moc-formal panel" key={m.id}>
                  <span className={`cm-itype cm-itype--${m.type}`}>{TYPE_LABEL[m.type] ?? m.type}</span>
                  <span className="cm-moc-title" style={{ flex: 1 }}>{m.title}</span>
                  <span className={`status-${m.status === 'approved' ? 'ok' : m.status === 'in_review' ? 'needs-review' : 'chip'}`}>
                    {m.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI guardrail */}
      <div className="cm-guard">
        <strong>Draft — Human Review Required.</strong> Detected impacts and revalidation steps are engine
        draft signals. A Management-of-Change record and qualified review are required before any control,
        document, or training is treated as revalidated.
      </div>
    </>
  );
}

/* ─── Scoped styles (light theme, app CSS vars) ──────────────────────────── */

const CM_STYLES = `
/* Lanes */
.cm-lanes { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-bottom: 14px; }
.cm-lane { display: flex; gap: 13px; text-align: left; background: var(--panel); border: 1px solid var(--bdr); border-radius: 12px; padding: 15px 16px; cursor: pointer; align-items: flex-start; transition: border-color .15s, box-shadow .15s; }
.cm-lane:hover { border-color: var(--blue-mid); }
.cm-lane--on { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(24,95,165,.12); }
.cm-lane-ic { font-size: 22px; flex-shrink: 0; }
.cm-lane-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 3px; display: flex; align-items: center; gap: 8px; }
.cm-lane-count { font-size: 10px; font-weight: 700; background: var(--blue-xs); color: var(--text2); border-radius: 5px; padding: 1px 7px; }
.cm-lane-count--warn { background: var(--amber-bg); color: var(--amber-dk); }
.cm-lane-desc { font-size: 11px; color: var(--text2); line-height: 1.5; }
/* Funnel */
.cm-funnel { display: flex; align-items: center; gap: 6px; padding: 13px 16px !important; margin-bottom: 12px; }
.cm-funnel-title { margin-right: 14px; white-space: nowrap; }
.cm-fstage { flex: 1; text-align: center; }
.cm-fbar { height: 7px; border-radius: 4px; margin-bottom: 6px; transition: opacity .2s; }
.cm-fn { font-size: 17px; font-weight: 800; line-height: 1; }
.cm-fl { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; font-weight: 600; margin-top: 3px; }
/* Plan table */
.cm-plan-table { overflow: hidden; }
.cm-thead, .cm-trow { display: grid; grid-template-columns: 2.4fr .8fr 1.1fr 1.8fr 1.1fr 1.1fr; gap: 11px; padding: 11px 16px; align-items: center; }
.cm-thead { font-size: 9.5px; letter-spacing: .06em; color: var(--muted); text-transform: uppercase; font-weight: 700; border-bottom: 1px solid var(--bdr); background: var(--panel-soft); }
.cm-trow { border-bottom: 1px solid var(--bdr); }
.cm-trow:last-child { border-bottom: none; }
.cm-trow:hover { background: var(--blue-xs); }
.cm-title { font-size: 12px; font-weight: 600; color: var(--text); }
.cm-prio { font-size: 9.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; padding: 3px 9px; border-radius: 6px; }
.cm-prio--high { background: var(--red-bg); color: var(--red-dk); }
.cm-prio--medium { background: var(--amber-bg); color: var(--amber-dk); }
.cm-prio--low { background: var(--bg-soft); color: var(--text2); }
.cm-stage { font-size: 9.5px; font-weight: 700; padding: 3px 9px; border-radius: 6px; letter-spacing: .03em; }
.cm-affects { display: flex; flex-wrap: wrap; gap: 4px; }
.cm-pill { font-size: 9.5px; color: var(--text2); background: var(--panel-soft); border: 1px solid var(--bdr); border-radius: 5px; padding: 2px 7px; white-space: nowrap; }
.cm-owner { font-size: 11px; color: var(--text2); }
.cm-prog { display: flex; align-items: center; gap: 7px; }
.cm-progbar { flex: 1; height: 6px; background: var(--bdr); border-radius: 3px; overflow: hidden; }
.cm-progbar i { display: block; height: 100%; background: var(--blue-mid); border-radius: 3px; }
.cm-progn { font-size: 10px; color: var(--text2); font-weight: 700; min-width: 28px; text-align: right; }
/* MOC */
.cm-alert { display: flex; gap: 11px; align-items: flex-start; background: var(--amber-bg); border: 1px solid var(--amber); border-radius: 10px; padding: 13px 15px; margin-bottom: 14px; font-size: 12px; color: var(--amber-dk); line-height: 1.5; }
.cm-alert strong { font-weight: 700; }
.cm-alert-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--amber); box-shadow: 0 0 0 4px rgba(239,159,39,.2); flex-shrink: 0; margin-top: 3px; }
.cm-demo-tag { font-size: 9px; font-weight: 700; background: rgba(239,159,39,.25); border: 1px solid var(--amber); border-radius: 4px; padding: 1px 5px; margin: 0 5px; text-transform: uppercase; letter-spacing: .05em; }
.cm-moc-hd { margin-bottom: 10px; }
.cm-moc { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; margin-bottom: 10px; }
.cm-moc-left {}
.cm-moc-top { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; flex-wrap: wrap; }
.cm-moc-title { font-size: 12px; font-weight: 600; color: var(--text); }
.cm-moc-aff { font-size: 10.5px; color: var(--text2); display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.cm-moc-right { border-left: 1px solid var(--bdr); padding-left: 16px; }
.cm-reval-hd { font-size: 9px; letter-spacing: .06em; text-transform: uppercase; font-weight: 700; color: var(--muted); margin-bottom: 7px; }
.cm-reval { font-size: 11px; color: var(--text2); display: flex; align-items: flex-start; gap: 7px; margin-bottom: 5px; line-height: 1.4; }
.cm-reval-ic { color: var(--blue); font-weight: 800; flex-shrink: 0; }
.cm-moc-btn { margin-top: 10px; display: inline-flex; }
.cm-itype { font-size: 9.5px; font-weight: 800; letter-spacing: .03em; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
.cm-itype--incident { background: var(--red-bg); color: var(--red-dk); }
.cm-itype--equipment_event { background: var(--amber-bg); color: var(--amber-dk); }
.cm-itype--new_material { background: var(--blue-bg); color: var(--blue); }
.cm-itype--process_change { background: var(--green-bg); color: var(--green-dk); }
.cm-itype--equipment_change { background: var(--amber-bg); color: var(--amber-dk); }
.cm-itype--detected { background: var(--bg-soft); color: var(--text2); }
.cm-itype--other { background: var(--bg-soft); color: var(--text2); }
.cm-moc-formal { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
/* Guard */
.cm-guard { font-size: 11px; color: var(--amber-dk); background: var(--amber-bg); border: 1px solid var(--amber); border-radius: 8px; padding: 10px 14px; margin-top: 16px; line-height: 1.55; }
.cm-section { display: flex; flex-direction: column; gap: 0; }
@media (max-width: 860px) {
  .cm-lanes { grid-template-columns: 1fr; }
  .cm-moc { grid-template-columns: 1fr; }
  .cm-moc-right { border-left: none; border-top: 1px solid var(--bdr); padding-left: 0; padding-top: 12px; }
  .cm-thead, .cm-trow { grid-template-columns: 1fr 1fr; }
}
`;
