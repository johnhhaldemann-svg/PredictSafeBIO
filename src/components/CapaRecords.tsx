'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export type CapaType  = 'corrective' | 'preventive' | 'equipment';
export type CapaStatLocal =
  | 'draft_human_review_required' | 'open' | 'in_progress' | 'closed' | 'void';
export type CapaStage =
  | 'identification' | 'root_cause' | 'action_plan'
  | 'implementation' | 'verification' | 'closure';

export interface ViewCapa {
  id: string;
  title: string;
  capaType: CapaType;
  status: CapaStatLocal;
  stage: CapaStage;
  ownerLabel: string | null;
  dueDateLabel: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
  actionCount: number;
  openActionCount: number;
  sourceLabel: string;
  sourceKind: string;
}

/* ─── Reference ─────────────────────────────────────────────────────────────── */

const TYPE_META: Record<CapaType, { label: string; cls: string }> = {
  corrective: { label: 'Corrective', cls: 'ca-t-corr' },
  preventive: { label: 'Preventive', cls: 'ca-t-prev' },
  equipment:  { label: 'Equipment',  cls: 'ca-t-equip' },
};

const STAT_META: Record<CapaStatLocal, { label: string; cls: string }> = {
  draft_human_review_required: { label: 'Draft — review',  cls: 'status-needs-review' },
  open:                        { label: 'Open',            cls: 'status-missing' },
  in_progress:                 { label: 'In progress',     cls: 'status-needs-review' },
  closed:                      { label: 'Closed',          cls: 'status-ok' },
  void:                        { label: 'Void',            cls: 'status-chip' },
};

const STAT_LABEL: Record<CapaStatLocal, string> = {
  draft_human_review_required: 'Draft — review',
  open: 'Open', in_progress: 'In progress', closed: 'Closed', void: 'Void',
};

const STAGES: { key: CapaStage; label: string; color: string }[] = [
  { key: 'identification', label: 'Identify',    color: 'var(--muted)' },
  { key: 'root_cause',     label: 'Root cause',  color: 'var(--blue)' },
  { key: 'action_plan',    label: 'Action plan', color: '#a855f7' },
  { key: 'implementation', label: 'Implement',   color: 'var(--amber)' },
  { key: 'verification',   label: 'Verify',      color: '#14b8a6' },
  { key: 'closure',        label: 'Close',       color: 'var(--green)' },
];

const SOURCE_ICON: Record<string, string> = {
  incident: '🚨', assessment: '⚠', finding: '🔍', deviation: '⚠', training: '🎓', other: '·',
};

/* ─── Component ─────────────────────────────────────────────────────────────── */

interface Props {
  capas: ViewCapa[];
  initialFilter?: CapaStatLocal | 'all';
}

