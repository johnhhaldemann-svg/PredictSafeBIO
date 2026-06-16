'use client';

/**
 * TrainingMatrix.tsx  (route: /training-matrix)
 * PredictSafe BIO — Operate · Training & Competency
 *
 * Data-driven: accepts TrainingMatrixSummary from the server and maps
 * it to the visual layer. Navigation uses Next.js <Link> + usePathname.
 * Self-contained layout (own topbar / sidebar); drop in without AppShell.
 */

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { TrainingMatrixSummary } from '@/lib/supabase/training-matrix-service';
import { signOutAction } from '@/app/auth/actions';
import {
  markTrainingCompleteAction,
  deleteTrainingRequirementAction,
} from '@/app/training-matrix/actions';
import { formatOwnerRole } from '@/lib/display-labels';

/* ── Module-level nav item (must be outside component to satisfy react-hooks/static-components) ── */
function NavItem({ href, pathname, children }: { href: string; pathname: string; children: ReactNode }) {
  const isActive = pathname === href || (href.length > 1 && pathname.startsWith(href + '/'));
  return <Link href={href} className={`psb-navitem${isActive ? ' on' : ''}`}>{children}</Link>;
}

/* ─────────────────────────────── Types ─────────────────────────────── */

type CellStatus = 'current' | 'needs_review' | 'expired' | 'missing' | 'none';

/* ───────────────────────────── Props ─────────────────────────────── */

export interface TrainingMatrixProps {
  summary: TrainingMatrixSummary;
  auth: {
    isSignedIn: boolean;
    isOwner: boolean;
    userEmail?: string;
    fullName?: string | null;
    role?: string;
  };
  message?: string;
  adminSection?: ReactNode;
}

/* ──────────────────────────── Helpers ──────────────────────────── */

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

function readinessTrend(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 50) return 'Needs improvement';
  return 'Action required';
}

function readinessBand(s: number) { return s >= 70 ? 'green' : s >= 40 ? 'amber' : 'red'; }

function readinessToCell(readiness: string): CellStatus {
  if (readiness === 'Current')      return 'current';
  if (readiness === 'Needs review') return 'needs_review';
  if (readiness === 'Expired')      return 'expired';
  if (readiness === 'Missing')      return 'missing';
  return 'none';
}

const CELL_META: Record<CellStatus, { label: string; cls: string; abbr: string }> = {
  current:      { label: 'Current',      cls: 'g-ready',   abbr: '✓' },
  needs_review: { label: 'Needs review', cls: 'g-review',  abbr: '!' },
  expired:      { label: 'Expired',      cls: 'g-missing', abbr: '✕' },
  missing:      { label: 'Missing',      cls: 'g-missing', abbr: '—' },
  none:         { label: '—',            cls: '',          abbr: '·' },
};

/* ─────────────────────────── Component ─────────────────────────── */

