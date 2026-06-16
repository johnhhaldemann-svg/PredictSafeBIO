'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type FeedSeverity = 'critical' | 'high' | 'medium';

export type FeedItem = {
  severity: FeedSeverity;
  text: string;
  page: string;
  href: string;
};

export type ViewKpi = {
  label: string;
  value: string;
  sub: string;
  accent: string;
  valueColor?: string;
};

export type ViewSubStage = { num: number; label: string };

export type ViewStage = {
  number: number;
  title: string;
  question: string;
  color: string;
  value: string;
  valueLabel: string;
  note: string;
  subStages: ViewSubStage[];
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
};

export type OperatingPictureAuth = {
  isSignedIn: boolean;
  isOwner: boolean;
  userEmail: string | null;
};

/* ─── Demo data ───────────────────────────────────────────────────────────── */

const DEMO_FEED: FeedItem[] = [
  { severity: 'critical', text: 'Hot Work permit (Lab 201) is active with gas / atmosphere test not logged — work should not continue', page: 'Work Permits', href: '/permits' },
  { severity: 'critical', text: 'Formaldehyde exposure — OSHA 300 Log due in 5 days', page: 'Incident Reporting', href: '/incidents' },
  { severity: 'critical', text: '2 required inspections overdue — eyewash/safety-shower and hazardous-waste satellite area', page: 'Inspections', href: '/inspections' },
  { severity: 'high', text: 'Hydrochloric Acid 37% (Lab 102) is missing its SDS', page: 'Chemical & SDS', href: '/chemical-inventory' },
  { severity: 'high', text: 'Sodium azide expired (toxic, restricted) — route to hazardous-waste disposal', page: 'Chemical & SDS', href: '/chemical-inventory' },
  { severity: 'high', text: 'BSC-001 CAPA is past its target date with no action plan defined', page: 'CAPA', href: '/operations/capa' },
  { severity: 'medium', text: '3 change impacts detected across the platform · 0 converted to MOC records', page: 'Change Management', href: '/change-management' },
  { severity: 'medium', text: '3 safety programs overdue — Bloodborne Pathogens, Chemical Hygiene, Spill Response', page: 'Programs', href: '/programs' },
  { severity: 'medium', text: 'No current approver for chemical / manifest decisions — qualified-person gap', page: 'Qualified Persons', href: '/plan/qualified-persons' },
];

const DEMO_KPIS: ViewKpi[] = [
  { label: 'BioRisk Score',    value: '81',  sub: 'critical · 2 awaiting review', accent: '#ef4444', valueColor: '#fca5a5' },
  { label: 'Audit Readiness',  value: '20%', sub: '3 programs overdue',           accent: '#f59e0b', valueColor: '#fcd34d' },
  { label: 'Needs Action',     value: '9',   sub: 'across all modules',            accent: '#f97316', valueColor: '#fdba74' },
  { label: 'Priority Signals', value: '3',   sub: '1 critical · 2 high · 5 active', accent: '#60a5fa' },
];

const DEMO_STAGES: ViewStage[] = [
  {
    number: 1, title: 'Assess', question: 'What are my risks?', color: '#ef4444',
    value: '81', valueLabel: 'Latest BioRisk score', note: '2 awaiting review · 1 critical',
    subStages: [{ num: 3, label: 'Hazard identification' }, { num: 4, label: 'Risk assessment & prioritization' }],
    cta: { label: 'Open Workbench', href: '/workbench' },
    secondary: { label: 'Hazard Register', href: '/hazards' },
  },
  {
    number: 2, title: 'Plan', question: 'What do I need to do?', color: '#f59e0b',
    value: '20%', valueLabel: 'Audit readiness', note: '3 programs overdue · qualified-person gap',
    subStages: [{ num: 1, label: 'Governance & requirements' }, { num: 2, label: 'Work & exposure mapping' }, { num: 5, label: 'Control selection & planning' }],
    cta: { label: 'Open Compliance Map', href: '/foundation' },
    secondary: { label: 'My Work', href: '/my-work' },
  },
  {
    number: 3, title: 'Operate', question: 'Do the work', color: '#a855f7',
    value: '4', valueLabel: 'items need action', note: '2 overdue inspections · 2 open CAPA · 1 gated permit',
    subStages: [{ num: 6, label: 'Training, authorization & execution' }],
    cta: { label: 'Review inspections', href: '/inspections' },
    secondary: { label: 'Work Permits', href: '/permits' },
  },
  {
    number: 4, title: 'Monitor', question: 'Am I on track?', color: '#22c55e',
    value: '3', valueLabel: 'priority signals', note: '1 critical · 2 high · 5 active',
    subStages: [{ num: 7, label: 'Monitoring & event response' }, { num: 8, label: 'CAPA, reporting & learning' }],
    cta: { label: 'Open Risk Monitor', href: '/risk-command-center' },
    secondary: { label: 'Predictive Engine', href: '/predictive-engine' },
  },
];

