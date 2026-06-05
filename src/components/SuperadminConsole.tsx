"use client";

import { useState, useTransition } from "react";
import {
  Activity, AlertTriangle, BarChart2, CheckCircle2, Clock, Cpu,
  Database, FileCheck, FlaskConical, Lock, Play, RefreshCw, XCircle,
} from "lucide-react";
import {
  refreshDbStatsAction,
  runAdHocAssessmentAction,
  runAiEngineChecksAction,
  runPlatformChecksAction,
} from "@/app/admin/superadmin/actions";
import type { PlatformChecklistItem, PlatformData } from "@/lib/supabase/platform-service";
import type { AdHocAssessmentInput, AiEngineStatus, DbTableStat } from "@/lib/supabase/superadmin-service";
import type { BioAiAssessment } from "@/lib/bio-ai/types";
import { AiEngineMemoryExplorer } from "@/components/AiEngineMemoryExplorer";

type Props = {
  initialPlatform: PlatformData;
  initialAiEngine: AiEngineStatus;
  initialDbStats: DbTableStat[];
  fetchedAt: string;
};

const CATEGORY_COLORS: Record<DbTableStat["category"], string> = {
  core: "#2563eb", compliance: "#16a34a", ai: "#7c3aed", ops: "#ea580c",
};
const CATEGORY_LABELS: Record<DbTableStat["category"], string> = {
  core: "Core", compliance: "Compliance", ai: "AI / Assessment", ops: "Operations",
};

const SIGNAL_TYPE_OPTIONS = [
  "contamination_event", "biosafety_event", "deviation", "capa", "audit_finding",
  "data_integrity", "environmental_monitoring", "equipment_event", "training_gap",
  "sop_gap", "sample_chain_of_custody", "assay_qc",
];

function statusIcon(status: PlatformChecklistItem["status"]) {
  if (status === "pass") return <CheckCircle2 size={15} className="status-icon-pass" />;
  if (status === "fail") return <XCircle size={15} className="status-icon-fail" />;
  if (status === "warn") return <AlertTriangle size={15} className="status-icon-warn" />;
  return <Clock size={15} className="status-icon-unknown" />;
}
function statusClass(status: PlatformChecklistItem["status"]) {
  if (status === "pass") return "platform-check-pass";
  if (status === "fail") return "platform-check-fail";
  if (status === "warn") return "platform-check-warn";
  return "platform-check-unknown";
}
function timeLabel(iso: string | null) {
  if (!iso) return "not run yet";
  return new Date(iso).toLocaleString();
}

