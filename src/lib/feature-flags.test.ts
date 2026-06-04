import { describe, expect, it } from "vitest";
import { assertLlmDraftAssistDisabled, llmDraftAssistGate } from "./feature-flags";

describe("feature flags", () => {
  it("keeps LLM draft assist disabled by default with explicit scope boundaries", () => {
    expect(assertLlmDraftAssistDisabled()).toBe(true);
    expect(llmDraftAssistGate.envVar).toBe("NEXT_PUBLIC_ENABLE_LLM_DRAFT_ASSIST");
    expect(llmDraftAssistGate.defaultEnabled).toBe(false);
    expect(llmDraftAssistGate.allowedScope).toContain("Draft wording assistance");
    expect(llmDraftAssistGate.blockedScope).toContain("No scoring");
  });
});
