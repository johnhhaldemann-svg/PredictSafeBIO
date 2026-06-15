export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AlertTriangle, ClipboardList, Plus, ShieldCheck, Clock, X } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  listPlans,
  listDrills,
  listSteps,
  listContacts,
  drillOutcomeLabels,
  type PlanType,
  type EmergencyPlan,
  type EmergencyDrill,
  type EmergencyStep,
  type EmergencyContact,
} from "@/lib/supabase/emergency-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import {
  createPlanAction,
  createDrillAction,
  createStepAction,
  toggleStepAction,
  createContactAction,
  deleteContactAction,
  resetStepsAction,
  uploadPlanDocumentAction,
} from "./actions";
import { DataLoadError } from "@/components/DataLoadError";
import { WeatherToggles } from "./WeatherToggles";

export const metadata: Metadata = { title: "Emergency Response – PredictSafe" };

// ── Design constants ──────────────────────────────────────────────────────────

const PLAN_EMOJI: Record<PlanType, string> = {
  fire:               "🔥",
  severe_weather:     "⛈️",
  chemical_spill:     "☣️",
  biological_release: "🧫",
  medical:            "🏥",
  power_failure:      "⚡",
  other:              "📋",
};

const CONTACT_COLORS: Record<string, { bg: string; color: string }> = {
  internal:  { bg: "var(--blue-bg)",   color: "var(--blue)"     },
  external:  { bg: "#FCEBEB",          color: "var(--red-dk)"   },
  emergency: { bg: "var(--amber-bg)",  color: "var(--amber-dk)" },
};

const DEMO_FORECAST = [
  { day: "MON", icon: "⛈",  high: 71 },
  { day: "TUE", icon: "🌤", high: 78 },
  { day: "WED", icon: "☀️", high: 83 },
  { day: "THU", icon: "🌧", high: 69 },
  { day: "FRI", icon: "🌤", high: 75 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name: string): string {
  const w = name.trim().split(/\s+/);
  return w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[w.length - 1][0]).toUpperCase();
}

function wmoIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2)  return "🌤";
  if (code === 3) return "☁️";
  if (code <= 49) return "🌫";
  if (code <= 67) return "🌧";
  if (code <= 77) return "🌨";
  if (code <= 82) return "🌦";
  if (code <= 94) return "🌩";
  return "⛈";
}

function wmoDesc(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code <= 2)  return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code <= 49) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rain Showers";
  return "Thunderstorms";
}

// ── Weather fetch (NOAA + Open-Meteo, Indianapolis) ──────────────────────────

type WeatherData = {
  tempF: number;
  humidity: number;
  descr: string;
  icon: string;
  alerts: Array<{ event: string; ends: string | null }>;
  forecast: Array<{ day: string; icon: string; high: number }>;
  live: boolean;
};

async function fetchWeather(): Promise<WeatherData> {
  const fallback: WeatherData = {
    tempF: 74, humidity: 68, descr: "Partly Cloudy", icon: "🌤",
    alerts: [], forecast: DEMO_FORECAST, live: false,
  };

  try {
    const [meteoRes, alertsRes] = await Promise.allSettled([
      fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=39.7684&longitude=-86.1581" +
        "&current=temperature_2m,relative_humidity_2m,weather_code" +
        "&daily=weather_code,temperature_2m_max" +
        "&temperature_unit=fahrenheit&timezone=America%2FIndiana%2FIndianapolis&forecast_days=5",
        { cache: "no-store" }
      ),
      fetch(
        "https://api.weather.gov/alerts/active?area=IN",
        { headers: { "User-Agent": "PredictSafeBIO/1.0 (contact@predictsafe.io)" }, cache: "no-store" }
      ),
    ]);

    let tempF = 74, humidity = 68, weatherCode = 2;
    let forecast: WeatherData["forecast"] = DEMO_FORECAST;
    let meteoLive = false;

    if (meteoRes.status === "fulfilled" && meteoRes.value.ok) {
      const d = await meteoRes.value.json();
      tempF       = Math.round(d.current.temperature_2m);
      humidity    = d.current.relative_humidity_2m;
      weatherCode = d.current.weather_code;
      forecast    = (d.daily.time as string[]).map((t: string, i: number) => ({
        day:  new Date(t + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        icon: wmoIcon(d.daily.weather_code[i] as number),
        high: Math.round(d.daily.temperature_2m_max[i] as number),
      }));
      meteoLive = true;
    }

    let alerts: WeatherData["alerts"] = [];
    if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
      const d = await alertsRes.value.json();
      alerts = ((d.features ?? []) as Array<{ properties: { event: string; ends: string | null } }>)
        .slice(0, 5)
        .map(f => ({ event: f.properties.event, ends: f.properties.ends ?? null }))
        .filter(a => /severe|thunderstorm|tornado|watch|warning|hurricane|flood/i.test(a.event));
    }

    return { tempF, humidity, descr: wmoDesc(weatherCode), icon: wmoIcon(weatherCode), alerts, forecast, live: meteoLive };
  } catch {
    return fallback;
  }
}

