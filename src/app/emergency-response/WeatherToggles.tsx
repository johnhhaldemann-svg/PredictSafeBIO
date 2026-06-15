"use client";

import { useState } from "react";

type Integration = { icon: string; name: string; sub: string; on: boolean };

const DEFAULTS: Integration[] = [
  { icon: "🌦", name: "NOAA / NWS Alerts",  sub: "Auto-triggers plan review",  on: true  },
  { icon: "📱", name: "SMS Notifications",   sub: "Alert contacts on trigger",   on: true  },
  { icon: "📧", name: "Email Escalation",    sub: "EHS leadership list",         on: true  },
  { icon: "🗺", name: "GIS / Site Mapping", sub: "Evac route overlay",          on: false },
];

export function WeatherToggles() {
  const [intgs, setIntgs] = useState<Integration[]>(DEFAULTS);
  const [saved, setSaved] = useState<string | null>(null);

  function toggle(i: number) {
    setIntgs(prev => {
      const next = prev.map((x, idx) => idx === i ? { ...x, on: !x.on } : x);
      const item = next[i];
      setSaved(item.on ? `${item.name} enabled` : `${item.name} disabled`);
      setTimeout(() => setSaved(null), 2000);
      return next;
    });
  }

  return (
    <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        Weather Integrations
        {saved && (
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--green-dk)", background: "var(--green-bg)", padding: "2px 7px", borderRadius: 99, letterSpacing: 0 }}>
            ✓ {saved}
          </span>
        )}
      </div>
      {intgs.map((intg, i) => (
        <div key={intg.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < intgs.length - 1 ? "1px solid var(--line)" : "none" }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--panel-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
            {intg.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--navy)" }}>{intg.name}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{intg.sub}</div>
          </div>
          <button
            onClick={() => toggle(i)}
            aria-label={intg.on ? `Disable ${intg.name}` : `Enable ${intg.name}`}
            style={{
              width: 34, height: 18, borderRadius: 9, position: "relative",
              background: intg.on ? "var(--green)" : "var(--line)",
              border: "none", cursor: "pointer", flexShrink: 0, padding: 0,
              transition: "background 0.15s",
            }}
          >
            <div style={{
              position: "absolute", width: 14, height: 14, borderRadius: "50%",
              background: "#fff", top: 2,
              left: intg.on ? 18 : 2,
              transition: "left 0.15s",
            }} />
          </button>
        </div>
      ))}
    </div>
  );
}
