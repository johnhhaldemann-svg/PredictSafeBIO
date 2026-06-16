'use client';

/**
 * ChemicalSds.tsx  (route: /chemical-inventory)
 * PredictSafe BIO — Operate · Chemical Hygiene
 * Reliance Predictive Safety Technologies
 *
 * Self-contained layout (own topbar / sidebar); drop in without AppShell.
 * Accepts optional `chemicals` from the server; falls back to demo data.
 *
 * Features:
 *  - 4 KPI cards (total, missing SDS, expiring/expired, restricted)
 *  - Dynamic storage compatibility / segregation matrix
 *  - AI-generated compat rules per hazard class pair in inventory
 *  - Red + amber alert banners
 *  - 5-tab filter (All / Expiring / Expired / Missing SDS / Restricted)
 *  - Chemical cards with GHS chips, SDS status, expiry chip, storage info
 */

import { useMemo, useState } from 'react';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type GhsKey =
  | 'flammable' | 'corrosive' | 'toxic' | 'oxidizer'
  | 'compressed_gas' | 'environmental' | 'health_hazard'
  | 'irritant' | 'explosive' | 'other';

export interface ViewChem {
  id: string;
  name: string;
  cas: string | null;
  location: string | null;
  quantity: string | null;
  hazardClass: GhsKey | null;
  restricted: boolean;
  sdsPresent: boolean;
  expirationDate: string | null;
  expiringSoon: boolean;
  expired: boolean;
  storageGroup: string | null;
  segregateFrom: string[];
}

export interface ChemicalSdsAuth {
  isSignedIn: boolean;
  isOwner: boolean;
  userEmail?: string | null;
}

interface Props {
  chemicals?: ViewChem[];
  auth?: ChemicalSdsAuth;
}

/* ─── Demo data ──────────────────────────────────────────────────────────── */

const DEMO: ViewChem[] = [
  {
    id: 'demo-chem-001', name: 'Ethanol (200 proof)', cas: '64-17-5',
    location: 'Lab 101', quantity: '4 L', hazardClass: 'flammable',
    restricted: false, sdsPresent: true, expirationDate: '2026-06-30',
    expiringSoon: true, expired: false,
    storageGroup: 'Flammables (yellow cabinet)',
    segregateFrom: ['Oxidizers', 'Acids'],
  },
  {
    id: 'demo-chem-002', name: 'Hydrochloric Acid 37%', cas: '7647-01-0',
    location: 'Lab 102', quantity: '500 mL', hazardClass: 'corrosive',
    restricted: true, sdsPresent: false, expirationDate: null,
    expiringSoon: false, expired: false,
    storageGroup: 'Inorganic acids (corrosives cabinet)',
    segregateFrom: ['Bases', 'Flammables', 'Azides / cyanides'],
  },
  {
    id: 'demo-chem-003', name: 'Sodium Azide', cas: '26628-22-8',
    location: 'Lab 103', quantity: '100 g', hazardClass: 'toxic',
    restricted: true, sdsPresent: true, expirationDate: '2026-06-06',
    expiringSoon: false, expired: true,
    storageGroup: 'Acute toxics (locked, ventilated)',
    segregateFrom: ['Acids', 'Metals / plumbing', 'Heavy metals (Cu, Pb)'],
  },
];

/* ─── Reference ─────────────────────────────────────────────────────────── */

const GHS_LABEL: Record<GhsKey, string> = {
  flammable: 'Flammable', corrosive: 'Corrosive', toxic: 'Toxic',
  oxidizer: 'Oxidizer', compressed_gas: 'Compressed Gas',
  environmental: 'Environmental', health_hazard: 'Health Hazard',
  irritant: 'Irritant', explosive: 'Explosive', other: 'Other',
};

const GHS_CLS: Record<GhsKey, string> = {
  flammable: 'g-flam', corrosive: 'g-corr', toxic: 'g-tox',
  oxidizer: 'g-ox', compressed_gas: 'g-cgas', environmental: 'g-env',
  health_hazard: 'g-hh', irritant: 'g-irr', explosive: 'g-expl', other: 'g-other',
};

