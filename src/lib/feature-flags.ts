export const featureFlags = {
  llmDraftAssist: process.env.NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST === "true"
};

export function assertLlmDraftAssistDisabled() {
  return !featureFlags.llmDraftAssist;
}