export function SuperadminConsole({ initialPlatform, initialAiEngine, initialDbStats, fetchedAt }: Props) {
  const [platform, setPlatform] = useState(initialPlatform);
  const [aiEngine, setAiEngine] = useState(initialAiEngine);
  const [dbStats, setDbStats] = useState(initialDbStats);

  const [platformRunAt, setPlatformRunAt] = useState<string | null>(fetchedAt);
  const [aiRunAt, setAiRunAt] = useState<string | null>(fetchedAt);
  const [dbRunAt, setDbRunAt] = useState<string | null>(fetchedAt);

  const [platformPending, startPlatform] = useTransition();
  const [aiPending, startAi] = useTransition();
  const [dbPending, startDb] = useTransition();
  const [adHocPending, startAdHoc] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [adHocResult, setAdHocResult] = useState<BioAiAssessment | null>(null);

  function exportReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      platform: { metrics: platform.metrics, security: platform.security, checklist: platform.checklist },
      aiEngine,
      dbStats,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform-health-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function runPlatform() {
    setError(null);
    startPlatform(async () => {
      const r = await runPlatformChecksAction();
      if (r.ok) { setPlatform(r.data); setPlatformRunAt(r.ranAt); } else setError(r.error);
    });
  }
  function runAi() {
    setError(null);
    startAi(async () => {
      const r = await runAiEngineChecksAction();
      if (r.ok) { setAiEngine(r.data); setAiRunAt(r.ranAt); } else setError(r.error);
    });
  }
  function runDb() {
    setError(null);
    startDb(async () => {
      const r = await refreshDbStatsAction();
      if (r.ok) { setDbStats(r.data); setDbRunAt(r.ranAt); } else setError(r.error);
    });
  }
  function runAdHoc(formData: FormData) {
    setError(null);
    const num = (k: string, d: number) => { const v = Number(formData.get(k)); return Number.isFinite(v) ? v : d; };
    const input: AdHocAssessmentInput = {
      area: String(formData.get("area") || "QC Lab"),
      workflow: String(formData.get("workflow") || "cell culture monitoring"),
      signalType: String(formData.get("signalType") || "contamination_event") as AdHocAssessmentInput["signalType"],
      signalLabel: String(formData.get("signalLabel") || "Ad-hoc test signal"),
      severity: num("severity", 4), likelihood: num("likelihood", 3), scope: num("scope", 3),
      controlGap: num("controlGap", 2), dataIntegrityConcern: num("dataIntegrityConcern", 1),
      controlEffectiveness: String(formData.get("controlEffectiveness") || "partial") as AdHocAssessmentInput["controlEffectiveness"],
      dataCompleteness: num("dataCompleteness", 0.85),
    };
    startAdHoc(async () => {
      const r = await runAdHocAssessmentAction(input);
      if (r.ok) setAdHocResult(r.data); else setError(r.error);
    });
  }

  const passCount = platform.checklist.filter((c) => c.status === "pass").length;
  const warnCount = platform.checklist.filter((c) => c.status === "warn").length;
  const failCount = platform.checklist.filter((c) => c.status === "fail").length;
  const dbMax = Math.max(...dbStats.map((s) => s.count), 1);
  const dbTotal = dbStats.reduce((sum, s) => sum + s.count, 0);
  const categoryTotals = dbStats.reduce(
    (acc, s) => { acc[s.category] = (acc[s.category] ?? 0) + s.count; return acc; },
    {} as Record<string, number>
  );

  return (
    <div className="page-stack">
      <header className="page-header">
        <div className="page-header-left">
          <p className="section-label">Superadmin Console</p>
          <h1>Platform · AI Engine · Database</h1>
          <p className="muted">Run live checks on demand. Each run is recorded in the audit log.</p>
        </div>
        <button className="button-secondary" onClick={exportReport}>
          <FileCheck size={14} /> Export report
        </button>
      </header>

      {error && (
        <section className="panel access-banner access-readonly">
          <strong><AlertTriangle size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Action failed</strong>
          <span>{error}</span>
        </section>
      )}

      {/* ── Section 1: Platform checks ─────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Platform operations</p>
            <h2>Configuration &amp; security checklist</h2>
            <p className="muted" style={{ fontSize: "0.72rem", margin: "0.25rem 0 0" }}>
              Last run: {timeLabel(platformRunAt)} · {passCount} pass · {warnCount} warn · {failCount} fail
            </p>
          </div>
          <button className="button-primary" onClick={runPlatform} disabled={platformPending}>
            <RefreshCw size={14} className={platformPending ? "spin" : undefined} />
            {platformPending ? "Running…" : "Run checks"}
          </button>
        </div>
        <div className="action-list">
          {platform.checklist.map((item) => (
            <article className={`action-row ${statusClass(item.status)}`} key={item.id}>
              <div>
                {statusIcon(item.status)}
                <strong>{item.label}</strong>
                <span className={
                  item.status === "pass" ? "status-current" :
                  item.status === "fail" ? "status-missing" :
                  item.status === "warn" ? "status-needs-review" : ""
                }>{item.status.toUpperCase()}</span>
              </div>
              <p>{item.detail}</p>
              {item.actionUrl && (
                <a className="text-link" href={item.actionUrl} target="_blank" rel="noopener noreferrer">
                  Open in Supabase →
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* RLS isolation */}
      <section className="panel">
        <div className="panel-heading">
          <div><p className="section-label">Data isolation</p><h2>Row-level security</h2></div>
          <Lock size={22} />
        </div>
        {platform.metrics.tablesWithoutRls === 0 ? (
          <div className="verification-pass-box">
            <strong>RLS enabled on all {platform.metrics.tablesWithRls} public tables</strong>
            <span>Organization data is fully isolated. No cross-org data leaks via the API.</span>
          </div>
        ) : (
          <div className="verification-pending-box">
            <strong>{platform.metrics.tablesWithoutRls} tables missing RLS</strong>
            <span>{platform.metrics.rlsTablesListed.join(", ")}</span>
          </div>
        )}
      </section>

      {/* ── Section 2: AI Engine ───────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">AI Engine</p>
            <h2>Engine health &amp; diagnostics</h2>
            <p className="muted" style={{ fontSize: "0.72rem", margin: "0.25rem 0 0" }}>
              Last run: {timeLabel(aiRunAt)} · {aiEngine.engineVersion}
            </p>
          </div>
          <button className="button-primary" onClick={runAi} disabled={aiPending}>
            <Play size={14} className={aiPending ? "spin" : undefined} />
            {aiPending ? "Running…" : "Run diagnostics"}
          </button>
        </div>

        <div className="psb-kpis" style={{ marginBottom: "1.25rem" }}>
          <div className="psb-kpi c-cyan">
            <div className="k-label">Engine Version</div>
            <div className="k-val" style={{ fontSize: 22 }}>{aiEngine.engineVersion.split("—")[0].trim()}</div>
            <div className="k-foot">deterministic engine</div>
          </div>
          <div className="psb-kpi c-purple">
            <div className="k-label">Risk Families</div>
            <div className="k-val">{aiEngine.riskFamiliesLoaded}</div>
            <div className="k-foot">loaded &amp; active</div>
          </div>
          <div className="psb-kpi c-green">
            <div className="k-label">Signal Types</div>
            <div className="k-val">{aiEngine.signalTypesSupported}</div>
            <div className="k-foot">supported inputs</div>
          </div>
          <div className="psb-kpi c-amber">
            <div className="k-label">Guardrails</div>
            <div className="k-val">{aiEngine.guardrailsActive}</div>
            <div className="k-foot">active · enforced</div>
          </div>
          <div className="psb-kpi c-orange">
            <div className="k-label">Source Artifacts</div>
            <div className="k-val">{aiEngine.sourceArtifactsLinked}</div>
            <div className="k-foot">linked references</div>
          </div>
        </div>

        <div className={aiEngine.smokeTestResult === "pass" ? "verification-pass-box" : "verification-pending-box"} style={{ marginBottom: "1.25rem" }}>
          <strong>Smoke test: {aiEngine.smokeTestResult === "pass" ? "✓ Engine functional" : "✗ Engine error — check logs"}</strong>
          <span>
            {aiEngine.smokeTestResult === "pass"
              ? `Returned score ${aiEngine.smokeTestScore} · level ${aiEngine.smokeTestLevel} · confidence ${aiEngine.smokeTestConfidence}. All guardrails and doNotClaim labels present.`
              : "assessBioRisk() threw an exception or returned an invalid result. Review engine.ts and risk-families.ts."}
          </span>
        </div>

        {/* Ad-hoc assessment runner */}
        <div className="panel-heading" style={{ marginBottom: "0.5rem" }}>
          <div><p className="section-label">Ad-hoc assessment</p><h3 style={{ fontSize: "0.9rem", fontWeight: 600, margin: 0 }}>Run the engine on a custom scenario</h3></div>
          <FlaskConical size={18} />
        </div>
        <form action={runAdHoc} className="form-grid" style={{ gap: "0.6rem" }}>
          <label>Area<input name="area" defaultValue="QC Lab" /></label>
          <label>Workflow<input name="workflow" defaultValue="cell culture monitoring" /></label>
          <label>Signal type
            <select name="signalType" defaultValue="contamination_event">
              {SIGNAL_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>Signal label<input name="signalLabel" defaultValue="Microbial excursion" /></label>
          <label>Severity (1-5)<input name="severity" type="number" min={1} max={5} defaultValue={4} /></label>
          <label>Likelihood (1-5)<input name="likelihood" type="number" min={1} max={5} defaultValue={3} /></label>
          <label>Scope (1-5)<input name="scope" type="number" min={1} max={5} defaultValue={3} /></label>
          <label>Control gap (1-5)<input name="controlGap" type="number" min={1} max={5} defaultValue={2} /></label>
          <label>Data integrity (1-5)<input name="dataIntegrityConcern" type="number" min={1} max={5} defaultValue={1} /></label>
          <label>Control effectiveness
            <select name="controlEffectiveness" defaultValue="partial">
              {["missing", "ineffective", "partial", "effective", "unknown"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Data completeness (0-1)<input name="dataCompleteness" type="number" min={0} max={1} step={0.05} defaultValue={0.85} /></label>
          <div className="onboarding-actions" style={{ alignSelf: "end" }}>
            <button className="button-secondary" type="submit" disabled={adHocPending}>
              <Play size={14} />{adHocPending ? "Running…" : "Run assessment"}
            </button>
          </div>
        </form>

        {adHocResult && (
          <div className="verification-pass-box" style={{ marginTop: "1rem" }}>
            <strong>Result — score {adHocResult.score} · {adHocResult.level} · confidence {adHocResult.confidence}</strong>
            <span>
              Human review {adHocResult.humanReviewRequired ? "required" : "not required"}
              {adHocResult.escalationRequired ? " · escalation required" : ""} · {adHocResult.recommendedActions.length} recommended action(s).
              {adHocResult.topDrivers.length > 0 && ` Top driver: ${adHocResult.topDrivers[0].label}.`}
            </span>
          </div>
        )}

        {/* Risk families */}
        <div className="panel-heading" style={{ margin: "1.25rem 0 0.5rem" }}>
          <div><p className="section-label">Loaded risk families</p><h3 style={{ fontSize: "0.9rem", fontWeight: 600, margin: 0 }}>{aiEngine.riskFamilies.length} families active</h3></div>
          <FlaskConical size={18} />
        </div>
        <div className="action-list">
          {aiEngine.riskFamilies.map((family) => (
            <article className="action-row platform-check-pass" key={family.id}>
              <div>
                <CheckCircle2 size={14} className="status-icon-pass" />
                <strong>{family.label}</strong>
                <span className="status-current" style={{ fontSize: "0.65rem" }}>
                  {family.signalTypes.length} signal{family.signalTypes.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p style={{ fontSize: "0.72rem" }}>Signals: {family.signalTypes.join(", ")} · Owners: {family.ownerRoles.join(", ")}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Section 3: Database map ─────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Database</p>
            <h2>Record distribution</h2>
            <p className="muted" style={{ fontSize: "0.72rem", margin: "0.25rem 0 0" }}>
              Last refreshed: {timeLabel(dbRunAt)} · {dbTotal.toLocaleString()} records
            </p>
          </div>
          <button className="button-primary" onClick={runDb} disabled={dbPending}>
            <RefreshCw size={14} className={dbPending ? "spin" : undefined} />
            {dbPending ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {(Object.keys(CATEGORY_LABELS) as DbTableStat["category"][]).map((cat) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--panel-soft)", borderRadius: 100, padding: "0.25rem 0.65rem", fontSize: "0.72rem", fontWeight: 600 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: CATEGORY_COLORS[cat], flexShrink: 0 }} />
              {CATEGORY_LABELS[cat]}
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{(categoryTotals[cat] ?? 0).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--panel-soft)", borderRadius: 100, padding: "0.25rem 0.65rem", fontSize: "0.72rem" }}>
            <Database size={10} /><strong>Total: {dbTotal.toLocaleString()} records</strong>
          </div>
        </div>

        <div style={{ padding: "0.25rem 0" }}>
          {dbStats.map((stat) => {
            const pct = dbMax > 0 ? Math.max(2, Math.round((stat.count / dbMax) * 100)) : 2;
            return (
              <div key={stat.table} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ width: "10rem", fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0, textAlign: "right" }}>{stat.label}</span>
                <div style={{ flex: 1, background: "var(--panel-soft)", borderRadius: 4, height: 16, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: CATEGORY_COLORS[stat.category], borderRadius: 4, transition: "width 0.3s ease" }} />
                </div>
                <span style={{ width: "3.5rem", fontSize: "0.72rem", fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{stat.count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 4: Engine memory explorer */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">AI Engine</p>
            <h2>Engine memory explorer</h2>
            <p className="muted" style={{ fontSize: "0.72rem", margin: "0.25rem 0 0" }}>
              Live read-only view of the engine built-in knowledge: risk model, families,
              guardrails, and core rules. Sourced directly from engine TypeScript files.
            </p>
          </div>
          <FileCheck size={22} />
        </div>
        <AiEngineMemoryExplorer />
      </section>

      <section className="panel">
        <p className="muted" style={{ fontSize: "0.72rem" }}>
          <Cpu size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Superadmin console — authorized operators only. All checks run against live production state.
          AI Engine results are draft — human review required before clinical or regulatory use.
          <Activity size={12} style={{ verticalAlign: "-2px", margin: "0 4px 0 8px" }} />
          <BarChart2 size={12} style={{ verticalAlign: "-2px" }} />
        </p>
      </section>
    </div>
  );
}
