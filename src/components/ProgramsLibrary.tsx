'use client';

/**
 * ProgramsLibrary — Plan · Safety Programs Library
 * Client component: search, filter, grouping, and Program Health strip.
 * The server page (programs/page.tsx) builds ViewProgram[] and passes it in.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';

/* ─── Types ───────────────────────────────────────────────────────────────── */

export type ProgramStatus = 'current' | 'due_soon' | 'overdue' | 'not_started';
export type ProgramGrouping = 'category' | 'status';

export interface ViewProgram {
  id: string;
  name: string;
  category: string;      // groupLabel
  frequency: string;
  owner: string;
  citation: string;      // regulation
  status: ProgramStatus;
  module: boolean;       // has dedicated platform module (relatedHref exists)
  href: string;          // /programs/[id]
  relatedHref?: string;
  relatedLabel?: string;
  inspectionHref: string;
}

/* ─── Reference ─────────────────────────────────────────────────────────────── */

const STATUS_META: Record<ProgramStatus, { label: string; cls: string; color: string }> = {
  current:     { label: 'On track',    cls: 'status-ok',           color: 'var(--green)' },
  due_soon:    { label: 'Due soon',    cls: 'status-needs-review',  color: 'var(--amber)' },
  overdue:     { label: 'Overdue',     cls: 'status-overdue',       color: 'var(--red)' },
  not_started: { label: 'Not started', cls: 'status-chip',          color: 'var(--muted)' },
};

const STATUS_ORDER: ProgramStatus[] = ['overdue', 'due_soon', 'not_started', 'current'];