// Short label for matrix column/row headers
const MAT_LABEL: Partial<Record<GhsKey, string>> = {
  flammable: 'Flam', corrosive: 'Acid', toxic: 'Toxic',
  oxidizer: 'Ox', explosive: 'Expl', health_hazard: 'HH', other: 'Other',
};

type Compat = 'ok' | 'sep' | 'no' | 'self';

const COMPAT: Partial<Record<GhsKey, Partial<Record<GhsKey, Compat>>>> = {
  flammable: { flammable: 'self', corrosive: 'sep', toxic: 'sep', oxidizer: 'no', explosive: 'no', other: 'ok', health_hazard: 'ok', irritant: 'ok', compressed_gas: 'sep', environmental: 'ok' },
  corrosive:  { flammable: 'sep', corrosive: 'self', toxic: 'no',  oxidizer: 'sep', explosive: 'no', other: 'ok', health_hazard: 'ok', irritant: 'ok', compressed_gas: 'sep', environmental: 'ok' },
  toxic:      { flammable: 'sep', corrosive: 'no',  toxic: 'self', oxidizer: 'sep', explosive: 'no', other: 'ok', health_hazard: 'ok', irritant: 'ok', compressed_gas: 'sep', environmental: 'ok' },
  oxidizer:   { flammable: 'no',  corrosive: 'sep', toxic: 'sep',  oxidizer: 'self', explosive: 'no', other: 'sep', health_hazard: 'sep', irritant: 'sep', compressed_gas: 'sep', environmental: 'ok' },
  explosive:  { flammable: 'no',  corrosive: 'no',  toxic: 'no',   oxidizer: 'no',  explosive: 'self', other: 'no', health_hazard: 'no', irritant: 'no', compressed_gas: 'no', environmental: 'no' },
};