export default function TrainingMatrix({
  summary,
  auth,
  message,
  adminSection,
}: TrainingMatrixProps) {
  const [section, setSection] = useState<string>('matrix');
  const pathname = usePathname();

  /* ── Derive role×training matrix from rows ── */

  const matrixRoles = useMemo(() => {
    const seen = new Set<string>();
    const roles: string[] = [];
    summary.rows.forEach(r => {
      if (r.ownerRole && !seen.has(r.ownerRole)) {
        seen.add(r.ownerRole);
        roles.push(r.ownerRole);
      }
    });
    return roles;
  }, [summary.rows]);

  const matrixTrainings = useMemo(() => {
    const seen = new Set<string>();
    const trainings: string[] = [];
    summary.rows.forEach(r => {
      if (!seen.has(r.requirement)) {
        seen.add(r.requirement);
        trainings.push(r.requirement);
      }
    });
    return trainings;
  }, [summary.rows]);

  const cellMap = useMemo(() => {
    const map = new Map<string, CellStatus>();
    summary.rows.forEach(r => {
      map.set(`${r.ownerRole}::${r.requirement}`, readinessToCell(r.readiness));
    });
    return map;
  }, [summary.rows]);

  /* ── Derived hero stats ── */
  const currentCount  = summary.counts.find(c => c.label === 'Current')?.value ?? 0;
  const reviewCount   = summary.counts.find(c => c.label === 'Needs review')?.value ?? 0;
  const expiredCount  = (summary.counts.find(c => c.label === 'Expired')?.value ?? 0)
                      + (summary.counts.find(c => c.label === 'Missing')?.value ?? 0);
  const totalCount    = summary.counts.find(c => c.label === 'Training requirements')?.value ?? summary.rows.length;

  const band    = readinessBand(summary.readinessScore);
  const circ    = 2 * Math.PI * 42;
  const trend   = readinessTrend(summary.readinessScore);

  const initials  = getInitials(auth.fullName, auth.userEmail);
  const roleLabel = (auth.role ?? 'member').toUpperCase().slice(0, 8);

  const SECTIONS: [string, string][] = [
    ['matrix',       'Training Matrix'],
    ['requirements', 'Requirements'],
    ['biotypes',     'BioType Training'],
    ['triggers',     'Change Triggers'],
    ...(adminSection ? [['admin', 'Admin'] as [string, string]] : []),
  ];


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
          <NavItem pathname={pathname} href="/foundation">Compliance Map</NavItem>
          <NavItem pathname={pathname} href="/plan/compliance-calendar">Compliance Calendar</NavItem>
          <NavItem pathname={pathname} href="/training-matrix">Training Matrix</NavItem>
          <NavItem pathname={pathname} href="/plan/qualified-persons">Qualified Persons</NavItem>
          <NavItem pathname={pathname} href="/controls">Control Register</NavItem>
          <NavItem pathname={pathname} href="/change-management">Change Management</NavItem>
          <NavItem pathname={pathname} href="/programs">Programs</NavItem>
          <NavItem pathname={pathname} href="/emergency-response">Emergency Response <span className="navnew">NEW</span></NavItem>
          <NavItem pathname={pathname} href="/documents">Documents</NavItem>

          <Link href="/inspections" className="psb-navtop">Operate <span className="ch">▸</span></Link>
          <Link href="/" className="psb-navtop">Monitor <span className="ch">▸</span></Link>
          <Link href="/my-work" className="psb-navtop">Workspace <span className="ch">▸</span></Link>
        </nav>

        {/* ── MAIN ── */}
        <main className="psb-main">

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
              <div className="psb-eyebrow">● Operate · Training &amp; Competency</div>
              <h1>Training Matrix</h1>
              <p className="psb-sub">
                Role-based training, document-change refreshers, and assignment evidence for{' '}
                {summary.biotypeRequirements.length > 0
                  ? `${summary.biotypeRequirements.length} active BioType${summary.biotypeRequirements.length !== 1 ? 's' : ''}`
                  : 'your BioTypes'}.
                Completion must be verified by a qualified reviewer.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <Link href="/plan/qualified-persons" className="psb-btn ghost">Qualified Persons →</Link>
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
                  strokeDasharray={`${(summary.readinessScore / 100) * circ} ${circ}`}
                  transform="rotate(-90 50 50)" />
                <text x="50" y="47" textAnchor="middle" fontSize="26" fontWeight="800" fill="#eaf1fb">
                  {summary.readinessScore}
                </text>
                <text x="50" y="63" textAnchor="middle" fontSize="8" fill="#9fb4d4" letterSpacing=".05em">
                  / 100
                </text>
              </svg>
              <div className="hero-gauge-label">Training Readiness</div>
              <div className="hero-gauge-sub">{trend}</div>
            </div>

            <div className="hero-stats">
              <div className="hstat">
                <div className="hlabel">Total Requirements</div>
                <div className="hrow">
                  <span className="hbig" style={{ color: '#eaf1fb' }}>{totalCount}</span>
                </div>
                <div className="hsub">{currentCount} current · {reviewCount} needs review</div>
              </div>

              <div className="hstat">
                <div className="hlabel">Expired / Missing</div>
                <div className="hrow">
                  <span className="hbig" style={{ color: expiredCount > 0 ? '#fca5a5' : '#86efac' }}>
                    {expiredCount}
                  </span>
                  <span className={`hsev ${expiredCount > 0 ? 'sev-crit' : 'sev-low'}`}>
                    {expiredCount > 0 ? 'overdue' : 'clear'}
                  </span>
                </div>
                <div className="hbar">
                  <i style={{ width: totalCount > 0 ? `${Math.round((expiredCount / totalCount) * 100)}%` : '0%' }} />
                </div>
              </div>

              <div className={`hgate${expiredCount === 0 ? ' hgate-ok' : ''}`}>
                {expiredCount > 0 ? (
                  <>
                    <div className="gate-row"><span className="gate-dot block" /><b>Training gaps</b></div>
                    <div className="gate-sub">{expiredCount} expired / missing · human review required</div>
                    <div className="gate-row" style={{ marginTop: 8 }}><span className="gate-dot pend" /> Assignments pending</div>
                  </>
                ) : (
                  <>
                    <div className="gate-row"><span className="gate-dot go" /><b>All current</b></div>
                    <div className="gate-sub">No expired training · {trend}</div>
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

          {/* ═══════════ MATRIX ═══════════ */}
          {section === 'matrix' && (
            <PSBSection eyebrow="Role × Competency Grid" title="Training assignment status by role">
              {summary.rows.length === 0 ? (
                <div className="subcard">
                  <div className="subhd">No training requirements yet</div>
                  <p className="line-desc" style={{ padding: '8px 0' }}>
                    {auth.isOwner
                      ? 'Add requirements in the Admin tab to populate the matrix.'
                      : 'No training requirements have been configured for this workspace.'}
                  </p>
                </div>
              ) : (
                <div className="tm-scroll">
                  <table className="tm-table">
                    <thead>
                      <tr>
                        <th className="tm-role-hd">Role</th>
                        {matrixTrainings.map(t => (
                          <th key={t} className="tm-col-hd" title={t}>{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixRoles.map(role => (
                        <tr key={role}>
                          <td className="tm-role">{formatOwnerRole(role)}</td>
                          {matrixTrainings.map(training => {
                            const cell = cellMap.get(`${role}::${training}`) ?? 'none';
                            const meta = CELL_META[cell];
                            return (
                              <td key={training} className={`tm-cell ${cell}`} title={meta.label}>
                                {meta.abbr}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="tm-legend">
                {(['current', 'needs_review', 'expired', 'missing', 'none'] as CellStatus[]).map(s => (
                  <span key={s} className={`tm-leg-item ${s}`}>
                    <span className="tm-leg-dot" /> {CELL_META[s].label}
                  </span>
                ))}
              </div>
            </PSBSection>
          )}

          {/* ═══════════ REQUIREMENTS ═══════════ */}
          {section === 'requirements' && (
            <PSBSection eyebrow="Training Requirements" title="Requirements &amp; readiness">
              <div className="req-scroll">
                <table className="req-table">
                  <thead>
                    <tr>
                      <th>Requirement</th>
                      <th>Source</th>
                      <th>Owner</th>
                      <th>Document</th>
                      <th>Status</th>
                      <th>Evidence</th>
                      <th>Readiness</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="req-empty">
                          No training requirements yet.{auth.isOwner ? ' Add one in the Admin tab.' : ''}
                        </td>
                      </tr>
                    ) : (
                      summary.rows.map(row => {
                        const cell = readinessToCell(row.readiness);
                        const meta = CELL_META[cell];
                        return (
                          <tr key={row.id}>
                            <td className="req-name">{row.requirement}</td>
                            <td className="req-muted">{row.source}</td>
                            <td className="req-muted">{formatOwnerRole(row.ownerRole ?? '')}</td>
                            <td>
                              {row.documentHref ? (
                                <Link href={row.documentHref} className="req-doc-link">
                                  {row.documentTitle}
                                </Link>
                              ) : (
                                <span className="req-muted">{row.documentTitle || '—'}</span>
                              )}
                            </td>
                            <td>
                              <span className="req-muted">{row.assignmentStatus}</span>
                              {row.dueDate && (
                                <small className="req-due">
                                  due {new Date(row.dueDate).toLocaleDateString()}
                                </small>
                              )}
                            </td>
                            <td className="req-muted">{row.evidenceLabel}</td>
                            <td>
                              <span className={`gchip ${meta.cls}`}>{meta.label}</span>
                            </td>
                            <td className="req-actions">
                              {auth.isSignedIn && row.assignmentStatus !== 'completed' && (
                                <form action={markTrainingCompleteAction} style={{ display: 'inline' }}>
                                  <input type="hidden" name="assignmentId" value={row.id} />
                                  <button className="req-action-btn" type="submit" title="Mark complete">✓</button>
                                </form>
                              )}
                              {auth.isOwner && (
                                <form action={deleteTrainingRequirementAction} style={{ display: 'inline' }}>
                                  <input type="hidden" name="requirementId" value={row.id} />
                                  <button className="req-action-btn req-action-del" type="submit" title="Delete">✕</button>
                                </form>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </PSBSection>
          )}

          {/* ═══════════ BIOTYPES ═══════════ */}
          {section === 'biotypes' && (
            <PSBSection eyebrow="BioType Requirements" title="Branch-driven training">
              {summary.biotypeRequirements.length === 0 ? (
                <div className="subcard">
                  <div className="subhd">No BioType training requirements configured</div>
                  <p className="line-desc" style={{ padding: '8px 0' }}>
                    BioType training requirements appear when BioType branches are activated in your workspace.
                  </p>
                </div>
              ) : (
                <div className="card-grid two">
                  {summary.biotypeRequirements.map(item => (
                    <div className="btcard" key={item.biotype}>
                      <div className="bt-hd">
                        <span className="bt-name">{item.biotype}</span>
                        <span className="btchip bt-primary">Active</span>
                      </div>
                      <div className="bt-reqs">
                        {item.training.map(t => (
                          <span className="pillsm" key={t}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PSBSection>
          )}

          {/* ═══════════ TRIGGERS ═══════════ */}
          {section === 'triggers' && (
            <PSBSection eyebrow="Change Impact" title="Training triggers">
              {summary.changeImpacts.length === 0 ? (
                <div className="subcard">
                  <div className="subhd">No change-impact training triggers found yet</div>
                  <p className="line-desc" style={{ padding: '8px 0' }}>
                    Impact events appear when materials, equipment, or incidents are logged.
                  </p>
                </div>
              ) : (
                summary.changeImpacts.map(change => (
                  <div className="change" key={change.id}>
                    <div className="ch-hd">
                      <span className="ch-type">{change.type}</span>
                      <span className={`gchip ${change.status === 'resolved' ? 'g-ready' : 'g-review'}`}>
                        {change.status}
                      </span>
                    </div>
                    <div className="ch-title">{change.summary}</div>
                    <div className="bt-reqs">
                      {change.trainingImpacts.length > 0
                        ? change.trainingImpacts.map(t => (
                          <span className="pillsm action" key={t}>→ {t}</span>
                        ))
                        : <span className="req-muted">Training impact pending owner review.</span>}
                    </div>
                  </div>
                ))
              )}
            </PSBSection>
          )}

          {/* ═══════════ ADMIN (owner-only) ═══════════ */}
          {section === 'admin' && adminSection && (
            <PSBSection eyebrow="Training Administration" title="Owner edit workflows">
              <div className="psb-admin">{adminSection}</div>
            </PSBSection>
          )}

          {/* COUNTS STRIP */}
          {summary.counts.length > 0 && (
            <div className="psb-counts">
              {summary.counts.map(c => (
                <div className="count" key={c.label}><b>{c.value}</b> {c.label}</div>
              ))}
            </div>
          )}

          {summary.guardrailText && (
            <div className="guardrail psb-foot-guard">{summary.guardrailText}</div>
          )}
          <div className="psb-foot-guard" style={{ marginTop: 8 }}>
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
.sev-low{background:rgba(34,197,94,.2);color:#86efac;border:1px solid rgba(34,197,94,.5)}
.hsub{font-size:10px;color:var(--wink2);margin-top:5px}
.hbar{height:6px;background:var(--wline2);border-radius:3px;overflow:hidden;margin-top:9px}
.hbar i{display:block;height:100%;background:#ef4444;border-radius:3px;transition:width .3s ease}
.hgate{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:11px 13px}
.hgate.hgate-ok{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.3)}
.gate-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--wink);font-weight:600}
.gate-row b{color:#fca5a5}
.hgate.hgate-ok .gate-row b{color:#86efac}
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

/* ── Card grids ── */
.card-grid{display:grid;gap:11px}
.card-grid.two{grid-template-columns:1fr 1fr}

/* ── Dark widget cards ── */
.subcard,.btcard,.change{
  background:var(--w2);border:1px solid var(--wline);border-radius:11px;
  padding:13px 15px;box-shadow:0 6px 18px rgba(15,38,71,.1);color:var(--wink2)
}
.subhd{font-size:11px;font-weight:700;color:var(--wink);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.line-desc{font-size:10px;color:var(--wink3)}
.gchip{font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:6px;white-space:nowrap}
.g-missing{background:rgba(239,68,68,.18);color:#fca5a5;border:1px solid rgba(239,68,68,.4)}
.g-review{background:rgba(245,158,11,.18);color:#fcd34d;border:1px solid rgba(245,158,11,.4)}
.g-ready{background:rgba(34,197,94,.18);color:#86efac;border:1px solid rgba(34,197,94,.4)}
.guardrail{font-size:9.5px;color:var(--wink3);background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:7px;padding:8px 10px;line-height:1.5}

/* ── BioTypes ── */
.bt-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.bt-name{font-size:12.5px;font-weight:700;color:var(--wink)}
.btchip{font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:6px}
.bt-primary{background:rgba(37,99,235,.25);color:#93c5fd;border:1px solid rgba(37,99,235,.5)}
.bt-reqs{display:flex;flex-wrap:wrap;gap:5px}
.pillsm{font-size:9.5px;color:var(--wink2);background:#0e234a;border:1px solid var(--wline2);border-radius:5px;padding:2px 7px}
.pillsm.action{color:#93c5fd}

/* ── Change events ── */
.change{margin-bottom:9px}
.ch-hd{display:flex;align-items:center;gap:9px;margin-bottom:6px}
.ch-type{font-size:11px;font-weight:700;color:var(--wink);text-transform:capitalize}
.ch-title{font-size:11px;color:var(--wink2);margin-bottom:9px;line-height:1.45}

/* ── Training Matrix grid ── */
.tm-scroll{overflow-x:auto;border-radius:11px;box-shadow:0 6px 18px rgba(15,38,71,.1)}
.tm-table{width:100%;border-collapse:collapse;background:var(--w2);border:1px solid var(--wline)}
.tm-table th,.tm-table td{border:1px solid var(--wline)}
.tm-role-hd{font-size:10px;font-weight:700;color:var(--wink);padding:9px 13px;white-space:nowrap;background:var(--w3);text-align:left;min-width:140px}
.tm-col-hd{font-size:9px;font-weight:700;color:var(--wink2);padding:8px 10px;text-align:center;background:var(--w3);max-width:110px;word-break:break-word;line-height:1.3}
.tm-role{font-size:11px;font-weight:600;color:var(--wink);padding:9px 13px;white-space:nowrap;background:var(--w2)}
.tm-cell{text-align:center;font-size:13px;font-weight:700;padding:10px 8px;cursor:default}
.tm-cell.current{background:rgba(34,197,94,.14);color:#86efac}
.tm-cell.needs_review{background:rgba(245,158,11,.14);color:#fcd34d}
.tm-cell.expired,.tm-cell.missing{background:rgba(239,68,68,.14);color:#fca5a5}
.tm-cell.none{background:transparent;color:var(--wink3)}

/* ── Matrix legend ── */
.tm-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:12px;padding:0 4px}
.tm-leg-item{display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--cink2)}
.tm-leg-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0}
.tm-leg-item.current .tm-leg-dot{background:rgba(34,197,94,.6)}
.tm-leg-item.needs_review .tm-leg-dot{background:rgba(245,158,11,.6)}
.tm-leg-item.expired .tm-leg-dot,.tm-leg-item.missing .tm-leg-dot{background:rgba(239,68,68,.6)}
.tm-leg-item.none .tm-leg-dot{background:var(--cline)}

/* ── Requirements table ── */
.req-scroll{overflow-x:auto;border-radius:11px;box-shadow:0 6px 18px rgba(15,38,71,.1)}
.req-table{width:100%;border-collapse:collapse;background:var(--w2);border:1px solid var(--wline)}
.req-table th{font-size:10px;font-weight:700;color:var(--wink2);padding:10px 13px;text-align:left;background:var(--w3);border-bottom:1px solid var(--wline);white-space:nowrap}
.req-table td{padding:10px 13px;border-bottom:1px solid var(--wline);color:var(--wink);vertical-align:top}
.req-table tr:last-child td{border-bottom:none}
.req-table tr:hover td{background:rgba(37,99,235,.05)}
.req-name{font-weight:600;font-size:12px;color:var(--wink)}
.req-muted{color:var(--wink3);font-size:11px}
.req-doc-link{color:var(--accent2);font-size:11px;text-decoration:underline;text-underline-offset:2px}
.req-due{display:block;font-size:10px;color:var(--wink3);margin-top:2px}
.req-empty{text-align:center;color:var(--wink3);padding:22px;font-style:italic;font-size:12px}
.req-actions{white-space:nowrap}
.req-action-btn{background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.35);color:#86efac;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;margin-right:4px;font-weight:700}
.req-action-btn:hover{background:rgba(34,197,94,.24)}
.req-action-del{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.35);color:#fca5a5}
.req-action-del:hover{background:rgba(239,68,68,.22)}

/* ── Counts strip ── */
.psb-counts{display:flex;flex-wrap:wrap;gap:7px;margin:16px 0 12px}
.count{background:#fff;border:1px solid var(--cline);border-radius:7px;padding:5px 10px;font-size:10.5px;color:var(--cink2)}
.count b{color:var(--cink);font-weight:800;margin-right:3px}

/* ── Footer guardrail ── */
.psb-foot-guard{font-size:9.5px;color:var(--cink3);background:#fff;border:1px solid var(--cline);border-radius:8px;padding:10px 12px;line-height:1.5;margin-top:auto}

/* ── Admin section ── */
.psb-admin{background:#fff;border-radius:12px;padding:16px;border:1px solid var(--cline)}

/* ── Responsive ── */
@media (max-width:900px){
  .hero-stats{grid-template-columns:1fr 1fr;gap:12px}
  .hgate{grid-column:1/-1}
  .card-grid.two{grid-template-columns:1fr}
}
@media (max-width:640px){
  .psb-nav{display:none}
  .hero-stats{grid-template-columns:1fr}
}
`;
