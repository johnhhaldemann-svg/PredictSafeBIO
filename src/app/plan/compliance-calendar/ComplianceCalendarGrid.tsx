"use client";

import { useMemo, useState } from "react";
import type { CalendarItem, CalendarUrgency } from "@/lib/supabase/compliance-calendar-service";

type Props = {
  items: CalendarItem[];
  completeAction: (formData: FormData) => void | Promise<void>;
};

const URGENCY: Record<CalendarUrgency, { bg: string; fg: string; dot: string; label: string }> = {
  overdue: { bg: "var(--red-bg)", fg: "var(--red-dk)", dot: "#E24B4A", label: "Overdue" },
  due_this_week: { bg: "var(--amber-bg)", fg: "var(--amber-dk)", dot: "#EF9F27", label: "Due this week" },
  upcoming: { bg: "var(--blue-bg)", fg: "var(--blue)", dot: "#378ADD", label: "Upcoming" },
  completed: { bg: "var(--green-bg)", fg: "var(--green-dk)", dot: "#639922", label: "Completed" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function prettyType(t: string | null): string {
  return t ? t.replace(/_/g, " ") : "";
}

export default function ComplianceCalendarGrid({ items, completeAction }: Props) {
  const today = useMemo(() => new Date(), []);
  const todayKey = ymd(today);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(today));
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selected, setSelected] = useState<string>(todayKey);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const i of items) {
      if (!i.dueDate) continue;
      const k = i.dueDate.slice(0, 10);
      const arr = map.get(k) ?? [];
      arr.push(i);
      map.set(k, arr);
    }
    return map;
  }, [items]);

  const unscheduled = useMemo(() => items.filter((i) => !i.dueDate), [items]);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const lead = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    const out: { date: Date; key: string; inMonth: boolean }[] = [];
    for (let n = 0; n < total; n++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - lead + n);
      out.push({ date, key: ymd(date), inMonth: date.getMonth() === cursor.getMonth() });
    }
    return out;
  }, [cursor]);

  const monthCount = useMemo(
    () => items.filter((i) => i.dueDate && i.dueDate.slice(0, 7) === ymd(cursor).slice(0, 7)).length,
    [items, cursor],
  );

  const selectedItems = byDate.get(selected) ?? [];

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  return (
    <div className="psb-cal">
      <div className="psb-cal-toolbar">
        <div className="psb-cal-nav">
          <button type="button" className="psb-cal-icon" aria-label="Previous month" onClick={() => shiftMonth(-1)}>‹</button>
          <h2 className="psb-cal-title">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h2>
          <button type="button" className="psb-cal-icon" aria-label="Next month" onClick={() => shiftMonth(1)}>›</button>
          <button type="button" className="psb-cal-today" onClick={() => { setCursor(startOfMonth(today)); setSelected(todayKey); }}>Today</button>
          <span className="psb-cal-count">{monthCount} task{monthCount !== 1 ? "s" : ""} this month</span>
        </div>
        <div className="psb-cal-toggle" role="tablist" aria-label="View">
          <button type="button" role="tab" aria-selected={view === "calendar"} className={view === "calendar" ? "on" : ""} onClick={() => setView("calendar")}>Calendar</button>
          <button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button>
        </div>
      </div>

      <div className="psb-cal-legend">
        {(Object.keys(URGENCY) as CalendarUrgency[]).map((u) => (
          <span key={u}><i style={{ background: URGENCY[u].dot }} />{URGENCY[u].label}</span>
        ))}
      </div>

      {view === "calendar" ? (
        <>
          <div className="psb-cal-grid">
            {WEEKDAYS.map((w) => (<div key={w} className="psb-cal-dow">{w}</div>))}
            {cells.map((c) => {
              const dayItems = byDate.get(c.key) ?? [];
              const isToday = c.key === todayKey;
              const isSel = c.key === selected;
              return (
                <button
                  type="button"
                  key={c.key}
                  className={`psb-cal-cell${c.inMonth ? "" : " out"}${isToday ? " today" : ""}${isSel ? " sel" : ""}`}
                  onClick={() => setSelected(c.key)}
                >
                  <span className="psb-cal-num">{c.date.getDate()}</span>
                  <span className="psb-cal-chips">
                    {dayItems.slice(0, 3).map((i) => (
                      <span key={i.id} className="psb-cal-chip" style={{ background: URGENCY[i.urgency].bg, color: URGENCY[i.urgency].fg }} title={i.taskName}>
                        {i.taskName}
                      </span>
                    ))}
                    {dayItems.length > 3 && <span className="psb-cal-more">+{dayItems.length - 3} more</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="psb-cal-detail">
            <h3>{new Date(selected + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h3>
            {selectedItems.length === 0 ? (
              <p className="psb-cal-empty">No tasks scheduled for this day.</p>
            ) : (
              selectedItems.map((i) => (
                <div className="psb-cal-detail-row" key={i.id}>
                  <div>
                    <strong>{i.taskName}</strong>
                    <span className="psb-cal-tag" style={{ background: URGENCY[i.urgency].bg, color: URGENCY[i.urgency].fg }}>{URGENCY[i.urgency].label}</span>
                    <small>{[prettyType(i.taskType), i.frequency, i.programName].filter(Boolean).join(" · ")}</small>
                  </div>
                  {i.status !== "completed" && (
                    <form action={completeAction}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className="psb-cal-btn" type="submit">Mark complete</button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="psb-cal-list">
          {items.length === 0 ? (
            <p className="psb-cal-empty">No tasks.</p>
          ) : (
            items.map((i) => (
              <div className="psb-cal-detail-row" key={i.id}>
                <div>
                  <strong>{i.taskName}</strong>
                  <span className="psb-cal-tag" style={{ background: URGENCY[i.urgency].bg, color: URGENCY[i.urgency].fg }}>{URGENCY[i.urgency].label}</span>
                  <small>{[prettyType(i.taskType), i.frequency, i.dueDate ? `Due ${i.dueDate}` : "No due date", i.programName].filter(Boolean).join(" · ")}</small>
                </div>
                {i.status !== "completed" && (
                  <form action={completeAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="psb-cal-btn" type="submit">Mark complete</button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {unscheduled.length > 0 && view === "calendar" && (
        <div className="psb-cal-detail">
          <h3>Unscheduled <small style={{ fontWeight: 500, color: "var(--muted)" }}>({unscheduled.length})</small></h3>
          {unscheduled.map((i) => (
            <div className="psb-cal-detail-row" key={i.id}>
              <div>
                <strong>{i.taskName}</strong>
                <small>{[prettyType(i.taskType), i.frequency, i.programName].filter(Boolean).join(" · ")}</small>
              </div>
              {i.status !== "completed" && (
                <form action={completeAction}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="psb-cal-btn" type="submit">Mark complete</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .psb-cal { display: flex; flex-direction: column; gap: 16px; }
        .psb-cal-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .psb-cal-nav { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .psb-cal-title { font-size: 1.15rem; font-weight: 700; color: var(--navy); margin: 0; min-width: 170px; }
        .psb-cal-icon { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--bdr); background: #fff; color: var(--navy); font-size: 20px; line-height: 1; cursor: pointer; }
        .psb-cal-icon:hover { background: var(--blue-bg); }
        .psb-cal-today { height: 34px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--bdr); background: #fff; color: var(--blue); font-weight: 600; font-size: 13px; cursor: pointer; }
        .psb-cal-today:hover { background: var(--blue-bg); }
        .psb-cal-count { font-size: 12px; color: var(--muted); }
        .psb-cal-toggle { display: inline-flex; border: 1px solid var(--bdr); border-radius: 8px; overflow: hidden; }
        .psb-cal-toggle button { padding: 7px 16px; border: 0; background: #fff; color: var(--text2); font-weight: 600; font-size: 13px; cursor: pointer; }
        .psb-cal-toggle button.on { background: var(--navy); color: #fff; }
        .psb-cal-legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--text2); }
        .psb-cal-legend span { display: inline-flex; align-items: center; gap: 6px; }
        .psb-cal-legend i { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
        .psb-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .psb-cal-dow { text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); padding: 4px 0; }
        .psb-cal-cell { position: relative; min-height: 104px; text-align: left; border: 1px solid var(--bdr); border-radius: 10px; background: #fff; padding: 6px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: border-color .12s, box-shadow .12s; }
        .psb-cal-cell:hover { border-color: var(--blue-mid); }
        .psb-cal-cell.out { background: var(--blue-xs); }
        .psb-cal-cell.out .psb-cal-num { color: var(--muted); }
        .psb-cal-cell.today { border-color: var(--blue); box-shadow: inset 0 0 0 1px var(--blue); }
        .psb-cal-cell.sel { box-shadow: 0 0 0 2px var(--navy); }
        .psb-cal-num { font-size: 13px; font-weight: 700; color: var(--navy); }
        .psb-cal-cell.today .psb-cal-num { background: var(--blue); color: #fff; width: 22px; height: 22px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; }
        .psb-cal-chips { display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
        .psb-cal-chip { font-size: 10.5px; font-weight: 600; padding: 2px 6px; border-radius: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .psb-cal-more { font-size: 10px; color: var(--muted); padding-left: 2px; }
        .psb-cal-detail, .psb-cal-list { border-top: 1px solid var(--bdr); padding-top: 14px; display: flex; flex-direction: column; gap: 8px; }
        .psb-cal-detail h3 { margin: 0 0 4px; font-size: 1rem; color: var(--navy); }
        .psb-cal-empty { color: var(--muted); font-size: 13px; margin: 0; }
        .psb-cal-detail-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--bdr); border-radius: 10px; background: #fff; }
        .psb-cal-detail-row strong { color: var(--navy); font-size: 14px; margin-right: 8px; }
        .psb-cal-detail-row small { display: block; color: var(--muted); font-size: 12px; margin-top: 3px; }
        .psb-cal-tag { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 2px 8px; border-radius: 999px; }
        .psb-cal-btn { padding: 7px 14px; border-radius: 8px; border: 1px solid var(--bdr); background: #fff; color: var(--blue); font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .psb-cal-btn:hover { background: var(--blue-bg); }
        @media (max-width: 720px) {
          .psb-cal-cell { min-height: 76px; }
          .psb-cal-chip { font-size: 0; padding: 3px; }
          .psb-cal-chip::before { content: ""; }
        }
      `}</style>
    </div>
  );
}