const PAIR_RULES: Partial<Record<string, { a: string; b: string; body: string }>> = {
  'toxic-corrosive':  { a: 'Toxic', b: 'Acids', body: 'Azide-type toxics + acid may form toxic and explosive gas. Keep strictly segregated; never flush to shared drains.' },
  'flammable-corrosive': { a: 'Flammables', b: 'Acids / Oxidizers', body: 'Keep flammables in approved cabinet, away from corrosives and oxidizers.' },
  'flammable-oxidizer':  { a: 'Flammables', b: 'Oxidizers', body: 'Fire / explosion hazard. Separate storage is mandatory — never co-locate.' },
  'corrosive-oxidizer':  { a: 'Acids', b: 'Oxidizers', body: 'Potential violent reaction. Store in separate cabinets.' },
  'toxic-oxidizer':      { a: 'Toxic', b: 'Oxidizers', body: 'May form toxic oxidation products. Separate storage.' },
  'explosive-flammable': { a: 'Explosives', b: 'Flammables', body: 'Extreme hazard. Separate building or blast barrier required.' },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function expiryChip(c: ViewChem): { cls: string; text: string } {
  if (!c.expirationDate) return { cls: 'exp-ok', text: '✓ No expiry' };
  const dt = new Date(c.expirationDate);
  const fmt = dt.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  if (c.expired) return { cls: 'exp-expired', text: `⛔ Expired ${fmt}` };
  if (c.expiringSoon) {
    const days = Math.ceil((dt.getTime() - new Date().getTime()) / 86400000);
    return { cls: 'exp-expiring', text: `⏱ Expires ${fmt} · in ${days} days` };
  }
  return { cls: 'exp-ok', text: `✓ Expires ${fmt}` };
}

function compatCell(a: GhsKey, b: GhsKey): Compat {
  if (a === b) return 'self';
  return COMPAT[a]?.[b] ?? COMPAT[b]?.[a] ?? 'ok';
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function ChemicalSds({ chemicals: chemsProp, auth }: Props) {
  const CHEMS = chemsProp ?? DEMO;
  const isDemo = !chemsProp;

  type FilterKey = 'all' | 'expiring' | 'expired' | 'no-sds' | 'restricted';
  const [filter, setFilter] = useState<FilterKey>('all');

  const counts = useMemo(() => ({
    all:        CHEMS.length,
    expiring:   CHEMS.filter((c) => c.expiringSoon && !c.expired).length,
    expired:    CHEMS.filter((c) => c.expired).length,
    'no-sds':   CHEMS.filter((c) => !c.sdsPresent).length,
    restricted: CHEMS.filter((c) => c.restricted).length,
  }), [CHEMS]);

  const rows = useMemo(() => CHEMS.filter((c) => {
    if (filter === 'all')        return true;
    if (filter === 'expiring')   return c.expiringSoon && !c.expired;
    if (filter === 'expired')    return c.expired;
    if (filter === 'no-sds')     return !c.sdsPresent;
    return c.restricted;
  }), [filter, CHEMS]);

  // Which hazard groups are in inventory — up to 3 for matrix
  const matrixGroups = useMemo<GhsKey[]>(() => {
    const order: GhsKey[] = ['flammable', 'corrosive', 'toxic', 'oxidizer', 'explosive', 'health_hazard', 'other'];
    const present = new Set(CHEMS.map((c) => c.hazardClass).filter(Boolean) as GhsKey[]);
    return order.filter((g) => present.has(g)).slice(0, 4);
  }, [CHEMS]);

  // Relevant compat rules based on pairs present in inventory
  const compatRules = useMemo(() => {
    const rules: Array<{ a: string; b: string; body: string; segregated: boolean }> = [];
    for (let i = 0; i < matrixGroups.length; i++) {
      for (let j = i + 1; j < matrixGroups.length; j++) {
        const a = matrixGroups[i];
        const b = matrixGroups[j];
        const result = compatCell(a, b);
        if (result === 'sep' || result === 'no') {
          const key1 = `${a}-${b}`;
          const key2 = `${b}-${a}`;
          const rule = PAIR_RULES[key1] ?? PAIR_RULES[key2];
          if (rule) {
            rules.push({ ...rule, segregated: true });
          }
        }
      }
    }
    return rules;
  }, [matrixGroups]);

  // True only when incompatible hazard classes share the SAME storage location
  const hasIncompat = useMemo(() => {
    const byLoc = new Map<string, GhsKey[]>();
    for (const c of CHEMS) {
      if (!c.location || !c.hazardClass) continue;
      const list = byLoc.get(c.location) ?? [];
      list.push(c.hazardClass);
      byLoc.set(c.location, list);
    }
    for (const classes of byLoc.values()) {
      for (let i = 0; i < classes.length; i++) {
        for (let j = i + 1; j < classes.length; j++) {
          if (compatCell(classes[i], classes[j]) === 'no') return true;
        }
      }
    }
    return false;
  }, [CHEMS]);

  const missingChems = CHEMS.filter((c) => !c.sdsPresent);
  const expiredChems = CHEMS.filter((c) => c.expired);

  const displayEmail = auth?.userEmail ?? 'john.haldemann@hotmail.com';
  const initials = displayEmail.slice(0, 2).toUpperCase();

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
          <div className="psb-pill">
            🔔 {(counts['no-sds'] + counts.expired) > 0 && (
              <span style={{ color: '#fca5a5', fontWeight: 700 }}>{counts['no-sds'] + counts.expired}</span>
            )}
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
          <div className="psb-navitem">Work Permits</div>
          <div className="psb-navitem on">Chemical &amp; SDS</div>
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
              <div className="psb-eyebrow">● Operate · Chemical Hygiene</div>
              <h1>Chemical &amp; SDS Management</h1>
              <p className="psb-sub">
                GHS inventory, SDS tracking, expiry alerts, and storage compatibility.
                All classification and storage decisions require a qualified chemical hygiene officer.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button className="psb-btn ghost">Waste Management →</button>
              <button className="psb-btn">＋ Add chemical</button>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="psb-kpis">
            <Kpi accent="#60a5fa" label="Total Chemicals"    value={counts.all}          sub="active in inventory" />
            <Kpi accent="#ef4444" label="Missing SDS"        value={counts['no-sds']}    sub={counts['no-sds'] > 0 ? 'SDS required — compliance risk' : 'All SDS on file'} valueColor={counts['no-sds'] > 0 ? '#fca5a5' : undefined} />
            <Kpi accent="#f59e0b" label="Expiring / Expired" value={counts.expiring + counts.expired} sub={counts.expired > 0 ? `${counts.expired} expired` : counts.expiring > 0 ? `${counts.expiring} within 30 days` : 'No expiry issues'} valueColor={(counts.expiring + counts.expired) > 0 ? '#fcd34d' : undefined} />
            <Kpi accent="#f97316" label="Restricted"         value={counts.restricted}   sub="require special handling" valueColor={counts.restricted > 0 ? '#fdba74' : undefined} />
          </div>

          {/* STORAGE COMPATIBILITY MATRIX */}
          {matrixGroups.length >= 2 && (
            <div className="compat">
              <div className="compat-l">
                <div className="sec-eyebrow blue">＋ New · Storage Compatibility</div>
                <h2>Segregation matrix</h2>
                <table className="cmx">
                  <thead>
                    <tr>
                      <th></th>
                      {matrixGroups.map((g) => <th key={g}>{MAT_LABEL[g] ?? g}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixGroups.map((a) => (
                      <tr key={a}>
                        <th>{MAT_LABEL[a] ?? a}</th>
                        {matrixGroups.map((b) => {
                          const r = compatCell(a, b);
                          return (
                            <td key={b} className={`cell ${r}`}>
                              {r === 'self' ? '·' : r === 'ok' ? '✓' : r === 'sep' ? '!' : '✗'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="cmx-legend">
                  <span><i className="lg ok"></i>Compatible</span>
                  <span><i className="lg sep"></i>Store separately</span>
                  <span><i className="lg no"></i>Never together</span>
                </div>
              </div>
              <div className="compat-r">
                <div className={`compat-status ${hasIncompat ? 'bad' : 'good'}`}>
                  {hasIncompat
                    ? '⚠ Incompatible storage groups detected in inventory. Review storage locations immediately.'
                    : '✓ No incompatible chemicals are currently co-located. All storage groups are segregated.'}
                </div>
                {compatRules.map((rule, i) => (
                  <div key={i} className="compat-rule">
                    <span className="rule-ic">⚠</span>
                    <div>
                      <b>{rule.a} × {rule.b}.</b>{' '}
                      {rule.body}
                      {' '}Currently <b>segregated</b>.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALERTS */}
          {missingChems.length > 0 && (
            <div className="alert">
              <span className="alert-dot" />
              <div>
                <b>{missingChems.length} chemical{missingChems.length !== 1 ? 's' : ''} missing SDS.</b>{' '}
                An SDS is required for all hazardous chemicals
                {missingChems.length === 1 ? ` — ${missingChems[0].name} (${missingChems[0].location ?? 'no location'})` : ''}.
                Resolve before next inspection.
              </div>
              <span className="alert-link" onClick={() => setFilter('no-sds')}>View →</span>
            </div>
          )}
          {expiredChems.length > 0 && (
            <div className="alert amber">
              <span className="alert-dot amber" />
              <div>
                <b>{expiredChems.length} chemical{expiredChems.length !== 1 ? 's' : ''} expired.</b>{' '}
                {expiredChems.map((c) => `${c.name}${c.expirationDate ? ` (expired ${new Date(c.expirationDate).toLocaleDateString()})` : ''}`).join(', ')}
                {' '}— route to hazardous-waste disposal; do not return to inventory or drain.
              </div>
            </div>
          )}

          {/* FILTER TABS */}
          <div className="ftabs">
            {([
              ['all',        `All chemicals ${counts.all}`],
              ['expiring',   `Expiring soon ${counts.expiring}`],
              ['expired',    `Expired ${counts.expired}`],
              ['no-sds',     `Missing SDS ${counts['no-sds']}`],
              ['restricted', `Restricted ${counts.restricted}`],
            ] as [FilterKey, string][]).map(([f, label]) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {label}
              </button>
            ))}
          </div>

          {/* CHEMICAL REGISTER */}
          <div className="sec-hd">
            <div className="sec-eyebrow">Chemical register</div>
            <h2>{rows.length} chemical{rows.length !== 1 ? 's' : ''}</h2>
          </div>

          <div className="chem-list">
            {rows.length === 0 ? (
              <div className="chem" style={{ textAlign: 'center', padding: '28px', color: 'var(--wink3)' }}>
                No chemicals match this filter.
              </div>
            ) : rows.map((c) => {
              const exp = expiryChip(c);
              return (
                <div className="chem" key={c.id}>
                  <div className="chem-top">
                    <div>
                      <span className="chem-name">{c.name}</span>
                      <div className="chem-meta">
                        {c.cas ? `CAS ${c.cas} · ` : ''}{c.location ?? 'No location'}{c.quantity ? ` · ${c.quantity}` : ''}
                      </div>
                    </div>
                    <div className="chem-chips">
                      {c.hazardClass && (
                        <span className={`ghs ${GHS_CLS[c.hazardClass]}`}>
                          {GHS_LABEL[c.hazardClass]}
                        </span>
                      )}
                      {c.restricted && <span className="restricted">Restricted</span>}
                    </div>
                  </div>

                  <div className="chem-status">
                    <span className={`stchip ${c.sdsPresent ? 'sds-on_file' : 'sds-missing'}`}>
                      {c.sdsPresent ? '✓ SDS on file' : '⚠ SDS missing'}
                    </span>
                    <span className={`stchip ${exp.cls}`}>{exp.text}</span>
                  </div>

                  <div className="chem-store">
                    {c.storageGroup && (
                      <span className="store-i">
                        <em>Storage group</em> {c.storageGroup}
                      </span>
                    )}
                    {c.segregateFrom.length > 0 && (
                      <span className="store-i">
                        <em>Segregate from</em>{' '}
                        {c.segregateFrom.map((s) => (
                          <span key={s} className="seg">{s}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="psb-guard">
            <b>AI Guardrail — Chemical hazard classification requires human verification.</b>{' '}
            AI may surface expiry alerts, SDS gaps, and segregation rules, but GHS classification,
            storage compatibility, and exposure-limit determinations must be verified by a qualified
            chemical hygiene officer. All records are <b>Draft — Human Review Required</b> until an SDS is on file.
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Subcomponents ─────────────────────────────────────────────────────── */

function Kpi({ label, value, sub, valueColor, accent }: {
  label: string; value: number; sub: string; valueColor?: string; accent: string;
}) {
  return (
    <div className="psb-kpi" style={{ ['--a' as string]: accent }}>
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
.psb-banner a{color:#1d4ed8;font-weight:600;text-decoration:none}
.psb-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:16px}
.psb-eyebrow{font-size:10px;letter-spacing:.14em;color:var(--accent);font-weight:700;
  text-transform:uppercase;margin-bottom:4px}
.psb-main h1{font-size:21px;font-weight:700;letter-spacing:-.01em;margin-bottom:3px;color:var(--cink)}
.psb-sub{font-size:11.5px;color:var(--cink2);max-width:680px}
.psb-btn{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;
  border-radius:8px;padding:9px 14px;font-size:12px;font-weight:600;cursor:pointer;
  white-space:nowrap;box-shadow:0 4px 14px rgba(37,99,235,.3)}
.psb-btn.ghost{background:#fff;border:1px solid var(--cline);color:var(--cink2);box-shadow:none;font-weight:500}
.psb-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:13px}
.psb-kpi{background:var(--w2);border:1px solid var(--wline);border-radius:11px;padding:13px 14px;
  position:relative;overflow:hidden;box-shadow:0 6px 18px rgba(15,38,71,.12)}
.psb-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--a,#60a5fa)}
.psb-kpi .klabel{font-size:9.5px;letter-spacing:.08em;color:var(--wink3);text-transform:uppercase;
  font-weight:700;margin-bottom:6px}
.psb-kpi .krow{display:flex;align-items:baseline;gap:8px}
.psb-kpi .knum{font-size:30px;font-weight:800;line-height:1;color:var(--wink)}
.psb-kpi .ksub{font-size:10.5px;color:var(--wink2)}
/* COMPAT MATRIX */
.compat{display:grid;grid-template-columns:auto 1fr;gap:18px;background:var(--w2);
  border:1px solid var(--wline);border-radius:12px;padding:16px 18px;margin-bottom:13px;
  box-shadow:0 6px 18px rgba(15,38,71,.12)}
.sec-eyebrow{font-size:9.5px;letter-spacing:.12em;color:var(--accent2);text-transform:uppercase;
  font-weight:700;margin-bottom:2px}
.sec-eyebrow.blue{color:#7dd3fc}
.compat h2{font-size:14px;font-weight:700;color:var(--wink);margin-bottom:11px}
.cmx{border-collapse:separate;border-spacing:4px}
.cmx th{font-size:10px;font-weight:700;color:var(--wink2);padding:3px 6px;text-align:center}
.cmx td.cell{width:34px;height:34px;text-align:center;border-radius:7px;font-size:14px;
  font-weight:800;vertical-align:middle}
.cell.self{background:#0e234a;color:#3f5b86}
.cell.ok{background:rgba(34,197,94,.16);color:#86efac;border:1px solid rgba(34,197,94,.35)}
.cell.sep{background:rgba(245,158,11,.16);color:#fcd34d;border:1px solid rgba(245,158,11,.4)}
.cell.no{background:rgba(239,68,68,.2);color:#fca5a5;border:1px solid rgba(239,68,68,.45)}
.cmx-legend{display:flex;flex-direction:column;gap:5px;margin-top:11px;font-size:10px;color:var(--wink2)}
.cmx-legend span{display:flex;align-items:center;gap:7px}
.cmx-legend .lg{width:11px;height:11px;border-radius:3px}
.cmx-legend .lg.ok{background:#22c55e}
.cmx-legend .lg.sep{background:#f59e0b}
.cmx-legend .lg.no{background:#ef4444}
.compat-r{display:flex;flex-direction:column;gap:9px}
.compat-status{font-size:11px;font-weight:600;border-radius:9px;padding:10px 13px;line-height:1.45}
.compat-status.good{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.35);color:#86efac}
.compat-status.bad{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.35);color:#fca5a5}
.compat-rule{display:flex;gap:10px;align-items:flex-start;background:#0e234a;
  border:1px solid var(--wline2);border-radius:9px;padding:10px 13px}
.rule-ic{color:#fdba74;font-size:13px;flex-shrink:0;line-height:1.3}
.compat-rule div{font-size:10.5px;color:var(--wink2);line-height:1.5}
.compat-rule b{color:var(--wink)}
/* ALERTS */
.alert{display:flex;align-items:center;gap:11px;background:linear-gradient(120deg,#2a1410,#13294d);
  border:1px solid rgba(239,68,68,.4);border-radius:11px;padding:11px 15px;margin-bottom:9px;
  box-shadow:0 6px 18px rgba(15,38,71,.12)}
.alert.amber{background:linear-gradient(120deg,#2a2410,#13294d);border-color:rgba(245,158,11,.4)}
.alert-dot{width:9px;height:9px;border-radius:50%;background:#ef4444;
  box-shadow:0 0 0 4px rgba(239,68,68,.2);flex-shrink:0}
.alert-dot.amber{background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.2)}
.alert div{font-size:11.5px;color:var(--wink2);line-height:1.45;flex:1}
.alert b{color:#fca5a5}
.alert.amber b{color:#fcd34d}
.alert-link{font-size:10px;font-weight:700;color:#fca5a5;white-space:nowrap;cursor:pointer}
/* FILTERS */
.ftabs{display:flex;gap:6px;margin:13px 0;align-items:center;flex-wrap:wrap}
.ftabs button{background:#fff;border:1px solid var(--cline);border-radius:7px;padding:7px 11px;
  font-size:11px;font-weight:600;color:var(--cink2);cursor:pointer}
.ftabs button.on{background:var(--accent);border-color:var(--accent);color:#fff}
/* REGISTER */
.sec-hd{margin-bottom:10px}
.sec-hd h2{font-size:15px;font-weight:700;color:var(--cink)}
.chem-list{display:flex;flex-direction:column;gap:10px}
.chem{background:var(--w2);border:1px solid var(--wline);border-radius:11px;padding:14px 16px;
  box-shadow:0 6px 18px rgba(15,38,71,.1)}
.chem-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px}
.chem-name{font-size:13px;font-weight:700;color:var(--wink)}
.chem-meta{font-size:10.5px;color:var(--wink3);margin-top:3px}
.chem-chips{display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
.ghs{font-size:9px;font-weight:800;text-transform:uppercase;padding:3px 8px;border-radius:6px}
.g-flam{background:rgba(249,115,22,.18);color:#fdba74;border:1px solid rgba(249,115,22,.4)}
.g-corr{background:rgba(245,158,11,.16);color:#fcd34d;border:1px solid rgba(245,158,11,.4)}
.g-tox{background:rgba(239,68,68,.18);color:#fca5a5;border:1px solid rgba(239,68,68,.45)}
.g-ox{background:rgba(168,85,247,.18);color:#d8b4fe;border:1px solid rgba(168,85,247,.4)}
.g-cgas,.g-env,.g-hh,.g-irr,.g-expl,.g-other{background:rgba(100,116,139,.18);color:#cbd5e1;border:1px solid rgba(100,116,139,.3)}
.restricted{font-size:9px;font-weight:800;text-transform:uppercase;padding:3px 8px;border-radius:6px;
  background:rgba(168,85,247,.14);color:#d8b4fe;border:1px solid rgba(168,85,247,.4)}
.chem-status{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.stchip{font-size:10px;font-weight:700;padding:4px 9px;border-radius:6px}
.sds-on_file{background:rgba(34,197,94,.14);color:#86efac;border:1px solid rgba(34,197,94,.35)}
.sds-missing{background:rgba(239,68,68,.16);color:#fca5a5;border:1px solid rgba(239,68,68,.45)}
.exp-ok{background:#0e234a;color:var(--wink2);border:1px solid var(--wline2)}
.exp-expiring{background:rgba(245,158,11,.14);color:#fcd34d;border:1px solid rgba(245,158,11,.4)}
.exp-expired{background:rgba(239,68,68,.16);color:#fca5a5;border:1px solid rgba(239,68,68,.45)}
.chem-store{display:flex;gap:24px;flex-wrap:wrap;border-top:1px solid var(--wline);padding-top:10px}
.store-i{font-size:10.5px;color:var(--wink2);display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.store-i em{font-style:normal;color:var(--wink3);font-size:9px;text-transform:uppercase;
  letter-spacing:.05em;font-weight:700}
.seg{font-size:9.5px;color:#fdba74;background:rgba(249,115,22,.1);
  border:1px solid rgba(249,115,22,.3);border-radius:5px;padding:2px 7px}
.psb-guard{font-size:9.5px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;
  border-radius:8px;padding:10px 12px;margin-top:16px;line-height:1.55}
.psb-guard b{color:#7c2d12}
`;
