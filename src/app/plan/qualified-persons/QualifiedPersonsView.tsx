'use client';

import { useState, useMemo } from 'react';
import type { QualifiedPerson, OrgMember } from '@/lib/supabase/qualified-person-service';
import { addQualifiedPersonAction, toggleQualifiedPersonAction } from './actions';

/* ── Task type registry ────────────────────────────────────────────────── */

const TASK_TYPES = [
  { key: 'risk_register_status', label: 'Register status' },
  { key: 'capa_closure',         label: 'CAPA closure' },
  { key: 'chemical_approval',    label: 'Chemical approval' },
  { key: 'manifest_signoff',     label: 'Manifests' },
  { key: 'change_approval',      label: 'Change approval' },
];

const SCOPE_LABELS: Record<string, string> = {
  risk_register_status: 'Register status',
  capa_closure:         'CAPA closure',
  chemical_approval:    'Chemical approval',
  manifest_signoff:     'Manifests',
  change_approval:      'Change approval',
  all:                  'Full authority',
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

function isExpired(d: string | null | undefined): boolean {
  return !!d && new Date(d) < new Date();
}

function isExpiringSoon(d: string | null | undefined, days = 30): boolean {
  if (!d) return false;
  const exp = new Date(d);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return exp >= new Date() && exp <= cutoff;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function expiryInfo(d: string | null) {
  if (!d) return { badge: 'Active', badgeCls: 'qp-st-active', sub: 'No expiry', subOd: false };
  const exp = new Date(d);
  const diffDays = Math.round((exp.getTime() - Date.now()) / 86_400_000);
  if (diffDays < 0) {
    return { badge: 'Expired', badgeCls: 'qp-st-expired', sub: `Expired ${Math.abs(diffDays)}d ago`, subOd: true };
  }
  if (diffDays <= 30) {
    return { badge: 'Expiring', badgeCls: 'qp-st-expiring', sub: `${diffDays}d left`, subOd: false };
  }
  const fmt = exp.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  return { badge: 'Active', badgeCls: 'qp-st-active', sub: fmt, subOd: false };
}

type FilterTab = 'all' | 'active' | 'expiring' | 'expired';

/* ── Component ───────────────────────────────────────────────────────── */

export default function QualifiedPersonsView({
  people,
  members,
  message,
}: {
  people: QualifiedPerson[];
  members: OrgMember[];
  message?: string;
}) {
  const [filter, setFilter]               = useState<FilterTab>('all');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  /* ── Derived counts ── */
  const totalCount       = people.length;
  const activeCount      = people.filter(p => p.active && !isExpired(p.expirationDate)).length;
  const expiringSoonCount = people.filter(p => p.active && isExpiringSoon(p.expirationDate, 30)).length;
  const expiredCount     = people.filter(p => p.active && isExpired(p.expirationDate)).length;

  /* ── Authority coverage ── */
  const coverage = useMemo(() => TASK_TYPES.map(t => {
    const count = people.filter(p =>
      p.active &&
      !isExpired(p.expirationDate) &&
      (p.qualifiedFor.includes(t.key) || p.qualifiedFor.includes('all'))
    ).length;
    return { ...t, count };
  }), [people]);

  const gapCount = coverage.filter(c => c.count === 0).length;

  /* ── Filtered rows ── */
  const filtered = useMemo(() => {
    if (filter === 'all') return people;
    return people.filter(p => {
      const exp  = isExpired(p.expirationDate);
      const soon = !exp && isExpiringSoon(p.expirationDate, 30);
      if (filter === 'active')   return p.active && !exp && !soon;
      if (filter === 'expiring') return p.active && soon;
      if (filter === 'expired')  return p.active && exp;
      return true;
    });
  }, [people, filter]);

  /* ── Scope toggle ── */
  const toggleScope = (key: string) => {
    if (key === 'all') {
      setSelectedScopes(prev => prev.includes('all') ? [] : ['all']);
      return;
    }
    setSelectedScopes(prev => {
      const without = prev.filter(s => s !== 'all');
      return without.includes(key) ? without.filter(s => s !== key) : [...without, key];
    });
  };

  /* ── Render ── */
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: QP_STYLES }} />

      {message && <p className="form-message" style={{ marginBottom: 12 }}>{message}</p>}

      {/* KPI Cards */}
      <div className="kpi-grid qp-kpis">
        <div className="qp-kpi" style={{ '--qpa': '#60a5fa' } as React.CSSProperties}>
          <div className="qp-klabel">Total in Registry</div>
          <div className="qp-krow">
            <div className="qp-knum">{totalCount}</div>
            <div className="qp-ksub">registered reviewers</div>
          </div>
        </div>
        <div className="qp-kpi" style={{ '--qpa': activeCount === 0 ? '#ef4444' : '#22c55e' } as React.CSSProperties}>
          <div className="qp-klabel">Active</div>
          <div className="qp-krow">
            <div className="qp-knum" style={{ color: activeCount === 0 ? '#fca5a5' : '#86efac' }}>{activeCount}</div>
            <div className="qp-ksub">currently authorized</div>
          </div>
        </div>
        <div className="qp-kpi" style={{ '--qpa': expiringSoonCount > 0 ? '#f59e0b' : '#22c55e' } as React.CSSProperties}>
          <div className="qp-klabel">Expiring Soon</div>
          <div className="qp-krow">
            <div className="qp-knum" style={{ color: expiringSoonCount > 0 ? '#fcd34d' : '#86efac' }}>{expiringSoonCount}</div>
            <div className="qp-ksub">within 30 days</div>
          </div>
        </div>
        <div className="qp-kpi" style={{ '--qpa': expiredCount > 0 ? '#ef4444' : '#22c55e' } as React.CSSProperties}>
          <div className="qp-klabel">Expired</div>
          <div className="qp-krow">
            <div className="qp-knum" style={{ color: expiredCount > 0 ? '#fca5a5' : '#86efac' }}>{expiredCount}</div>
            <div className="qp-ksub">no longer authorize</div>
          </div>
        </div>
      </div>

      {/* Authority Coverage */}
      {totalCount > 0 && (
        <div className={`qp-cover ${gapCount > 0 ? 'qp-cover--gap' : 'qp-cover--ok'}`}>
          <div className="qp-cover-lead">
            <span className={`qp-cover-dot ${gapCount > 0 ? 'qp-dot--gap' : 'qp-dot--ok'}`} />
            <div>
              <div className="qp-cover-title">
                {gapCount > 0
                  ? `${gapCount} of ${coverage.length} restricted decision type${gapCount !== 1 ? 's have' : ' has'} no current approver`
                  : 'All decision types have at least one current approver'}
              </div>
              <div className="qp-cover-sub">
                Authority Coverage — expired reviewers do not count. Restricted actions in an uncovered area are blocked.
              </div>
            </div>
          </div>
          <div className="qp-cover-grid">
            {coverage.map(c => (
              <div key={c.key} className={`qp-covcard ${c.count > 0 ? 'qp-covcard--ok' : 'qp-covcard--gap'}`}>
                <div className="qp-cov-name">{c.label}</div>
                <div className="qp-cov-state">
                  {c.count > 0
                    ? <span className="qp-cov-ok">&#9679; Covered &middot; {c.count} approver{c.count !== 1 ? 's' : ''}</span>
                    : <span className="qp-cov-gap">&#9650; Gap &middot; no current approver</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="qp-toolbar">
        {([
          ['all',      'All',      totalCount],
          ['active',   'Active',   activeCount],
          ['expiring', 'Expiring', expiringSoonCount],
          ['expired',  'Expired',  expiredCount],
        ] as [FilterTab, string, number][]).map(([tab, label, count]) => (
          <button
            key={tab}
            type="button"
            className={`qp-fbtn${filter === tab ? ' qp-fbtn--act' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {label} <span className="qp-cnt">{count}</span>
          </button>
        ))}
      </div>

      {/* Registry Table */}
      <div className="qp-tbl">
        <div className="qp-thead">
          <div>Person</div>
          <div>Qualified for</div>
          <div>Qualification basis</div>
          <div>Expiration</div>
          <div />
        </div>

        {filtered.length === 0 ? (
          <div className="qp-empty">
            {totalCount === 0 ? 'No qualified persons registered yet.' : 'No records match this filter.'}
          </div>
        ) : (
          filtered.map(p => {
            const info = expiryInfo(p.expirationDate);
            return (
              <div className="qp-trow" key={p.id}>
                {/* Person */}
                <div className="qp-own">
                  <div className="qp-oava">{getInitials(p.personName)}</div>
                  <div>
                    <div className="qp-oname">{p.personName ?? 'Unknown'}</div>
                    <div className="qp-orole">{p.roleTitle ?? (p.active ? '' : 'Inactive')}</div>
                  </div>
                </div>

                {/* Qualified for */}
                <div className="qp-scopes">
                  {p.qualifiedFor.length > 0
                    ? p.qualifiedFor.map(s => (
                        <span key={s} className={`qp-scope${s === 'all' ? ' qp-scope--all' : ''}`}>
                          {SCOPE_LABELS[s] ?? s}
                        </span>
                      ))
                    : <span className="qp-scope">—</span>}
                </div>

                {/* Basis */}
                <div className="qp-basis">{p.qualificationBasis ?? '—'}</div>

                {/* Expiry */}
                <div>
                  <span className={`qp-status ${info.badgeCls}`}>{info.badge}</span>
                  <div className={`qp-exsub${info.subOd ? ' qp-exsub--od' : ''}`}>{info.sub}</div>
                </div>

                {/* Action */}
                <div style={{ textAlign: 'right' }}>
                  <form action={toggleQualifiedPersonAction}>
                    <input type="hidden" name="id"     value={p.id} />
                    <input type="hidden" name="active" value={p.active ? '0' : '1'} />
                    <button type="submit" className="qp-revoke">
                      {p.active ? 'Revoke' : 'Reactivate'}
                    </button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Guard note */}
      <div className="qp-guard">
        DRAFT — Human Review Required. The registry is the control behind restricted approvals.
        Keep it current — expired entries no longer authorize approvals.
      </div>

      {/* Add Form */}
      <section className="panel" style={{ marginTop: 6 }}>
        <div className="panel-heading">
          <div>
            <p className="section-label">Add</p>
            <h2>Add a qualified person</h2>
          </div>
        </div>

        <form action={addQualifiedPersonAction} className="stacked-form">
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <label>
              Person *
              <select name="profileId" defaultValue="">
                <option value="">— Select —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label>
              Role title
              <input name="roleTitle" type="text" placeholder="e.g. Biosafety Officer" />
            </label>
            <label>
              Expiration date
              <input name="expirationDate" type="date" />
            </label>
          </div>

          <div>
            <span className="qp-flabel">Qualified for (task types)</span>
            <div className="qp-stoggle-row">
              {[...TASK_TYPES, { key: 'all', label: 'Full authority' }].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleScope(t.key)}
                  className={`qp-stoggle${selectedScopes.includes(t.key) ? ' qp-stoggle--on' : ''}${t.key === 'all' ? ' qp-stoggle--full' : ''}`}
                >
                  {selectedScopes.includes(t.key) ? '✓ ' : ''}{t.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="qualifiedFor" value={selectedScopes.join(',')} />
            <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              Pick one or more task types, or <strong>Full authority</strong> for all restricted decisions.
            </p>
          </div>

          <label>
            Qualification basis
            <input name="qualificationBasis" type="text" placeholder="Certification, appointment, or training that authorizes approval" />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="button-primary" type="submit">+ Add to registry</button>
          </div>
        </form>
      </section>
    </>
  );
}

/* ── Scoped styles ───────────────────────────────────────────────────── */

const QP_STYLES = `
/* KPI grid — reuse global .kpi-grid grid, custom dark cards */
.qp-kpis { margin-bottom: 14px; }
.qp-kpi {
  background: #13294d;
  border: 1px solid #22406e;
  border-radius: 11px;
  padding: 13px 14px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(15,38,71,.12);
}
.qp-kpi::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--qpa, #60a5fa);
}
.qp-klabel { font-size: 9.5px; letter-spacing: .08em; color: #6f87ad; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
.qp-krow   { display: flex; align-items: baseline; gap: 8px; }
.qp-knum   { font-size: 30px; font-weight: 800; letter-spacing: -.02em; line-height: 1; color: #eaf1fb; }
.qp-ksub   { font-size: 10.5px; color: #9fb4d4; }

/* Authority coverage panel */
.qp-cover {
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 14px;
  box-shadow: 0 6px 18px rgba(15,38,71,.12);
}
.qp-cover--gap { background: linear-gradient(120deg,#1a1330,#13294d); border: 1px solid rgba(239,68,68,.45); }
.qp-cover--ok  { background: linear-gradient(120deg,#0f2d1a,#13294d); border: 1px solid rgba(34,197,94,.35); }
.qp-cover-lead { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 12px; }
.qp-cover-dot  { width: 10px; height: 10px; border-radius: 50%; margin-top: 3px; flex-shrink: 0; }
.qp-dot--gap   { background: #ef4444; box-shadow: 0 0 0 4px rgba(239,68,68,.2); }
.qp-dot--ok    { background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.2); }
.qp-cover-title { font-size: 13px; font-weight: 700; color: #eaf1fb; }
.qp-cover-sub   { font-size: 10.5px; color: #6f87ad; margin-top: 2px; }
.qp-cover-grid  { display: grid; grid-template-columns: repeat(5,1fr); gap: 10px; }
@media (max-width:900px) { .qp-cover-grid { grid-template-columns: repeat(3,1fr); } }
.qp-covcard       { border-radius: 10px; padding: 11px 12px; border: 1px solid #2c4d80; }
.qp-covcard--ok   { background: rgba(34,197,94,.08);  border-color: rgba(34,197,94,.3); }
.qp-covcard--gap  { background: rgba(239,68,68,.1);   border-color: rgba(239,68,68,.45); }
.qp-cov-name { font-size: 11.5px; font-weight: 700; color: #eaf1fb; margin-bottom: 6px; }
.qp-cov-ok   { color: #86efac; font-weight: 700; font-size: 11px; }
.qp-cov-gap  { color: #fca5a5; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; font-size: 10px; }

/* Filter toolbar */
.qp-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.qp-fbtn {
  background: #fff;
  border: 1px solid var(--bdr, #D6E4F0);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 11.5px;
  color: var(--text2, #4A6080);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: border-color .15s, background .15s, color .15s;
}
.qp-fbtn--act { border-color: #2563eb; color: #fff; background: #2563eb; }
.qp-cnt { background: rgba(0,0,0,.1); border-radius: 5px; padding: 0 5px; font-size: 10px; font-weight: 700; }
.qp-fbtn--act .qp-cnt { background: rgba(255,255,255,.25); }

/* Registry table */
.qp-tbl {
  background: #13294d;
  border: 1px solid #22406e;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(15,38,71,.14);
  margin-bottom: 10px;
}
.qp-thead, .qp-trow {
  display: grid;
  grid-template-columns: 1.6fr 1.9fr 1.7fr 1fr .7fr;
  gap: 12px;
  padding: 13px 16px;
  align-items: center;
}
.qp-thead {
  background: #0e234a;
  border-bottom: 1px solid #22406e;
  font-size: 9.5px;
  letter-spacing: .06em;
  color: #6f87ad;
  text-transform: uppercase;
  font-weight: 700;
  padding: 11px 16px;
}
.qp-trow { border-bottom: 1px solid #22406e; }
.qp-trow:last-child { border-bottom: none; }
.qp-trow:hover { background: #16315c; }
.qp-empty { padding: 32px 16px; text-align: center; color: #6f87ad; font-size: 13px; }

/* Person cell */
.qp-own  { display: flex; align-items: center; gap: 9px; }
.qp-oava { width: 28px; height: 28px; border-radius: 50%; background: #2c4d80; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #9fb4d4; flex-shrink: 0; }
.qp-oname { font-size: 12px; color: #eaf1fb; font-weight: 600; }
.qp-orole { font-size: 10px; color: #6f87ad; }

/* Scope tags */
.qp-scopes { display: flex; flex-wrap: wrap; gap: 5px; }
.qp-scope { font-size: 9.5px; font-weight: 600; color: #9fb4d4; background: #0e234a; border: 1px solid #2c4d80; border-radius: 5px; padding: 2px 7px; }
.qp-scope--all { background: rgba(37,99,235,.2); color: #93c5fd; border-color: rgba(37,99,235,.5); font-weight: 700; }

/* Basis */
.qp-basis { font-size: 10.5px; color: #9fb4d4; line-height: 1.45; }

/* Status badges */
.qp-status { display: inline-block; font-size: 9.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; padding: 3px 9px; border-radius: 6px; }
.qp-st-active   { background: rgba(34,197,94,.18);  color: #86efac; border: 1px solid rgba(34,197,94,.4); }
.qp-st-expiring { background: rgba(245,158,11,.18); color: #fcd34d; border: 1px solid rgba(245,158,11,.4); }
.qp-st-expired  { background: rgba(239,68,68,.18);  color: #fca5a5; border: 1px solid rgba(239,68,68,.45); }
.qp-exsub    { font-size: 10px; color: #6f87ad; margin-top: 4px; }
.qp-exsub--od { color: #fca5a5; font-weight: 700; }

/* Revoke/reactivate */
.qp-revoke { background: #fff; border: 1px solid var(--bdr, #D6E4F0); border-radius: 7px; padding: 5px 11px; font-size: 10.5px; font-weight: 600; color: var(--text2, #4A6080); cursor: pointer; transition: border-color .15s, color .15s; }
.qp-revoke:hover { border-color: #ef4444; color: #ef4444; }

/* Guard note */
.qp-guard { font-size: 9.5px; color: #92400e; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 9px 12px; margin-top: 2px; line-height: 1.5; }

/* Add form — scope toggles */
.qp-flabel { display: block; font-size: 10px; font-weight: 700; color: var(--text2, #4A6080); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
.qp-stoggle-row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 4px; }
.qp-stoggle { background: var(--panel-soft, #F4F8FD); border: 1px solid var(--bdr, #D6E4F0); border-radius: 7px; padding: 6px 11px; font-size: 11px; font-weight: 600; color: var(--text2, #4A6080); cursor: pointer; transition: all .15s; }
.qp-stoggle--on  { background: rgba(34,197,94,.1);  border-color: rgba(34,197,94,.5);  color: #166534; }
.qp-stoggle--full.qp-stoggle--on { background: rgba(37,99,235,.1); border-color: rgba(37,99,235,.5); color: #1e40af; }
`;