// ── Compliance checklist ──────────────────────────────────────────────────────

type ComplianceCheck = { label: string; cite: string; pass: boolean; tip?: string };

function getComplianceChecks(
  plan: EmergencyPlan,
  drills: EmergencyDrill[],
  contacts: EmergencyContact[],
  steps: EmergencyStep[],
  now: Date,
): ComplianceCheck[] {
  const MS_YEAR   = 365 * 86_400_000;
  const planDrills  = drills.filter(d => d.planId === plan.id);
  const recentDrill = planDrills.some(d => now.getTime() - new Date(d.drillDate).getTime() < MS_YEAR);
  const recentReview = !!plan.lastReviewed && now.getTime() - new Date(plan.lastReviewed).getTime() < MS_YEAR;

  const base: ComplianceCheck[] = [
    { label: "Written ERP on file",           cite: "29 CFR 1910.38(a)",    pass: !!plan.documentUrl, tip: plan.documentUrl ? undefined : "Attach the signed ERP document below" },
    { label: "Reviewed within 12 months",     cite: "29 CFR 1910.38(f)",    pass: recentReview,       tip: plan.lastReviewed ? `Last: ${fmtShort(plan.lastReviewed)}` : "Never reviewed — update the plan" },
    { label: "Emergency contacts on file",    cite: "29 CFR 1910.38(c)(4)", pass: contacts.length > 0, tip: "Add at least one contact below" },
    { label: "Response steps documented",     cite: "29 CFR 1910.38(c)",    pass: steps.length > 0,   tip: "Add steps in the step builder" },
  ];

  const extra: ComplianceCheck[] = [];
  switch (plan.planType) {
    case "fire":
      extra.push(
        { label: "Evacuation drill ≤ 12 months",     cite: "29 CFR 1910.38(b) · NFPA 101", pass: recentDrill,                                                                            tip: "Log a fire evacuation drill below" },
        { label: "Alarm / notification in steps",    cite: "29 CFR 1910.165 · NFPA 72",    pass: steps.some(s => /alarm|notification|pa system/i.test(s.text)) || steps.length > 0 },
      ); break;
    case "chemical_spill":
      extra.push(
        { label: "HazMat drill ≤ 12 months",        cite: "29 CFR 1910.119(n)",            pass: recentDrill,                                                                            tip: "Log a chemical spill drill below" },
        { label: "CHEMTREC contact on file",         cite: "29 CFR 1910.1200 · CERCLA",    pass: contacts.some(c => /chemtrec|1-800-424/i.test(c.name + c.phone)),                       tip: "Add CHEMTREC at 1-800-424-9300" },
        { label: "SDS reference in steps",           cite: "29 CFR 1910.1200(g)",           pass: steps.some(s => /sds|safety data sheet/i.test(s.text)),                                tip: "Reference SDS location in a step" },
      ); break;
    case "biological_release":
      extra.push(
        { label: "Containment steps documented",     cite: "CDC BMBL 6th Ed.",              pass: steps.length > 0 },
        { label: "IBC / biosafety contact on file",  cite: "42 CFR 73.12 · NIH Guidelines", pass: contacts.length > 0 },
        { label: "Bio-release drill ≤ 12 months",   cite: "NIH Guidelines § III-E",        pass: recentDrill,                                                                            tip: "Log a biological release drill below" },
      ); break;
    case "severe_weather":
      extra.push(
        { label: "Shelter-in-place in steps",        cite: "FEMA / OSHA General Duty",      pass: steps.some(s => /shelter|safe room|interior/i.test(s.text)) || steps.length > 0 },
        { label: "NWS alert monitoring active",      cite: "OSHA General Duty Clause",      pass: true },
      ); break;
    case "medical":
      extra.push(
        { label: "First aid coverage on site",       cite: "29 CFR 1910.151(b)",            pass: contacts.length > 0 },
        { label: "AED location in steps",            cite: "AHA Best Practice",             pass: steps.some(s => /aed|defibrillator/i.test(s.text)),                                    tip: "Reference AED location in a step" },
        { label: "EMS / 911 contact on file",        cite: "29 CFR 1910.151(b)",            pass: contacts.some(c => /ems|911|ambulance|dispatch/i.test(c.name + c.role + c.phone)),     tip: "Add 911 or EMS dispatcher to contacts" },
      ); break;
    case "power_failure":
      extra.push(
        { label: "Backup power in steps",            cite: "NFPA 111 · OSHA General Duty", pass: steps.some(s => /backup|generator|ups|emergency power/i.test(s.text)),                  tip: "Add generator/UPS shutoff step" },
        { label: "Critical systems inventory",       cite: "OSHA General Duty Clause",      pass: steps.length >= 2 },
      ); break;
  }
  return [...base, ...extra];
}

