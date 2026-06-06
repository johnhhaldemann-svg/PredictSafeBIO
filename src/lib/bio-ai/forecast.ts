/**
 * Predictive forecast (Phase 4 — the engine's forward-looking layer).
 *
 * Pure, deterministic, side-effect-free. Turns the leading-indicator signals
 * produced by the registers (hazard precursors, residual-risk forecasts,
 * exposure early warnings) into a forward-looking "predicted pressure" with a
 * trend, a confidence level, and a suggested review horizon.
 *
 * HONESTY GUARDRAIL: until the calibration loop has enough confirmed outcomes,
 * `calibrated` is false and confidence is capped at "moderate". Outputs are
 * EARLY INDICATORS for a human to review — never validated incident forecasts.
 */

export type ForecastCellType =
  | "precursor_cell"
  | "control_cell"
  | "failure_cell"
  | "behavior_cell"
  | "event_cell"
  | "improvement_cell";

export type ForecastSeverity = "low" | "medium" | "high" | "critical";

export type ForecastSignal = {
  label?: string;
  cellType: ForecastCellType;
  severity: ForecastSeverity;
  leadingIndicator?: boolean;
  earlyWarning?: boolean;
  overdueVerification?: boolean;
  aiScore?: number | null;
  /** ISO timestamp the signal was last scored. Used for trend. */
  scoredAt?: string | null;
};

export type TrendDirection = "rising" | "stable" | "falling" | "not_enough_data";
export type ForecastConfidence = "low" | "moderate" | "high";
export type PressureBand = "low" | "elevated" | "high" | "critical";

export type SafetyForecast = {
  predictedPressure: number; // 0–100
  band: PressureBand;
  trend: TrendDirection;
  confidence: ForecastConfidence;
  /** Suggested review-by horizon in days — sooner when pressure is higher. */
  horizonDays: number;
  signalCount: number;
  leadingIndicatorCount: number;
  earlyWarningCount: number;
  overdueCount: number;
  calibrated: boolean;
  topDrivers: string[];
  asOf: string;
};

const SEVERITY_WEIGHT: Record<ForecastSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const CELL_WEIGHT: Record<ForecastCellType, number> = {
  failure_cell: 4,
  event_cell: 3,
  precursor_cell: 2,
  behavior_cell: 2,
  control_cell: 1,
  improvement_cell: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Contribution of a single signal to predicted pressure. */
export function signalContribution(signal: ForecastSignal): number {
  let c = SEVERITY_WEIGHT[signal.severity] * CELL_WEIGHT[signal.cellType];
  if (signal.earlyWarning) c += 3;
  if (signal.overdueVerification) c += 2;
  if (signal.leadingIndicator) c += 1;
  return c;
}

function bandFor(pressure: number): PressureBand {
  if (pressure >= 75) return "critical";
  if (pressure >= 50) return "high";
  if (pressure >= 25) return "elevated";
  return "low";
}

function horizonFor(band: PressureBand): number {
  switch (band) {
    case "critical":
      return 3;
    case "high":
      return 7;
    case "elevated":
      return 14;
    case "low":
    default:
      return 30;
  }
}

/**
 * Trend from comparing the most recent 14-day window to the prior 14 days.
 * Returns not_enough_data when the prior window is too sparse to compare.
 */
export function computeTrend(signals: ForecastSignal[], now: number = Date.now()): TrendDirection {
  let recent = 0;
  let prior = 0;
  let priorDated = 0;
  for (const s of signals) {
    if (!s.scoredAt) continue;
    const t = Date.parse(s.scoredAt);
    if (Number.isNaN(t)) continue;
    const ageDays = (now - t) / DAY_MS;
    const w = signalContribution(s);
    if (ageDays <= 14) recent += w;
    else if (ageDays <= 28) {
      prior += w;
      priorDated += 1;
    }
  }
  if (priorDated < 2) return "not_enough_data";
  if (recent > prior * 1.2) return "rising";
  if (recent < prior * 0.8) return "falling";
  return "stable";
}

function confidenceFor(signalCount: number, calibrated: boolean): ForecastConfidence {
  if (signalCount < 5) return "low";
  // Without a calibrated outcome loop, never claim high confidence.
  if (!calibrated) return "moderate";
  return signalCount >= 15 ? "high" : "moderate";
}

export function computeForecast(
  signals: ForecastSignal[],
  opts?: { calibrated?: boolean; now?: number }
): SafetyForecast {
  const now = opts?.now ?? Date.now();
  const calibrated = opts?.calibrated ?? false;

  const active = signals.filter((s) => s.cellType !== "improvement_cell");
  const raw = active.reduce((sum, s) => sum + signalContribution(s), 0);
  // Saturating scale: raw=25 → 50, raw=75 → 75. Keeps a single bad signal from maxing out.
  const predictedPressure = active.length === 0 ? 0 : Math.round((100 * raw) / (raw + 25));
  const band = bandFor(predictedPressure);

  const leadingIndicatorCount = signals.filter(
    (s) => s.leadingIndicator || s.cellType === "precursor_cell"
  ).length;
  const earlyWarningCount = signals.filter((s) => s.earlyWarning).length;
  const overdueCount = signals.filter((s) => s.overdueVerification).length;

  const topDrivers = [...active]
    .sort((a, b) => signalContribution(b) - signalContribution(a))
    .map((s) => s.label)
    .filter((l): l is string => Boolean(l))
    .slice(0, 5);

  return {
    predictedPressure,
    band,
    trend: computeTrend(signals, now),
    confidence: confidenceFor(active.length, calibrated),
    horizonDays: horizonFor(band),
    signalCount: signals.length,
    leadingIndicatorCount,
    earlyWarningCount,
    overdueCount,
    calibrated,
    topDrivers,
    asOf: new Date(now).toISOString(),
  };
}

export const pressureBandLabels: Record<PressureBand, string> = {
  low: "Low",
  elevated: "Elevated",
  high: "High",
  critical: "Critical",
};

export const trendLabels: Record<TrendDirection, string> = {
  rising: "Rising",
  stable: "Stable",
  falling: "Falling",
  not_enough_data: "Not enough data",
};
