"use client";

import { useState } from "react";

export function CopyVerificationSummaryButton({ summary }: { summary: string }) {
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="button-secondary compact" onClick={copySummary} type="button">
      {copied ? "Copied" : "Copy verification summary"}
    </button>
  );
}
