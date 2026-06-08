import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Manual v1.1 §11 guardrail — yellow "DRAFT - Human Review Required" banner.
 * Render directly above any AI-generated output. Uses existing amber tokens.
 */
export function AiDraftBanner({ children }: { children?: ReactNode }) {
  return (
    <div
      role="note"
      aria-label="AI draft notice"
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        background: "var(--amber-bg)",
        border: "1px solid var(--amber)",
        color: "var(--amber-dk)",
        borderRadius: 10,
        padding: "10px 14px",
        margin: "6px 0",
        fontSize: 13,
      }}
    >
      <AlertTriangle size={16} aria-hidden="true" style={{ marginTop: 1, flexShrink: 0 }} />
      <span>
        <strong>DRAFT — Human Review Required.</strong>{" "}
        {children ?? "AI may recommend, draft, summarize, and prioritize. A qualified person must approve all regulatory, biosafety, quality, medical, waste, radiation, and emergency decisions."}
      </span>
    </div>
  );
}
