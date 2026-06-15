export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Brain, TrendingUp, TrendingDown, Minus, Clock, Gauge, Activity, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getSafetyForecast } from "@/lib/supabase/predictive-service";
import { pressureBandLabels, trendLabels, type PressureBand, type TrendDirection } from "@/lib/bio-ai/forecast";

export const metadata: Metadata = { title: "Predictive Engine – PredictSafe" };

const BAND_CLASS: Record<PressureBand, string> = {
  low: "kpi-card--green",
  elevated: "kpi-card--blue",
  high: "kpi-card--amber",
  critical: "kpi-card--red",
};

function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === "rising") return <TrendingUp size={16} aria-hidden="true" />;
  if (trend === "falling") return <TrendingDown size={16} aria-hidden="true" />;
  return <Minus size={16} aria-hidden="true" />;
}

export default async function PredictiveEnginePage() {
  const { forecast, drivers, calibration } = await getSafetyForecast();

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Monitor · Predictive AI Safety Engine</p>
            <h1>Predictive Engine</h1>
            <p className="muted">
              Leading indicators from your hazards, controls, and exposure pathways rolled into a single{" "}
              <strong>predicted pressure</strong>, with a trend and a suggested review horizon. These
              are <strong>early indicators for human review</strong> — not validated incident forecasts.
            </p>
          </div>
        </header>

        {/* Forecast headline */}
        <section className="kpi-grid" aria-label="Safety forecast">
          <div className={`kpi-card ${BAND_CLASS[forecast.band]}`}>
            <div className="kpi-label">Predicted Pressure</div>
            <div className="kpi-value">{forecast.predictedPressure}</div>
            <div className="kpi-sub">{pressureBandLabels[forecast.band]}</div>
          </div>
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-label">Trend</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{trendLabels[forecast.trend]}</div>
            <div className="kpi-sub">14-day vs prior 14-day</div>
          </div>
          <div className="kpi-card kpi-card--purple">
            <div className="kpi-label">Review Horizon</div>
            <div className="kpi-value">{forecast.horizonDays}d</div>
            <div className="kpi-sub">Suggested review window</div>
          </div>
          <div className="kpi-card kpi-card--amber">
            <div className="kpi-label">Confidence</div>
            <div className="kpi-value" style={{ fontSize: 16 }}>{forecast.confidence[0].toUpperCase() + forecast.confidence.slice(1)}</div>
            <div className="kpi-sub">{calibration.calibrated ? "Calibrated" : "Uncalibrated"}</div>
          </div>
        </section>

        {/* Signal breakdown */}
        <section className="kpi-grid" aria-label="Signal breakdown">
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-label">Leading Indicators</div>
            <div className="kpi-value">{forecast.leadingIndicatorCount}</div>
            <div className="kpi-sub">Feeding the forecast</div>
          </div>
          <div className={`kpi-card ${forecast.earlyWarningCount > 0 ? "kpi-card--red" : "kpi-card--green"}`}>
            <div className="kpi-label">Early Warnings</div>
            <div className="kpi-value">{forecast.earlyWarningCount}</div>
            <div className="kpi-sub">High-route precursors</div>
          </div>
          <div className={`kpi-card ${forecast.overdueCount > 0 ? "kpi-card--amber" : "kpi-card--green"}`}>
            <div className="kpi-label">Overdue Verifications</div>
            <div className="kpi-value">{forecast.overdueCount}</div>
            <div className="kpi-sub">Controls past due date</div>
          </div>
          <div className="kpi-card kpi-card--purple">
            <div className="kpi-label">Signal Coverage</div>
            <div className="kpi-value">{forecast.leadingIndicatorCount > 0 ? "Active" : "None"}</div>
            <div className="kpi-sub">Leading indicator status</div>
          </div>
        </section>

        {/* Top drivers */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Top predicted drivers</p>
              <h2>What is pushing the forecast up</h2>
            </div>
          </div>
          {drivers.length === 0 ? (
            <p className="muted">
              No active leading indicators yet. As you add hazards, controls, and exposure pathways,
              the engine surfaces the signals driving predicted risk here.
            </p>
          ) : (
            <div className="action-list">
              {drivers.map((d, i) => (
                <article className="action-row" key={`${d.label}-${i}`}>
                  <div>
                    <strong>{d.label}</strong>
                    <small className="muted">
                      {d.severity[0].toUpperCase() + d.severity.slice(1)} severity
                      {d.earlyWarning ? " · early warning" : ""}
                      {d.overdueVerification ? " · verification overdue" : ""}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Calibration loop status */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Learning loop</p>
              <h2>Outcome calibration</h2>
            </div>
          </div>
          <p className="muted">
            The engine logs its predictions and compares them to what actually happens. Once{" "}
            <strong>{calibration.threshold}</strong> outcomes are confirmed, forecasts become
            calibrated and confidence can rise above moderate.
          </p>
          <p className="muted">
            Confirmed outcomes so far: <strong>{calibration.confirmedOutcomes}</strong> /{" "}
            {calibration.threshold}.{" "}
            {calibration.calibrated
              ? "Calibrated."
              : "Collecting baseline — forecasts are early indicators only."}
          </p>
        </section>

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Predictions support decisions — your team stays accountable</h2>
            <p className="muted">
              Predicted pressure and trend are decision support, not a guarantee that an incident
              will or will not occur. Until the calibration loop matures, treat every signal as an{" "}
              <strong>early indicator requiring human review</strong>. Act on the underlying hazards,
              controls, and exposures — not on the number alone.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