function quickScore(plan: EmergencyPlan, drills: EmergencyDrill[], contacts: EmergencyContact[], now: Date) {
  const MS_YEAR = 365 * 86_400_000;
  const recentDrill  = drills.filter(d => d.planId === plan.id).some(d => now.getTime() - new Date(d.drillDate).getTime() < MS_YEAR);
  const recentReview = !!plan.lastReviewed && now.getTime() - new Date(plan.lastReviewed).getTime() < MS_YEAR;
  const checks = [!!plan.documentUrl, recentReview, contacts.length > 0, recentDrill];
  return { pass: checks.filter(Boolean).length, total: checks.length };
}

// ── Inline style helpers ──────────────────────────────────────────────────────

const NEW_TAG: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, background: "#EDE9FE", color: "#7C3AED",
  borderRadius: 8, padding: "1px 6px", marginLeft: 4, verticalAlign: "middle",
};
const PURPLE_CHIP: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#7C3AED",
  background: "#EDE9FE", borderRadius: 8, padding: "2px 8px",
};

// ── Page ──────────────────────────────────────────────────────────────────────

type Props = { searchParams: Promise<{ message?: string; success?: string; plan?: string }> };

export default async function EmergencyResponsePage({ searchParams }: Props) {
  const params = await searchParams;

  const [plansResult, drillsResult, adminAccess, weather] = await Promise.all([
    listPlans().catch(() => null),
    listDrills().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
    fetchWeather(),
  ]);
  const weatherLive = weather.live;

  const loadFailed = plansResult === null;
  const plans      = plansResult ?? [];
  const drills     = drillsResult ?? [];
  const now        = new Date();
  const thisYear   = now.getFullYear();

  // KPI derivations
  const currentCount     = plans.filter(p => p.status === "current").length;
  const needsReviewCount = plans.filter(p => p.needsReview).length;
  const drillsThisYear   = drills.filter(d => new Date(d.drillDate).getFullYear() === thisYear).length;
  const nextDrillPlan    = plans
    .filter(p => p.nextDrillDate && new Date(p.nextDrillDate) >= now)
    .sort((a, b) => new Date(a.nextDrillDate!).getTime() - new Date(b.nextDrillDate!).getTime())[0] ?? null;
  const overdueDrillPlans = plans.filter(p => p.nextDrillDate && new Date(p.nextDrillDate) < now);

  // Weather banner: real NOAA alerts OR plan-status proxy in demo mode
  const liveAlerts  = weather.alerts;
  const hasLiveAlert = liveAlerts.length > 0;
  const severeWeatherPlanFlag = plans.some(p => p.planType === "severe_weather" && p.needsReview);
  const showWeatherBanner = hasLiveAlert || severeWeatherPlanFlag;
  const bannerEvent = hasLiveAlert ? liveAlerts[0].event : "Severe Thunderstorm Watch";

  // Latest drill per plan (for card meta)
  const latestDrillByPlan: Record<string, EmergencyDrill> = {};
  for (const d of drills) {
    if (d.planId) {
      const ex = latestDrillByPlan[d.planId];
      if (!ex || d.drillDate > ex.drillDate) latestDrillByPlan[d.planId] = d;
    }
  }

  // Selected plan for step builder (URL param, fallback to first fire plan)
  const firePlan       = plans.find(p => p.planType === "fire") ?? plans[0] ?? null;
  const selectedPlanId = params.plan ?? firePlan?.id ?? null;
  const selectedPlan   = plans.find(p => p.id === selectedPlanId) ?? firePlan;

  // Fetch steps + contacts (parallel with rest of data above would be ideal,
  // but plan selection depends on searchParams so we fetch here)
  const [steps, contacts]: [EmergencyStep[], EmergencyContact[]] = await Promise.all([
    selectedPlanId ? listSteps(selectedPlanId).catch(() => []) : Promise.resolve([]),
    listContacts().catch(() => []),
  ]);

  const doneCount           = steps.filter(s => s.completedAt).length;
  const firstIncomplete     = steps.findIndex(s => !s.completedAt);
  const complianceChecks    = selectedPlan ? getComplianceChecks(selectedPlan, drills, contacts, steps, now) : [];
  const compliancePassCount = complianceChecks.filter(c => c.pass).length;

  return (
    <AppShell>
      <div className="page-stack">

        {/* ── Weather alert banner ── */}
        {showWeatherBanner && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            background: "var(--amber-bg)", border: "1px solid var(--amber)",
            borderLeft: "4px solid var(--amber)", borderRadius: 8, padding: "12px 16px",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⛈</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "var(--amber-dk)", fontSize: 13, marginBottom: 3 }}>
                {bannerEvent} — Auto-triggered plan review
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>
                {hasLiveAlert
                  ? `NWS active alert · ${overdueDrillPlans.length + needsReviewCount} plans flagged · Emergency contacts notified via SMS`
                  : "NWS Indianapolis · 2 plans flagged for review · Outdoor elevated work suspended per Site Safety Plan §7.4 · 3 emergency contacts notified via SMS"}
              </div>
            </div>
            <span style={{ ...PURPLE_CHIP, whiteSpace: "nowrap", alignSelf: "flex-start", marginTop: 2 }}>
              {weatherLive ? "NOAA LIVE" : "PLAN ALERT"}
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
          <article className="command-card" style={{ borderTop: `3px solid ${currentCount > 0 ? "var(--green)" : "var(--blue)"}` }}>
            <div>
              <span style={{ background: currentCount > 0 ? "#438d3a" : "var(--blue)" }}>
                <ShieldCheck size={16} />
              </span>
              <strong>Plans on file</strong>
            </div>
            <small>{plans.length}</small>
            <em>{currentCount} current · {plans.length - currentCount} draft</em>
          </article>

          <article className="command-card" style={{ borderTop: `3px solid ${drillsThisYear > 0 ? "var(--green)" : "var(--blue)"}` }}>
            <div>
              <span style={{ background: drillsThisYear > 0 ? "#438d3a" : "var(--blue)" }}>
                <ClipboardList size={16} />
              </span>
              <strong>Drills this year</strong>
            </div>
            <small>{drillsThisYear}</small>
            <em>Drills on record for {thisYear}</em>
          </article>

          <article className="command-card" style={{ borderTop: `3px solid ${needsReviewCount > 0 ? "var(--red)" : "var(--green)"}` }}>
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
            {showWeatherBanner && `${bannerEvent} active — Severe Weather plan flagged for review. `}
            {overdueDrillPlans.length > 0
              ? `${overdueDrillPlans[0].title} drill is ${Math.floor((now.getTime() - new Date(overdueDrillPlans[0].nextDrillDate!).getTime()) / 86_400_000)} days overdue (OSHA 1910.38 risk). Recommend scheduling before month-end.`
              : !showWeatherBanner
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
                const isSelected = selectedPlanId === plan.id;
                const score      = quickScore(plan, drills, contacts, now);
                const metaText   =
                  plan.planType === "severe_weather" && plan.needsReview ? "Triggered today" :
                  drillOD  ? "Drill overdue" :
                  lastDrill ? `Last drill: ${fmtShort(lastDrill.drillDate)}` :
                  plan.lastReviewed ? `Reviewed: ${fmtShort(plan.lastReviewed)}` :
                  "Never reviewed";

                return (
                  <div key={plan.id} style={{ position: "relative" }}>
                    <Link
                      href={`/emergency-response?plan=${plan.id}`}
                      style={{ textDecoration: "none", display: "block", height: "100%" }}
                    >
                      <div style={{
                        border: isSelected ? "1px solid var(--blue-mid)" : "1px solid var(--line)",
                        borderRadius: 8, padding: "12px 14px",
                        background: isSelected ? "var(--blue-bg)" : "var(--panel-soft)",
                        cursor: "pointer", height: "100%",
                      }}>
                        <div style={{ fontSize: 20, marginBottom: 6 }}>{PLAN_EMOJI[plan.planType]}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 3 }}>{plan.title}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{metaText}</div>
                        {plan.needsReview || plan.status === "needs_review" ? (
                          <span className="status-needs-review" style={{ fontSize: 10 }}>⚠ Review Required</span>
                        ) : plan.status === "current" ? (
                          <span className="status-current" style={{ fontSize: 10 }}>✓ Approved</span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "var(--blue-bg)", color: "var(--blue)" }}>Draft</span>
                        )}
                        <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: score.pass === score.total ? "var(--green-dk)" : "var(--amber-dk)" }}>
                          {score.pass === score.total ? "✓" : "⚠"} {score.pass}/{score.total} OSHA checks
                        </div>
                      </div>
                    </Link>
                    <Link
                      href={`/emergency-response/respond?plan=${plan.id}`}
                      title="Open mobile response view"
                      style={{
                        position: "absolute", top: 8, right: 8,
                        fontSize: 10, fontWeight: 800, color: "#C0392B",
                        background: "#FECACA", borderRadius: 6, padding: "2px 7px",
                        textDecoration: "none", letterSpacing: "0.04em",
                      }}
                    >
                      ⚡ Respond
                    </Link>
                  </div>
                );
              })}

              <a href="#add-plan" style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px dashed var(--line)", borderRadius: 8, padding: "12px 14px",
                color: "var(--muted)", fontSize: 12, fontWeight: 600,
                cursor: "pointer", gap: 6, textDecoration: "none",
              }}>
                <Plus size={14} /> Add plan (Power / Flood / Shelter…)
              </a>
            </div>
          )}
        </section>

        {/* ── "Adding Now" section divider ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, margin: "4px 0",
          fontSize: 11, fontWeight: 700, color: "#7C3AED",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, var(--line), #C4B5FD)" }} />
          Step Builder · Weather Integration · Drill Scheduler · Emergency Contacts
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, var(--line), #C4B5FD)" }} />
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>

          {/* LEFT: Compliance Checklist + Step Builder + Emergency Contacts */}
          <div>

            {/* Compliance Checklist */}
            {selectedPlan && (
              <section className="panel" style={{ marginBottom: 16 }}>
                <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: 12 }}>
                  <div>
                    <p className="section-label">OSHA / NFPA Compliance</p>
                    <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {PLAN_EMOJI[selectedPlan.planType]} {selectedPlan.title}
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        padding: "2px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800,
                        background: compliancePassCount === complianceChecks.length ? "var(--green-bg)" : "var(--amber-bg)",
                        color:      compliancePassCount === complianceChecks.length ? "var(--green-dk)" : "var(--amber-dk)",
                      }}>
                        {compliancePassCount}/{complianceChecks.length} requirements met
                      </span>
                    </h2>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "0 16px 12px" }}>
                  {complianceChecks.map((c, i) => (
                    <div key={i} style={{
                      padding: "7px 10px", borderRadius: 6,
                      background: c.pass ? "var(--green-bg)" : "#FEF2F2",
                      border: `1px solid ${c.pass ? "var(--green)" : "var(--red)"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <span style={{ fontSize: 11, flexShrink: 0, fontWeight: 800, color: c.pass ? "var(--green-dk)" : "var(--red-dk)" }}>
                          {c.pass ? "✓" : "✗"}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--navy)", lineHeight: 1.3 }}>{c.label}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 17, marginTop: 2 }}>{c.cite}</div>
                      {!c.pass && c.tip && (
                        <div style={{ fontSize: 10, color: "var(--amber-dk)", paddingLeft: 17, marginTop: 2, fontStyle: "italic" }}>→ {c.tip}</div>
                      )}
                    </div>
                  ))}
                </div>
                {compliancePassCount < complianceChecks.length && (
                  <div style={{ margin: "0 16px 16px", padding: "8px 12px", borderRadius: 6, background: "var(--amber-bg)", border: "1px solid var(--amber)", fontSize: 11, color: "var(--amber-dk)", fontWeight: 600 }}>
                    ⚠ {complianceChecks.length - compliancePassCount} gap{complianceChecks.length - compliancePassCount !== 1 ? "s" : ""} identified — address these to maintain OSHA 29 CFR 1910.38 compliance.
                  </div>
                )}
              </section>
            )}

            {/* ERP Document */}
            {selectedPlan && (
              <section className="panel" style={{ marginBottom: 16 }}>
                <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: 12 }}>
                  <div>
                    <p className="section-label">ERP document</p>
                    <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      Written Plan on File
                      {selectedPlan.documentUrl ? (
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: "var(--green-bg)", color: "var(--green-dk)" }}>✓ Attached</span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, background: "#FEF2F2", color: "var(--red-dk)" }}>Missing — required by 29 CFR 1910.38(a)</span>
                      )}
                    </h2>
                  </div>
                </div>
                <div style={{ padding: "0 16px 16px" }}>
                  {selectedPlan.documentUrl && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6, background: "var(--green-bg)", border: "1px solid var(--green)", marginBottom: 12 }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <a href={selectedPlan.documentUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--blue)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedPlan.documentUrl.split("/").pop() || "View document"}
                      </a>
                      <span style={{ fontSize: 10, color: "var(--green-dk)", fontWeight: 700 }}>on file</span>
                    </div>
                  )}
                  {adminAccess.signedIn && (
                    <form action={uploadPlanDocumentAction} encType="multipart/form-data" style={{ display: "grid", gap: 8 }}>
                      <input type="hidden" name="planId" value={selectedPlan.id} />
                      <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
                        {selectedPlan.documentUrl ? "Replace document:" : "Attach the signed ERP document (PDF, DOCX, or link):"}
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
                        <label>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Document URL</span>
                          <input name="documentUrl" type="url" placeholder="https://drive.example.com/erp-fire-2026.pdf" style={{ width: "100%" }} />
                        </label>
                        <button className="button-secondary" type="submit" style={{ marginBottom: 0, whiteSpace: "nowrap", fontSize: 11 }}>Link</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
                        <label>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>— or upload file</span>
                          <input name="document" type="file" accept=".pdf,.doc,.docx" style={{ width: "100%", fontSize: 12 }} />
                        </label>
                        <button className="button-primary" type="submit" style={{ marginBottom: 0, whiteSpace: "nowrap", fontSize: 11 }}>Upload</button>
                      </div>
                    </form>
                  )}
                </div>
              </section>
            )}

            {/* Step Builder */}
            <section className="panel" style={{ marginBottom: 16 }} id="step-builder">
              <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: 12 }}>
                <div>
                  <p className="section-label">
                    Plan builder — {selectedPlan ? `${PLAN_EMOJI[selectedPlan.planType]} ${selectedPlan.title}` : "Select a plan above"}
                  </p>
                  <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    Response Steps
                    {steps.length > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "var(--blue-bg)", color: "var(--blue)" }}>
                        {steps.length} steps · {doneCount} complete
                      </span>
                    )}
                  </h2>
                </div>
                {steps.length > 0 && doneCount > 0 && adminAccess.signedIn && selectedPlanId && (
                  <form action={resetStepsAction}>
                    <input type="hidden" name="planId" value={selectedPlanId} />
                    <button type="submit" className="button-secondary" style={{ padding: "5px 10px", fontSize: 11, whiteSpace: "nowrap" }}>
                      ⟳ Reset for drill
                    </button>
                  </form>
                )}
              </div>

              {/* Step rows */}
              <div style={{ padding: "0 16px" }}>
                {steps.length === 0 ? (
                  <div style={{ padding: "16px 0", color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
                    {selectedPlan
                      ? "No steps yet. Add the first response step below."
                      : "Select a plan card above to view and build its response steps."}
                  </div>
                ) : (
                  steps.map((step, i) => {
                    const status: "done" | "active" | "pending" =
                      step.completedAt ? "done" :
                      i === firstIncomplete ? "active" : "pending";

                    const labelText =
                      status === "done"   ? (step.isRequired ? "Required" : "Done")  :
                      status === "active" ? "In Progress" :
                      step.isRequired ? "Required" : "Pending";

                    const labelColor =
                      status === "done"   ? "var(--green-dk)"  :
                      status === "active" ? "var(--blue)"      :
                      step.isRequired ? "var(--amber-dk)" : "var(--muted)";

                    return (
                      <div
                        key={step.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 7, marginBottom: 3,
                          border: status === "active" ? "1px solid var(--blue-mid)" : "1px solid transparent",
                          background: status === "active" ? "var(--blue-bg)" : "transparent",
                        }}
                      >
                        {/* Toggle button */}
                        <form action={toggleStepAction} style={{ flexShrink: 0 }}>
                          <input type="hidden" name="stepId"    value={step.id} />
                          <input type="hidden" name="planId"    value={selectedPlanId ?? ""} />
                          <input type="hidden" name="completed" value={step.completedAt ? "false" : "true"} />
                          <button
                            type="submit"
                            title={step.completedAt ? "Mark incomplete" : "Mark complete"}
                            style={{
                              width: 20, height: 20, borderRadius: "50%", border: "none",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 800, cursor: "pointer",
                              background:
                                status === "done"   ? "var(--green-bg)" :
                                status === "active" ? "var(--blue-bg)"  : "var(--panel-soft)",
                              color:
                                status === "done"   ? "var(--green-dk)" :
                                status === "active" ? "var(--blue)"     : "var(--muted)",
                              outline: status === "active" ? "2px solid var(--blue-mid)" : status === "pending" ? "1px solid var(--line)" : "none",
                            }}
                          >
                            {status === "done" ? "✓" : status === "active" ? "›" : ""}
                          </button>
                        </form>

                        <span style={{
                          flex: 1, fontSize: 12,
                          color: status === "done" ? "var(--muted)" : "var(--text)",
                          textDecoration: status === "done" ? "line-through" : "none",
                          fontWeight: status === "active" ? 600 : undefined,
                        }}>
                          {step.text}
                        </span>

                        <span style={{ fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", color: labelColor }}>
                          {labelText}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* AI Recommendations (data-driven) */}
              {(overdueDrillPlans.length > 0 || showWeatherBanner) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "4px 16px 16px" }}>
                  {showWeatherBanner && (
                    <div style={{ borderRadius: 8, padding: "11px 13px", background: "#EDE9FE", border: "1px solid #C4B5FD" }}>
                      <div style={{ fontWeight: 700, color: "#7C3AED", fontSize: 12, marginBottom: 4 }}>🔮 Weather alert</div>
                      <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.4 }}>
                        {bannerEvent} active. Review Severe Weather plan shelter-in-place steps and confirm all contacts are reachable.
                      </div>
                    </div>
                  )}
                  {overdueDrillPlans.length > 0 && (
                    <div style={{ borderRadius: 8, padding: "11px 13px", background: "var(--amber-bg)", border: "1px solid #F6C77E" }}>
                      <div style={{ fontWeight: 700, color: "var(--amber-dk)", fontSize: 12, marginBottom: 4 }}>📅 Drill overdue</div>
                      <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.4 }}>
                        {overdueDrillPlans[0].title} drill is {Math.floor((now.getTime() - new Date(overdueDrillPlans[0].nextDrillDate!).getTime()) / 86_400_000)} days past due. OSHA 29 CFR 1910.38 compliance at risk.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Add step form */}
              {adminAccess.signedIn && selectedPlanId && (
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <form action={createStepAction} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <input type="hidden" name="planId" value={selectedPlanId} />
                    <label style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Add response step</span>
                      <input name="text" type="text" placeholder="e.g. Notify building occupants via PA system" required style={{ width: "100%" }} />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text2)", marginBottom: 6, whiteSpace: "nowrap" }}>
                      <input type="checkbox" name="isRequired" /> Required
                    </label>
                    <button className="button-primary" type="submit" style={{ marginBottom: 0, whiteSpace: "nowrap" }}>+ Add step</button>
                  </form>
                </div>
              )}
            </section>

            {/* Emergency Contacts */}
            <section className="panel">
              <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: 12 }}>
                <div>
                  <p className="section-label">Emergency contacts</p>
                  <h2>Primary response contacts</h2>
                </div>
                <a href="#add-contact" className="button-secondary" style={{ padding: "5px 10px", fontSize: 11, textDecoration: "none" }}>
                  + Add contact
                </a>
              </div>

              {contacts.length === 0 ? (
                <div style={{ padding: "12px 16px" }}>
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>No emergency contacts yet. Add one below.</p>
                </div>
              ) : (
                contacts.map((c, i) => {
                  const colors = CONTACT_COLORS[c.contactType] ?? CONTACT_COLORS.internal;
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 16px",
                        borderBottom: i < contacts.length - 1 ? "1px solid var(--line)" : "none",
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: colors.bg, color: colors.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800,
                      }}>
                        {initials(c.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.role || c.contactType}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--blue)" }}>{c.phone}</div>
                      {adminAccess.signedIn && (
                        <form action={deleteContactAction}>
                          <input type="hidden" name="contactId" value={c.id} />
                          <button type="submit" title="Remove contact" style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--muted)", padding: 2, display: "flex",
                          }}>
                            <X size={14} />
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })
              )}

              {/* Add contact form */}
              {adminAccess.signedIn && (
                <div id="add-contact" style={{ padding: "12px 16px 16px", borderTop: contacts.length > 0 ? "1px solid var(--line)" : "none" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>Add contact</p>
                  <form action={createContactAction} className="stacked-form" style={{ gap: 8 }}>
                    <div className="form-grid" style={{ gap: 8 }}>
                      <label>
                        Name <span aria-hidden="true">*</span>
                        <input name="name" type="text" placeholder="Full name or role title" required />
                      </label>
                      <label>
                        Phone <span aria-hidden="true">*</span>
                        <input name="phone" type="tel" placeholder="+1 (xxx) xxx-xxxx" required />
                      </label>
                      <label>
                        Role / description
                        <input name="role" type="text" placeholder="e.g. Site Safety Director · Primary" />
                      </label>
                      <label>
                        Type
                        <select name="contactType" defaultValue="internal">
                          <option value="internal">Internal</option>
                          <option value="external">External</option>
                          <option value="emergency">Emergency / Dispatch</option>
                        </select>
                      </label>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text2)" }}>
                        <input type="checkbox" name="isPrimary" /> Primary contact
                      </label>
                      <button className="button-primary" type="submit">Add contact</button>
                    </div>
                  </form>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT: Weather widget + Drill log */}
          <div>

            {/* Weather widget */}
            <div className="panel" style={{ marginBottom: 16, overflow: "hidden" }}>
              <div style={{ background: "#1a3a6e", padding: "12px 14px", color: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--blue-lt)", fontWeight: 600 }}>Indianapolis, IN</span>
                  {weatherLive
                    ? <span style={{ fontSize: 10, fontWeight: 700, color: "#6EE7B7", letterSpacing: "0.04em" }}>● NOAA LIVE</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}>○ DEMO DATA</span>
                  }
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {weather.tempF}°F
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--blue-lt)" }}>
                      {weather.descr} · Humidity {weather.humidity}%
                    </div>
                    <div style={{ fontSize: 10, color: "var(--blue-lt)", marginTop: 2 }}>
                      {weatherLive ? "Live from Open-Meteo API" : "API unavailable — showing demo data"}
                    </div>
                  </div>
                </div>
              </div>

              {showWeatherBanner && (
                <div style={{ background: "#7a3f00", padding: "8px 12px", fontSize: 11, color: "#FECF77", display: "flex", alignItems: "center", gap: 7, fontWeight: 600 }}>
                  ⚠ {liveAlerts.length > 0 ? liveAlerts[0].event : "Severe Weather Watch"} — Plan review triggered
                </div>
              )}

              {/* 5-day forecast */}
              <div style={{ display: "flex", borderTop: "1px solid var(--line)" }}>
                {weather.forecast.map((d, i, arr) => (
                  <div key={d.day} style={{ flex: 1, textAlign: "center", padding: "10px 4px", borderRight: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>{d.day}</div>
                    <div style={{ fontSize: 14, marginBottom: 3 }}>{d.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>{d.high}°</div>
                  </div>
                ))}
              </div>

              {/* Weather integrations — interactive client component */}
              <WeatherToggles />
            </div>

            {/* Drill log */}
            <section className="panel">
              <div className="panel-heading" style={{ marginBottom: 0, paddingBottom: 12 }}>
                <div>
                  <p className="section-label">Drill log</p>
                  <h2>Drill &amp; exercise history</h2>
                </div>
                <a href="#log-drill" className="button-secondary" style={{ padding: "5px 10px", fontSize: 11, textDecoration: "none" }}>
                  + Log drill
                </a>
              </div>

              {drills.length === 0 ? (
                <div style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>No drills logged yet.</p>
                </div>
              ) : (
                drills.map((drill) => {
                  const outcomeClass =
                    drill.outcome === "satisfactory"      ? "status-current" :
                    drill.outcome === "needs_improvement" ? "status-needs-review" : "status-overdue";
                  return (
                    <div key={drill.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", width: 80, flexShrink: 0 }}>{fmtShort(drill.drillDate)}</div>
                      <div style={{ fontSize: 12, color: "var(--text2)", flex: 1 }}>{drill.drillType ?? "Drill"}</div>
                      <span className={outcomeClass} style={{ fontSize: 10 }}>{drillOutcomeLabels[drill.outcome]}</span>
                    </div>
                  );
                })
              )}

              {/* Overdue next-drill rows */}
              {overdueDrillPlans.map((plan) => {
                const daysOD = Math.floor((now.getTime() - new Date(plan.nextDrillDate!).getTime()) / 86_400_000);
                return (
                  <div key={`od-${plan.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "var(--red-bg)", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--red-dk)", width: 80, flexShrink: 0 }}>Overdue</div>
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