const DATA_INPUTS = [
  'SOPs & policies', 'SDS & agents', 'Audit findings', 'Incidents & near-misses',
  'Training records', 'Calibration logs', 'Waste logs', 'Permits & change control',
];

const AUTOMATED_OUTPUTS = [
  'Risk & exposure alerts', 'Control recommendations', 'Inspection schedules',
  'Training reminders', 'CAPA assignments', 'Dashboards & trends',
  'Compliance evidence', 'Executive visibility',
];

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const STYLES = `
.op{--w2:#13294d;--w3:#16315c;--wline:#22406e;--wline2:#2c4d80;--wink:#eaf1fb;--wink2:#9fb4d4;--wink3:#6f87ad;
  --cink:#0f2647;--cink2:#475569;--cink3:#94a3b8;--cline:#e2e8f0;--accent:#2563eb;--accent2:#60a5fa;
  width:100%;background:#f5f8fc;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;
  box-shadow:0 12px 40px rgba(15,38,71,.08);color:var(--cink);font-size:13px;line-height:1.4;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.op *{box-sizing:border-box;margin:0;padding:0}
.op-topbar{display:flex;align-items:center;justify-content:space-between;background:#0a1d38;padding:12px 18px}
.op-brand{display:flex;align-items:center;gap:10px}
.op-logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#1d4ed8,#0891b2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.op-brand b{font-size:14px;font-weight:700;color:#fff}
.op-brand span{display:block;font-size:9.5px;color:#7e96bd;font-weight:500}
.op-topright{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.op-pill{background:#13294d;border:1px solid #2c4d80;border-radius:7px;padding:5px 9px;font-size:11px;color:#9fb4d4;display:flex;align-items:center;gap:6px}
.op-pill-owner{background:rgba(34,197,94,.14);border-color:rgba(34,197,94,.4);color:#86efac;font-weight:700;letter-spacing:.04em;font-size:9.5px}
.op-ava{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
.op-shell{display:flex;min-height:600px}
.op-nav{width:188px;background:#fff;border-right:1px solid var(--cline);padding:10px 0;flex-shrink:0}
.op-navgrp{font-size:9.5px;letter-spacing:.12em;color:var(--cink3);text-transform:uppercase;padding:11px 16px 4px;display:flex;align-items:center;gap:7px;font-weight:700}
.op-navitem{padding:7px 16px 7px 30px;font-size:11.5px;color:var(--cink2);display:flex;align-items:center;gap:6px;text-decoration:none;transition:color .15s}
.op-navitem:hover{color:var(--cink)}
.op-navitem.on{color:var(--accent);background:linear-gradient(90deg,rgba(37,99,235,.1),transparent);border-left:2px solid var(--accent);padding-left:28px;font-weight:700}
.op-navbadge-new{font-size:7.5px;font-weight:800;letter-spacing:.05em;background:rgba(37,99,235,.15);color:var(--accent);border:1px solid rgba(37,99,235,.3);padding:1px 4px;border-radius:4px}
.op-navbadge-live{font-size:7.5px;font-weight:800;letter-spacing:.05em;background:rgba(34,197,94,.15);color:#16a34a;border:1px solid rgba(34,197,94,.35);padding:1px 4px;border-radius:4px}
.op-navtop{padding:9px 16px;font-size:12.5px;color:var(--cink);font-weight:600;display:flex;align-items:center;gap:8px;text-decoration:none;border:none;background:none;width:100%;cursor:pointer;transition:background .15s}
.op-navtop:hover{background:#f8fafc}
.op-navtop .ch{margin-left:auto;color:var(--cink3);font-size:10px}
.op-main{flex:1;padding:16px 20px;overflow:auto;background:#f5f8fc}
.op-banner{font-size:11px;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;margin-bottom:14px}
.op-banner a{color:#1d4ed8;font-weight:600}
.op-head{margin-bottom:14px}
.op-eyebrow{font-size:10px;letter-spacing:.14em;color:var(--accent);font-weight:700;text-transform:uppercase;margin-bottom:4px}
.op-head h1{font-size:22px;font-weight:700;letter-spacing:-.01em;margin-bottom:3px;color:var(--cink)}
.op-sub{font-size:11.5px;color:var(--cink2);max-width:720px}
.op-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:16px}
.op-kpi{background:var(--w2);border:1px solid var(--wline);border-radius:11px;padding:13px 14px;position:relative;overflow:hidden;box-shadow:0 6px 18px rgba(15,38,71,.12)}
.op-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--a,#60a5fa)}
.op-kpi .klabel{font-size:9.5px;letter-spacing:.08em;color:var(--wink3);text-transform:uppercase;font-weight:700;margin-bottom:6px}
.op-kpi .krow{display:flex;align-items:baseline;gap:8px}
.op-kpi .knum{font-size:30px;font-weight:800;line-height:1;color:var(--wink)}
.op-kpi .ksub{font-size:10.5px;color:var(--wink2)}
.op-sec-hd{margin-bottom:10px}
.op-sec-eyebrow{font-size:9.5px;letter-spacing:.12em;color:var(--accent2);text-transform:uppercase;font-weight:700;margin-bottom:2px}
.op-sec-eyebrow.blue{color:#7dd3fc}
.op-sec-hd h2{font-size:15px;font-weight:700;color:var(--cink);display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.op-hd-sub2{font-size:10.5px;font-weight:500;color:var(--cink3)}
.op-feed-tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
.op-feed-tabs button{background:#fff;border:1px solid var(--cline);border-radius:7px;padding:6px 11px;font-size:11px;font-weight:600;color:var(--cink2);cursor:pointer;transition:all .15s}
.op-feed-tabs button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.op-feed{display:flex;flex-direction:column;gap:7px}
.op-fitem{display:flex;align-items:center;gap:12px;background:var(--w2);border:1px solid var(--wline);border-left:3px solid var(--sc);border-radius:9px;padding:11px 14px;box-shadow:0 4px 14px rgba(15,38,71,.1);text-decoration:none}
.op-fitem.a-crit{--sc:#ef4444}.op-fitem.a-high{--sc:#f97316}.op-fitem.a-med{--sc:#f59e0b}
.op-fsev{font-size:8.5px;font-weight:800;text-transform:uppercase;padding:3px 8px;border-radius:6px;flex-shrink:0;width:62px;text-align:center}
.op-fsev.a-crit{background:rgba(239,68,68,.2);color:#fca5a5;border:1px solid rgba(239,68,68,.45)}
.op-fsev.a-high{background:rgba(249,115,22,.18);color:#fdba74;border:1px solid rgba(249,115,22,.4)}
.op-fsev.a-med{background:rgba(245,158,11,.16);color:#fcd34d;border:1px solid rgba(245,158,11,.4)}
.op-ftext{flex:1;font-size:11.5px;color:var(--wink2);line-height:1.4}
.op-fpage{font-size:10px;font-weight:700;color:#93c5fd;white-space:nowrap;flex-shrink:0}
.op-loop{display:grid;grid-template-columns:1fr 1.1fr 1fr;gap:12px;margin-bottom:14px}
.op-loop-col{background:var(--w2);border:1px solid var(--wline);border-radius:12px;padding:14px;box-shadow:0 6px 18px rgba(15,38,71,.1)}
.op-lc-hd{font-size:11.5px;font-weight:700;color:var(--wink);margin-bottom:1px}
.op-lc-sub{font-size:9.5px;color:var(--wink3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px}
.op-chip-in,.op-chip-out{font-size:10.5px;border-radius:6px;padding:6px 9px;margin-bottom:5px}
.op-chip-in{background:#0e234a;border:1px solid var(--wline2);color:var(--wink2)}
.op-chip-out{background:rgba(37,99,235,.1);border:1px solid rgba(37,99,235,.3);color:#93c5fd}
.op-loop-engine{background:linear-gradient(135deg,#16315c,#13294d);border:1px solid var(--accent);border-radius:12px;padding:16px;box-shadow:0 8px 24px rgba(37,99,235,.2);position:relative;display:flex;flex-direction:column;justify-content:center}
.op-le-badge{font-size:12px;font-weight:800;color:#fff;background:rgba(37,99,235,.3);border:1px solid rgba(96,165,250,.5);border-radius:8px;padding:7px 11px;display:inline-block;margin-bottom:11px;width:fit-content}
.op-le-text{font-size:11px;color:var(--wink2);line-height:1.55;margin-bottom:9px}
.op-le-acc{font-size:10px;color:#86efac;font-weight:600}
.op-le-arrow{position:absolute;right:-7px;top:50%;transform:translateY(-50%);font-size:18px;color:var(--accent2);font-weight:800}
.op-stages{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:13px}
.op-stage{background:var(--w2);border:1px solid var(--wline);border-top:3px solid var(--sc);border-radius:12px;padding:14px;box-shadow:0 6px 18px rgba(15,38,71,.12);display:flex;flex-direction:column}
.op-stage-top{display:flex;align-items:center;gap:10px;margin-bottom:11px}
.op-stage-n{width:24px;height:24px;border-radius:7px;background:var(--sc);color:#0a1d38;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.op-stage-name{font-size:13px;font-weight:700;color:var(--wink)}
.op-stage-q{font-size:9.5px;color:var(--wink3)}
.op-stage-metric{display:flex;align-items:baseline;gap:7px;margin-bottom:5px}
.op-sm-val{font-size:26px;font-weight:800;color:var(--wink);line-height:1}
.op-sm-lbl{font-size:10px;color:var(--wink2)}
.op-stage-note{font-size:10px;color:var(--wink3);margin-bottom:10px;min-height:26px}
.op-stage-subs{display:flex;flex-direction:column;gap:5px;margin-bottom:11px;flex:1}
.op-ssub{font-size:10px;color:var(--wink2);display:flex;align-items:center;gap:7px}
.op-ssub-n{width:15px;height:15px;border-radius:4px;background:#0e234a;border:1px solid var(--wline2);color:var(--wink3);font-size:8.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.op-stage-links{display:flex;flex-direction:column;gap:6px}
.op-slink{background:#0e234a;border:1px solid var(--wline2);border-radius:7px;padding:6px 9px;font-size:10px;font-weight:600;color:#93c5fd;text-align:left;text-decoration:none;display:block;transition:background .15s}
.op-slink:hover{background:#13294d}
.op-loop-foot{text-align:center;font-size:11px;color:var(--cink2);background:#fff;border:1px dashed var(--cline);border-radius:9px;padding:11px;margin-bottom:13px}
.op-loop-foot b{color:var(--cink)}
.op-guard{font-size:9.5px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;line-height:1.55}
.op-guard b{color:#7c2d12}
@media(max-width:900px){
  .op-kpis{grid-template-columns:repeat(2,1fr)}
  .op-stages{grid-template-columns:repeat(2,1fr)}
  .op-loop{grid-template-columns:1fr}
  .op-loop-engine{order:-1}
  .op-le-arrow{display:none}
  .op-nav{display:none}
}
@media(max-width:600px){
  .op-kpis{grid-template-columns:1fr}
  .op-stages{grid-template-columns:1fr}
}
`;

