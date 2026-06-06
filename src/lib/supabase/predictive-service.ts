/**
 * Predictive service (Phase 4) — reads the leading-indicator risk cells that
 * the registers produce and turns them into a forward-looking forecast.
 *
 * The forecast math lives in lib/bio-ai/forecast.ts (pure + unit-tested). This
 * file is the IO layer: read risk_cells, read calibration status, compose.
 */

import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { getActiveCells, type RiskCell } from "./risk-dashboard-service";
import {
  computeForecast,
  type ForecastSignal,
  type ForecastSeverity,
  type SafetyForecast,
} from "@/lib/bio-ai/forecast";

/** Number of confirmed outcomes required before forecasts count as calibrated. */
const CALIBRATION_THRESHOLD = 20;

export type PredictiveDriver = {
  label: string;
  cellType: string;
  severity: ForecastSeverity;
  earlyWarning: boolean;
  overdueVerification: boolean;
};

export type SafetyForecastResult = {
  forecast: SafetyForecast;
  drivers: PredictiveDriver[];
  calibration: {
    confirmedOutcomes: number;
    threshold: number;
    calibrated: boolean;
  };
};

function cellToSignal(cell: RiskCell): ForecastSignal {
  const payload = cell.payload ?? {};
  return {
    label: cell.label,
    cellType: cell.cellType,
    severity: cell.severity as ForecastSeverity,
    leadingIndicator: payload.leading_indicator === true || cell.cellType === "precursor_cell",
    earlyWarning: payload.early_warning === true,
    overdueVerification: payload.overdue_verification === true,
    aiScore: typeof payload.ai_score === "number" ? payload.ai_score : null,
    scoredAt:
      typeof payload.scored_at === "string" ? payload.scored_at : cell.updatedAt ?? cell.createdAt ?? null,
  };
}

async function countConfirmedOutcomes(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const ctx = await getProfileContext();
    if (!ctx) return 0;
    const supabase = await createSupabaseServerClient();
    const { count, error } = await supabase
      .from("prediction_outcomes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId)
      .neq("outcome", "pending");
    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getSafetyForecast(): Promise<SafetyForecastResult> {
  const [cells, confirmedOutcomes] = await Promise.all([
    getActiveCells().catch(() => [] as RiskCell[]),
    countConfirmedOutcomes(),
  ]);

  const calibrated = confirmedOutcomes >= CALIBRATION_THRESHOLD;
  const signals = cells.map(cellToSignal);
  const forecast = computeForecast(signals, { calibrated });

  const drivers: PredictiveDriver[] = cells
    .map((cell) => {
      const payload = cell.payload ?? {};
      return {
        label: cell.label,
        cellType: cell.cellType,
        severity: cell.severity as ForecastSeverity,
        earlyWarning: payload.early_warning === true,
        overdueVerification: payload.overdue_verification === true,
      };
    })
    .filter((d) => forecast.topDrivers.includes(d.label))
    .slice(0, 5);

  return {
    forecast,
    drivers,
    calibration: {
      confirmedOutcomes,
      threshold: CALIBRATION_THRESHOLD,
      calibrated,
    },
  };
}
