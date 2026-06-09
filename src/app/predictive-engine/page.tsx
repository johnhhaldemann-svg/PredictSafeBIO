export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Brain, TrendingUp, TrendingDown, Minus, Clock, Gauge, Activity, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getSafetyForecast } from "@/lib/supabase/predictive-service";
import { pressureBandLabels, trendLabels, type PressureBand, type TrendDirection } from "@/lib/bio-ai/forecast";

export const metadata: Metadata = { title: "Predictive Engine – PredictSafeBIO" };

const BAND_CLASS: Record<PressureBand, string> = {
  low: "platform-green",
  elevated: "platform-blue",
  high: "platform-red",
  critical: "platform-red",
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
        <section className="command-card-grid" aria-label="Safety forecast">
          <article className={`command-card ${BAND_CLASS[forecast.band]}`}>
            <div><span><Gauge size={16} /></span><strong>Predicted pressure</strong></div>
            <small>{forecast.predictedPressure}</small>
            <em>{pressureBandLabels[forecast.band]} — composite of active leading indicators.</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><TrendIcon trend={forecast.trend} /></span><strong>Trend</strong></div>
            <small>{trendLabels[forecast.trend]}</small>
            <em>Recent 14 days vs. the prior 14 days.</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><Clock size={16} /></span><strong>Suggested review</strong></div>
            <small>within {forecast.horizonDays}d</small>
            <em>Sooner when predicted pressure is higher.</em>
          </article>
          <article className="command-card platform-blue">
            <div><span><Activity size={16} /></span><strong>Confidence</strong></div>
            <small>{forecast.confidence[0].toUpperCase() + forecast.confidence.slice(1)}</small>
            <em>{calibration.calibrated ? "Calibrated against outcomes." : "Uncalibrated — capped at moderate."}</em>
          </article>
        </section>

        {/* Signal breakdown */}
        <section className="command-card-grid" aria-label="Signal breakdown">
          <article className="command-card">
            <div><span><Activity size={16} /></span><strong>Leading indicators</strong></div>
            <small>{forecast.leadingIndicatorCount}</small>
            <em>Precursors feeding the forecast.</em>
          </article>
          <article className={`command-card ${forecast.earlyWarningCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><Brain size={16} /></span><strong>Early warnings</strong></div>
            <small>{forecast.earlyWarningCount}</small>
            <em>High-route / high-severity precursors.</em>
          </article>
          <article className={`command-card ${forecast.overdueCount > 0 ? "platform-red" : "platform-green"}`}>
            <div><span><Clock size={16} /></span><strong>Overdue verifications</strong></div>
            <small>{forecast.overdueCount}</small>
            <em>Controls past their verification date.</em>
          </article>
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
