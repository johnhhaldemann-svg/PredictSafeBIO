export const featureFlags = {
  llmDraftAssist: process.env.NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST === "true"
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
