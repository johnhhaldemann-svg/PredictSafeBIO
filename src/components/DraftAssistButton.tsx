"use client";

/**
 * DraftAssistButton
 *
 * Inline "Draft with AI" button that streams a Claude Haiku draft
 * directly into a target textarea or input identified by `targetId`.
 *
 * Usage:
 *   <DraftAssistButton
 *     type="reviewer_notes"
 *     context={{ workflow: "...", riskLevel: "high", ... }}
 *     targetId="reviewer-notes"
 *     label="Draft reviewer notes"
 *   />
 */

import { useState } from "react";
import { Sparkles } from "lucide-react";

export type DraftType = "capa_action" | "reviewer_notes" | "incident_summary";

interface Props {
  type: DraftType;
  context: Record<string, string>;
  targetId: string;
  label?: string;
  /** Called with the final drafted text once streaming completes */
  onDraftComplete?: (text: string) => void;
}

const DISCLAIMER = "\n\n[AI Draft — Human Review Required]";

type Status = "idle" | "streaming" | "done" | "error";

export function DraftAssistButton({
  type,
  context,
  targetId,
  label = "Draft with AI",
  onDraftComplete,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (status === "streaming") return;

    setStatus("streaming");
    setError(null);

    const el = document.getElementById(targetId) as
      | HTMLTextAreaElement
      | HTMLInputElement
      | null;

    if (!el) {
      setStatus("error");
      setError(`Element #${targetId} not found`);
      return;
    }

    // Clear the field and show placeholder
    el.value = "";
    el.placeholder = "Drafting…";
    el.disabled = true;

    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        el.value = text;
        // Scroll textarea to bottom as text streams in
        if (el.tagName === "TEXTAREA") {
          el.scrollTop = el.scrollHeight;
        }
      }

      // Append disclaimer
      text += DISCLAIMER;
      el.value = text;

      // Trigger a native input event so any React onChange handlers fire
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));

      onDraftComplete?.(text);
      setStatus("done");

      // Reset to "idle" after 3 seconds so user can re-draft
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      const msg = (err as Error).message;
      el.value = "";
      el.placeholder = "";
      setError(msg);
      setStatus("error");
    } finally {
      el.disabled = false;
      el.placeholder = "";
    }
  }

  const buttonLabel =
    status === "streaming" ? "Drafting…" :
    status === "done"      ? "✓ Draft inserted" :
    label;

  const buttonClass =
    status === "done"      ? "button-secondary compact draft-assist-done" :
    status === "streaming" ? "button-secondary compact draft-assist-loading" :
    status === "error"     ? "button-secondary compact draft-assist-error" :
    "button-secondary compact";

  return (
    <span className="draft-assist-wrapper">
      <button
        type="button"
        className={buttonClass}
        onClick={handleClick}
        disabled={status === "streaming"}
        title="Generate an AI draft — you can edit before saving"
        aria-label={buttonLabel}
      >
        <Sparkles size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
        {buttonLabel}
      </button>
      {status === "error" && error && (
        <span className="draft-assist-error-msg" role="alert">
          {error.includes("ANTHROPIC_API_KEY")
            ? "AI draft unavailable — API key not configured."
            : `Draft failed: ${error}`}
        </span>
      )}
    </span>
  );
}
