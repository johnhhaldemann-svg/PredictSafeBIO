'use client';

/**
 * ControlInsights — Plan · Control Register · Insights & Recommendations
 * Three analytical panels:
 *   (1) Weak controls on high hazards
 *   (2) Recommended next control up the hierarchy (engine draft)
 *   (3) Residual risk acceptance / sign-off (links to Qualified Persons)
 */

import { useMemo } from 'react';
import Link from 'next/link';
import type { HazardControlState } from '@/lib/supabase/control-service';

/* ─── UI-only helpers ─────────────────────────────────────────────────────── */

type Tier = 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';
type RiskBand = 'green' | 'amber' | 'orange' | 'red';

const TIER_RANK: Record<Tier, number> = {
  ppe: 1, administrative: 2, engineering: 3, substitution: 4, elimination: 5,
};
const TIER_LABEL: Record<Tier, string> = {
  elimination: 'Elimination', substitution: 'Substitution', engineering: 'Engineering',
  administrative: 'Administrative', ppe: 'PPE',
};

function band(score: number): RiskBand {
  return score >= 9 ? 'red' : score >= 7 ? 'orange' : score >= 4 ? 'amber' : 'green';
}

function strongestTier(tiers: Tier[]): number {
  return tiers.length ? Math.max(...tiers.map((t) => TIER_RANK[t])) : 0;
}

function tierByRank(rank: number): Tier | undefined {
  return (Object.keys(TIER_RANK) as Tier[]).find((t) => TIER_RANK[t] === rank);
}

