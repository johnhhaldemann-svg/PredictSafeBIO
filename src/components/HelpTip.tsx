"use client";

import { useState, useRef, useEffect } from "react";

type Side = "above" | "below" | "right" | "left";

export function HelpTip({
  tip,
  side = "above"
}: {
  tip: string;
  side?: Side;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <span
      ref={ref}
      className={`help-tip help-tip-${side}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="help-tip-btn"
        aria-label={`Help: ${tip}`}
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && (
        <span className="help-tip-panel" role="tooltip">
          {tip}
          <span className="help-tip-arrow" aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
