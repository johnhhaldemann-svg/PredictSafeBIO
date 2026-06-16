'use client';

/**
 * ComplianceMap.tsx  (route: /foundation)
 * PredictSafe BIO — Plan · Compliance Map & AI Guardrails
 *
 * Data-driven: accepts IntelligenceFoundationSummary from the server and maps
 * it to the visual layer. Navigation uses Next.js <Link> + usePathname.
 * Self-contained layout (own topbar / sidebar); drop in without AppShell.
 */

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { IntelligenceFoundationSummary } from '@/lib/supabase/data';
import { signOutAction } from '@/app/auth/actions';

/* ─────────────────────────────── Types ─────────────────────────────── */

type GapStatus = 'missing' | 'review_needed' | 'ready';
type BioTypeStatus = 'primary' | 'secondary' | 'available';

interface EvidenceRecord  { name: string; status: GapStatus; owner: string }
interface Obligation      { code: string; title: string; owner: string; controls: string[] }
interface BioType         { name: string; status: BioTypeStatus; desc: string; requirements: string[] }
interface Trigger         { key: string; maps: string[] }
interface Program         { name: string; owner: string; statusLabel: string; statusCls: string }
interface Method          { name: string; desc: string }
interface ChangeImpact    { type: string; title: string; actions: string[] }
interface Drilldown       { group: string; count: number; desc: string }

/* ───────────────────────────── Props ─────────────────────────────── */

export interface ComplianceMapProps {
  summary: IntelligenceFoundationSummary;
  auditScore: number;
  auditTrend: string;
  unresolvedGaps: Array<{ label: string; status: string; sourceHref: string }>;
  bioRisk: { score: number; level: string; confidence: string };
  auth: {
    isSignedIn: boolean;
    isOwner: boolean;
    userEmail?: string;
    fullName?: string | null;
    role?: string;
  };
  message?: string;
  /** Owner-only admin panel rendered inside an "Admin" section tab. */
  adminSection?: ReactNode;
}

/* ──────────────────────────── Helpers ──────────────────────────── */

function toGapStatus(status: string, auditReady: boolean): GapStatus {
  if (auditReady) return 'ready';
  const s = (status ?? '').toLowerCase().trim();
  if (!s || s === 'missing' || s === 'not_started' || s === 'none' || s === 'open') return 'missing';
  return 'review_needed';
}

function parseList(s: string): string[] {
  if (!s) return [];
  return s.split(/[,;]/).map(x => x.trim()).filter(Boolean);
}

function programChip(status: string): { label: string; cls: string } {
  const s = (status ?? '').toLowerCase();
  if (s === 'active' || s === 'approved' || s === 'ready') return { label: 'Active', cls: 'g-ready' };
  if (s === 'missing' || s === 'not_started')              return { label: 'Missing', cls: 'g-missing' };
  return { label: status || 'Draft', cls: 'g-review' };
}

function getInitials(fullName?: string | null, email?: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '??';
  }
  if (email) {
    const local = email.split('@')[0].split(/[._-]/);
    if (local.length >= 2) return (local[0][0] + local[1][0]).toUpperCase();
    return email.slice(0, 2).toUpperCase();
  }
  return 'JH';
}

function readinessBand(s: number) { return s >= 70 ? 'green' : s >= 40 ? 'amber' : 'red'; }

const GAP_META: Record<GapStatus, { label: string; cls: string }> = {
  missing:      { label: 'Missing',      cls: 'g-missing' },
  review_needed:{ label: 'Review needed', cls: 'g-review'  },
  ready:        { label: 'Ready',         cls: 'g-ready'   },
};

const BT_META: Record<BioTypeStatus, { label: string; cls: string }> = {
  primary:   { label: 'Primary',   cls: 'bt-primary'   },
  secondary: { label: 'Secondary', cls: 'bt-secondary' },
  available: { label: 'Available', cls: 'bt-available' },
};

const UTILITIES = [
  'Company Profile Intelligence', 'BioType Branching Engine', 'Document Gap Engine',
  'Training Matrix', 'CAPA Screening', 'Evidence Tracking', 'Reference Knowledge Base',
  'Audit Dashboard', 'Regulatory Mapping', 'Risk Scoring Engine',
  'Controlled Records Linkage', 'Programs & Methods Library', 'Human Validation Workflow',
];

/* ─────────────────────────── Component ─────────────────────────── */