function recommendTier(state: HazardControlState): { tier: Tier; rationale: string } | null {
  const strongest = strongestTier(state.controlTiers as Tier[]);
  if (state.residual <= state.target && !state.raisedByOverdue) return null;
  const nextRank = Math.min(5, strongest + 1) as 1 | 2 | 3 | 4 | 5;
  const tier = tierByRank(nextRank)!;
  const rationale =
    strongest === 0
      ? `No controls on a hazard scoring ${state.inherent}. Add an ${TIER_LABEL[tier].toLowerCase()}-level control.`
      : `Residual ${state.residual} exceeds target ${state.target}. Strongest: ${TIER_LABEL[tierByRank(strongest)!].toLowerCase()}; upgrade to ${TIER_LABEL[tier].toLowerCase()}.`;
  return { tier, rationale };
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—';
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function ControlInsights({ hazards = [] }: { hazards?: HazardControlState[] }) {
  const weak = useMemo(
    () => hazards.filter((h) => h.inherent >= 7 && strongestTier(h.controlTiers as Tier[]) <= 2),
    [hazards],
  );
  const recs = useMemo(
    () =>
      hazards
        .map((h) => ({ h, rec: recommendTier(h) }))
        .filter((x) => x.rec) as { h: HazardControlState; rec: { tier: Tier; rationale: string } }[],
    [hazards],
  );
  const unaccepted = useMemo(() => hazards.filter((h) => !h.acceptedBy), [hazards]);

  if (hazards.length === 0) return null;

  return (
    <section aria-label="Control insights and recommendations">
      <style dangerouslySetInnerHTML={{ __html: CI_STYLES }} />

      <div className="ci-hd">
        <div className="ci-eyebrow">● Predictive Engine · Draft — Human Review Required</div>
        <h2>Control Insights &amp; Recommendations</h2>
        <p className="ci-sub">
          Engine output. Adequacy, recommendations, and residual acceptance must be confirmed by a
          qualified safety professional before any action is taken.
        </p>
      </div>

      <div className="ci-grid">

        {/* ── Weak controls on high hazards ── */}
        <div className="ci-card">
          <div className="ci-card-hd">
            <span className="ci-icn ci-icn--red">▲</span>
            Weak controls on high hazards
            <span className="ci-count">{weak.length}</span>
          </div>
          {weak.length === 0 ? (
            <div className="ci-empty">No high hazards rely on weak controls only.</div>
          ) : (
            weak.map((h) => {
              const st = strongestTier(h.controlTiers as Tier[]);
              const strongLabel = st > 0 ? TIER_LABEL[tierByRank(st)!] : null;
              return (
                <div className="ci-item" key={h.hazard}>
                  <div className="ci-name">{h.hazard}</div>
                  <div className="ci-meta">
                    Inherent <b className={`ci-band ci-band--${band(h.inherent)}`}>{h.inherent}</b>
                    {' · '}
                    {strongLabel
                      ? <>strongest: {strongLabel}</>
                      : <span className="ci-none">no controls</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Recommended next control ── */}
        <div className="ci-card">
          <div className="ci-card-hd">
            <span className="ci-icn ci-icn--blue">↑</span>
            Recommended next control
            <span className="ci-count">{recs.length}</span>
          </div>
          {recs.length === 0 ? (
            <div className="ci-empty">All hazards meet their residual target.</div>
          ) : (
            recs.map(({ h, rec }) => (
              <div className="ci-item" key={h.hazard}>
                <div className="ci-rc-top">
                  <span className="ci-name" style={{ marginBottom: 0 }}>{h.hazard}</span>
                  <span className={`ci-tier ci-tier--${rec.tier}`}>→ {TIER_LABEL[rec.tier]}</span>
                </div>
                <div className="ci-rationale">{rec.rationale}</div>
              </div>
            ))
          )}
        </div>

        {/* ── Residual acceptance ── */}
        <div className="ci-card">
          <div className="ci-card-hd">
            <span className={`ci-icn ${unaccepted.length ? 'ci-icn--amber' : 'ci-icn--green'}`}>✓</span>
            Residual acceptance
            <span className="ci-count">{hazards.length - unaccepted.length}/{hazards.length}</span>
          </div>
          {hazards.map((h) => (
            <div className="ci-item" key={h.hazard}>
              <div className="ci-name">{h.hazard}</div>
              {h.acceptedBy ? (
                <div className="ci-ok">
                  Accepted by <b>{h.acceptedBy}</b> · {fmt(h.acceptedOn)}
                  <div className="ci-ok-sub">re-review {fmt(h.reReviewDue)}</div>
                </div>
              ) : (
                <div className="ci-warn">
                  ⚠ Residual {h.residual} — needs qualified sign-off
                  <Link href="/plan/qualified-persons" className="ci-link">
                    Qualified Persons →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ─── Scoped styles (light-theme, app CSS vars) ──────────────────────────── */

const CI_STYLES = `
.ci-hd { margin-bottom: 14px; }
.ci-eyebrow { font-size: 10px; letter-spacing: .1em; color: #7c3aed; text-transform: uppercase; font-weight: 700; margin-bottom: 3px; }
.ci-hd h2 { font-size: 15px; font-weight: 700; color: var(--text); }
.ci-sub { font-size: 11.5px; color: var(--text2); margin-top: 3px; max-width: 640px; line-height: 1.5; }
.ci-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ci-card { background: var(--panel-soft); border: 1px solid var(--bdr); border-radius: 10px; padding: 14px 16px; }
.ci-card-hd { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
.ci-icn { width: 20px; height: 20px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
.ci-icn--red   { background: var(--red-bg);   color: var(--red); }
.ci-icn--blue  { background: var(--blue-bg);  color: var(--blue); }
.ci-icn--amber { background: var(--amber-bg); color: var(--amber); }
.ci-icn--green { background: var(--green-bg); color: var(--green); }
.ci-count { margin-left: auto; background: var(--blue-xs); color: var(--blue); border-radius: 5px; padding: 1px 8px; font-size: 10.5px; font-weight: 700; }
.ci-empty { font-size: 11px; color: var(--muted); padding: 6px 0; }
.ci-item { padding: 9px 0; border-bottom: 1px solid var(--line); }
.ci-item:last-child { border-bottom: none; }
.ci-name { font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.ci-meta { font-size: 11px; color: var(--text2); }
.ci-band { font-weight: 800; }
.ci-band--red    { color: var(--red-dk); }
.ci-band--orange { color: var(--orange); }
.ci-band--amber  { color: var(--amber-dk); }
.ci-band--green  { color: var(--green-dk); }
.ci-none { color: var(--red); font-weight: 700; }
.ci-rc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.ci-tier { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 5px; white-space: nowrap; }
.ci-tier--engineering   { background: #dbeafe; color: #1e40af; }
.ci-tier--substitution  { background: #d1fae5; color: #065f46; }
.ci-tier--elimination   { background: #bbf7d0; color: #14532d; }
.ci-tier--administrative { background: #fef3c7; color: #78350f; }
.ci-tier--ppe           { background: #fed7aa; color: #7c2d12; }
.ci-rationale { font-size: 11px; color: var(--text2); line-height: 1.5; }
.ci-ok { font-size: 11px; color: var(--green-dk); }
.ci-ok b { color: var(--text); }
.ci-ok-sub { font-size: 10.5px; color: var(--muted); margin-top: 2px; }
.ci-warn { font-size: 11px; color: var(--amber-dk); font-weight: 600; line-height: 1.6; }
.ci-link { display: block; color: var(--blue); font-weight: 700; margin-top: 1px; font-size: 11px; }
.ci-link:hover { text-decoration: underline; }
@media (max-width: 900px) {
  .ci-grid { grid-template-columns: 1fr; }
}
`;