export default function CapaRecords({ capas, initialFilter = 'all' }: Props) {
  const [filter, setFilter] = useState<CapaStatLocal | 'all'>(initialFilter);

  const counts = useMemo(() => ({
    all:                        capas.length,
    draft_human_review_required: capas.filter((c) => c.status === 'draft_human_review_required').length,
    open:                       capas.filter((c) => c.status === 'open').length,
    in_progress:                capas.filter((c) => c.status === 'in_progress').length,
    closed:                     capas.filter((c) => c.status === 'closed').length,
    void:                       capas.filter((c) => c.status === 'void').length,
  }), [capas]);

  const openTotal = capas.filter(
    (c) => c.status !== 'closed' && c.status !== 'void',
  ).length;

  const stageCounts = useMemo(() =>
    STAGES.map((s) => ({ ...s, n: capas.filter((c) => c.stage === s.key).length })),
  [capas]);

  const stalled = capas.filter((c) => c.isOverdue && c.actionCount === 0);

  const rows = useMemo(() =>
    filter === 'all' ? capas : capas.filter((c) => c.status === filter),
  [capas, filter]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CA_STYLES }} />

      {/* ── CAPA Lifecycle Pipeline ── */}
      <div className="panel ca-pipe">
        <p className="section-label">CAPA Lifecycle</p>
        <h2 className="ca-pipe-h2">Where every CAPA sits</h2>
        <div className="ca-stepper">
          {stageCounts.map((s, i) => (
            <div className="ca-step" key={s.key}>
              <div
                className="ca-step-dot"
                style={s.n > 0
                  ? { background: s.color, borderColor: s.color, color: '#fff' }
                  : undefined}
              >
                {s.n > 0 ? s.n : ''}
              </div>
              <div
                className="ca-step-lbl"
                style={s.n > 0 ? { color: 'var(--text)', fontWeight: 700 } : undefined}
              >
                {s.label}
              </div>
              {i < stageCounts.length - 1 && <div className="ca-step-line" />}
            </div>
          ))}
        </div>
        {openTotal > 0 && (
          <p className="ca-pipe-insight">
            ▲ All {openTotal} open CAPA{openTotal !== 1 ? 's' : ''}{' '}
            {openTotal === 1 ? 'is' : 'are'} upstream of effectiveness verification — nothing has
            reached the closure gate yet
            {stalled.length > 0
              ? `, and ${stalled.length} CAPA${stalled.length !== 1 ? 's are' : ' is'} past due with no action plan.`
              : '.'}
          </p>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div className="ca-ftabs">
        {(['all', 'draft_human_review_required', 'open', 'in_progress', 'closed', 'void'] as const).map((s) => (
          <button
            key={s}
            className={`ca-ftab ${filter === s ? 'ca-ftab--on' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : STAT_LABEL[s]}
            <span className="ca-cnt">{s === 'all' ? counts.all : counts[s]}</span>
          </button>
        ))}
      </div>

      {/* ── CAPA register ── */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">CAPA Register</p>
            <h2>{rows.length} record{rows.length !== 1 ? 's' : ''}</h2>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="muted">No CAPA records match the current filter.</p>
        ) : (
          <div className="ca-list">
            {rows.map((c) => (
              <article className="ca-row" key={c.id}>
                <div className="ca-row-top">
                  <Link href={`/operations/capa/${c.id}`} className="ca-row-title">{c.title}</Link>
                  <div className="ca-row-chips">
                    <span className={TYPE_META[c.capaType].cls}>{TYPE_META[c.capaType].label}</span>
                    <span className={STAT_META[c.status].cls}>{STAT_META[c.status].label}</span>
                  </div>
                </div>
                <div className="ca-row-meta">
                  <span className="ca-stage-chip">{STAGES.find((s) => s.key === c.stage)?.label}</span>
                  {c.ownerLabel && <span>Owner: {c.ownerLabel}</span>}
                  {c.dueDateLabel && (
                    <span className={c.isOverdue ? 'ca-past' : c.isDueToday ? 'ca-today' : ''}>
                      Due {c.dueDateLabel}
                      {c.isOverdue ? ' · past due' : c.isDueToday ? ' · due today' : ''}
                    </span>
                  )}
                  <span className="ca-actions-meta">
                    {c.actionCount} action{c.actionCount !== 1 ? 's' : ''}
                    {c.openActionCount > 0 ? ` (${c.openActionCount} open)` : ''}
                  </span>
                </div>
                <div className="ca-src">
                  <span className="ca-src-chip">
                    {SOURCE_ICON[c.sourceKind] ?? '·'} Source: {c.sourceLabel}
                  </span>
                </div>
                {c.actionCount === 0 && (
                  <p className="ca-noact">
                    ⚠ No actions defined — action plan required before this CAPA can progress.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ─── Scoped styles (light theme, app CSS vars) ──────────────────────────── */

const CA_STYLES = `
/* Pipeline */
.ca-pipe-h2 { font-size: 14px; font-weight: 700; color: var(--text); margin-top: 2px; margin-bottom: 14px; }
.ca-stepper { display: flex; align-items: flex-start; margin-bottom: 14px; }
.ca-step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.ca-step-dot { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--bdr); background: var(--panel-soft); color: var(--muted); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; z-index: 2; flex-shrink: 0; }
.ca-step-lbl { font-size: 9.5px; font-weight: 600; color: var(--muted); margin-top: 7px; text-align: center; line-height: 1.3; }
.ca-step-line { position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background: var(--bdr); z-index: 1; }
.ca-pipe-insight { font-size: 11px; color: var(--text2); background: var(--amber-bg); border: 1px solid var(--amber); border-radius: 8px; padding: 9px 12px; line-height: 1.5; }
/* Filter tabs */
.ca-ftabs { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.ca-ftab { background: var(--panel); border: 1px solid var(--bdr); border-radius: 7px; padding: 7px 11px; font-size: 11px; font-weight: 600; color: var(--text2); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: border-color .12s, color .12s; }
.ca-ftab:hover { border-color: var(--blue-mid); color: var(--blue); }
.ca-ftab--on { background: var(--blue); border-color: var(--blue); color: #fff; }
.ca-ftab--on .ca-cnt { background: rgba(255,255,255,.25); color: #fff; }
.ca-cnt { background: var(--blue-xs); color: var(--text2); border-radius: 5px; padding: 0 5px; font-size: 10px; font-weight: 700; }
/* CAPA type chips */
.ca-t-corr  { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; padding: 2px 7px; border-radius: 6px; background: var(--blue-bg); color: var(--blue); border: 1px solid var(--blue-lt); }
.ca-t-prev  { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; padding: 2px 7px; border-radius: 6px; background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe; }
.ca-t-equip { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; padding: 2px 7px; border-radius: 6px; background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; }
/* CAPA rows */
.ca-list { display: flex; flex-direction: column; }
.ca-row { padding: 13px 0; border-bottom: 1px solid var(--bdr); }
.ca-row:last-child { border-bottom: none; }
.ca-row-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 7px; }
.ca-row-title { font-size: 12.5px; font-weight: 700; color: var(--text); line-height: 1.3; text-decoration: none; }
.ca-row-title:hover { color: var(--blue); }
.ca-row-chips { display: flex; gap: 5px; flex-shrink: 0; }
.ca-row-meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 10.5px; color: var(--text2); margin-bottom: 8px; }
.ca-stage-chip { font-weight: 700; color: var(--blue); background: var(--blue-bg); border: 1px solid var(--blue-lt); border-radius: 5px; padding: 1px 8px; font-size: 9.5px; }
.ca-today { color: var(--amber); font-weight: 700; }
.ca-past   { color: var(--red);   font-weight: 700; }
.ca-actions-meta { color: var(--muted); }
.ca-src { margin-bottom: 6px; }
.ca-src-chip { font-size: 10px; color: var(--text2); background: var(--panel-soft); border: 1px solid var(--bdr); border-radius: 6px; padding: 3px 9px; }
.ca-noact { font-size: 10.5px; color: var(--red); font-weight: 600; padding-top: 8px; border-top: 1px solid var(--bdr); margin-top: 4px; }
`;