export default function ComplianceMap({
  summary,
  auditScore,
  auditTrend,
  unresolvedGaps,
  bioRisk,
  auth,
  message,
  adminSection,
}: ComplianceMapProps) {
  const [section, setSection] = useState<string>('readiness');
  const pathname = usePathname();

  /* ── Map props → internal display models ── */

  const evidence = useMemo<EvidenceRecord[]>(() =>
    summary.evidence.map(e => ({
      name:   e.requirement,
      status: toGapStatus(e.status, e.auditReady),
      owner:  '',
    })), [summary.evidence]);

  const obligations = useMemo<Obligation[]>(() =>
    summary.applicability.map(a => {
      const sep = a.rule.indexOf(': ');
      return {
        code:     sep >= 0 ? a.rule.slice(0, sep)    : a.rule,
        title:    sep >= 0 ? a.rule.slice(sep + 2)   : '',
        owner:    a.reviewer,
        controls: parseList(a.required),
      };
    }), [summary.applicability]);

  const biotypes = useMemo<BioType[]>(() =>
    summary.biotypes.map(b => ({
      name:         b.name,
      status:       b.role as BioTypeStatus,
      desc:         b.focus,
      requirements: parseList(b.requirements),
    })), [summary.biotypes]);

  const triggers = useMemo<Trigger[]>(() =>
    summary.intake
      .filter(i => i.booleanValue)
      .map(i => ({ key: i.question, maps: parseList(i.triggers) }))
      .filter(t => t.maps.length > 0),
    [summary.intake]);

  const programs = useMemo<Program[]>(() =>
    summary.programs.map(p => {
      const chip = programChip(p.status);
      return { name: p.name, owner: p.owner, statusLabel: chip.label, statusCls: chip.cls };
    }), [summary.programs]);

  const methods = useMemo<Method[]>(() =>
    summary.methods.map(m => ({
      name: m.name,
      desc: m.purpose || 'Keeps AI outputs draft-only and source-backed.',
    })), [summary.methods]);

  const changes = useMemo<ChangeImpact[]>(() =>
    summary.changes.map(c => ({
      type:    c.type,
      title:   c.summary,
      actions: parseList(c.actions),
    })), [summary.changes]);

  const counts: [string, number][] = summary.counts.map(c => [c.label, c.value]);

  const gaps     = evidence.filter(e => e.status !== 'ready');
  const band     = readinessBand(auditScore);
  const circ     = 2 * Math.PI * 42;
  const gapPct   = evidence.length > 0 ? (gaps.length / evidence.length) * 100 : 0;

  const drilldowns: Drilldown[] = [
    { group: 'Evidence gaps',             count: gaps.length,  desc: 'Mapped controls that still need audit-ready evidence or human review.' },
    { group: 'BioType missing controls',  count: unresolvedGaps.filter(g => g.status !== 'ready').length, desc: 'Selected BioType branches driving document, training, record, and evidence checks.' },
    { group: 'Incident / CAPA screening', count: 0,            desc: 'Open incidents that may need CAPA screening, document or training impact.' },
    { group: 'Equipment readiness',       count: 0,            desc: 'Equipment records with inactive status, overdue qualification, or readiness impact.' },
    { group: 'Training readiness',        count: 0,            desc: 'Expired or incomplete training assignments that block readiness.' },
  ];

  const initials  = getInitials(auth.fullName, auth.userEmail);
  const roleLabel = (auth.role ?? 'member').toUpperCase().slice(0, 8);

  const aiFlow    = summary.aiWorkflow.length    > 0 ? summary.aiWorkflow    : ['Company profile', 'BioType branching', 'Regulatory mapping', 'Risk scoring', 'Document control', 'Training matrix', 'Audit dashboard'];
  const humanFlow = summary.humanValidationWorkflow.length > 0 ? summary.humanValidationWorkflow : ['AI draft', 'Human review', 'Approve / reject / change', 'Effective controlled output', 'Training impact', 'Audit event'];

  const riskColor = bioRisk.level === 'critical' ? '#fca5a5' : bioRisk.level === 'high' ? '#fcd34d' : '#86efac';
  const riskCls   = bioRisk.level === 'critical' ? 'sev-crit' : bioRisk.level === 'high' ? 'sev-high' : 'sev-low';

  const SECTIONS: [string, string][] = [
    ['readiness', 'Readiness'],
    ['evidence',  'Evidence & Obligations'],
    ['sources',   'Source Intelligence'],
    ['drafts',    'Drafts & Changes'],
    ['drilldowns','Drilldowns'],
    ['guardrails','AI Guardrails'],
    ...(adminSection ? [['admin', 'Admin'] as [string, string]] : []),
  ];

  function isActivePath(href: string) {
    if (href === '/foundation') return pathname === '/foundation';
    return pathname.startsWith(href);
  }

  /* ── Nav item helper ── */
  const NavItem = ({ href, children }: { href: string; children: ReactNode }) => (
    <Link href={href} className={`psb-navitem${isActivePath(href) ? ' on' : ''}`}>{children}</Link>
  );

  /* ─────────────────────────────── JSX ─────────────────────────────── */

  return (
    <div className="psb">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── TOP BAR ── */}
      <div className="psb-topbar">
        <Link href="/workbench" className="psb-brand">
          <div className="psb-logo">🛡️</div>
          <div><b>PredictSafe BIO</b><span>Biosafety Intelligence</span></div>
        </Link>
        <div className="psb-topright">
          {auth.isOwner && (
            <div className="psb-pill">🔔 <span style={{ color: '#fca5a5', fontWeight: 700 }}>1</span></div>
          )}
          <div className="psb-pill psb-owner">{roleLabel}</div>
          <div className="psb-ava">{initials}</div>
          {auth.userEmail && (
            <div className="psb-pill" style={{ fontSize: 10.5 }}>{auth.userEmail}</div>
          )}
          {auth.isSignedIn ? (
            <form action={signOutAction}>
              <button type="submit" className="psb-pill psb-signout" title="Sign out">⎋</button>
            </form>
          ) : (
            <Link href="/login" className="psb-pill psb-signout" title="Sign in">Sign in</Link>
          )}
        </div>
      </div>

      <div className="psb-shell">

        {/* ── SIDEBAR NAV ── */}
        <nav className="psb-nav" aria-label="Platform navigation">
          <Link href="/workbench" className="psb-navtop">Assess <span className="ch">▸</span></Link>

          <div className="psb-navgrp">Plan <span style={{ marginLeft: 'auto' }}>▾</span></div>
          <NavItem href="/foundation">Compliance Map</NavItem>
          <NavItem href="/plan/compliance-calendar">Compliance Calendar</NavItem>
          <NavItem href="/training-matrix">Training Matrix</NavItem>
          <NavItem href="/plan/qualified-persons">Qualified Persons</NavItem>
          <NavItem href="/controls">Control Register</NavItem>
          <NavItem href="/change-management">Change Management</NavItem>
          <NavItem href="/programs">Programs</NavItem>
          <NavItem href="/emergency-response">Emergency Response <span className="navnew">NEW</span></NavItem>
          <NavItem href="/documents">Documents</NavItem>

          <Link href="/inspections" className="psb-navtop">Operate <span className="ch">▸</span></Link>
          <Link href="/" className="psb-navtop">Monitor <span className="ch">▸</span></Link>
          <Link href="/my-work" className="psb-navtop">Workspace <span className="ch">▸</span></Link>
        </nav>

        {/* ── MAIN ── */}
        <main className="psb-main">

          {/* Banner */}
          {!auth.isSignedIn && (
            <div className="psb-banner">
              You are viewing sample data.{' '}
              <Link href="/signup">Sign up</Link> or <Link href="/login">sign in</Link> to connect your workspace.
            </div>
          )}
          {message && <div className="psb-banner psb-banner-info">{message}</div>}

          {/* Page header */}
          <div className="psb-head">
            <div>
              <div className="psb-eyebrow">● Assess · Plan</div>
              <h1>Compliance Map &amp; AI Guardrails</h1>
              <p className="psb-sub">
                Turns assessed risks into source-traced compliance tasks with audit-ready evidence.
                Source: <b>{summary.companyName}</b>.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <Link href="/my-work"   className="psb-btn ghost">Open My Work</Link>
              <Link href="/workbench" className="psb-btn">Open Workbench</Link>
            </div>
          </div>

          {/* ── READINESS HERO ── */}
          <div className="psb-hero">
            <div className="hero-gauge">
              <svg viewBox="0 0 100 100" width="110" height="110">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#22406e" strokeWidth="9" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={band === 'red' ? '#ef4444' : band === 'amber' ? '#f59e0b' : '#22c55e'}
                  strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={`${(auditScore / 100) * circ} ${circ}`}
                  transform="rotate(-90 50 50)" />
                <text x="50" y="47" textAnchor="middle" fontSize="26" fontWeight="800" fill="#eaf1fb">{auditScore}</text>
                <text x="50" y="63" textAnchor="middle" fontSize="8"  fill="#9fb4d4" letterSpacing=".05em">/ 100</text>
              </svg>
              <div className="hero-gauge-label">Readiness score</div>
              <div className="hero-gauge-sub">
                Docs {summary.readiness.documentsScore} · Training {summary.readiness.trainingScore} · Evidence {summary.readiness.evidenceScore}
              </div>
            </div>

            <div className="hero-stats">
              <div className="hstat">
                <div className="hlabel">BioRisk Index</div>
                <div className="hrow">
                  <span className="hbig" style={{ color: riskColor }}>{bioRisk.score}</span>
                  <span className={`hsev ${riskCls}`}>{bioRisk.level}</span>
                </div>
                <div className="hsub">Confidence: {bioRisk.confidence} · Draft — human review required</div>
              </div>

              <div className="hstat">
                <div className="hlabel">Open Evidence Gaps</div>
                <div className="hrow">
                  <span className="hbig" style={{ color: gaps.length > 0 ? '#fca5a5' : '#86efac' }}>{gaps.length}</span>
                  <span className="hsub" style={{ alignSelf: 'flex-end' }}>controls awaiting evidence</span>
                </div>
                <div className="hbar"><i style={{ width: `${gapPct}%` }} /></div>
              </div>

              <div className="hgate">
                {gaps.length > 0 ? (
                  <>
                    <div className="gate-row"><span className="gate-dot block" /><b>Promotion blocked</b></div>
                    <div className="gate-sub">{gaps.length} gap{gaps.length !== 1 ? 's' : ''} · human review required</div>
                    <div className="gate-row" style={{ marginTop: 8 }}><span className="gate-dot pend" /> Verification pending</div>
                  </>
                ) : (
                  <>
                    <div className="gate-row"><span className="gate-dot go" /><b>Evidence ready</b></div>
                    <div className="gate-sub">No open gaps · {auditTrend.replace(/_/g, ' ')}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SECTION NAV */}
          <div className="psb-secnav">
            {SECTIONS.map(([id, label]) => (
              <button key={id} className={`secbtn${section === id ? ' on' : ''}`} onClick={() => setSection(id)}>
                {label}
              </button>
            ))}
          </div>

          {/* ═══════════ READINESS ═══════════ */}
          {section === 'readiness' && (
            <PSBSection eyebrow="Audit Readiness" title="Compliance operating console">
              <div className="card-grid two">
                <div className="subcard">
                  <div className="subhd">
                    Unresolved gaps <span className="cnt-red">{gaps.length}</span>
                  </div>
                  {gaps.length === 0 ? (
                    <div className="line">
                      <span className="gchip g-ready">All clear</span>
                      <span className="line-name">No open evidence gaps</span>
                    </div>
                  ) : (
                    gaps.slice(0, 10).map(g => (
                      <div className="line" key={g.name}>
                        <span className={`gchip ${GAP_META[g.status].cls}`}>{GAP_META[g.status].label}</span>
                        <span className="line-name">{g.name}</span>
                        {g.owner && <span className="line-owner">{g.owner}</span>}
                      </div>
                    ))
                  )}
                </div>
                <div className="subcard">
                  <div className="subhd">Status</div>
                  <div className="kv"><span>Readiness trend</span><b>{auditTrend.replace(/_/g, ' ')}</b></div>
                  <div className="kv"><span>Documents score</span><b>{summary.readiness.documentsScore} / 100</b></div>
                  <div className="kv"><span>Training score</span><b>{summary.readiness.trainingScore} / 100</b></div>
                  <div className="kv"><span>Evidence score</span><b>{summary.readiness.evidenceScore} / 100</b></div>
                  <div className="kv"><span>My Work queue</span><b><Link href="/my-work" style={{ color: '#60a5fa' }}>Open My Work →</Link></b></div>
                  <div className="guardrail">{summary.guardrailText}</div>
                </div>
              </div>
              {summary.readiness.topGaps.length > 0 && (
                <div className="subcard" style={{ marginTop: 11 }}>
                  <div className="subhd">Top gaps from AI assessment</div>
                  {summary.readiness.topGaps.map((gap, i) => (
                    <div className="line" key={i}>
                      <span className="gchip g-missing">Gap</span>
                      <span className="line-name">{gap}</span>
                    </div>
                  ))}
                </div>
              )}
            </PSBSection>
          )}

          {/* ═══════════ EVIDENCE & OBLIGATIONS ═══════════ */}
          {section === 'evidence' && (
            <>
              <PSBSection eyebrow="Evidence Map" title="Audit-ready records">
                {evidence.length === 0 ? (
                  <div className="subcard">
                    <div className="subhd">No evidence items yet</div>
                    <p className="line-desc" style={{ padding: '8px 0' }}>Complete setup to populate the evidence map.</p>
                  </div>
                ) : (
                  <div className="card-grid three">
                    {evidence.map(e => (
                      <div className={`evcard ${GAP_META[e.status].cls}`} key={e.name}>
                        <div className="ev-name">{e.name}</div>
                        <div className="ev-foot">
                          <span className={`gchip ${GAP_META[e.status].cls}`}>{GAP_META[e.status].label}</span>
                          {e.owner && <span className="ev-owner">{e.owner}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PSBSection>

              <PSBSection eyebrow="Regulatory Mapping" title="Required obligations and controls">
                {obligations.length === 0 ? (
                  <div className="subcard"><div className="subhd">No applicability rules configured</div></div>
                ) : (
                  obligations.map(o => (
                    <div className="oblig" key={o.code}>
                      <div className="ob-code">{o.code}</div>
                      <div className="ob-body">
                        <div className="ob-title">{o.title}</div>
                        <div className="ob-controls">
                          {o.controls.map(c => <span className="pillsm" key={c}>{c}</span>)}
                        </div>
                      </div>
                      <div className="ob-owner">{o.owner}</div>
                    </div>
                  ))
                )}
              </PSBSection>
            </>
          )}

          {/* ═══════════ SOURCE INTELLIGENCE ═══════════ */}
          {section === 'sources' && (
            <>
              <PSBSection eyebrow="BioType Branching Engine" title="Primary and secondary BioTypes">
                <div className="card-grid two">
                  {biotypes.map(b => (
                    <div className={`btcard${b.status === 'available' ? ' muted' : ''}`} key={b.name}>
                      <div className="bt-hd">
                        <span className="bt-name">{b.name}</span>
                        <span className={`btchip ${BT_META[b.status].cls}`}>{BT_META[b.status].label}</span>
                      </div>
                      <div className="bt-desc">{b.desc}</div>
                      <div className="bt-reqs">
                        {b.requirements.map(r => <span className="pillsm" key={r}>{r}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </PSBSection>

              <PSBSection eyebrow="Company Profile Intelligence" title="Applicability triggers">
                {triggers.length === 0 ? (
                  <div className="subcard">
                    <div className="subhd">No active triggers</div>
                    <p className="line-desc" style={{ padding: '8px 0' }}>
                      Complete the <Link href="/assess/setup-questionnaire" style={{ color: '#60a5fa' }}>setup questionnaire</Link> to activate applicability triggers.
                    </p>
                  </div>
                ) : (
                  <div className="card-grid two">
                    {triggers.map(t => (
                      <div className="trig" key={t.key}>
                        <div className="trig-hd">
                          <span className="trig-key">{t.key}</span>
                          <span className="trig-true">TRUE</span>
                        </div>
                        <div className="bt-reqs">
                          {t.maps.map(m => <span className="pillsm" key={m}>{m}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PSBSection>
            </>
          )}

          {/* ═══════════ DRAFTS & CHANGES ═══════════ */}
          {section === 'drafts' && (
            <>
              <PSBSection eyebrow="Operate" title="Draft operating library">
                <div className="card-grid two">
                  <div className="subcard">
                    <div className="subhd">Programs <span className="cnt-amber">{programs.length}</span></div>
                    {programs.length === 0 ? (
                      <div className="line"><span className="line-name muted-txt">No programs configured</span></div>
                    ) : (
                      programs.map(p => (
                        <div className="line" key={p.name}>
                          <span className={`gchip ${p.statusCls}`}>{p.statusLabel}</span>
                          <span className="line-name">{p.name}</span>
                          <span className="line-owner">{p.owner}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="subcard">
                    <div className="subhd">Methods <span className="cnt">{methods.length}</span></div>
                    {methods.length === 0 ? (
                      <div className="line"><span className="line-name muted-txt">No methods configured</span></div>
                    ) : (
                      methods.map(m => (
                        <div className="line col" key={m.name}>
                          <span className="line-name">{m.name}</span>
                          <span className="line-desc">{m.desc}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PSBSection>

              <PSBSection eyebrow="Change Impact Management" title="Impact events">
                {changes.length === 0 ? (
                  <div className="subcard">
                    <div className="subhd">No change impact events</div>
                    <p className="line-desc" style={{ padding: '8px 0' }}>
                      Impact events appear when materials, equipment, or incidents are logged.
                    </p>
                  </div>
                ) : (
                  changes.map(c => (
                    <div className="change" key={`${c.type}-${c.title}`}>
                      <div className="ch-hd">
                        <span className="ch-type">{c.type}</span>
                        <span className="gchip g-review">Draft</span>
                      </div>
                      <div className="ch-title">{c.title}</div>
                      <div className="bt-reqs">
                        {c.actions.map(a => <span className="pillsm action" key={a}>→ {a}</span>)}
                      </div>
                    </div>
                  ))
                )}
              </PSBSection>
            </>
          )}

          {/* ═══════════ DRILLDOWNS ═══════════ */}
          {section === 'drilldowns' && (
            <PSBSection eyebrow="Source Drilldowns" title="Traceable source detail">
              <div className="card-grid three">
                {drilldowns.map(d => (
                  <div className={`drill${d.count === 0 ? ' clear' : ''}`} key={d.group}>
                    <div className="dr-hd">
                      <span className="dr-group">{d.group}</span>
                      <span className={`dr-cnt${d.count === 0 ? ' zero' : ''}`}>{d.count}</span>
                    </div>
                    <div className="dr-desc">{d.desc}</div>
                    <div className="dr-foot">
                      {d.count === 0 ? 'No active source gaps' : `${d.count} source${d.count > 1 ? 's' : ''} need review`}
                    </div>
                  </div>
                ))}
              </div>
            </PSBSection>
          )}

          {/* ═══════════ AI GUARDRAILS ═══════════ */}
          {section === 'guardrails' && (
            <>
              <PSBSection eyebrow="AI Guardrails" title="Deterministic data flow">
                <div className="flow">
                  {aiFlow.map((s, i) => (
                    <span key={s} className="flowstep">
                      {s}{i < aiFlow.length - 1 && <span className="flowarrow">→</span>}
                    </span>
                  ))}
                </div>
              </PSBSection>

              <PSBSection eyebrow="Human Validation Workflow" title="Draft to controlled use">
                <div className="flow">
                  {humanFlow.map((s, i) => (
                    <span key={s} className="flowstep human">
                      {s}{i < humanFlow.length - 1 && <span className="flowarrow">→</span>}
                    </span>
                  ))}
                </div>
              </PSBSection>

              <PSBSection eyebrow="Common Utilities" title={`${UTILITIES.length} shared platform components`}>
                <div className="util-grid">
                  {UTILITIES.map(u => <div className="util" key={u}>{u}</div>)}
                </div>
              </PSBSection>
            </>
          )}

          {/* ═══════════ ADMIN (owner-only) ═══════════ */}
          {section === 'admin' && adminSection && (
            <PSBSection eyebrow="Foundation Administration" title="Owner edit workflows">
              <div className="psb-admin">{adminSection}</div>
            </PSBSection>
          )}

          {/* COUNTS STRIP */}
          {counts.length > 0 && (
            <div className="psb-counts">
              {counts.map(([label, n]) => (
                <div className="count" key={label}><b>{n}</b> {label}</div>
              ))}
            </div>
          )}

          <div className="psb-foot-guard">
            Draft AI recommendation — human review required. This view does not certify compliance, approve
            documents, close corrective actions, clear hazards, or replace qualified EHS review.
          </div>
        </main>
      </div>
    </div>
  );
}

/* ────────────────── Section sub-component ────────────────── */

function PSBSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="psb-section">
      <div className="sec-hd">
        <div className="sec-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

/* ──────────────────────────── Styles ──────────────────────────── */

const STYLES = `
/* ── Reset & root ── */
.psb *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.psb a{text-decoration:none;color:inherit}

/* CSS custom properties */
.psb{
  --w2:#13294d;--w3:#16315c;--wline:#22406e;--wline2:#2c4d80;
  --wink:#eaf1fb;--wink2:#9fb4d4;--wink3:#6f87ad;
  --cink:#0f2647;--cink2:#475569;--cink3:#94a3b8;--cline:#e2e8f0;
  --accent:#2563eb;--accent2:#60a5fa;
  background:#f5f8fc;
  min-height:100dvh;
  display:flex;
  flex-direction:column;
  color:var(--cink);
  font-size:13px;
  line-height:1.4;
}

/* ── Top bar ── */
.psb-topbar{display:flex;align-items:center;justify-content:space-between;background:#0a1d38;padding:12px 18px;flex-shrink:0}
.psb-brand{display:flex;align-items:center;gap:10px}
.psb-logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#1d4ed8,#0891b2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.psb-brand b{font-size:14px;font-weight:700;color:#fff}
.psb-brand span{display:block;font-size:9.5px;color:#7e96bd;font-weight:500}
.psb-topright{display:flex;align-items:center;gap:10px}
.psb-pill{background:#13294d;border:1px solid #2c4d80;border-radius:7px;padding:5px 9px;font-size:11px;color:#9fb4d4;display:flex;align-items:center;gap:6px;cursor:default}
.psb-signout{cursor:pointer;background:none;border:none;color:#9fb4d4;padding:5px 8px;font-size:13px}
.psb-owner{background:rgba(34,197,94,.14);border-color:rgba(34,197,94,.4);color:#86efac;font-weight:700;letter-spacing:.04em;font-size:9.5px}
.psb-ava{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}

/* ── Shell ── */
.psb-shell{display:flex;flex:1;overflow:hidden}

/* ── Sidebar nav ── */
.psb-nav{width:188px;background:#fff;border-right:1px solid var(--cline);padding:10px 0;flex-shrink:0;overflow-y:auto}
.psb-navgrp{font-size:9.5px;letter-spacing:.12em;color:var(--cink3);text-transform:uppercase;padding:11px 16px 4px;display:flex;align-items:center;gap:7px;font-weight:700}
.psb-navitem{padding:7px 16px 7px 30px;font-size:11.5px;color:var(--cink2);cursor:pointer;display:flex;align-items:center;gap:6px}
.psb-navitem:hover{color:var(--cink);background:#f1f5fb}
.psb-navitem.on{color:var(--accent);background:linear-gradient(90deg,rgba(37,99,235,.1),transparent);border-left:2px solid var(--accent);padding-left:28px;font-weight:700}
.navnew{font-size:7.5px;font-weight:800;letter-spacing:.05em;background:rgba(37,99,235,.15);color:var(--accent);border:1px solid rgba(37,99,235,.3);padding:1px 4px;border-radius:4px}
.psb-navtop{padding:9px 16px;font-size:12.5px;color:var(--cink);font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer}
.psb-navtop .ch{margin-left:auto;color:var(--cink3);font-size:10px}
.psb-navtop:hover{background:#f1f5fb}

/* ── Main content ── */
.psb-main{flex:1;padding:16px 20px;overflow-y:auto;background:#f5f8fc;display:flex;flex-direction:column;gap:0}

/* ── Banners ── */
.psb-banner{font-size:11px;color:#92400e;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;margin-bottom:14px}
.psb-banner a{color:#1d4ed8;font-weight:600;cursor:pointer}
.psb-banner-info{color:#1e40af;background:#eff6ff;border-color:#bfdbfe}

/* ── Page header ── */
.psb-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:16px}
.psb-eyebrow{font-size:10px;letter-spacing:.14em;color:var(--accent);font-weight:700;text-transform:uppercase;margin-bottom:4px}
.psb-main h1{font-size:21px;font-weight:700;letter-spacing:-.01em;margin-bottom:3px;color:var(--cink)}
.psb-sub{font-size:11.5px;color:var(--cink2);max-width:640px}
.psb-btn{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 4px 14px rgba(37,99,235,.3);display:inline-flex;align-items:center}
.psb-btn.ghost{background:#fff;border:1px solid var(--cline);color:var(--cink2);box-shadow:none;font-weight:500}
.psb-btn:hover{opacity:.9}

/* ── Hero ── */
.psb-hero{display:flex;gap:16px;background:linear-gradient(120deg,#0b1f3a,#13294d);border:1px solid var(--wline);border-radius:14px;padding:18px 20px;margin-bottom:14px;box-shadow:0 10px 30px rgba(15,38,71,.18)}
.hero-gauge{display:flex;flex-direction:column;align-items:center;justify-content:center;padding-right:18px;border-right:1px solid var(--wline);min-width:150px}
.hero-gauge-label{font-size:11px;color:var(--wink);font-weight:700;margin-top:6px}
.hero-gauge-sub{font-size:9.5px;color:var(--wink3);margin-top:2px}
.hero-stats{display:grid;grid-template-columns:1fr 1fr 1.1fr;gap:18px;flex:1;align-items:center}
.hstat .hlabel{font-size:9.5px;letter-spacing:.08em;color:var(--wink3);text-transform:uppercase;font-weight:700;margin-bottom:6px}
.hrow{display:flex;align-items:center;gap:9px}
.hbig{font-size:34px;font-weight:800;line-height:1}
.hsev{font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:6px}
.sev-crit{background:rgba(239,68,68,.2);color:#fca5a5;border:1px solid rgba(239,68,68,.5)}
.sev-high{background:rgba(245,158,11,.2);color:#fcd34d;border:1px solid rgba(245,158,11,.5)}
.sev-low{background:rgba(34,197,94,.2);color:#86efac;border:1px solid rgba(34,197,94,.5)}
.hsub{font-size:10px;color:var(--wink2);margin-top:5px}
.hbar{height:6px;background:var(--wline2);border-radius:3px;overflow:hidden;margin-top:9px}
.hbar i{display:block;height:100%;background:#ef4444;border-radius:3px;transition:width .3s ease}
.hgate{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:11px 13px}
.gate-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--wink);font-weight:600}
.gate-row b{color:#fca5a5}
.gate-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.gate-dot.block{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.2)}
.gate-dot.pend{background:#f59e0b}
.gate-dot.go{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.2)}
.gate-sub{font-size:10px;color:var(--wink3);margin:5px 0 0 17px}

/* ── Section nav ── */
.psb-secnav{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
.secbtn{background:#fff;border:1px solid var(--cline);border-radius:8px;padding:8px 13px;font-size:11.5px;font-weight:600;color:var(--cink2);cursor:pointer;transition:background .15s}
.secbtn:hover{background:#f1f5fb}
.secbtn.on{background:var(--accent);border-color:var(--accent);color:#fff}

/* ── Section wrapper ── */
.psb-section{margin-bottom:16px}
.sec-hd{margin-bottom:10px}
.sec-eyebrow{font-size:9.5px;letter-spacing:.12em;color:var(--accent);text-transform:uppercase;font-weight:700;margin-bottom:2px}
.psb-section h2{font-size:15px;font-weight:700;color:var(--cink)}

/* ── Grid ── */
.card-grid{display:grid;gap:11px}
.card-grid.two{grid-template-columns:1fr 1fr}
.card-grid.three{grid-template-columns:repeat(3,1fr)}

/* ── Dark widget cards ── */
.subcard,.evcard,.btcard,.trig,.oblig,.change,.drill{
  background:var(--w2);border:1px solid var(--wline);border-radius:11px;
  padding:13px 15px;box-shadow:0 6px 18px rgba(15,38,71,.1);color:var(--wink2)
}
.subhd{font-size:11px;font-weight:700;color:var(--wink);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.cnt-red{background:rgba(239,68,68,.2);color:#fca5a5;border-radius:5px;padding:1px 7px;font-size:10px}
.cnt-amber{background:rgba(245,158,11,.2);color:#fcd34d;border-radius:5px;padding:1px 7px;font-size:10px}
.cnt{background:var(--wline2);color:var(--wink2);border-radius:5px;padding:1px 7px;font-size:10px}
.line{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--wline)}
.line:last-child{border-bottom:none}
.line.col{flex-direction:column;align-items:flex-start;gap:2px}
.line-name{font-size:11.5px;color:var(--wink);font-weight:600;flex:1}
.line-owner{font-size:10px;color:var(--wink3)}
.line-desc{font-size:10px;color:var(--wink3)}
.muted-txt{color:var(--wink3)!important;font-weight:400!important}
.gchip{font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:6px;white-space:nowrap}
.g-missing{background:rgba(239,68,68,.18);color:#fca5a5;border:1px solid rgba(239,68,68,.4)}
.g-review{background:rgba(245,158,11,.18);color:#fcd34d;border:1px solid rgba(245,158,11,.4)}
.g-ready{background:rgba(34,197,94,.18);color:#86efac;border:1px solid rgba(34,197,94,.4)}
.kv{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--wline);font-size:11px}
.kv:last-of-type{border-bottom:none}
.kv span{color:var(--wink3)}
.kv b{color:var(--wink);font-weight:600;text-align:right}
.guardrail{margin-top:10px;font-size:9.5px;color:var(--wink3);background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:7px;padding:8px 10px;line-height:1.5}

/* ── Evidence cards ── */
.evcard{border-left:3px solid var(--wline2)}
.evcard.g-missing{border-left-color:#ef4444}
.evcard.g-review{border-left-color:#f59e0b}
.evcard.g-ready{border-left-color:#22c55e}
.ev-name{font-size:12px;font-weight:600;color:var(--wink);margin-bottom:10px}
.ev-foot{display:flex;align-items:center;justify-content:space-between}
.ev-owner{font-size:10px;color:var(--wink3)}

/* ── Obligations ── */
.oblig{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;margin-bottom:9px}
.ob-code{font-size:11px;font-weight:800;color:#93c5fd;background:#0e234a;border:1px solid var(--wline2);border-radius:6px;padding:5px 9px;white-space:nowrap}
.ob-title{font-size:12px;color:var(--wink);font-weight:600;margin-bottom:5px}
.ob-controls,.bt-reqs{display:flex;flex-wrap:wrap;gap:5px}
.ob-owner{font-size:10px;color:var(--wink3);white-space:nowrap}
.pillsm{font-size:9.5px;color:var(--wink2);background:#0e234a;border:1px solid var(--wline2);border-radius:5px;padding:2px 7px}
.pillsm.action{color:#93c5fd}

/* ── BioTypes ── */
.btcard.muted{opacity:.62}
.bt-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}
.bt-name{font-size:12.5px;font-weight:700;color:var(--wink)}
.btchip{font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:6px}
.bt-primary{background:rgba(37,99,235,.25);color:#93c5fd;border:1px solid rgba(37,99,235,.5)}
.bt-secondary{background:rgba(168,85,247,.2);color:#d8b4fe;border:1px solid rgba(168,85,247,.45)}
.bt-available{background:var(--wline2);color:var(--wink3)}
.bt-desc{font-size:10.5px;color:var(--wink2);margin-bottom:9px;line-height:1.45}

/* ── Triggers ── */
.trig-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.trig-key{font-size:12px;font-weight:700;color:var(--wink);font-family:ui-monospace,monospace;word-break:break-all}
.trig-true{font-size:9px;font-weight:800;background:rgba(34,197,94,.18);color:#86efac;border:1px solid rgba(34,197,94,.4);padding:2px 8px;border-radius:6px;flex-shrink:0}

/* ── Change events ── */
.change{margin-bottom:9px}
.ch-hd{display:flex;align-items:center;gap:9px;margin-bottom:6px}
.ch-type{font-size:11px;font-weight:700;color:var(--wink);text-transform:capitalize}
.ch-title{font-size:11px;color:var(--wink2);margin-bottom:9px;line-height:1.45}

/* ── Drilldowns ── */
.drill.clear{opacity:.6}
.dr-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}
.dr-group{font-size:11.5px;font-weight:700;color:var(--wink)}
.dr-cnt{font-size:13px;font-weight:800;color:#fca5a5;background:rgba(239,68,68,.16);border-radius:6px;padding:1px 9px}
.dr-cnt.zero{color:#86efac;background:rgba(34,197,94,.14)}
.dr-desc{font-size:10px;color:var(--wink3);line-height:1.5;margin-bottom:8px}
.dr-foot{font-size:10px;color:var(--wink2);font-weight:600;border-top:1px solid var(--wline);padding-top:7px}

/* ── Flow diagrams ── */
.flow{display:flex;flex-wrap:wrap;align-items:center;background:var(--w2);border:1px solid var(--wline);border-radius:11px;padding:14px 16px;box-shadow:0 6px 18px rgba(15,38,71,.1)}
.flowstep{display:flex;align-items:center;font-size:11px;font-weight:600;color:var(--wink2)}
.flowstep .flowarrow{color:var(--accent2);margin:0 10px;font-weight:700}
.flowstep.human{color:#d8b4fe}
.flowstep.human .flowarrow{color:#a855f7}

/* ── Utilities grid ── */
.util-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.util{background:#fff;border:1px solid var(--cline);border-radius:8px;padding:9px 11px;font-size:10.5px;font-weight:600;color:var(--cink2)}

/* ── Counts strip ── */
.psb-counts{display:flex;flex-wrap:wrap;gap:7px;margin:16px 0 12px}
.count{background:#fff;border:1px solid var(--cline);border-radius:7px;padding:5px 10px;font-size:10.5px;color:var(--cink2)}
.count b{color:var(--cink);font-weight:800;margin-right:3px}

/* ── Footer guardrail ── */
.psb-foot-guard{font-size:9.5px;color:var(--cink3);background:#fff;border:1px solid var(--cline);border-radius:8px;padding:10px 12px;line-height:1.5;margin-top:auto}

/* ── Admin section ── */
.psb-admin{background:#fff;border-radius:12px;padding:16px;border:1px solid var(--cline)}

/* ── Responsive tweaks ── */
@media (max-width:900px){
  .hero-stats{grid-template-columns:1fr 1fr;gap:12px}
  .hgate{grid-column:1/-1}
  .card-grid.three{grid-template-columns:repeat(2,1fr)}
  .util-grid{grid-template-columns:repeat(2,1fr)}
}
@media (max-width:640px){
  .psb-nav{display:none}
  .card-grid.two,.card-grid.three{grid-template-columns:1fr}
  .hero-stats{grid-template-columns:1fr}
  .oblig{grid-template-columns:auto 1fr;grid-template-rows:auto auto}
  .ob-owner{grid-column:2}
}
`;
