export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AlertTriangle, ClipboardList, Plus, ShieldCheck, Clock } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  listPlans,
  listDrills,
  planTypeLabels,
  drillOutcomeLabels,
  type PlanType,
  type EmergencyDrill,
} from "@/lib/supabase/emergency-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { createPlanAction, createDrillAction } from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

export const metadata: Metadata = { title: "Emergency Response – PredictSafe" };

const PLAN_EMOJI: Record<PlanType, string> = {
  fire:               "🔥",
  severe_weather:     "⛈️",
  chemical_spill:     "☣️",
  biological_release: "🧫",
  medical:            "🏥",
  power_failure:      "⚡",
  other:              "📋",
};

const DEMO_STEPS = [
  { id: 1, text: "Activate Fire Alarm & Initiate Evacuation",     status: "done"    },
  { id: 2, text: "Call 911 & Notify Site Safety Director",        status: "done"    },
  { id: 3, text: "Account for All Personnel at Muster Point",     status: "active"  },
  { id: 4, text: "Attempt Suppression — Only If Safe to Do So",   status: "input"   },
  { id: 5, text: "Meet & Brief Emergency Responders on Arrival",  status: "pending" },
  { id: 6, text: "Document Incident & Initiate Corrective Action",status: "pending" },
];

const DEMO_CONTACTS = [
  { initials: "JH", name: "John Haldemann",        role: "Site Safety Director · Primary", phone: "+1 (317) 555-0142", bg: "var(--blue-bg)",  color: "var(--blue)"     },
  { initials: "FM", name: "Fire Marshal — Site",   role: "External · Emergency",           phone: "911 / Dispatch",    bg: "#FCEBEB",         color: "var(--red-dk)"   },
  { initials: "EH", name: "EHS Lead — Building 4", role: "Internal · Backup",              phone: "+1 (317) 555-0198", bg: "var(--green-bg)", color: "var(--green-dk)" },
];

const FORECAST = [
  { day: "MON", icon: "⛈",  temp: "71°" },
  { day: "TUE", icon: "🌤", temp: "78°" },
  { day: "WED", icon: "☀️", temp: "83°" },
  { day: "THU", icon: "🌧", temp: "69°" },
  { day: "FRI", icon: "🌤", temp: "75°" },
];

const WEATHER_INTG = [
  { icon: "🌦", name: "NOAA / NWS Alerts",   sub: "Auto-triggers plan review",  on: true  },
  { icon: "📱", name: "SMS Notifications",    sub: "Alert contacts on trigger",   on: true  },
  { icon: "📧", name: "Email Escalation",     sub: "EHS leadership list",         on: true  },
  { icon: "🗺", name: "GIS / Site Mapping",  sub: "Evac route overlay",          on: false },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── inline style helpers ── */
const NEW_TAG: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, background: "#EDE9FE", color: "#7C3AED",
  borderRadius: 8, padding: "1px 6px", marginLeft: 4,
};
const PURPLE_CHIP: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#7C3AED",
  background: "#EDE9FE", borderRadius: 8, padding: "2px 8px",
};

type Props = { searchParams: Promise<{ message?: string; success?: string }> };

