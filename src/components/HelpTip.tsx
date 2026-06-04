"use client";

import { useState, useRef, useId, useEffect } from "react";

type Side = "above" | "below" | "right" | "left";

export function HelpTip({
  tip,
  side = "above",
}: {
  tip: string;
  side?: Side;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const uid = useId();
  const tooltipId = "help-tip-" + uid.replace(/:/g, "");
  const openAttr = open ? "true" : "false";

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
      className={"help-tip help-tip-" + side}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="help-tip-btn"
        aria-label="Help"
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="help-tip-panel"
        data-open={openAttr}
      >
        {tip}
        <span className="help-tip-arrow" aria-hidden="true" />
      </span>
    </span>
  );
}
