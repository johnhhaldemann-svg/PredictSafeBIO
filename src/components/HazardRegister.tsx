'use client';

import { useMemo, useState } from 'react';

/* ----------------------------- Types ----------------------------- */

export type HazardType = 'biological' | 'chemical' | 'physical' | 'ergonomic';
export type HazardStatus =
  | 'identified'
  | 'under_assessment'
  | 'controls_assigned'
  | 'controlled';

export interface Hazard {
  id: string;
  name: string;
  location: string;
  containment: string;
  containmentLevel: string;
  casNumber?: string;
  type: HazardType;
  riskScore: number;
  consequenceNote: string;
  controlsInPlace: number;
  controlsRequired: number;
  ownerName: string | null;
  nextReview: string | null;
  status: HazardStatus;
}

type RiskBand = 'green' | 'amber' | 'orange' | 'red';
type TabFilter = 'all' | 'uncontrolled' | 'controlled';
type SortKey = 'risk' | 'review' | 'name';

/* --------------------------- ARC logic --------------------------- */

function riskBand(score: number): RiskBand {
  if (score >= 9) return 'red';
  if (score >= 7) return 'orange';
  if (score >= 4) return 'amber';
  return 'green';
}

const BAND_LABEL: Record<RiskBand, string> = {
  red: 'Red',
  orange: 'Orange',
  amber: 'Amber',
  green: 'Green',
};

function initialsOf(name: string | null): string {
  if (!name) return '—';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function reviewInfo(nextReview: string | null): {
  label: string;
  overdueDays: number;
  unassigned: boolean;
} {
  if (!nextReview) return { label: 'needs owner', overdueDays: 0, unassigned: true };
  const today = new Date();
  const due = new Date(nextReview);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) {
    return { label: `Overdue ${Math.abs(diffDays)}d`, overdueDays: Math.abs(diffDays), unassigned: false };
  }
  const fmt = due.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  return { label: `${fmt} · ${diffDays}d`, overdueDays: 0, unassigned: false };
}

const TYPE_LABEL: Record<HazardType, string> = {
  biological: 'Biological',
  chemical: 'Chemical',
  physical: 'Physical',
  ergonomic: 'Ergonomic',
};

/* --------------------------- Sample data -------------------------- */

const SAMPLE_HAZARDS: Hazard[] = [
  {
    id: 'hz-001',
    name: 'Recombinant Lentiviral Vector',
    location: 'Cell Culture Lab · Room 104',
    containment: 'BSC Class II Type A2',
    containmentLevel: 'BSL-2',
    type: 'biological',
    riskScore: 9,
    consequenceNote: 'Work stoppage',
    controlsInPlace: 0,
    controlsRequired: 4,
    ownerName: 'D. Mehta',
    nextReview: '2026-06-10',
    status: 'identified',
  },
  {
    id: 'hz-002',
    name: 'HEK293T Cell Line',
    location: 'Cell Culture Lab · Room 104',
    containment: 'BSC Class II Type A2',
    containmentLevel: 'BSL-2',
    type: 'biological',
    riskScore: 7,
    consequenceNote: 'Toolbox + insp.',
    controlsInPlace: 1,
    controlsRequired: 3,
    ownerName: 'D. Mehta',
    nextReview: '2026-06-24',
    status: 'identified',
  },
  {
    id: 'hz-003',
    name: 'Ethidium Bromide (EtBr) Gel Stain',
    location: 'Molecular Biology Bench · Room 102',
    containment: 'Fume hood / glove box',
    containmentLevel: 'Fume hood',
    casNumber: '1239-45-8',
    type: 'chemical',
    riskScore: 6,
    consequenceNote: 'Supervisor alert',
    controlsInPlace: 2,
    controlsRequired: 3,
    ownerName: 'R. Kim',
    nextReview: '2026-07-02',
    status: 'identified',
  },
  {
    id: 'hz-004',
    name: 'Liquid Nitrogen Cryogenic Storage',
    location: 'Freezer Room · Room 108',
    containment: 'Cryogenic gloves + face shield',
    containmentLevel: 'PPE req.',
    type: 'physical',
    riskScore: 5,
    consequenceNote: 'Asphyxiation / O₂',
    controlsInPlace: 2,
    controlsRequired: 4,
    ownerName: null,
    nextReview: null,
    status: 'identified',
  },
  {
    id: 'hz-005',
    name: 'β-Mercaptoethanol (BME)',
    location: 'Biochemistry Lab · Room 103',
    containment: 'Fume hood only',
    containmentLevel: 'Fume hood',
    casNumber: '60-24-2',
    type: 'chemical',
    riskScore: 7,
    consequenceNote: 'Inhalation toxic',
    controlsInPlace: 0,
    controlsRequired: 3,
    ownerName: 'R. Kim',
    nextReview: '2026-06-14',
    status: 'identified',
  },
];

