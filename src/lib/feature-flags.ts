export const featureFlags = {
  llmDraftAssist: process.env.NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST === "true",
  riskCells: process.env.NEXT_PUBLIC_FEATURE_RISK_CELLS === "true",
  demoMode: process.env.NEXT_PUBLIC_FEATURE_DEMO_MODE === "true"
};

export const llmDraftAssistGate = {
  envVar: "NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST",
  defaultEnabled: false,
  allowedScope: "Draft wording assistance only after deterministic engine, review workflow, and recommendation-history tests stay green.",
  blockedScope: "No scoring, release, approval, validation, diagnosis, regulatory acceptance, or autonomous persistence decisions."
};

export function assertLlmDraftAssistDisabled() {
  return !featureFlags.llmDraftAssist;
}

export function isAuditLogEnabled(): boolean {
  return process.env.AUDIT_LOG_ENABLED === "true";
}

export function isRiskCellsEnabled(): boolean {
  return featureFlags.riskCells;
}