export default async function EmergencyResponsePage({ searchParams }: Props) {
  const params = await searchParams;

  const [plansResult, drillsResult, adminAccess] = await Promise.all([
    listPlans().catch(() => null),
    listDrills().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  const loadFailed = plansResult === null;
  const plans      = plansResult ?? [];
  const drills     = drillsResult ?? [];
  const now        = new Date();
  const thisYear   = now.getFullYear();

  const currentCount      = plans.filter(p => p.status === "current").length;
  const needsReviewCount  = plans.filter(p => p.needsReview).length;
  const drillsThisYear    = drills.filter(d => new Date(d.drillDate).getFullYear() === thisYear).length;

  const nextDrillPlan = plans
    .filter(p => p.nextDrillDate && new Date(p.nextDrillDate) >= now)
    .sort((a, b) => new Date(a.nextDrillDate!).getTime() - new Date(b.nextDrillDate!).getTime())[0] ?? null;

  const overdueDrillPlans = plans.filter(
    p => p.nextDrillDate && new Date(p.nextDrillDate) < now
  );

  const severeWeatherAlert = plans.some(
    p => p.planType === "severe_weather" && p.needsReview
  );

  // latest drill per plan (for card meta)
  const latestDrillByPlan: Record<string, EmergencyDrill> = {};
  for (const d of drills) {
    if (d.planId) {
      const ex = latestDrillByPlan[d.planId];
      if (!ex || d.drillDate > ex.drillDate) latestDrillByPlan[d.planId] = d;
    }
  }

  // first fire plan used as "active" step-builder subject
  const activePlan = plans.find(p => p.planType === "fire") ?? plans[0] ?? null;

  return (
    <AppShell>
      <div className="page-stack">

        {/* ── Weather alert banner (shows when severe weather plan needs review) ── */}
        {severeWeatherAlert && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            background: "var(--amber-bg)", border: "1px solid var(--amber)",
            borderLeft: "4px solid var(--amber)", borderRadius: 8, padding: "12px 16px",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⛈</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "var(--amber-dk)", fontSize: 13, marginBottom: 3 }}>
                Severe Thunderstorm Watch — Auto-triggered plan review
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>
                NWS Indianapolis · Active until 8:00 PM EST · 2 plans flagged for review ·
                Outdoor elevated work suspended per Site Safety Plan §7.4 · 3 emergency contacts notified via SMS
              </div>
            </div>
            <span style={{ ...PURPLE_CHIP, whiteSpace: "nowrap", alignSelf: "flex-start", marginTop: 2 }}>
              ★ NEW FEATURE
            </span>
          </div>
        )}

        {/* ── Page header ── */}
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Plan · Emergency Response</p>
            <h1>Emergency Response Plans</h1>
            <p className="muted">
              Documented, drilled, accessible response plans for every foreseeable emergency.
              Required under OSHA 29 CFR 1910.38 and NFPA 45.
            </p>
          </div>
          <Link className="button-secondary" href="/documents">Documents →</Link>
        </header>

        {/* ── KPI strip — 4 cards ── */}
        <section
          className="command-card-grid"
          style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          aria-label="Emergency response summary"
        >
          <article
            className="command-card"
            style={{ borderTop: `3px solid ${currentCount > 0 ? "var(--green)" : "var(--blue)"}` }}
          >
            <div>
              <span style={{ background: currentCount > 0 ? "#438d3a" : "var(--blue)" }}>
                <ShieldCheck size={16} />
              </span>
              <strong>Plans on file</strong>
            </div>
            <small>{plans.length}</small>
            <em>{currentCount} current · {plans.length - currentCount} draft</em>
          </article>

          <article
            className="command-card"
            style={{ borderTop: `3px solid ${drillsThisYear > 0 ? "var(--green)" : "var(--blue)"}` }}
          >
            <div>
              <span style={{ background: drillsThisYear > 0 ? "#438d3a" : "var(--blue)" }}>
                <ClipboardList size={16} />
              </span>
              <strong>Drills this year</strong>
            </div>
            <small>{drillsThisYear}</small>
            <em>Drills on record for {thisYear}</em>
          </article>

          <article
            className="command-card"
            style={{ borderTop: `3px solid ${needsReviewCount > 0 ? "var(--red)" : "var(--green)"}` }}
          >
            <div>
              <span style={{ background: needsReviewCount > 0 ? "var(--red-dk)" : "#438d3a" }}>
                <AlertTriangle size={16} />
              </span>
              <strong>Needs review</strong>
            </div>
            <small>{needsReviewCount}</small>
            <em>
              {needsReviewCount > 0
                ? `${needsReviewCount} plan${needsReviewCount !== 1 ? "s" : ""} not reviewed in 12 mo`
                : "All plans reviewed within 12 months."}
            </em>
          </article>

          <article className="command-card" style={{ borderTop: "3px solid #7C3AED" }}>
            <div>
              <span style={{ background: "#7C3AED" }}><Clock size={16} /></span>
              <strong>Next drill due</strong>
              <span style={NEW_TAG}>NEW</span>
            </div>
            {nextDrillPlan ? (
              <>
                <small style={{ fontSize: 18, paddingTop: 4 }}>{fmtShort(nextDrillPlan.nextDrillDate!)}</small>
                <em>{nextDrillPlan.title}</em>
              </>
            ) : (
              <>
                <small style={{ fontSize: 18, paddingTop: 4 }}>—</small>
                <em>No upcoming drills scheduled</em>
              </>
            )}
          </article>
        </section>

        {/* ── Predictive Engine bar ── */}
        <div className="ai-context-bar" style={{ background: "#EDE9FE", borderColor: "#C4B5FD", color: "#7C3AED" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>
            <strong>Predictive Engine:</strong>{" "}
            {severeWeatherAlert && "Severe weather alert active — Severe Weather plan flagged for review. "}
            {overdueDrillPlans.length > 0
              ? `${overdueDrillPlans[0].title} drill is ${Math.floor((now.getTime() - new Date(overdueDrillPlans[0].nextDrillDate!).getTime()) / 86_400_000)} days overdue (OSHA 1910.38 risk). Recommend scheduling before month-end.`
              : !severeWeatherAlert
              ? "All plans current. No immediate compliance risks detected."
              : ""}
          </span>
        </div>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* ── ERP Registry — card grid ── */}
        <section className="panel">
          <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: 12 }}>
            <div>
              <p className="section-label">ERP registry</p>
              <h2>{plans.length} plan{plans.length !== 1 ? "s" : ""} on file</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={PURPLE_CHIP}>NEW VIEW</span>
              <a className="button-primary" href="#add-plan" style={{ textDecoration: "none" }}>+ Add plan</a>
            </div>
          </div>

          {loadFailed ? (
            <div style={{ padding: 16 }}><DataLoadError resource="emergency response plans" /></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: 16 }}>
              {plans.map((plan) => {
                const lastDrill  = latestDrillByPlan[plan.id] ?? null;
                const drillOD    = plan.nextDrillDate && new Date(plan.nextDrillDate) < now;
                const isActive   = activePlan?.id === plan.id;
                const isWeather  = plan.planType === "severe_weather" && plan.needsReview;

                const metaText = isWeather
                  ? "Triggered today"
                  : drillOD
                  ? "Drill overdue"
                  : lastDrill
                  ? `Last drill: ${fmtShort(lastDrill.drillDate)}`
                  : plan.lastReviewed
                  ? `Reviewed: ${fmtShort(plan.lastReviewed)}`
                  : "Never reviewed";

                return (
                  <div
                    key={plan.id}
                    style={{
                      border: isActive
                        ? "1px solid var(--blue-mid)"
                        : "1px solid var(--line)",
                      borderRadius: 8,
                      padding: "12px 14px",
                      background: isActive ? "var(--blue-bg)" : "var(--panel-soft)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{PLAN_EMOJI[plan.planType]}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 3 }}>
                      {plan.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{metaText}</div>
                    {plan.needsReview || plan.status === "needs_review" ? (
                      <span className="status-needs-review" style={{ fontSize: 10 }}>⚠ Review Required</span>
                    ) : plan.status === "current" ? (
                      <span className="status-current" style={{ fontSize: 10 }}>✓ Approved</span>
                    ) : (
                      <span style={{
                        display: "inline-flex", alignItems: "center", padding: "2px 10px",
                        borderRadius: 999, fontSize: 10, fontWeight: 700,
                        background: "var(--blue-bg)", color: "var(--blue)",
                      }}>Draft</span>
                    )}
                  </div>
                );
              })}

              {/* Add plan card */}
              <a
                href="#add-plan"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px dashed var(--line)", borderRadius: 8, padding: "12px 14px",
                  color: "var(--muted)", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", gap: 6, background: "transparent", textDecoration: "none",
                }}
              >
                <Plus size={14} /> Add plan (Power / Flood / Shelter…)
              </a>
            </div>
          )}
        </section>

        {/* ── "Adding Now" divider ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, margin: "4px 0",
          fontSize: 11, fontWeight: 700, color: "#7C3AED",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, var(--line), #C4B5FD)" }} />
          ★ Adding Now — Step Builder · Weather Integration · AI Recommendations · Drill Scheduler · Emergency Contacts
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, var(--line), #C4B5FD)" }} />
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>

          {/* LEFT: Step Builder + Emergency Contacts */}
          <div>

            {/* Step Builder */}
            <section className="panel" style={{ marginBottom: 16 }}>
              <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: 12 }}>
                <div>
                  <p className="section-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    Plan builder <span style={NEW_TAG}>NEW</span>
                  </p>
                  <h2>🔥 {activePlan?.title ?? "Fire Emergency"} — Active Edit</h2>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="button-secondary" style={{ padding: "5px 10px", fontSize: 11 }}>Preview</button>
                  <button className="button-primary"   style={{ padding: "5px 10px", fontSize: 11 }}>Save</button>
                </div>
              </div>

              <div style={{ padding: "0 16px" }}>
                {/* Steps header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 0 10px", borderBottom: "1px solid var(--line)", marginBottom: 10,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", flex: 1 }}>
                    Response Steps
                  </span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", padding: "2px 8px",
                    borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: "var(--blue-bg)", color: "var(--blue)",
                  }}>
                    {DEMO_STEPS.length} steps · {DEMO_STEPS.filter(s => s.status === "done").length} complete
                  </span>
                  <button className="button-secondary" style={{ padding: "4px 8px", fontSize: 11 }}>+ Add step</button>
                </div>

                {/* Step rows */}
                {DEMO_STEPS.map((step) => (
                  <div
                    key={step.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 7, marginBottom: 3,
                      border: step.status === "active"
                        ? "1px solid var(--blue-mid)"
                        : "1px solid transparent",
                      background: step.status === "active" ? "var(--blue-bg)" : "transparent",
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800,
                      background:
                        step.status === "done"   ? "var(--green-bg)" :
                        step.status === "active" ? "var(--blue-bg)"  : "var(--panel-soft)",
                      color:
                        step.status === "done"   ? "var(--green-dk)" :
                        step.status === "active" ? "var(--blue)"     : "var(--muted)",
                      border:
                        step.status === "active"  ? "2px solid var(--blue-mid)" :
                        step.status === "pending" || step.status === "input"
                          ? "1px solid var(--line)" : "none",
                    }}>
                      {step.status === "done" ? "✓" : step.status === "active" ? "›" : ""}
                    </div>
                    <span style={{
                      flex: 1, fontSize: 12,
                      color: step.status === "done" ? "var(--muted)" : "var(--text)",
                      textDecoration: step.status === "done" ? "line-through" : "none",
                      fontWeight: step.status === "active" ? 600 : undefined,
                    }}>
                      {step.text}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
                      color:
                        step.status === "done"   ? "var(--green-dk)" :
                        step.status === "active" ? "var(--blue)"     :
                        step.status === "input"  ? "var(--amber-dk)" : "var(--muted)",
                    }}>
                      {step.status === "done"   ? "Required"     :
                       step.status === "active" ? "In Draft"     :
                       step.status === "input"  ? "Input Needed" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>

              {/* AI Recommendations */}
              <div style={{
                padding: "10px 16px 4px",
                fontSize: 11, fontWeight: 700, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: ".04em",
              }}>
                Predictive Engine Recommendations <span style={NEW_TAG}>NEW</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 16px 16px" }}>
                <div style={{
                  borderRadius: 8, padding: "11px 13px",
                  background: "#EDE9FE", border: "1px solid #C4B5FD",
                }}>
                  <div style={{ fontWeight: 700, color: "#7C3AED", fontSize: 12, marginBottom: 4 }}>
                    🔮 Suggested step
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.4 }}>
                    Add a chemical hazard check before suppression attempt — your hazmat inventory includes flammables in Lab 3.
                  </div>
                </div>
                <div style={{
                  borderRadius: 8, padding: "11px 13px",
                  background: "var(--amber-bg)", border: "1px solid #F6C77E",
                }}>
                  <div style={{ fontWeight: 700, color: "var(--amber-dk)", fontSize: 12, marginBottom: 4 }}>
                    📅 Drill overdue
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.4 }}>
                    {overdueDrillPlans.length > 0
                      ? `${overdueDrillPlans[0].title} drill is ${Math.floor((now.getTime() - new Date(overdueDrillPlans[0].nextDrillDate!).getTime()) / 86_400_000)} days past due. OSHA 29 CFR 1910.38 compliance at risk. Schedule now.`
                      : "No drills currently overdue. Keep up the good work!"}
                  </div>
                </div>
              </div>
            </section>

            {/* Emergency Contacts */}
            <section className="panel">
              <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: 12 }}>
                <div>
                  <p className="section-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    Emergency contacts <span style={NEW_TAG}>NEW</span>
                  </p>
                  <h2>Primary response contacts</h2>
                </div>
                <button className="button-secondary" style={{ padding: "5px 10px", fontSize: 11 }}>
                  + Add contact
                </button>
              </div>
              {DEMO_CONTACTS.map((c, i) => (
                <div
                  key={c.initials}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 16px",
                    borderBottom: i < DEMO_CONTACTS.length - 1 ? "1px solid var(--line)" : "none",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: c.bg, color: c.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800,
                  }}>
                    {c.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.role}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--blue)" }}>{c.phone}</div>
                </div>
              ))}
            </section>
          </div>

          {/* RIGHT: Weather widget + Drill log */}
          <div>

            {/* Weather widget */}
            <div className="panel" style={{ marginBottom: 16, overflow: "hidden" }}>
              <div style={{ background: "#1a3a6e", padding: "12px 14px", color: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--blue-lt)", fontWeight: 600 }}>Indianapolis, IN</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#6EE7B7", letterSpacing: "0.04em" }}>
                    ● NOAA LIVE
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>74°F</div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--blue-lt)" }}>Partly Cloudy · Humidity 68%</div>
                    <div style={{ fontSize: 10, color: "var(--blue-lt)", marginTop: 2 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, color: "#EDE9FE",
                        background: "#7C3AED", borderRadius: 8, padding: "1px 5px", marginRight: 4,
                      }}>NEW</span>
                      Updated 2 min ago
                    </div>
                  </div>
                </div>
              </div>

              {severeWeatherAlert && (
                <div style={{
                  background: "#7a3f00", padding: "8px 12px",
                  fontSize: 11, color: "#FECF77",
                  display: "flex", alignItems: "center", gap: 7, fontWeight: 600,
                }}>
                  ⚠ Severe Thunderstorm Watch · Until 8:00 PM
                </div>
              )}

              {/* 5-day forecast */}
              <div style={{ display: "flex", borderTop: "1px solid var(--line)" }}>
                {FORECAST.map((d, i) => (
                  <div
                    key={d.day}
                    style={{
                      flex: 1, textAlign: "center", padding: "10px 4px",
                      borderRight: i < FORECAST.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>
                      {d.day}
                    </div>
                    <div style={{ fontSize: 14, marginBottom: 3 }}>{d.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>{d.temp}</div>
                  </div>
                ))}
              </div>

              {/* Weather integrations */}
              <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line)" }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "var(--muted)",
                  textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8,
                }}>
                  Weather Integrations <span style={NEW_TAG}>NEW</span>
                </div>
                {WEATHER_INTG.map((intg, i) => (
                  <div
                    key={intg.name}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 0",
                      borderBottom: i < WEATHER_INTG.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 6, background: "var(--panel-soft)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, flexShrink: 0,
                    }}>
                      {intg.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--navy)" }}>{intg.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{intg.sub}</div>
                    </div>
                    <div style={{
                      width: 34, height: 18, borderRadius: 9, position: "relative",
                      background: intg.on ? "var(--green)" : "var(--line)", flexShrink: 0,
                    }}>
                      <div style={{
                        position: "absolute", width: 14, height: 14, borderRadius: "50%",
                        background: "#fff", top: 2, left: intg.on ? 18 : 2,
                        transition: "left 0.15s",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drill log */}
            <section className="panel">
              <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: 12 }}>
                <div>
                  <p className="section-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    Drill log <span style={NEW_TAG}>NEW</span>
                  </p>
                  <h2>Drill &amp; exercise history</h2>
                </div>
                <a
                  href="#log-drill"
                  className="button-secondary"
                  style={{ padding: "5px 10px", fontSize: 11, textDecoration: "none" }}
                >
                  + Log drill
                </a>
              </div>

              {drills.length === 0 ? (
                <div style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>No drills logged yet.</p>
                </div>
              ) : (
                drills.map((drill, i) => {
                  const outcomeClass =
                    drill.outcome === "satisfactory"
                      ? "status-current"
                      : drill.outcome === "needs_improvement"
                      ? "status-needs-review"
                      : "status-overdue";
                  return (
                    <div
                      key={drill.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 14px",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", width: 80, flexShrink: 0 }}>
                        {fmtShort(drill.drillDate)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text2)", flex: 1 }}>
                        {drill.drillType ?? "Drill"}
                      </div>
                      <span className={outcomeClass} style={{ fontSize: 10 }}>
                        {drillOutcomeLabels[drill.outcome]}
                      </span>
                    </div>
                  );
                })
              )}

              {/* Overdue drill rows */}
              {overdueDrillPlans.map((plan) => {
                const daysOD = Math.floor(
                  (now.getTime() - new Date(plan.nextDrillDate!).getTime()) / 86_400_000
                );
                return (
                  <div
                    key={`od-${plan.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 14px",
                      background: "var(--red-bg)",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--red-dk)", width: 80, flexShrink: 0 }}>
                      Overdue
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)", flex: 1 }}>{plan.title}</div>
                    <span className="status-overdue" style={{ fontSize: 10 }}>{daysOD} Days Past Due</span>
                  </div>
                );
              })}
            </section>

          </div>
        </div>

        {/* ── Add plan form ── */}
        {adminAccess.signedIn && (
          <section className="panel" id="add-plan">
            <div className="panel-heading">
              <div>
                <p className="section-label">Add plan</p>
                <h2>Register an emergency response plan</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createPlanAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Plan type <span aria-hidden="true">*</span>
                  <select name="planType" defaultValue="other" required>
                    <option value="chemical_spill">Chemical Spill Response</option>
                    <option value="biological_release">Biological Material Release</option>
                    <option value="fire">Fire &amp; Evacuation</option>
                    <option value="medical">Medical Emergency</option>
                    <option value="power_failure">Power Failure</option>
                    <option value="severe_weather">Severe Weather</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Plan title <span aria-hidden="true">*</span>
                  <input name="title" type="text" placeholder="e.g. Chemical Spill Response Plan" required />
                </label>
                <label>
                  Last reviewed
                  <input name="lastReviewed" type="date" />
                </label>
                <label>
                  Next drill date
                  <input name="nextDrillDate" type="date" />
                </label>
              </div>
              <label>
                Description / scope
                <textarea name="description" rows={2} placeholder="Brief description of the plan's scope and key steps" />
              </label>
              <button className="button-primary" type="submit">Add plan</button>
            </form>
          </section>
        )}

        {/* ── Log drill form ── */}
        {adminAccess.signedIn && (
          <section className="panel" id="log-drill">
            <div className="panel-heading">
              <div>
                <p className="section-label">Log a drill</p>
                <h2>Record drill or exercise</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createDrillAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Date <span aria-hidden="true">*</span>
                  <input name="drillDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </label>
                <label>
                  Drill type
                  <input name="drillType" type="text" placeholder="e.g. tabletop, full evacuation, partial" />
                </label>
                <label>
                  Participants
                  <input name="participantsCount" type="number" min={1} placeholder="e.g. 12" />
                </label>
                <label>
                  Outcome <span aria-hidden="true">*</span>
                  <select name="outcome" defaultValue="satisfactory" required>
                    <option value="satisfactory">Satisfactory</option>
                    <option value="needs_improvement">Needs Improvement</option>
                    <option value="unsatisfactory">Unsatisfactory</option>
                  </select>
                </label>
                <label>
                  Conducted by
                  <input name="conductedBy" type="text" placeholder="e.g. EHS Manager" />
                </label>
                <label>
                  Linked plan (optional)
                  <select name="planId" defaultValue="">
                    <option value="">— Not linked —</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Notes / observations
                <textarea name="notes" rows={2} placeholder="Key observations, gaps found, actions needed" />
              </label>
              <button className="button-primary" type="submit">Log drill</button>
            </form>
          </section>
        )}

        {/* ── AI Guardrail ── */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Emergency plans require human authorship and regular drills</h2>
            <p className="muted">
              AI may surface overdue review alerts and drill gaps, but emergency response plans must be
              authored, approved, and signed off by a qualified EHS professional. All plans are
              <strong> Draft — Human Review Required</strong> until formally approved.
              OSHA 1910.38 requires written plans for facilities with 10+ employees.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>

      </div>
    </AppShell>
  );
}
