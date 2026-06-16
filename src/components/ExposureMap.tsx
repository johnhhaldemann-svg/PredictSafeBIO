'use client';

/**
 * ExposureMap.tsx
 * PredictSafe BIO – Assess · Stage 4 · Exposure Map
 * Companion to HazardRegister.tsx – same light-canvas / dark-widget styling.
 * Self-contained (scoped <style>, no Tailwind dependency).
 */

import { useMemo, useState } from 'react';

/* ----------------------------- Types ----------------------------- */

export type ExposureRoute =
  | 'inhalation'
  | 'injection_sharps'
  | 'skin_dermal'
  | 'ingestion'
  | 'absorption';

export type Frequency = 'routine' | 'occasional' | 'rare';
export type PathwayStatus = 'active' | 'mitigated' | 'verified';

export interface ExposurePathway {
  id: string;
  role: string;
  task: string;
  location: string;
  route: ExposureRoute;
  frequency: Frequency;
  status: PathwayStatus;
  hazardName: string;
  hazardRef?: string;
  containmentLevel?: string;
  controlNote: string;
  controlsVerified: boolean;
  owner: string | null;
  nextReview: string | null;
}

type RiskBand = 'green' | 'amber' | 'orange' | 'red';
type TabFilter = 'all' | 'high_route' | 'active' | 'mitigated';
type SortKey = 'priority' | 'route' | 'role';

/* --------------------------- Domain logic --------------------------- */

const ROUTE_META: Record<ExposureRoute, { label: string; severity: 'high' | 'medium'; cls: string }> = {
  inhalation:       { label: 'Inhalation',        severity: 'high',   cls: 'rt-inhalation' },
  injection_sharps: { label: 'Injection / Sharps', severity: 'high',   cls: 'rt-injection'  },
  skin_dermal:      { label: 'Skin / Dermal',      severity: 'medium', cls: 'rt-skin'       },
  ingestion:        { label: 'Ingestion',           severity: 'medium', cls: 'rt-ingestion'  },
  absorption:       { label: 'Absorption',          severity: 'medium', cls: 'rt-absorption' },
};

const FREQ_LABEL: Record<Frequency, string> = {
  routine:    'Routine',
  occasional: 'Occasional',
  rare:       'Rare',
};

function exposurePriority(p: ExposurePathway): { band: RiskBand; label: string; note: string } {
  if (p.status !== 'active') return { band: 'green', label: 'Mitigated', note: 'Controls verified' };
  const sev = ROUTE_META[p.route].severity;
  if (sev === 'high' && p.frequency === 'routine')     return { band: 'red',    label: 'High',     note: 'Immediate attention' };
  if (sev === 'high' && p.frequency === 'occasional')  return { band: 'orange', label: 'Elevated', note: 'Monitor closely'     };
  if (sev === 'high')                                   return { band: 'amber',  label: 'Moderate', note: 'Confirm controls'    };
  if (sev === 'medium' && p.frequency === 'occasional') return { band: 'amber',  label: 'Moderate', note: 'Monitor'             };
  return { band: 'amber', label: 'Moderate', note: 'Monitor' };
}

const BAND_RANK: Record<RiskBand, number> = { red: 3, orange: 2, amber: 1, green: 0 };