/* ─── Component ───────────────────────────────────────────────────────────── */

interface OperatingPictureProps {
  feed?:   FeedItem[];
  kpis?:   ViewKpi[];
  stages?: ViewStage[];
  auth?:   OperatingPictureAuth;
}

export default function OperatingPicture({ feed: feedProp, kpis: kpisProp, stages: stagesProp, auth }: OperatingPictureProps) {
  const FEED   = feedProp   ?? DEMO_FEED;
  const KPIS   = kpisProp   ?? DEMO_KPIS;
  const STAGES = stagesProp ?? DEMO_STAGES;

  const [tab, setTab] = useState<'all' | 'critical' | 'high' | 'medium'>('all');

  const crit = FEED.filter(f => f.severity === 'critical');
  const high = FEED.filter(f => f.severity === 'high');
  const med  = FEED.filter(f => f.severity === 'medium');

  const visible = tab === 'all' ? FEED : tab === 'critical' ? crit : tab === 'high' ? high : med;

  const isSignedIn = auth?.isSignedIn ?? false;
  const isOwner    = auth?.isOwner    ?? false;
  const email      = auth?.userEmail  ?? null;
  const initials   = email ? email.slice(0, 2).toUpperCase() : 'JH';

  function sevCls(s: FeedSeverity) {
    return s === 'critical' ? 'a-crit' : s === 'high' ? 'a-high' : 'a-med';
  }
  function sevLabel(s: FeedSeverity) {
    return s === 'critical' ? 'Critical' : s === 'high' ? 'High' : 'Medium';
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="op">

        {/* ── Topbar ── */}
        <div className="op-topbar">
          <div className="op-brand">
            <div className="op-logo">🛡</div>
            <div><b>PredictSafe BIO</b><span>Biosafety Intelligence</span></div>
          </div>
          <div className="op-topright">
            <div className="op-pill">🔔 <span style={{ color: '#fca5a5', fontWeight: 700 }}>1</span></div>
            {isOwner && <div className="op-pill op-pill-owner">OWNER</div>}
            <div className="op-ava">{initials}</div>
            {email && <div className="op-pill" style={{ fontSize: '10.5px' }}>{email}</div>}
            {!isSignedIn && (
              <Link href="/login?next=/" className="op-pill" style={{ fontSize: '10.5px', textDecoration: 'none' }}>Sign in</Link>
            )}
          </div>
        </div>

        {/* ── Shell ── */}
        <div className="op-shell">

          {/* ── Nav ── */}
          <nav className="op-nav" aria-label="Platform navigation">
            <Link href="/workbench" className="op-navtop">Assess <span className="ch">▶</span></Link>
            <Link href="/foundation" className="op-navtop">Plan <span className="ch">▶</span></Link>
            <Link href="/inspections" className="op-navtop">Operate <span className="ch">▶</span></Link>
            <div className="op-navgrp">Monitor <span style={{ marginLeft: 'auto' }}>▾</span></div>
            <Link href="/"                    className="op-navitem on">Operating Picture</Link>
            <Link href="/predictive-engine"   className="op-navitem">Predictive Engine <span className="op-navbadge-new">NEW</span></Link>
            <Link href="/risk-command-center" className="op-navitem">Risk Monitor</Link>
            <Link href="/monitoring/exposure" className="op-navitem">Exposure Monitoring <span className="op-navbadge-live">LIVE</span></Link>
            <Link href="/trends"              className="op-navitem">Trend Analysis</Link>
            <Link href="/management-review"   className="op-navitem">Management Review</Link>
            <Link href="/lessons-learned"     className="op-navitem">Lessons Learned</Link>
            <Link href="/account/company"     className="op-navtop">Workspace <span className="ch">▶</span></Link>
          </nav>

          {/* ── Main ── */}
          <main className="op-main">

            {/* Demo banner */}
            {!isSignedIn && (
              <div className="op-banner">
                You are viewing sample data.{' '}
                <Link href="/signup?next=/">Sign up</Link> or{' '}
                <Link href="/login?next=/">sign in</Link> to connect your workspace.
              </div>
            )}

            {/* Page header */}
            <div className="op-head">
              <div className="op-eyebrow">● Monitor · Predictive AI engine · live</div>
              <h1>Operating Picture</h1>
              <p className="op-sub">
                Where you stand across the Assess → Plan → Operate → Monitor loop, and what needs your attention now.
                The engine scores risk and drafts actions — people stay accountable for every decision.
              </p>
            </div>

            {/* KPI cards */}
            <div className="op-kpis">
              {KPIS.map((k) => (
                <div className="op-kpi" key={k.label} style={{ '--a': k.accent } as React.CSSProperties}>
                  <div className="klabel">{k.label}</div>
                  <div className="krow">
                    <div className="knum" style={k.valueColor ? { color: k.valueColor } : {}}>{k.value}</div>
                    <div className="ksub">{k.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feed section */}
            <div className="op-sec-hd">
              <div className="op-sec-eyebrow blue">＋ New · Needs attention now</div>
              <h2>{FEED.length} items across the platform <span className="op-hd-sub2">rolled up from every module, newest risk first</span></h2>
            </div>

            <div className="op-feed-tabs">
              <button className={tab === 'all'      ? 'on' : ''} onClick={() => setTab('all')}>All {FEED.length}</button>
              <button className={tab === 'critical' ? 'on' : ''} onClick={() => setTab('critical')}>Critical {crit.length}</button>
              <button className={tab === 'high'     ? 'on' : ''} onClick={() => setTab('high')}>High {high.length}</button>
              <button className={tab === 'medium'   ? 'on' : ''} onClick={() => setTab('medium')}>Medium {med.length}</button>
            </div>

            <div className="op-feed" style={{ marginBottom: '18px' }}>
              {visible.map((item, i) => (
                <Link key={i} href={item.href} className={`op-fitem ${sevCls(item.severity)}`}>
                  <span className={`op-fsev ${sevCls(item.severity)}`}>{sevLabel(item.severity)}</span>
                  <span className="op-ftext">{item.text}</span>
                  <span className="op-fpage">{item.page} →</span>
                </Link>
              ))}
              {visible.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--cink3)', fontSize: '11px' }}>
                  No items in this category.
                </div>
              )}
            </div>

            {/* Operating model loop */}
            <div className="op-sec-hd" style={{ marginTop: '4px' }}>
              <div className="op-sec-eyebrow">Operating model</div>
              <h2>Safety &amp; compliance loop</h2>
            </div>
            <div className="op-loop">
              <div className="op-loop-col">
                <div className="op-lc-hd">Key data inputs</div>
                <div className="op-lc-sub">what you already track</div>
                {DATA_INPUTS.map(d => <div key={d} className="op-chip-in">{d}</div>)}
              </div>
              <div className="op-loop-engine">
                <div className="op-le-badge">⚡ Predictive AI Safety Engine</div>
                <div className="op-le-text">Ingests your data, scores risk, triggers actions, tracks closure, and learns from outcomes across the eight-stage cycle.</div>
                <div className="op-le-acc">Supports decisions — your team remains accountable.</div>
                <div className="op-le-arrow">→</div>
              </div>
              <div className="op-loop-col">
                <div className="op-lc-hd">Automated outputs</div>
                <div className="op-lc-sub">what the engine returns</div>
                {AUTOMATED_OUTPUTS.map(o => <div key={o} className="op-chip-out">{o}</div>)}
              </div>
            </div>

            {/* PDCA stage cards */}
            <div className="op-stages">
              {STAGES.map(s => (
                <div key={s.number} className="op-stage" style={{ '--sc': s.color } as React.CSSProperties}>
                  <div className="op-stage-top">
                    <span className="op-stage-n">{s.number}</span>
                    <div>
                      <div className="op-stage-name">{s.title}</div>
                      <div className="op-stage-q">{s.question}</div>
                    </div>
                  </div>
                  <div className="op-stage-metric">
                    <span className="op-sm-val">{s.value}</span>
                    <span className="op-sm-lbl">{s.valueLabel}</span>
                  </div>
                  <div className="op-stage-note">{s.note}</div>
                  <div className="op-stage-subs">
                    {s.subStages.map(sub => (
                      <div key={sub.num} className="op-ssub">
                        <span className="op-ssub-n">{sub.num}</span>
                        {sub.label}
                      </div>
                    ))}
                  </div>
                  <div className="op-stage-links">
                    <Link href={s.cta.href} className="op-slink">{s.cta.label} →</Link>
                    {s.secondary && (
                      <Link href={s.secondary.href} className="op-slink">{s.secondary.label} →</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Loop footer */}
            <div className="op-loop-foot">
              ↻ Insights from <b>Monitor</b> feed the next <b>Assess</b> — the loop repeats.
            </div>

            {/* AI guardrail */}
            <div className="op-guard">
              <b>People stay accountable for every decision.</b> The Predictive AI Safety Engine surfaces risk scores, early warnings, and recommended actions, but classification, approval, and closure decisions rest with qualified EHS, biosafety, and quality personnel. All engine outputs are Draft — Human Review Required.
            </div>

          </main>
        </div>
      </div>
    </>
  );
}
