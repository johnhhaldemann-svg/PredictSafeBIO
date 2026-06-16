'use client';

/**
 * WorkPermits.tsx  (route: /permits)
 * PredictSafe BIO — Operate · Permit to Work
 * Reliance Predictive Safety Technologies
 *
 * Self-contained layout (own topbar / sidebar); drop in without AppShell.
 * Accepts optional `permits` from the server; falls back to demo data when absent.
 *
 * Features:
 *  - Required controls / verification checklist per permit
 *  - Authorization chain (holder / issued by / approved by)
 *  - Validity clock (overrun detection, >24 h flag) and controls-gate alert
 */

import { useMemo, useState } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Status = 'active' | 'approved' | 'draft' | 'closed';

export interface Control { label: string; done: boolean; }

export interface Permit {
  id: string; type: string; icon: string; status: Status; over24: boolean;
  location: string; work: string; window: string; clock: string;
  clockState: 'over' | 'ok' | 'scheduled' | 'draft';
  hazards: string[]; controls: Control[];
  holder: string; issuedBy: string; approvedBy: string | null;
}

export interface WorkPermitsAuth {
  isSignedIn: boolean;
  isOwner: boolean;
  userEmail?: string | null;
}

interface Props {
  permits?: Permit[];
  auth?: WorkPermitsAuth;
}

/* ─── Demo data ──────────────────────────────────────────────────────────── */

const DEMO_PERMITS: Permit[] = [
  {
    id: 'demo-permit-001', type: 'Hot Work', icon: '🔥', status: 'active', over24: true,
    location: 'Lab 201 · BSC room 201', work: 'Welding repair on exhaust flange',
    window: 'Started 6/15 4:59 PM · Ends 6/17 6:59 PM', clock: 'Open 26 h', clockState: 'over',
    hazards: ['fire', 'fumes', 'sparks'],
    controls: [
      { label: 'Fire watch assigned', done: true },
      { label: 'Extinguisher staged', done: true },
      { label: 'Combustibles cleared (10 m)', done: true },
      { label: 'Hot-work permit posted', done: true },
      { label: 'Gas / atmosphere test logged', done: false },
    ],
    holder: 'J. Alvarez · Maintenance', issuedBy: 'Facilities', approvedBy: 'EHS Manager',
  },
  {
    id: 'demo-permit-002', type: 'Lockout / Tagout (LOTO)', icon: '🔒', status: 'approved', over24: false,
    location: 'Sterilization Room', work: 'Autoclave preventive maintenance',
    window: 'Starts 6/16 6:59 PM · Ends 6/17 6:59 PM', clock: 'Starts in 2 h', clockState: 'scheduled',
    hazards: ['electrical', 'steam'],
    controls: [
      { label: 'Energy sources identified', done: true },
      { label: 'Isolation points locked', done: true },
      { label: 'Zero-energy verified', done: true },
      { label: 'Tags applied', done: true },
      { label: 'Affected staff notified', done: true },
    ],
    holder: 'M. Chen · Validation', issuedBy: 'Facilities', approvedBy: 'EHS Manager',
  },
  {
    id: 'demo-permit-003', type: 'Contractor Work', icon: '👷', status: 'draft', over24: false,
    location: 'BSL-2 Suite', work: 'HVAC filter replacement — BSL-2 suite',
    window: 'Not scheduled', clock: 'Draft', clockState: 'draft',
    hazards: ['biological', 'particulates'],
    controls: [
      { label: 'Contractor induction complete', done: true },
      { label: 'Insurance / COI on file', done: true },
      { label: 'Biosafety briefing', done: false },
      { label: 'Decontamination plan', done: false },
      { label: 'BSC / airflow lockout', done: false },
    ],
    holder: 'AirFlow Services (contractor)', issuedBy: 'Facilities', approvedBy: null,
  },
];