function initialsOf(name: string | null): string {
  if (!name) return '—';
  return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function reviewInfo(nextReview: string | null) {
  if (!nextReview) return { label: 'needs owner', overdueDays: 0, unassigned: true };
  const diffDays = Math.round((new Date(nextReview).getTime() - Date.now()) / 86_400_000);
  if (diffDays < 0) return { label: `Overdue ${Math.abs(diffDays)}d`, overdueDays: Math.abs(diffDays), unassigned: false };
  const fmt = new Date(nextReview).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  return { label: `${fmt} · ${diffDays}d`, overdueDays: 0, unassigned: false };
}

/* --------------------------- Sample data -------------------------- */

const SAMPLE_PATHWAYS: ExposurePathway[] = [
  {
    id: 'ep-001', role: 'Research Scientist', task: 'Lentiviral supernatant during ultracentrifugation',
    location: 'BSL-2 Cell Culture Lab', route: 'inhalation', frequency: 'occasional', status: 'active',
    hazardName: 'Recombinant Lentiviral Vector', hazardRef: 'hz-001', containmentLevel: 'BSL-2',
    controlNote: 'Aerosol risk at high-speed centrifugation. Sealed rotors + BSC required; personnel verified trained.',
    controlsVerified: true, owner: 'D. Mehta', nextReview: '2026-07-08',
  },
  {
    id: 'ep-002', role: 'Lab Technician', task: 'Ethidium bromide gel staining solution',
    location: 'BSL-2 Cell Culture Lab', route: 'skin_dermal', frequency: 'routine', status: 'active',
    hazardName: 'Ethidium Bromide (EtBr) Gel Stain', hazardRef: 'hz-003', containmentLevel: 'Fume hood',
    controlNote: 'Contact during gel casting/staining. Nitrile gloves mandatory; waste in dedicated EtBr container.',
    controlsVerified: true, owner: 'R. Kim', nextReview: '2026-07-02',
  },
  {
    id: 'ep-003', role: 'Research Scientist', task: 'Beta-mercaptoethanol in lysis buffer preparation',
    location: 'BSL-2 Cell Culture Lab', route: 'inhalation', frequency: 'occasional', status: 'mitigated',
    hazardName: 'β-Mercaptoethanol (BME)', hazardRef: 'hz-005', containmentLevel: 'Fume hood',
    controlNote: 'All BME work in fume hood. Hood sash incident Jan 2026 — corrective action completed and verified.',
    controlsVerified: true, owner: 'R. Kim', nextReview: '2026-08-15',
  },
  {
    id: 'ep-004', role: 'Research Associate', task: 'Hypodermic needle during cell injection procedure',
    location: 'BSL-2 Cell Culture Lab', route: 'injection_sharps', frequency: 'occasional', status: 'active',
    hazardName: 'Sharps / Needle Stick Risk', hazardRef: 'hz-006', containmentLevel: 'Sharps protocol',
    controlNote: 'One near-miss Q4 2025. Needle-guard protocol updated; all personnel re-trained Feb 2026.',
    controlsVerified: false, owner: 'D. Mehta', nextReview: '2026-06-20',
  },
  {
    id: 'ep-005', role: 'Lab Technician', task: 'Liquid nitrogen during cell cryopreservation',
    location: 'BSL-2 Cell Culture Lab', route: 'skin_dermal', frequency: 'routine', status: 'active',
    hazardName: 'Liquid Nitrogen Cryogenic Storage', hazardRef: 'hz-004', containmentLevel: 'PPE req.',
    controlNote: 'Splash risk during LN2 transfer to cryovials. Cryogenic gloves + face shield required in freezer room.',
    controlsVerified: true, owner: null, nextReview: null,
  },
  {
    id: 'ep-006', role: 'Research Scientist', task: 'Human cell culture media and supernatants',
    location: 'BSL-2 Cell Culture Lab', route: 'skin_dermal', frequency: 'routine', status: 'active',
    hazardName: 'HEK293T Cell Line (Human Embryonic Kidney)', hazardRef: 'hz-002', containmentLevel: 'BSL-2',
    controlNote: 'Routine cell passaging. All human-derived material treated as potentially infectious (Universal Precautions).',
    controlsVerified: true, owner: 'D. Mehta', nextReview: '2026-07-12',
  },
];

/* ------------------------------ View ------------------------------ */

export default function ExposureMap({
  pathways = SAMPLE_PATHWAYS,
  onAddPathway,
  onExport,
  onMarkMitigated,
  onOpenPathway,
  onOpenHazard,
}: {
  pathways?: ExposurePathway[];
  onAddPathway?: () => void;
  onExport?: () => void;
  onMarkMitigated?: (id: string) => void;
  onOpenPathway?: (id: string) => void;
  onOpenHazard?: (hazardRef: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabFilter>('all');
  const [routeFilter, setRouteFilter] = useState<ExposureRoute | 'all'>('all');
  const [freqFilter, setFreqFilter] = useState<Frequency | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('priority');

  const counts = useMemo(() => {
    const total        = pathways.length;
    const highRoute    = pathways.filter((p) => ROUTE_META[p.route].severity === 'high').length;
    const active       = pathways.filter((p) => p.status === 'active').length;
    const mitigated    = pathways.filter((p) => p.status !== 'active').length;
    const uniqueRoles  = new Set(pathways.map((p) => p.role)).size;
    const earlyWarnings = pathways.filter(
      (p) => p.status === 'active' && ROUTE_META[p.route].severity === 'high' && p.frequency === 'routine',
    ).length;
    const unverified   = pathways.filter((p) => p.status === 'active' && !p.controlsVerified).length;
    return { total, highRoute, active, mitigated, uniqueRoles, earlyWarnings, unverified };
  }, [pathways]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = pathways.filter((p) => {
      if (tab === 'high_route' && ROUTE_META[p.route].severity !== 'high') return false;
      if (tab === 'active'     && p.status !== 'active') return false;
      if (tab === 'mitigated'  && p.status === 'active') return false;
      if (routeFilter !== 'all' && p.route !== routeFilter) return false;
      if (freqFilter  !== 'all' && p.frequency !== freqFilter) return false;
      if (q) {
        const hay = `${p.role} ${p.task} ${p.hazardName} ${p.owner ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'priority') return BAND_RANK[exposurePriority(b).band] - BAND_RANK[exposurePriority(a).band];
      if (sort === 'route') {
        const sa = ROUTE_META[a.route].severity === 'high' ? 1 : 0;
        const sb = ROUTE_META[b.route].severity === 'high' ? 1 : 0;
        return sb - sa;
      }
      return a.role.localeCompare(b.role);
    });
    return list;
  }, [pathways, search, tab, routeFilter, freqFilter, sort]);

  const groups = useMemo(() => {
    const map = new Map<string, ExposurePathway[]>();
    for (const p of rows) {
      if (!map.has(p.location)) map.set(p.location, []);
      map.get(p.location)!.push(p);
    }
    return Array.from(map.entries());
  }, [rows]);

  return (
    <div className="psb">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* TOP BAR */}
      <div className="psb-topbar">
        <div className="psb-brand">
          <div className="psb-logo">🛡️</div>
          <div><b>PredictSafe BIO</b><span>Biosafety Intelligence</span></div>
        </div>
        <div className="psb-topright">
          <div className="psb-pill">🔔 <span style={{ color: '#fca5a5', fontWeight: 700 }}>1</span></div>
          <div className="psb-pill psb-owner">OWNER</div>
          <div className="psb-ava">JH</div>
        </div>
      </div>

      <div className="psb-shell">
        {/* NAV */}
        <nav className="psb-nav">
          <div className="psb-navgrp">Assess <span style={{ marginLeft: 'auto' }}>▾</span></div>
          <div className="psb-navitem">Risk Workbench</div>
          <div className="psb-navitem">Risk Register</div>
          <div className="psb-navitem">Hazard Register</div>
          <div className="psb-navitem on">Exposure Map</div>
          <div className="psb-navitem">Personnel</div>
          <div className="psb-navtop">Plan <span className="ch">▸</span></div>
          <div className="psb-navtop">Operate <span className="ch">▸</span></div>
          <div className="psb-navtop">Monitor <span className="ch">▸</span></div>
          <div className="psb-navtop">Workspace <span className="ch">▸</span></div>
        </nav>

        {/* MAIN */}
        <main className="psb-main">
          <div className="psb-connbar">
            Workspace connected &middot; <b>PredictSafe BIO</b> &middot; <span style={{ color: '#16a34a', fontWeight: 700 }}>OWNER</span>
          </div>

          <div className="psb-head">
            <div>
              <div className="psb-eyebrow">&bull; Assess &middot; Stage 4</div>
              <h1>Exposure Map</h1>
              <p className="psb-sub">
                Map which people and roles are exposed to which hazards, by route and frequency.
                Active high-route, high-frequency pathways feed the Predictive Engine as early warnings.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button className="psb-btn ghost" onClick={onExport}>❳ Export</button>
              <button className="psb-btn" onClick={onAddPathway}>&#xFF0B; Add Pathway</button>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="psb-kpis">
            <Kpi cls="k-tot" label="Exposure Pathways"  value={counts.total}        sub="mapped people ↔ routes"            trend="▲ +1"                               trendCls="up"   accent="#60a5fa" />
            <Kpi cls="k-unc" label="High-Route Exposures" value={counts.highRoute}  sub="injection / inhalation"                  trend={`${pct(counts.highRoute, counts.total)}%`} trendCls="up"   valueColor="#fca5a5" accent="#ef4444" />
            <Kpi cls="k-ctl" label="Early Warnings"      value={counts.earlyWarnings} sub={counts.earlyWarnings ? 'firing now' : 'no warnings'} trend={counts.earlyWarnings ? 'ALERT' : '—'} trendCls={counts.earlyWarnings ? 'up' : 'flat'} valueColor={counts.earlyWarnings ? '#fca5a5' : '#86efac'} accent="#22c55e" />
            <Kpi cls="k-rol" label="Unique Roles Exposed" value={counts.uniqueRoles} sub="distinct job roles"                    trend="—"                                   trendCls="flat" accent="#a855f7" />
          </div>

          {/* PREDICTIVE ENGINE STRIP */}
          <div className="psb-pe">
            <div className="dot" />
            <div className="txt">
              <b>Predictive Engine</b> &nbsp; {counts.earlyWarnings} early warnings firing &middot; {counts.active} active pathways,{' '}
              <b style={{ color: '#fca5a5' }}>{counts.highRoute} high-route</b>.{' '}
              {counts.unverified > 0
                ? <><b style={{ color: '#fca5a5' }}>{counts.unverified} active pathway{counts.unverified > 1 ? 's' : ''}</b> lack verified controls &mdash; flagged to watch.</>
                : <>All active pathways have verified controls.</>}
            </div>
            <div className="arrow">View signals &rarr;</div>
          </div>

          {/* TOOLBAR */}
          <div className="psb-toolbar">
            <div className="psb-search">
              &#128269;
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search role, task, hazard, or owner…" />
            </div>
            <button className={`psb-fbtn ${tab === 'all'        ? 'act' : ''}`} onClick={() => setTab('all')}>All <span className="cnt">{counts.total}</span></button>
            <button className={`psb-fbtn ${tab === 'high_route' ? 'act' : ''}`} onClick={() => setTab('high_route')}>High-route <span className="cnt">{counts.highRoute}</span></button>
            <button className={`psb-fbtn ${tab === 'active'     ? 'act' : ''}`} onClick={() => setTab('active')}>Active <span className="cnt">{counts.active}</span></button>
            <button className={`psb-fbtn ${tab === 'mitigated'  ? 'act' : ''}`} onClick={() => setTab('mitigated')}>Mitigated <span className="cnt">{counts.mitigated}</span></button>

            <select className="psb-select" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value as ExposureRoute | 'all')}>
              <option value="all">Route: All</option>
              <option value="inhalation">Inhalation</option>
              <option value="injection_sharps">Injection / Sharps</option>
              <option value="skin_dermal">Skin / Dermal</option>
              <option value="ingestion">Ingestion</option>
              <option value="absorption">Absorption</option>
            </select>
            <select className="psb-select" value={freqFilter} onChange={(e) => setFreqFilter(e.target.value as Frequency | 'all')}>
              <option value="all">Frequency: All</option>
              <option value="routine">Routine</option>
              <option value="occasional">Occasional</option>
              <option value="rare">Rare</option>
            </select>
            <select className="psb-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="priority">Sort: Priority</option>
              <option value="route">Sort: Route severity</option>
              <option value="role">Sort: Role</option>
            </select>
          </div>

          {/* GROUPED TABLE */}
          <div className="psb-tbl">
            <div className="psb-thead">
              <div>Person / Task</div>
              <div>Route</div>
              <div>Frequency</div>
              <div>&rarr; Linked Hazard</div>
              <div>Priority</div>
              <div>Status &middot; Owner</div>
              <div />
            </div>

            {groups.map(([location, items]) => (
              <div key={location}>
                <div className="psb-group">&#127970; {location} <span className="gcount">{items.length} pathway{items.length > 1 ? 's' : ''}</span></div>
                {items.map((p) => {
                  const route   = ROUTE_META[p.route];
                  const pr      = exposurePriority(p);
                  const rev     = reviewInfo(p.nextReview);
                  const isActive = p.status === 'active';
                  return (
                    <div className="psb-trow" key={p.id} onClick={() => onOpenPathway?.(p.id)}>
                      <div>
                        <div className="hz">{p.role} <span className="dash">&mdash;</span> <span className="task">{p.task}</span></div>
                        <div className="hzmeta">{p.controlNote}</div>
                      </div>
                      <div>
                        <span className={`route ${route.cls}`}>
                          {route.label}
                          {route.severity === 'high' && <i className="hi">HIGH</i>}
                        </span>
                      </div>
                      <div><span className={`freq fq-${p.frequency}`}>{FREQ_LABEL[p.frequency]}</span></div>
                      <div>
                        <button
                          className="hazlink"
                          onClick={(e) => { e.stopPropagation(); if (p.hazardRef) onOpenHazard?.(p.hazardRef); }}
                        >
                          {p.hazardName} <span className="ext">&nearr;</span>
                        </button>
                        {p.containmentLevel && <div className="bslmini">{p.containmentLevel}</div>}
                      </div>
                      <div className="risk">
                        <span className={`prio r-${pr.band}`}>{pr.label}</span>
                        <div className="hzmeta">{pr.note}</div>
                      </div>
                      <div>
                        <div className="own">
                          <span className={`status st-${p.status}`}>
                            {p.status === 'active' ? 'Active' : p.status === 'verified' ? 'Verified' : 'Mitigated'}
                          </span>
                        </div>
                        <div className="own" style={{ marginTop: 5 }}>
                          <div className="oava">{initialsOf(p.owner)}</div>
                          <div>
                            <div className="oname" style={rev.unassigned ? { color: '#fca5a5' } : undefined}>{p.owner ?? 'Unassigned'}</div>
                            <div className="rev">
                              {rev.unassigned
                                ? <span>&#9888; {rev.label}</span>
                                : rev.overdueDays > 0
                                  ? <span className="od">{rev.label}</span>
                                  : rev.label}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {isActive ? (
                          <button
                            className="mitbtn"
                            onClick={(e) => { e.stopPropagation(); onMarkMitigated?.(p.id); }}
                          >
                            Mark mitigated
                          </button>
                        ) : (
                          <span className="mitdone">&#10003;</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {rows.length === 0 && <div className="psb-empty">No exposure pathways match the current filters.</div>}
          </div>

          {/* LEGEND */}
          <div className="psb-legend">
            <span><b>Exposure priority:</b></span>
            <span><i className="lg" style={{ background: '#ef4444' }} /> High &middot; high-route + routine</span>
            <span><i className="lg" style={{ background: '#f97316' }} /> Elevated &middot; high-route or routine</span>
            <span><i className="lg" style={{ background: '#f59e0b' }} /> Moderate &middot; monitor</span>
            <span><i className="lg" style={{ background: '#22c55e' }} /> Mitigated / verified</span>
          </div>
        </main>
      </div>
    </div>
  );
}

/* --------------------------- Subcomponents --------------------------- */

function Kpi({ cls, label, value, sub, trend, trendCls, valueColor, accent }: {
  cls: string; label: string; value: number; sub: string; trend: string;
  trendCls: 'up' | 'flat'; valueColor?: string; accent: string;
}) {
  return (
    <div className={`psb-kpi ${cls}`} style={{ ['--accent' as string]: accent }}>
      <div className="klabel">{label}</div>
      <div className="krow">
        <div className="knum" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
        <div className="ksub">{sub}</div>
      </div>
      <div className={`ktrend ${trendCls === 'up' ? 'tr-up' : 'tr-flat'}`}>{trend}</div>
    </div>
  );
}

function pct(part: number, total: number): number { return total ? Math.round((part / total) * 100) : 0; }

/* ------------------------------ Styles ------------------------------ */
const STYLES = `
.psb *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.psb{--w2:#13294d;--w3:#16315c;--wline:#22406e;--wline2:#2c4d80;--wink:#eaf1fb;--wink2:#9fb4d4;--wink3:#6f87ad;
  --cink:#0f2647;--cink2:#475569;--cink3:#94a3b8;--cline:#e2e8f0;--accent:#2563eb;--accent2:#60a5fa;
  background:#f5f8fc;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 40px rgba(15,38,71,.08);color:var(--cink);font-size:13px;line-height:1.4}
.psb-topbar{display:flex;align-items:center;justify-content:space-between;background:#0a1d38;padding:12px 18px}
.psb-brand{display:flex;align-items:center;gap:10px}
.psb-logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#1d4ed8,#0891b2);display:flex;align-items:center;justify-content:center;font-size:15px}
.psb-brand b{font-size:14px;font-weight:700;color:#fff}
.psb-brand span{display:block;font-size:9.5px;color:#7e96bd;font-weight:500}
.psb-topright{display:flex;align-items:center;gap:10px}
.psb-pill{background:#13294d;border:1px solid #2c4d80;border-radius:7px;padding:5px 9px;font-size:11px;color:#9fb4d4;display:flex;align-items:center;gap:6px}
.psb-owner{background:rgba(34,197,94,.14);border-color:rgba(34,197,94,.4);color:#86efac;font-weight:700;letter-spacing:.04em;font-size:9.5px}
.psb-ava{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff}
.psb-shell{display:flex;min-height:600px}
.psb-nav{width:182px;background:#fff;border-right:1px solid var(--cline);padding:10px 0;flex-shrink:0}
.psb-navgrp{font-size:9.5px;letter-spacing:.12em;color:var(--cink3);text-transform:uppercase;padding:11px 16px 4px;display:flex;align-items:center;gap:7px;font-weight:700}
.psb-navitem{padding:7px 16px 7px 34px;font-size:12px;color:var(--cink2);cursor:pointer}
.psb-navitem:hover{color:var(--cink);background:#f1f5fb}
.psb-navitem.on{color:var(--accent);background:linear-gradient(90deg,rgba(37,99,235,.1),transparent);border-left:2px solid var(--accent);padding-left:32px;font-weight:700}
.psb-navtop{padding:9px 16px;font-size:12.5px;color:var(--cink);font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer}
.psb-navtop .ch{margin-left:auto;color:var(--cink3);font-size:10px}
.psb-main{flex:1;padding:16px 20px;overflow:auto;background:#f5f8fc}
.psb-connbar{font-size:10.5px;color:var(--cink3);margin-bottom:12px}
.psb-connbar b{color:var(--cink2);font-weight:600}
.psb-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:16px}
.psb-eyebrow{font-size:10px;letter-spacing:.14em;color:var(--accent);font-weight:700;text-transform:uppercase;margin-bottom:4px}
.psb-main h1{font-size:21px;font-weight:700;letter-spacing:-.01em;margin-bottom:3px;color:var(--cink)}
.psb-sub{font-size:11.5px;color:var(--cink2);max-width:620px}
.psb-btn{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px;white-space:nowrap;box-shadow:0 4px 14px rgba(37,99,235,.3)}
.psb-btn.ghost{background:#fff;border:1px solid var(--cline);color:var(--cink2);box-shadow:none;font-weight:500}
.psb-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:13px}
.psb-kpi{background:var(--w2);border:1px solid var(--wline);border-radius:11px;padding:13px 14px;position:relative;overflow:hidden;box-shadow:0 6px 18px rgba(15,38,71,.12)}
.psb-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent,#60a5fa)}
.psb-kpi .klabel{font-size:9.5px;letter-spacing:.08em;color:var(--wink3);text-transform:uppercase;font-weight:700;margin-bottom:6px}
.psb-kpi .krow{display:flex;align-items:baseline;gap:8px}
.psb-kpi .knum{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1;color:var(--wink)}
.psb-kpi .ksub{font-size:10.5px;color:var(--wink2)}
.psb-kpi .ktrend{position:absolute;top:12px;right:12px;font-size:10px;font-weight:700;padding:2px 6px;border-radius:5px}
.psb-kpi .tr-up{background:rgba(239,68,68,.18);color:#fca5a5}
.psb-kpi .tr-flat{background:rgba(159,180,212,.16);color:var(--wink3)}
.psb-pe{background:linear-gradient(100deg,#1c1740,#0f2647);border:1px solid rgba(168,85,247,.4);border-radius:11px;padding:12px 15px;margin-bottom:14px;display:flex;align-items:center;gap:14px;box-shadow:0 6px 18px rgba(15,38,71,.12)}
.psb-pe .dot{width:9px;height:9px;border-radius:50%;background:#a855f7;box-shadow:0 0 0 4px rgba(168,85,247,.25);flex-shrink:0}
.psb-pe .txt{font-size:11.5px;color:var(--wink2);flex:1}
.psb-pe b{color:#d8b4fe}
.psb-pe .arrow{font-size:11px;color:#d8b4fe;font-weight:700;white-space:nowrap;cursor:pointer}
.psb-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.psb-search{flex:1;min-width:220px;background:#fff;border:1px solid var(--cline);border-radius:8px;padding:8px 11px;font-size:12px;color:var(--cink3);display:flex;align-items:center;gap:8px}
.psb-search input{border:none;outline:none;background:transparent;flex:1;font-size:12px;color:var(--cink)}
.psb-fbtn{background:#fff;border:1px solid var(--cline);border-radius:8px;padding:8px 11px;font-size:11.5px;color:var(--cink2);cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap}
.psb-fbtn.act{border-color:var(--accent);color:#fff;background:var(--accent)}
.psb-fbtn.act .cnt{background:rgba(255,255,255,.25)}
.psb-fbtn .cnt{background:#eef2f8;border-radius:5px;padding:0 5px;font-size:10px;font-weight:700}
.psb-select{background:#fff;border:1px solid var(--cline);border-radius:8px;padding:8px 11px;font-size:11.5px;color:var(--cink2);cursor:pointer}
.psb-tbl{background:var(--w2);border:1px solid var(--wline);border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(15,38,71,.14)}
.psb-thead,.psb-trow{display:grid;grid-template-columns:2.5fr 1.1fr .8fr 1.6fr 1fr 1.3fr .9fr;gap:10px;padding:13px 16px;align-items:center}
.psb-thead{border-bottom:1px solid var(--wline);background:#0e234a;font-size:9.5px;letter-spacing:.06em;color:var(--wink3);text-transform:uppercase;font-weight:700;padding:11px 16px}
.psb-group{background:#0c1f43;border-bottom:1px solid var(--wline);padding:8px 16px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#8fb0e0;display:flex;align-items:center;gap:8px}
.psb-group .gcount{color:var(--wink3);font-weight:600;letter-spacing:.04em}
.psb-trow{border-bottom:1px solid var(--wline);cursor:pointer}
.psb-trow:last-child{border-bottom:none}
.psb-trow:hover{background:var(--w3)}
.psb-trow .hz{font-size:12px;font-weight:600;color:var(--wink);margin-bottom:3px;line-height:1.35}
.psb-trow .hz .dash{color:var(--wink3);font-weight:400}
.psb-trow .hz .task{font-weight:500;color:var(--wink2)}
.psb-trow .hzmeta{font-size:10px;color:var(--wink3);line-height:1.4}
.psb-trow .route{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;letter-spacing:.02em}
.psb-trow .route .hi{font-style:normal;font-size:8px;font-weight:800;letter-spacing:.06em;background:rgba(239,68,68,.3);color:#fecaca;padding:1px 4px;border-radius:4px}
.psb-trow .rt-inhalation{background:rgba(239,68,68,.16);color:#fca5a5}
.psb-trow .rt-injection{background:rgba(249,115,22,.16);color:#fdba74}
.psb-trow .rt-skin{background:rgba(245,158,11,.16);color:#fcd34d}
.psb-trow .rt-ingestion{background:rgba(6,182,212,.16);color:#67e8f9}
.psb-trow .rt-absorption{background:rgba(168,85,247,.16);color:#d8b4fe}
.psb-trow .freq{font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px}
.psb-trow .fq-routine{background:rgba(239,68,68,.14);color:#fca5a5}
.psb-trow .fq-occasional{background:rgba(245,158,11,.14);color:#fcd34d}
.psb-trow .fq-rare{background:rgba(159,180,212,.14);color:var(--wink2)}
.psb-trow .hazlink{background:none;border:none;padding:0;text-align:left;cursor:pointer;font-size:11.5px;font-weight:600;color:#93c5fd;line-height:1.3}
.psb-trow .hazlink:hover{text-decoration:underline}
.psb-trow .hazlink .ext{font-size:9px;color:var(--wink3)}
.psb-trow .bslmini{font-size:9.5px;font-weight:700;color:var(--wink3);margin-top:3px}
.psb-trow .risk .prio{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:6px;margin-bottom:3px}
.psb-trow .r-red{background:rgba(239,68,68,.2);color:#fca5a5;border:1px solid rgba(239,68,68,.5)}
.psb-trow .r-orange{background:rgba(249,115,22,.2);color:#fdba74;border:1px solid rgba(249,115,22,.5)}
.psb-trow .r-amber{background:rgba(245,158,11,.2);color:#fcd34d;border:1px solid rgba(245,158,11,.5)}
.psb-trow .r-green{background:rgba(34,197,94,.2);color:#86efac;border:1px solid rgba(34,197,94,.5)}
.psb-trow .status{display:inline-block;font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:6px;letter-spacing:.03em}
.psb-trow .st-active{background:rgba(239,68,68,.16);color:#fca5a5}
.psb-trow .st-mitigated{background:rgba(245,158,11,.16);color:#fcd34d}
.psb-trow .st-verified{background:rgba(34,197,94,.16);color:#86efac}
.psb-trow .own{display:flex;align-items:center;gap:7px}
.psb-trow .oava{width:22px;height:22px;border-radius:50%;background:var(--wline2);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--wink2);flex-shrink:0}
.psb-trow .oname{font-size:10.5px;color:var(--wink2);font-weight:600}
.psb-trow .rev{font-size:10px;color:var(--wink3)}
.psb-trow .rev .od{color:#fca5a5;font-weight:700}
.psb-trow .mitbtn{background:#fff;border:1px solid var(--cline);border-radius:7px;padding:6px 10px;font-size:10.5px;font-weight:600;color:var(--cink2);cursor:pointer;white-space:nowrap}
.psb-trow .mitbtn:hover{border-color:var(--accent);color:var(--accent)}
.psb-trow .mitdone{color:#86efac;font-weight:800;font-size:15px}
.psb-empty{padding:28px;text-align:center;color:var(--wink3);font-size:12px}
.psb-legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:13px;padding:11px 14px;background:#fff;border:1px solid var(--cline);border-radius:9px;font-size:10px;color:var(--cink2)}
.psb-legend span{display:flex;align-items:center;gap:6px}
.psb-legend .lg{width:9px;height:9px;border-radius:3px;display:inline-block}
`;