const CATEGORY_ORDER = [
  'Administrative & Communication',
  'Laboratory & Chemical Safety',
  'Emergency Response & Spill',
  'Physical Safety & Hazard Controls',
  'Warehouse & Material Handling',
  'Environmental & Regulatory',
];

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function ProgramsLibrary({ programs }: { programs: ViewProgram[] }) {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | 'all'>('all');
  const [group, setGroup]             = useState<ProgramGrouping>('category');

  const counts = useMemo(() => {
    const by = (s: ProgramStatus) => programs.filter((p) => p.status === s).length;
    return {
      total:    programs.length,
      modules:  programs.filter((p) => p.module).length,
      overdue:  by('overdue'),
      due:      by('due_soon'),
      none:     by('not_started'),
      current:  by('current'),
    };
  }, [programs]);

  const overdueNames = useMemo(
    () => programs.filter((p) => p.status === 'overdue').map((p) => p.name),
    [programs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return programs.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (q && !`${p.name} ${p.owner} ${p.citation} ${p.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [programs, search, statusFilter]);

  const groups = useMemo(() => {
    if (group === 'status') {
      return STATUS_ORDER
        .map((s) => ({ key: s, title: STATUS_META[s].label, items: filtered.filter((p) => p.status === s) }))
        .filter((g) => g.items.length > 0);
    }
    return CATEGORY_ORDER
      .map((cat) => ({ key: cat, title: cat, items: filtered.filter((p) => p.category === cat) }))
      .filter((g) => g.items.length > 0);
  }, [filtered, group]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PL_STYLES }} />

      {/* ── Program Health strip ── */}
      <div className="pl-health panel">
        <div className="pl-health-hd">
          <div>
            <p className="section-label">Program Health</p>
            <h2>Compliance status across all {counts.total} programs</h2>
          </div>
          {counts.overdue > 0 && (
            <div className="pl-flag">
              ▲ {counts.overdue} overdue: {overdueNames.join(', ')}
            </div>
          )}
        </div>
        <div className="pl-bar" role="img" aria-label="Program health distribution">
          <span className="pl-seg pl-seg--overdue"  style={{ flex: counts.overdue  || 0 }} title={`Overdue: ${counts.overdue}`} />
          <span className="pl-seg pl-seg--due"      style={{ flex: counts.due      || 0 }} title={`Due soon: ${counts.due}`} />
          <span className="pl-seg pl-seg--none"     style={{ flex: counts.none     || 0 }} title={`Not started: ${counts.none}`} />
          <span className="pl-seg pl-seg--current"  style={{ flex: counts.current  || 0 }} title={`On track: ${counts.current}`} />
        </div>
        <div className="pl-legend">
          <span><i className="pl-dot pl-dot--overdue" /> {counts.overdue} Overdue</span>
          <span><i className="pl-dot pl-dot--due"     /> {counts.due} Due soon</span>
          <span><i className="pl-dot pl-dot--none"    /> {counts.none} Not started</span>
          <span><i className="pl-dot pl-dot--current" /> {counts.current} On track</span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="pl-toolbar">
        <div className="pl-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search program, owner, or regulation…"
            aria-label="Search programs"
          />
        </div>
        <button className={`pl-fbtn ${statusFilter === 'all'         ? 'pl-fbtn--on' : ''}`} onClick={() => setStatusFilter('all')}>
          All <span className="pl-cnt">{counts.total}</span>
        </button>
        <button className={`pl-fbtn ${statusFilter === 'overdue'     ? 'pl-fbtn--on' : ''}`} onClick={() => setStatusFilter('overdue')}>
          Overdue <span className="pl-cnt">{counts.overdue}</span>
        </button>
        <button className={`pl-fbtn ${statusFilter === 'due_soon'    ? 'pl-fbtn--on' : ''}`} onClick={() => setStatusFilter('due_soon')}>
          Due soon <span className="pl-cnt">{counts.due}</span>
        </button>
        <button className={`pl-fbtn ${statusFilter === 'not_started' ? 'pl-fbtn--on' : ''}`} onClick={() => setStatusFilter('not_started')}>
          Not started <span className="pl-cnt">{counts.none}</span>
        </button>
        <div style={{ flex: 1 }} />
        <div className="pl-toggle" role="group" aria-label="Group by">
          <button
            className={group === 'category' ? 'pl-toggle-on' : ''}
            onClick={() => setGroup('category')}
          >By category</button>
          <button
            className={group === 'status' ? 'pl-toggle-on' : ''}
            onClick={() => setGroup('status')}
          >By status</button>
        </div>
      </div>

      {/* ── Program groups ── */}
      {groups.length === 0 ? (
        <div className="panel empty-state-card">
          <p className="empty-state-title">No programs match</p>
          <p className="muted">Try a different search term or status filter.</p>
        </div>
      ) : (
        groups.map((g) => {
          const od = g.items.filter((p) => p.status === 'overdue').length;
          return (
            <section key={g.key} aria-label={g.title}>
              <div className="pl-group-hd">
                <span className="pl-group-title">{g.title}</span>
                <span className="pl-group-count">
                  {g.items.length} program{g.items.length !== 1 ? 's' : ''}
                  {od > 0 ? ` · ${od} overdue` : ''}
                </span>
              </div>
              <div className="pl-cards">
                {g.items.map((p) => (
                  <article className="pl-card" key={p.id}>
                    <div className="pl-card-top">
                      <Link href={p.href} className="pl-card-name">{p.name}</Link>
                      <span className={STATUS_META[p.status].cls}>{STATUS_META[p.status].label}</span>
                    </div>
                    <div className="pl-badges">
                      <span className="pl-freq">{p.frequency}</span>
                      <span className={`pl-mod ${p.module ? 'pl-mod--active' : ''}`}>
                        {p.module ? 'Module' : 'Inspection'}
                      </span>
                    </div>
                    <p className="pl-cite">{p.citation}</p>
                    <p className="pl-owner">{p.owner}</p>
                    <div className="pl-actions">
                      <Link href={p.href} className="button-primary compact pl-action-btn">
                        Open tool
                      </Link>
                      {p.relatedHref ? (
                        <Link href={p.relatedHref} className="button-secondary compact pl-action-btn">
                          {p.relatedLabel ?? 'Platform module'}
                        </Link>
                      ) : (
                        <Link href={p.inspectionHref} className="button-secondary compact pl-action-btn">
                          Log inspection
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}

/* ─── Scoped styles (light theme, app CSS vars) ──────────────────────────── */

const PL_STYLES = `
/* Health strip */
.pl-health { margin-bottom: 0; }
.pl-health-hd { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 12px; }
.pl-health h2 { font-size: 14px; font-weight: 700; color: var(--text); margin-top: 2px; }
.pl-flag { font-size: 10.5px; font-weight: 600; color: var(--red-dk); background: var(--red-bg); border: 1px solid var(--red); border-radius: 8px; padding: 6px 10px; max-width: 50%; text-align: right; line-height: 1.4; }
.pl-bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden; gap: 2px; }
.pl-seg { display: block; border-radius: 3px; min-width: 0; }
.pl-seg--overdue { background: var(--red); }
.pl-seg--due { background: var(--amber); }
.pl-seg--none { background: var(--muted); }
.pl-seg--current { background: var(--green); }
.pl-legend { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 10px; font-size: 10.5px; color: var(--text2); }
.pl-legend span { display: flex; align-items: center; gap: 6px; }
.pl-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.pl-dot--overdue { background: var(--red); }
.pl-dot--due { background: var(--amber); }
.pl-dot--none { background: var(--muted); }
.pl-dot--current { background: var(--green); }
/* Toolbar */
.pl-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pl-search { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 8px; background: var(--panel); border: 1px solid var(--bdr); border-radius: 8px; padding: 8px 12px; color: var(--muted); transition: border-color .15s, box-shadow .15s; }
.pl-search:focus-within { border-color: var(--blue-mid); box-shadow: 0 0 0 3px rgba(55,138,221,.12); }
.pl-search input { border: none; outline: none; background: transparent; flex: 1; font-size: 12px; color: var(--text); }
.pl-fbtn { background: var(--panel); border: 1px solid var(--bdr); border-radius: 8px; padding: 7px 11px; font-size: 11.5px; font-weight: 500; color: var(--text2); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: border-color .12s, background .12s, color .12s; white-space: nowrap; }
.pl-fbtn:hover { border-color: var(--blue-mid); color: var(--blue); }
.pl-fbtn--on { border-color: var(--blue); background: var(--blue); color: #fff; }
.pl-fbtn--on .pl-cnt { background: rgba(255,255,255,.25); color: #fff; }
.pl-cnt { background: var(--blue-xs); color: var(--text2); border-radius: 5px; padding: 0 6px; font-size: 10px; font-weight: 700; }
.pl-toggle { display: flex; background: var(--panel); border: 1px solid var(--bdr); border-radius: 8px; overflow: hidden; }
.pl-toggle button { background: none; border: none; padding: 7px 12px; font-size: 11px; font-weight: 600; color: var(--text2); cursor: pointer; white-space: nowrap; transition: background .12s, color .12s; }
.pl-toggle button:hover { background: var(--blue-xs); color: var(--blue); }
.pl-toggle-on { background: var(--blue) !important; color: #fff !important; }
/* Group headings */
.pl-group-hd { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
.pl-group-title { font-size: 13px; font-weight: 700; color: var(--text); }
.pl-group-count { font-size: 10.5px; color: var(--muted); font-weight: 500; }
/* Cards */
.pl-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 11px; }
.pl-card { background: var(--panel); border: 1px solid var(--bdr); border-radius: 10px; padding: 14px 15px; display: flex; flex-direction: column; gap: 0; transition: box-shadow .15s, border-color .15s; }
.pl-card:hover { border-color: var(--blue-lt); box-shadow: var(--shadow); }
.pl-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 9px; }
.pl-card-name { font-size: 12.5px; font-weight: 700; color: var(--text); line-height: 1.3; text-decoration: none; }
.pl-card-name:hover { color: var(--blue); }
.pl-badges { display: flex; gap: 6px; margin-bottom: 9px; flex-wrap: wrap; }
.pl-freq { font-size: 9px; font-weight: 700; color: var(--blue); background: var(--blue-bg); border: 1px solid var(--blue-lt); border-radius: 5px; padding: 2px 7px; }
.pl-mod { font-size: 9px; font-weight: 700; color: var(--muted); background: var(--panel-soft); border: 1px solid var(--bdr); border-radius: 5px; padding: 2px 7px; }
.pl-mod--active { color: #7c3aed; background: #f5f3ff; border-color: #ddd6fe; }
.pl-cite { font-size: 9.5px; color: var(--text2); line-height: 1.5; margin-bottom: 7px; flex: 1; }
.pl-owner { font-size: 10.5px; color: var(--muted); font-weight: 500; margin-bottom: 11px; }
.pl-actions { display: flex; gap: 6px; margin-top: auto; }
.pl-action-btn { flex: 1; text-align: center; justify-content: center; }
@media (max-width: 960px) {
  .pl-cards { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .pl-cards { grid-template-columns: 1fr; }
  .pl-toolbar { flex-direction: column; align-items: stretch; }
}
`;