/* ─── Reference ─────────────────────────────────────────────────────────── */

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  active:   { label: 'Active',   cls: 'ps-active' },
  approved: { label: 'Approved', cls: 'ps-approved' },
  draft:    { label: 'Draft',    cls: 'ps-draft' },
  closed:   { label: 'Closed',   cls: 'ps-closed' },
};

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function WorkPermits({ permits: permitsProp, auth }: Props) {
  const PERMITS = permitsProp ?? DEMO_PERMITS;
  const isDemo  = !permitsProp;

  const [filter, setFilter] = useState<'all' | 'active' | 'overdue' | 'draft'>('all');

  const counts = useMemo(() => ({
    all:     PERMITS.length,
    active:  PERMITS.filter((p) => p.status === 'active' || p.status === 'approved').length,
    overdue: PERMITS.filter((p) => p.over24).length,
    draft:   PERMITS.filter((p) => p.status === 'draft').length,
    closed:  PERMITS.filter((p) => p.status === 'closed').length,
  }), [PERMITS]);

  const rows = useMemo(() => PERMITS.filter((p) => {
    if (filter === 'all')     return true;
    if (filter === 'overdue') return p.over24;
    if (filter === 'active')  return p.status === 'active' || p.status === 'approved';
    return p.status === 'draft';
  }), [filter, PERMITS]);

  // Controls-gate: an ACTIVE permit with at least one incomplete required control
  const gated = PERMITS.filter(
    (p) => p.status === 'active' && p.controls.some((c) => !c.done),
  );

  const displayEmail = auth?.userEmail ?? 'john.haldemann@hotmail.com';
  const initials     = displayEmail.slice(0, 2).toUpperCase();

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
          <div className="psb-pill">
            🔔 <span style={{ color: '#fca5a5', fontWeight: 700 }}>{counts.overdue || ''}</span>
          </div>
          {auth?.isOwner && <div className="psb-pill psb-owner">OWNER</div>}
          <div className="psb-ava">{initials}</div>
          <div className="psb-pill" style={{ fontSize: 10.5 }}>{displayEmail}</div>
          <div className="psb-pill" style={{ padding: '5px 8px' }}>⎋</div>
        </div>
      </div>

      <div className="psb-shell">
        {/* NAV */}
        <nav className="psb-nav">
          <div className="psb-navtop">Assess <span className="ch">▸</span></div>
          <div className="psb-navtop">Plan <span className="ch">▸</span></div>
          <div className="psb-navgrp">Operate <span style={{ marginLeft: 'auto' }}>▾</span></div>
          <div className="psb-navitem">Inspections</div>
          <div className="psb-navitem">Incident Reporting</div>
          <div className="psb-navitem">CAPA</div>
          <div className="psb-navitem on">Work Permits</div>
          <div className="psb-navitem">Chemical &amp; SDS</div>
          <div className="psb-navitem">Waste Management</div>
          <div className="psb-navitem">Ergonomics</div>
          <div className="psb-navitem">Pest &amp; Disinfect</div>
          <div className="psb-navitem">Equipment &amp; Calibration</div>
          <div className="psb-navtop">Monitor <span className="ch">▸</span></div>
          <div className="psb-navtop">Workspace <span className="ch">▸</span></div>
        </nav>

        {/* MAIN */}
        <main className="psb-main">
          {isDemo && (
            <div className="psb-banner">
              You are viewing sample data.{' '}
              <a href="/signup">Sign up</a> or <a href="/login">sign in</a> to connect your workspace.
            </div>
          )}

          <div className="psb-head">
            <div>
              <div className="psb-eyebrow">● Operate · Permit to Work</div>
              <h1>Controlled Work Permits</h1>
              <p className="psb-sub">
                LOTO, hot work, confined space, contractor, and chemical transfer permits.
                No work may begin without an Approved permit and all required controls verified.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button className="psb-btn ghost">Inspections →</button>
              <button className="psb-btn">＋ New permit</button>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="psb-kpis">
            <Kpi label="Active Permits"    value={counts.active}  sub="approved or in-progress"  accent="#22c55e" />
            <Kpi label="Overdue (>24 hrs)" value={counts.overdue} sub="close or escalate"         valueColor="#fca5a5" accent="#ef4444" />
            <Kpi label="Drafts"            value={counts.draft}   sub="awaiting approval"          valueColor="#fcd34d" accent="#f59e0b" />
            <Kpi label="Closed"            value={counts.closed}  sub="completed safely"           accent="#60a5fa" />
          </div>

          {/* SAFETY ALERTS */}
          {counts.overdue > 0 && (
            <div className="alert">
              <span className="alert-dot" />
              <div>
                <b>{counts.overdue} permit{counts.overdue !== 1 ? 's' : ''} open beyond 24 hours.</b>{' '}
                Permits left open past their stop time must be closed or escalated immediately
                {counts.overdue === 1 && rows[0] ? ` — ${rows.find((p) => p.over24)?.type ?? ''}, ${rows.find((p) => p.over24)?.location.split(' · ')[0] ?? ''}` : ''}.
              </div>
              <span className="alert-link" onClick={() => setFilter('overdue')}>View overdue →</span>
            </div>
          )}

          {gated.length > 0 && (
            <div className="gate">
              <span className="gate-ic">⛔</span>
              <div>
                <b>{gated.length} active permit has an incomplete required control.</b>{' '}
                {gated[0].type} ({gated[0].location.split(' · ')[0]}) is active with{' '}
                <b>{gated[0].controls.find((c) => !c.done)?.label ?? 'a control'} not logged</b>{' '}
                — work should not continue until the control is verified and signed off.
              </div>
            </div>
          )}

          {/* FILTERS */}
          <div className="ftabs">
            {(['all', 'active', 'overdue', 'draft'] as const).map((f) => (
              <button
                key={f}
                className={filter === f ? 'on' : ''}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All permits' : f.charAt(0).toUpperCase() + f.slice(1)}{' '}
                {f === 'all' ? counts.all : f === 'active' ? counts.active : f === 'overdue' ? counts.overdue : counts.draft}
              </button>
            ))}
          </div>

          {/* PERMIT REGISTER */}
          <div className="sec-hd">
            <div className="sec-eyebrow">Permit register</div>
            <h2>{rows.length} permit{rows.length !== 1 ? 's' : ''}</h2>
          </div>

          <div className="perm-list">
            {rows.length === 0 ? (
              <div className="perm" style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--wink3)' }}>
                No permits match this filter.
              </div>
            ) : rows.map((p) => {
              const done      = p.controls.filter((c) => c.done).length;
              const incomplete = done < p.controls.length;
              const blocked    = p.status === 'active' && incomplete;
              return (
                <div className={`perm${blocked ? ' blocked' : ''}`} key={p.id}>
                  <div className="perm-top">
                    <div className="perm-id">
                      <span className="perm-ic">{p.icon}</span>
                      <span className="perm-type">{p.type}</span>
                    </div>
                    <div className="perm-chips">
                      <span className={`pstat ${STATUS_META[p.status].cls}`}>{STATUS_META[p.status].label}</span>
                      {p.over24 && <span className="over24">⚠ Open &gt;24 hrs</span>}
                    </div>
                  </div>

                  <div className="perm-work">{p.location} · {p.work}</div>

                  <div className="perm-clockrow">
                    <span className="perm-window">{p.window}</span>
                    <span className={`perm-clock ${p.clockState}`}>{p.clock}</span>
                  </div>

                  <div className="perm-haz">
                    {p.hazards.map((h) => <span className="haz" key={h}>{h}</span>)}
                  </div>

                  <div className="perm-controls">
                    <div className="pc-hd">
                      Required controls
                      <span className={`pc-count ${incomplete ? 'bad' : 'good'}`}>
                        {done}/{p.controls.length} verified
                      </span>
                    </div>
                    <div className="pc-grid">
                      {p.controls.map((c) => (
                        <div className={`pc-item ${c.done ? 'done' : 'pending'}`} key={c.label}>
                          <span className="pc-box">{c.done ? '✓' : '○'}</span>
                          {c.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="perm-auth">
                    <span className="auth-i"><em>Holder</em> {p.holder}</span>
                    <span className="auth-i"><em>Issued by</em> {p.issuedBy}</span>
                    <span className="auth-i">
                      <em>Approved by</em>{' '}
                      {p.approvedBy ?? <b className="await">Awaiting approval</b>}
                    </span>
                    <div style={{ flex: 1 }} />
                    {p.status === 'active'   && <button className="psb-btn sm">Close permit</button>}
                    {p.status === 'draft'    && <button className="psb-btn sm">Submit for approval</button>}
                    {p.status === 'approved' && <button className="psb-btn sm ghost">View permit</button>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="psb-guard">
            <b>AI Guardrail — Permit authorization requires qualified human sign-off.</b>{' '}
            AI may flag overdue permits and missing controls, but permit approval, isolation
            verification, and closeout authorization must be performed by a qualified EHS
            professional or authorized approver. No work may begin without an Approved
            permit and all required controls verified.
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Subcomponents ─────────────────────────────────────────────────────── */

function Kpi({
  label, value, sub, valueColor, accent,
}: {
  label: string; value: number | string; sub: string; valueColor?: string; accent: string;
}) {
  return (
    <div className="psb-kpi" style={{ ['--accent' as string]: accent }}>
      <div className="klabel">{label}</div>
      <div className="krow">
        <div className="knum" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
        <div className="ksub">{sub}</div>
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const STYLES = `
.psb *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.psb{--w2:#13294d;--w3:#16315c;--wline:#22406e;--wline2:#2c4d80;--wink:#eaf1fb;--wink2:#9fb4d4;--wink3:#6f87ad;
  --cink:#0f2647;--cink2:#475569;--cink3:#94a3b8;--cline:#e2e8f0;--accent:#2563eb;--accent2:#60a5fa;
  background:#f5f8fc;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;
  box-shadow:0 12px 40px rgba(15,38,71,.08);color:var(--cink);font-size:13px;line-height:1.4}
.psb-topbar{display:flex;align-items:center;justify-content:space-between;background:#0a1d38;padding:12px 18px}
.psb-brand{display:flex;align-items:center;gap:10px}
.psb-logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#1d4ed8,#0891b2);
  display:flex;align-items:center;justify-content:center;font-size:15px}
.psb-brand b{font-size:14px;font-weight:700;color:#fff}
.psb-brand span{display:block;font-size:9.5px;color:#7e96bd;font-weight:500}
.psb-topright{display:flex;align-items:center;gap:10px}
.psb-pill{background:#13294d;border:1px solid #2c4d80;border-radius:7px;padding:5px 9px;
  font-size:11px;color:#9fb4d4;display:flex;align-items:center;gap:6px}
.psb-owner{background:rgba(34,197,94,.14);border-color:rgba(34,197,94,.4);color:#86efac;
  font-weight:700;letter-spacing:.04em;font-size:9.5px}
.psb-ava{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);
  display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff}
.psb-shell{display:flex;min-height:600px}
.psb-nav{width:188px;background:#fff;border-right:1px solid var(--cline);padding:10px 0;flex-shrink:0}
.psb-navgrp{font-size:9.5px;letter-spacing:.12em;color:var(--cink3);text-transform:uppercase;
  padding:11px 16px 4px;display:flex;align-items:center;gap:7px;font-weight:700}
.psb-navitem{padding:7px 16px 7px 30px;font-size:11.5px;color:var(--cink2);cursor:pointer;
  display:flex;align-items:center;gap:6px}
.psb-navitem:hover{color:var(--cink);background:#f1f5fb}
.psb-navitem.on{color:var(--accent);background:linear-gradient(90deg,rgba(37,99,235,.1),transparent);
  border-left:2px solid var(--accent);padding-left:28px;font-weight:700}
.psb-navtop{padding:9px 16px;font-size:12.5px;color:var(--cink);font-weight:600;
  display:flex;align-items:center;gap:8px;cursor:pointer}
.psb-navtop .ch{margin-left:auto;color:var(--cink3);font-size:10px}
.psb-main{flex:1;padding:16px 20px;overflow:auto;background:#f5f8fc}
.psb-banner{font-size:11px;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;
  border-radius:8px;padding:8px 12px;margin-bottom:14px}
.psb-banner a{color:#1d4ed8;font-weight:600;cursor:pointer;text-decoration:none}
.psb-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:16px}
.psb-eyebrow{font-size:10px;letter-spacing:.14em;color:var(--accent);font-weight:700;
  text-transform:uppercase;margin-bottom:4px}
.psb-main h1{font-size:21px;font-weight:700;letter-spacing:-.01em;margin-bottom:3px;color:var(--cink)}
.psb-sub{font-size:11.5px;color:var(--cink2);max-width:680px}
.psb-btn{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;
  border-radius:8px;padding:9px 14px;font-size:12px;font-weight:600;cursor:pointer;
  white-space:nowrap;box-shadow:0 4px 14px rgba(37,99,235,.3)}
.psb-btn.ghost{background:#fff;border:1px solid var(--cline);color:var(--cink2);box-shadow:none;font-weight:500}
.psb-btn.sm{padding:6px 11px;font-size:11px;box-shadow:none}
.psb-btn.sm.ghost{background:rgba(255,255,255,.06);border:1px solid var(--wline2);color:var(--wink2)}
.psb-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:13px}
.psb-kpi{background:var(--w2);border:1px solid var(--wline);border-radius:11px;padding:13px 14px;
  position:relative;overflow:hidden;box-shadow:0 6px 18px rgba(15,38,71,.12)}
.psb-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent,#60a5fa)}
.psb-kpi .klabel{font-size:9.5px;letter-spacing:.08em;color:var(--wink3);text-transform:uppercase;
  font-weight:700;margin-bottom:6px}
.psb-kpi .krow{display:flex;align-items:baseline;gap:8px}
.psb-kpi .knum{font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1;color:var(--wink)}
.psb-kpi .ksub{font-size:10.5px;color:var(--wink2)}
.alert{display:flex;align-items:center;gap:11px;background:linear-gradient(120deg,#2a1410,#13294d);
  border:1px solid rgba(239,68,68,.4);border-radius:11px;padding:11px 15px;margin-bottom:10px;
  box-shadow:0 6px 18px rgba(15,38,71,.12)}
.alert-dot{width:9px;height:9px;border-radius:50%;background:#ef4444;
  box-shadow:0 0 0 4px rgba(239,68,68,.2);flex-shrink:0}
.alert div{font-size:11.5px;color:var(--wink2);line-height:1.45;flex:1}
.alert b{color:#fca5a5}
.alert-link{font-size:10px;font-weight:700;color:#fca5a5;white-space:nowrap;cursor:pointer}
.gate{display:flex;align-items:flex-start;gap:11px;background:rgba(239,68,68,.1);
  border:1px solid rgba(239,68,68,.5);border-radius:11px;padding:11px 15px;margin-bottom:13px}
.gate-ic{font-size:16px;flex-shrink:0;line-height:1.2}
.gate div{font-size:11.5px;color:#fecaca;line-height:1.5}
.gate b{color:#fca5a5}
.ftabs{display:flex;gap:6px;margin-bottom:13px;align-items:center;flex-wrap:wrap}
.ftabs button{background:#fff;border:1px solid var(--cline);border-radius:7px;padding:7px 11px;
  font-size:11px;font-weight:600;color:var(--cink2);cursor:pointer}
.ftabs button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.sec-hd{margin-bottom:10px}
.sec-eyebrow{font-size:9.5px;letter-spacing:.12em;color:var(--accent2);text-transform:uppercase;
  font-weight:700;margin-bottom:2px}
.sec-hd h2{font-size:15px;font-weight:700;color:var(--cink)}
.perm-list{display:flex;flex-direction:column;gap:11px}
.perm{background:var(--w2);border:1px solid var(--wline);border-radius:11px;padding:14px 16px;
  box-shadow:0 6px 18px rgba(15,38,71,.1)}
.perm.blocked{border-left:3px solid #ef4444}
.perm-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}
.perm-id{display:flex;align-items:center;gap:9px}
.perm-ic{font-size:17px}
.perm-type{font-size:13px;font-weight:700;color:var(--wink)}
.perm-chips{display:flex;gap:7px;align-items:center}
.pstat{font-size:9px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;
  padding:3px 9px;border-radius:6px}
.ps-active{background:rgba(34,197,94,.16);color:#86efac;border:1px solid rgba(34,197,94,.4)}
.ps-approved{background:rgba(20,184,166,.16);color:#5eead4;border:1px solid rgba(20,184,166,.4)}
.ps-draft{background:rgba(245,158,11,.16);color:#fcd34d;border:1px solid rgba(245,158,11,.4)}
.ps-closed{background:rgba(100,116,139,.18);color:#cbd5e1}
.over24{font-size:9px;font-weight:800;letter-spacing:.03em;color:#fca5a5;
  background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.4);border-radius:6px;padding:3px 8px}
.perm-work{font-size:11.5px;color:var(--wink2);margin-bottom:7px}
.perm-clockrow{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:9px}
.perm-window{font-size:10.5px;color:var(--wink3)}
.perm-clock{font-size:11px;font-weight:800;padding:3px 9px;border-radius:6px}
.perm-clock.over{background:rgba(239,68,68,.16);color:#fca5a5}
.perm-clock.ok{background:rgba(34,197,94,.14);color:#86efac}
.perm-clock.scheduled{background:rgba(96,165,250,.14);color:#93c5fd}
.perm-clock.draft{background:rgba(100,116,139,.18);color:#cbd5e1}
.perm-haz{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px}
.haz{font-size:9.5px;font-weight:700;color:#fdba74;background:rgba(249,115,22,.12);
  border:1px solid rgba(249,115,22,.32);border-radius:5px;padding:2px 8px;text-transform:capitalize}
.perm-controls{background:#0e234a;border:1px solid var(--wline2);border-radius:9px;
  padding:11px 13px;margin-bottom:11px}
.pc-hd{display:flex;justify-content:space-between;align-items:center;font-size:9.5px;
  letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:var(--wink3);margin-bottom:9px}
.pc-count{font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:5px}
.pc-count.good{background:rgba(34,197,94,.16);color:#86efac}
.pc-count.bad{background:rgba(239,68,68,.16);color:#fca5a5}
.pc-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px}
.pc-item{display:flex;align-items:center;gap:8px;font-size:10.5px}
.pc-item.done{color:var(--wink2)}
.pc-item.pending{color:#fca5a5;font-weight:600}
.pc-box{width:15px;height:15px;border-radius:4px;display:flex;align-items:center;
  justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
.pc-item.done .pc-box{background:rgba(34,197,94,.2);color:#86efac;border:1px solid rgba(34,197,94,.45)}
.pc-item.pending .pc-box{background:rgba(239,68,68,.14);color:#fca5a5;border:1px solid rgba(239,68,68,.45)}
.perm-auth{display:flex;align-items:center;gap:16px;flex-wrap:wrap;
  border-top:1px solid var(--wline);padding-top:10px}
.auth-i{font-size:10.5px;color:var(--wink2)}
.auth-i em{font-style:normal;color:var(--wink3);font-size:9px;text-transform:uppercase;
  letter-spacing:.05em;font-weight:700;margin-right:6px}
.auth-i .await{color:#fcd34d}
.psb-guard{font-size:9.5px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;
  border-radius:8px;padding:10px 12px;margin-top:16px;line-height:1.55}
.psb-guard b{color:#7c2d12}
`;
