export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { listPlans, listSteps, listContacts, type PlanType } from "@/lib/supabase/emergency-service";
import { toggleStepAction } from "../actions";

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

type Props = { searchParams: Promise<{ plan?: string }> };

export default async function EmergencyRespondPage({ searchParams }: Props) {
  const { plan: planId } = await searchParams;

  const [plans, contacts] = await Promise.all([
    listPlans().catch(() => []),
    listContacts().catch(() => []),
  ]);

  const plan = (planId ? plans.find(p => p.id === planId) : null) ?? plans[0] ?? null;

  const steps = plan
    ? await listSteps(plan.id).catch(() => [])
    : [];

  const doneCount = steps.filter(s => s.completedAt).length;
  const firstIncomplete = steps.findIndex(s => !s.completedAt);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0F1B2D",
      color: "#F0F4FF",
      fontFamily: "system-ui, -apple-system, sans-serif",
      paddingBottom: 32,
    }}>

      {/* Header strip */}
      <div style={{
        background: "#C0392B",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#FECACA" }}>
          ⚡ Emergency Response
        </span>
        <Link
          href={`/emergency-response${plan ? `?plan=${plan.id}` : ""}`}
          style={{ fontSize: 11, color: "#FECACA", textDecoration: "none", fontWeight: 600 }}
        >
          ← Full plan
        </Link>
      </div>

      {/* Plan selector (if multiple plans) */}
      {plans.length > 1 && (
        <div style={{ padding: "8px 16px", overflowX: "auto", display: "flex", gap: 8, background: "#1a2d47", borderBottom: "1px solid #2a3d5a" }}>
          {plans.map(p => (
            <Link
              key={p.id}
              href={`/emergency-response/respond?plan=${p.id}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: plan?.id === p.id ? "#C0392B" : "#2a3d5a",
                color: plan?.id === p.id ? "#fff" : "#94A3B8",
                textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {PLAN_EMOJI[p.planType]} {p.title}
            </Link>
          ))}
        </div>
      )}

      {!plan ? (
        <div style={{ padding: 24, textAlign: "center", color: "#94A3B8" }}>
          <p>No emergency response plans found.</p>
          <Link href="/emergency-response" style={{ color: "#60A5FA", fontSize: 14 }}>Set up plans →</Link>
        </div>
      ) : (
        <>
          {/* Plan title */}
          <div style={{ padding: "20px 16px 12px" }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>{PLAN_EMOJI[plan.planType]}</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#F0F4FF", letterSpacing: "-0.02em" }}>
              {plan.title}
            </h1>
            {steps.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>
                {doneCount}/{steps.length} steps complete
              </div>
            )}
          </div>

          {/* Progress bar */}
          {steps.length > 0 && (
            <div style={{ height: 4, background: "#1a2d47", margin: "0 16px 20px" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: doneCount === steps.length ? "#22C55E" : "#3B82F6",
                width: `${Math.round((doneCount / steps.length) * 100)}%`,
                transition: "width 0.3s",
              }} />
            </div>
          )}

          {/* Steps */}
          {steps.length === 0 ? (
            <div style={{ padding: "16px", color: "#94A3B8", textAlign: "center", fontSize: 14 }}>
              No response steps configured for this plan.
            </div>
          ) : (
            <div style={{ padding: "0 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#64748B", textTransform: "uppercase", marginBottom: 10 }}>
                Response Steps
              </div>
              {steps.map((step, i) => {
                const status =
                  step.completedAt ? "done" :
                  i === firstIncomplete ? "active" : "pending";

                return (
                  <form key={step.id} action={toggleStepAction} style={{ display: "contents" }}>
                    <input type="hidden" name="stepId"    value={step.id} />
                    <input type="hidden" name="planId"    value={plan.id} />
                    <input type="hidden" name="completed" value={step.completedAt ? "false" : "true"} />
                    <button
                      type="submit"
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        width: "100%", border: "none", cursor: "pointer", textAlign: "left",
                        padding: "14px 16px", marginBottom: 8, borderRadius: 12,
                        background:
                          status === "done"   ? "rgba(34,197,94,0.12)" :
                          status === "active" ? "rgba(59,130,246,0.18)" :
                          "rgba(255,255,255,0.04)",
                        borderLeft:
                          status === "done"   ? "3px solid #22C55E" :
                          status === "active" ? "3px solid #3B82F6" :
                          "3px solid transparent",
                      }}
                    >
                      {/* Circle */}
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 800,
                        background:
                          status === "done"   ? "#22C55E" :
                          status === "active" ? "#3B82F6" :
                          "rgba(255,255,255,0.1)",
                        color: status === "pending" ? "#94A3B8" : "#fff",
                      }}>
                        {status === "done" ? "✓" : status === "active" ? "›" : step.stepNumber}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 15, fontWeight: 600,
                          color: status === "done" ? "#64748B" : "#F0F4FF",
                          textDecoration: status === "done" ? "line-through" : "none",
                        }}>
                          {step.text}
                        </div>
                        {step.isRequired && status !== "done" && (
                          <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginTop: 2 }}>
                            REQUIRED
                          </div>
                        )}
                      </div>
                    </button>
                  </form>
                );
              })}

              {doneCount === steps.length && steps.length > 0 && (
                <div style={{
                  textAlign: "center", padding: "20px 16px",
                  background: "rgba(34,197,94,0.12)", borderRadius: 12, marginTop: 8,
                  border: "1px solid rgba(34,197,94,0.3)",
                }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#22C55E" }}>All steps complete</div>
                  <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>Document this response in the drill log</div>
                </div>
              )}
            </div>
          )}

          {/* Emergency Contacts */}
          {contacts.length > 0 && (
            <div style={{ padding: "24px 16px 0" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#64748B", textTransform: "uppercase", marginBottom: 10 }}>
                Emergency Contacts
              </div>
              {contacts.map((c) => (
                <a
                  key={c.id}
                  href={`tel:${c.phone.replace(/\D/g, "")}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", marginBottom: 8, borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", textDecoration: "none",
                    border: c.isPrimary ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                    background: c.contactType === "emergency" ? "#C0392B" : c.contactType === "internal" ? "#1E3A5F" : "#374151",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, color: "#fff",
                  }}>
                    {(c.name.split(" ").map(w => w[0]).join("").slice(0, 2)).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#F0F4FF" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.role || c.contactType}</div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: "#60A5FA",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    📞 {c.phone}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div style={{ padding: "24px 16px 0", textAlign: "center", color: "#475569", fontSize: 11 }}>
            Last loaded: {new Date().toLocaleTimeString()}<br />
            <Link href={`/emergency-response/respond?plan=${plan.id}`} style={{ color: "#3B82F6", fontWeight: 600 }}>
              Reload
            </Link>
            {" · "}
            <Link href="/emergency-response" style={{ color: "#3B82F6", fontWeight: 600 }}>
              Full view
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