/* ------------------------------ View ------------------------------ */

export default function HazardRegister({
  hazards = SAMPLE_HAZARDS,
  onAddHazard,
  onExport,
  onOpenHazard,
}: {
  hazards?: Hazard[];
  onAddHazard?: () => void;
  onExport?: () => void;
  onOpenHazard?: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabFilter>('all');
  const [typeFilter, setTypeFilter] = useState<HazardType | 'all'>('all');
  const [bandFilter, setBandFilter] = useState<RiskBand | 'all'>('all');
  const [reviewDueOnly, setReviewDueOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('risk');

  const counts = useMemo(() => {
    const total = hazards.length;
    const controlled = hazards.filter((h) => h.status === 'controlled').length;
    const underAssessment = hazards.filter((h) => h.status === 'under_assessment').length;
    const controlsAssigned = hazards.filter((h) => h.status === 'controls_assigned').length;
    const identified = hazards.filter((h) => h.status === 'identified').length;
    const uncontrolled = total - controlled;
    const highRiskNoControls = hazards.filter(
      (h) => h.riskScore >= 7 && h.controlsInPlace === 0,
    ).length;
    return { total, controlled, underAssessment, controlsAssigned, identified, uncontrolled, highRiskNoControls };
  }, [hazards]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = hazards.filter((h) => {
      if (tab === 'uncontrolled' && h.status === 'controlled') return false;
      if (tab === 'controlled' && h.status !== 'controlled') return false;
      if (typeFilter !== 'all' && h.type !== typeFilter) return false;
      if (bandFilter !== 'all' && riskBand(h.riskScore) !== bandFilter) return false;
      if (reviewDueOnly && reviewInfo(h.nextReview).overdueDays === 0) return false;
      if (q) {
        const hay = `${h.name} ${h.location} ${h.casNumber ?? ''} ${h.ownerName ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'risk') return b.riskScore - a.riskScore;
      if (sort === 'name') return a.name.localeCompare(b.name);
      const ra = a.nextReview ? new Date(a.nextReview).getTime() : Infinity;
      const rb = b.nextReview ? new Date(b.nextReview).getTime() : Infinity;
      return ra - rb;
    });
    return list;
  }, [hazards, search, tab, typeFilter, bandFilter, reviewDueOnly, sort]);

  return (
    <div className="psb">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* TOP BAR */}
      <div className="psb-topbar">
        <div className="psb-brand">
          <div className="psb-logo">🛡️</div>
          <div>
            <b>PredictSafe BIO</b>
            <span>Biosafety Intelligence</span>
          </div>
        </div>
        <div className="psb-topright">
          <div className="psb-pill">🔔 <span style={{ color: '#fca5a5', fontWeight: 700 }}>1</span></div>
          <div className="psb-pill psb-owner">OWNER</div>
          <div className="psb-ava">JH</div>
          <div className="psb-pill" style={{ fontSize: 10.5 }}>john.haldemann@hotmail.com</div>
          <div className="psb-pill" style={{ padding: '5px 8px' }}>⎋</div>
        </div>
      </div>

      <div className="psb-shell">
        {/* NAV */}
        <nav className="psb-nav">
          <div className="psb-navgrp">Assess <span style={{ marginLeft: 'auto' }}>▾</span></div>
          <div className="psb-navitem">Risk Workbench</div>
          <div className="psb-navitem">Risk Register</div>
          <div className="psb-navitem on">Hazard Register</div>
          <div className="psb-navitem">Exposure Map</div>
          <div className="psb-navitem">Personnel</div>
          <div className="psb-navtop">Plan <span className="ch">▸</span></div>
          <div className="psb-navtop">Operate <span className="ch">▸</span></div>
          <div className="psb-navtop">Monitor <span className="ch">▸</span></div>
          <div className="psb-navtop">Workspace <span className="ch">▸</span></div>
        </nav>

        {/* MAIN */}
        <main className="psb-main">
          <div className="psb-connbar">
            Workspace connected · <b>john.haldemann@hotmail.com</b> ·{' '}
            <span style={{ color: '#16a34a', fontWeight: 700 }}>OWNER</span>
          </div>

          <div className="psb-head">
            <div>
              <div className="psb-eyebrow">● Assess · Stage 3</div>
              <h1>Hazard Register</h1>
              <p className="psb-sub">
                Identify, score, and track biological, chemical, physical, and ergonomic hazards.
                Uncontrolled hazards feed the Predictive Engine as leading indicators.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button className="psb-btn ghost" onClick={onExport}>⭳ Export</button>
              <button className="psb-btn" onClick={onAddHazard}>＋ Add Hazard</button>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="psb-kpis">
            <Kpi cls="k-tot" label="Total Hazards" value={counts.total} sub="active in register" trend="▲ +2" trendCls="up" accent="#60a5fa" />
            <Kpi cls="k-unc" label="Uncontrolled" value={counts.uncontrolled} sub="leading risk indicators" trend={`${pct(counts.uncontrolled, counts.total)}%`} trendCls="up" valueColor="#fca5a5" accent="#ef4444" />
            <Kpi cls="k-und" label="Under Assessment" value={counts.underAssessment} sub="being evaluated" trend="—" trendCls="flat" valueColor="#fcd34d" accent="#f59e0b" />
            <Kpi cls="k-ctl" label="Controlled" value={counts.controlled} sub="controls verified" trend={`${pct(counts.controlled, counts.total)}%`} trendCls="flat" valueColor="#86efac" accent="#22c55e" />
          </div>

          {/* PREDICTIVE ENGINE STRIP */}
          <div className="psb-pe">
            <div className="dot" />
            <div className="txt">
              <b>Predictive Engine</b> &nbsp; {counts.uncontrolled} uncontrolled hazards are active
              leading indicators.{' '}
              <b style={{ color: '#fca5a5' }}>{counts.highRiskNoControls} high-risk</b> have zero
              documented controls — flagged for priority action.
            </div>
            <div className="arrow">View signals →</div>
          </div>

          {/* CONTROL PIPELINE FUNNEL */}
          <div className="psb-funnel">
            <div className="ftitle">Control<br />Pipeline</div>
            <FunnelStage n={counts.identified} label="Identified" color="#ef4444" active />
            <span className="fsep">→</span>
            <FunnelStage n={counts.underAssessment} label="Under Assessment" color="#f59e0b" active={counts.underAssessment > 0} />
            <span className="fsep">→</span>
            <FunnelStage n={counts.controlsAssigned} label="Controls Assigned" color="#f97316" active={counts.controlsAssigned > 0} />
            <span className="fsep">→</span>
            <FunnelStage n={counts.controlled} label="Controlled / Verified" color="#22c55e" active={counts.controlled > 0} />
          </div>

          {/* TOOLBAR */}
          <div className="psb-toolbar">
            <div className="psb-search">
              🔍
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search hazards, location, CAS #, or owner…"
              />
            </div>
            <button className={`psb-fbtn ${tab === 'all' ? 'act' : ''}`} onClick={() => setTab('all')}>
              All <span className="cnt">{counts.total}</span>
            </button>
            <button className={`psb-fbtn ${tab === 'uncontrolled' ? 'act' : ''}`} onClick={() => setTab('uncontrolled')}>
              Uncontrolled <span className="cnt">{counts.uncontrolled}</span>
            </button>
            <button className={`psb-fbtn ${tab === 'controlled' ? 'act' : ''}`} onClick={() => setTab('controlled')}>
              Controlled <span className="cnt">{counts.controlled}</span>
            </button>
            <select className="psb-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as HazardType | 'all')}>
              <option value="all">Type: All</option>
              <option value="biological">Biological</option>
              <option value="chemical">Chemical</option>
              <option value="physical">Physical</option>
              <option value="ergonomic">Ergonomic</option>
            </select>
            <select className="psb-select" value={bandFilter} onChange={(e) => setBandFilter(e.target.value as RiskBand | 'all')}>
              <option value="all">Risk Band: All</option>
              <option value="red">Red (9–10)</option>
              <option value="orange">Orange (7–8)</option>
              <option value="amber">Amber (4–6)</option>
              <option value="green">Green (0–3)</option>
            </select>
            <button className={`psb-fbtn ${reviewDueOnly ? 'act' : ''}`} onClick={() => setReviewDueOnly((v) => !v)}>
              ⏱ Review Due
            </button>
            <select className="psb-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="risk">Sort: Risk</option>
              <option value="review">Sort: Review date</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>

          {/* TABLE */}
          <div className="psb-tbl">
            <div className="psb-thead">
              <div>Hazard / Location</div>
              <div>Type</div>
              <div>Containment</div>
              <div>Risk Score</div>
              <div>Controls</div>
              <div>Owner · Next Review</div>
              <div />
            </div>

            {rows.map((h) => {
              const band = riskBand(h.riskScore);
              const rev = reviewInfo(h.nextReview);
              const ctrlPct = h.controlsRequired ? (h.controlsInPlace / h.controlsRequired) * 100 : 0;
              const none = h.controlsInPlace === 0;
              return (
                <div className="psb-trow" key={h.id} onClick={() => onOpenHazard?.(h.id)}>
                  <div>
                    <div className="hz">{h.name}</div>
                    <div className="hzmeta">
                      {h.location} · {h.casNumber ? `CAS ${h.casNumber}` : h.containment}
                    </div>
                  </div>
                  <div><span className={`tag t-${h.type}`}>{TYPE_LABEL[h.type]}</span></div>
                  <div><span className="bsl">{h.containmentLevel}</span></div>
                  <div className="risk">
                    <div className={`rscore r-${band}`}>{h.riskScore}</div>
                    <div>
                      <div className={`rband rb-${band}`}>{BAND_LABEL[band]}</div>
                      <div className="hzmeta">{h.consequenceNote}</div>
                    </div>
                  </div>
                  <div>
                    <div className="ctrl" style={none ? { color: '#fca5a5' } : undefined}>
                      {h.controlsInPlace} / {h.controlsRequired}
                    </div>
                    <div className={`cbar ${none ? 'none' : ''}`}>
                      <i style={{ width: `${none ? 4 : ctrlPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="own">
                      <div className="oava">{initialsOf(h.ownerName)}</div>
                      <div>
                        <div className="oname" style={rev.unassigned ? { color: '#fca5a5' } : undefined}>
                          {h.ownerName ?? 'Unassigned'}
                        </div>
                        <div className="rev">
                          {rev.unassigned ? (
                            <span>⚠ {rev.label}</span>
                          ) : rev.overdueDays > 0 ? (
                            <span className="od">{rev.label}</span>
                          ) : (
                            rev.label
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="kebab">⋯</div>
                </div>
              );
            })}

            {rows.length === 0 && <div className="psb-empty">No hazards match the current filters.</div>}
          </div>

          {/* LEGEND */}
          <div className="psb-legend">
            <span><b>Risk bands:</b></span>
            <span><i className="lg" style={{ background: '#22c55e' }} /> 0–3 Green · Monitor</span>
            <span><i className="lg" style={{ background: '#f59e0b' }} /> 4–6 Amber · Alert + observe</span>
            <span><i className="lg" style={{ background: '#f97316' }} /> 7–8 Orange · Toolbox + inspection</span>
            <span><i className="lg" style={{ background: '#ef4444' }} /> 9–10 Red · Consider work stoppage</span>
          </div>
        </main>
      </div>
    </div>
  );
}

/* --------------------------- Subcomponents --------------------------- */

function Kpi({
  cls, label, value, sub, trend, trendCls, valueColor, accent,
}: {
  cls: string; label: string; value: number; sub: string;
  trend: string; trendCls: 'up' | 'flat'; valueColor?: string; accent: string;
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

function FunnelStage({ n, label, color, active }: { n: number; label: string; color: string; active?: boolean }) {
  return (
    <div className="fstage">
      <div className="fbar" style={{ background: color, opacity: active ? 1 : 0.35 }} />
      <div className="fn" style={{ color: active ? color : '#6f87ad' }}>{n}</div>
      <div className="fl">{label}</div>
    </div>
  );
}

function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

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
.psb-sub{font-size:11.5px;color:var(--cink2);max-width:560px}
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
.psb-funnel{display:flex;align-items:center;margin-bottom:14px;background:var(--w2);border:1px solid var(--wline);border-radius:11px;padding:13px 16px;box-shadow:0 6px 18px rgba(15,38,71,.12)}
.psb-funnel .ftitle{font-size:9.5px;letter-spacing:.08em;color:var(--wink3);text-transform:uppercase;font-weight:700;margin-right:16px;white-space:nowrap}
.psb-funnel .fstage{flex:1;text-align:center}
.psb-funnel .fbar{height:7px;border-radius:4px;margin-bottom:6px}
.psb-funnel .fn{font-size:17px;font-weight:800}
.psb-funnel .fl{font-size:9.5px;color:var(--wink3);text-transform:uppercase;letter-spacing:.05em;font-weight:600}
.psb-funnel .fsep{color:var(--wink3);font-size:13px;padding:0 14px;align-self:flex-start;margin-top:2px}
.psb-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.psb-search{flex:1;min-width:220px;background:#fff;border:1px solid var(--cline);border-radius:8px;padding:8px 11px;font-size:12px;color:var(--cink3);display:flex;align-items:center;gap:8px}
.psb-search input{border:none;outline:none;background:transparent;flex:1;font-size:12px;color:var(--cink)}
.psb-fbtn{background:#fff;border:1px solid var(--cline);border-radius:8px;padding:8px 11px;font-size:11.5px;color:var(--cink2);cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap}
.psb-fbtn.act{border-color:var(--accent);color:#fff;background:var(--accent)}
.psb-fbtn.act .cnt{background:rgba(255,255,255,.25)}
.psb-fbtn .cnt{background:#eef2f8;border-radius:5px;padding:0 5px;font-size:10px;font-weight:700}
.psb-select{background:#fff;border:1px solid var(--cline);border-radius:8px;padding:8px 11px;font-size:11.5px;color:var(--cink2);cursor:pointer}
.psb-tbl{background:var(--w2);border:1px solid var(--wline);border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(15,38,71,.14)}
.psb-thead,.psb-trow{display:grid;grid-template-columns:2.6fr 1fr .9fr 1.3fr 1.1fr 1.2fr .4fr;gap:10px;padding:13px 16px;align-items:center}
.psb-thead{border-bottom:1px solid var(--wline);background:#0e234a;font-size:9.5px;letter-spacing:.06em;color:var(--wink3);text-transform:uppercase;font-weight:700;padding:11px 16px}
.psb-trow{border-bottom:1px solid var(--wline);cursor:pointer}
.psb-trow:last-child{border-bottom:none}
.psb-trow:hover{background:var(--w3)}
.psb-trow .hz{font-size:12.5px;font-weight:600;color:var(--wink);margin-bottom:3px}
.psb-trow .hzmeta{font-size:10px;color:var(--wink3)}
.psb-trow .tag{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;letter-spacing:.03em}
.psb-trow .tag::before{content:'';width:6px;height:6px;border-radius:50%}
.psb-trow .t-biological{background:rgba(168,85,247,.18);color:#d8b4fe}.psb-trow .t-biological::before{background:#a855f7}
.psb-trow .t-chemical{background:rgba(6,182,212,.18);color:#67e8f9}.psb-trow .t-chemical::before{background:#06b6d4}
.psb-trow .t-physical{background:rgba(234,179,8,.18);color:#fde047}.psb-trow .t-physical::before{background:#eab308}
.psb-trow .t-ergonomic{background:rgba(236,72,153,.18);color:#f9a8d4}.psb-trow .t-ergonomic::before{background:#ec4899}
.psb-trow .bsl{font-size:10.5px;font-weight:700;color:var(--wink2);background:#0f2647;border:1px solid var(--wline2);border-radius:5px;padding:2px 7px;display:inline-block}
.psb-trow .risk{display:flex;align-items:center;gap:8px}
.psb-trow .rscore{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;flex-shrink:0}
.psb-trow .r-red{background:rgba(239,68,68,.2);color:#fca5a5;border:1px solid rgba(239,68,68,.5)}
.psb-trow .r-orange{background:rgba(249,115,22,.2);color:#fdba74;border:1px solid rgba(249,115,22,.5)}
.psb-trow .r-amber{background:rgba(245,158,11,.2);color:#fcd34d;border:1px solid rgba(245,158,11,.5)}
.psb-trow .r-green{background:rgba(34,197,94,.2);color:#86efac;border:1px solid rgba(34,197,94,.5)}
.psb-trow .rband{font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.psb-trow .rb-red{color:#fca5a5}.psb-trow .rb-orange{color:#fdba74}.psb-trow .rb-amber{color:#fcd34d}.psb-trow .rb-green{color:#86efac}
.psb-trow .ctrl{font-size:10.5px;color:var(--wink2);margin-bottom:4px;font-weight:600}
.psb-trow .cbar{height:5px;background:var(--wline2);border-radius:3px;overflow:hidden}
.psb-trow .cbar i{display:block;height:100%;border-radius:3px;background:#22c55e}
.psb-trow .cbar.none i{background:#ef4444}
.psb-trow .own{display:flex;align-items:center;gap:7px}
.psb-trow .oava{width:22px;height:22px;border-radius:50%;background:var(--wline2);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--wink2);flex-shrink:0}
.psb-trow .oname{font-size:10.5px;color:var(--wink2);font-weight:600}
.psb-trow .rev{font-size:10px;color:var(--wink3)}
.psb-trow .rev .od{color:#fca5a5;font-weight:700}
.psb-trow .kebab{color:var(--wink3);font-size:16px;text-align:center;font-weight:700}
.psb-empty{padding:28px;text-align:center;color:var(--wink3);font-size:12px}
.psb-legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:13px;padding:11px 14px;background:#fff;border:1px solid var(--cline);border-radius:9px;font-size:10px;color:var(--cink2)}
.psb-legend span{display:flex;align-items:center;gap:6px}
.psb-legend .lg{width:9px;height:9px;border-radius:3px;flex-shrink:0}
`;
