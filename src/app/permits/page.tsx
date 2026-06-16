export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import {
  listPermits,
  permitTypeLabels,
  type PermitRecord,
  type PermitType,
  type CloseoutStatus,
} from "@/lib/supabase/permits-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { getAuthSummary } from "@/lib/supabase/account-service";
import WorkPermits, { type Permit, type Control } from "@/components/WorkPermits";

export const metadata: Metadata = { title: "Work Permits – PredictSafe" };

/* ─── Permit-type icons ─────────────────────────────────────────────────── */

const ICON_MAP: Record<PermitType, string> = {
  hot_work:         "🔥",
  loto:             "🔒",
  contractor:       "👷",
  confined_space:   "⚠️",
  line_break:       "🔧",
  cleanroom:        "🧬",
  utility_shutdown: "⚡",
  chemical_transfer:"🧪",
};

/* ─── Control-key → human label ─────────────────────────────────────────── */

const CONTROL_LABELS: Record<string, string> = {
  fire_watch:           "Fire watch assigned",
  fire_extinguisher:    "Extinguisher staged",
  combustibles_cleared: "Combustibles cleared (10 m)",
  permit_posted:        "Hot-work permit posted",
  gas_test:             "Gas / atmosphere test logged",
  loto_applied:         "LOTO applied",
  zero_energy_verified: "Zero-energy verified",
  tags_applied:         "Tags applied",
  staff_notified:       "Affected staff notified",
  energy_identified:    "Energy sources identified",
  isolation_locked:     "Isolation points locked",
  contractor_induction: "Contractor induction complete",
  insurance_on_file:    "Insurance / COI on file",
  biosafety_briefing:   "Biosafety briefing",
  decontamination_plan: "Decontamination plan",
  airflow_lockout:      "BSC / airflow lockout",
  ppe_required:         "PPE requirements confirmed",
  escort_required:      "Escort assigned",
  ventilation:          "Ventilation verified",
};

/* ─── Status map ────────────────────────────────────────────────────────── */

const STATUS_MAP: Record<CloseoutStatus, Permit["status"]> = {
  draft:            "draft",
  pending_approval: "draft",
  approved:         "approved",
  active:           "active",
  closed:           "closed",
  voided:           "closed",
};

/* ─── Mapping ───────────────────────────────────────────────────────────── */

function mapRecord(p: PermitRecord): Permit {
  const now     = new Date().getTime();
  const startMs = p.startTime ? new Date(p.startTime).getTime() : null;
  const stopMs  = p.stopTime  ? new Date(p.stopTime).getTime()  : null;

  // Controls — each key maps to a label; all marked done if isolationVerified
  const controls: Control[] = (p.requiredControls ?? []).map((key) => ({
    label: CONTROL_LABELS[key] ?? key.replace(/_/g, " "),
    done:  p.isolationVerified,
  }));
  if (controls.length === 0) {
    controls.push({ label: "No controls specified", done: false });
  }

  // Clock
  let clock      = "Draft";
  let clockState: Permit["clockState"] = "draft";
  if (p.closeoutStatus !== "draft" && p.closeoutStatus !== "pending_approval") {
    if (startMs && startMs > now) {
      const hrs = Math.round((startMs - now) / 3_600_000);
      clock = `Starts in ${hrs} h`; clockState = "scheduled";
    } else if (startMs) {
      const hrs = Math.round((now - startMs) / 3_600_000);
      clock = `Open ${hrs} h`; clockState = p.isOverdue ? "over" : "ok";
    }
  }

  // Window label
  const fmt = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleString("en-US", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "";
  const window = startMs
    ? `Started ${fmt(p.startTime)} · Ends ${stopMs ? fmt(p.stopTime) : "TBD"}`
    : stopMs
    ? `Ends ${fmt(p.stopTime)}`
    : "Not scheduled";

  return {
    id:         p.id,
    type:       permitTypeLabels[p.permitType],
    icon:       ICON_MAP[p.permitType] ?? "📋",
    status:     STATUS_MAP[p.closeoutStatus] ?? "draft",
    over24:     p.isOverdue,
    location:   p.location ?? "Unknown location",
    work:       p.taskDescription ?? "No description",
    window,
    clock,
    clockState,
    hazards:    p.hazards ?? [],
    controls,
    holder:     p.createdBy ?? "Unknown",
    issuedBy:   "Facilities",
    approvedBy: (p.closeoutStatus === "approved" || p.closeoutStatus === "active")
      ? "EHS Manager" : null,
  };
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

function safeSettle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export default async function PermitsPage() {
  const [permitsResult, adminAccess, auth] = await Promise.all([
    safeSettle(listPermits(), null),
    safeSettle(getFoundationAdminAccessSummary(), {
      configured: false, signedIn: false, isOwner: false, message: "",
    }),
    safeSettle(getAuthSummary(), {
      configured: false, signedIn: false, needsOnboarding: false,
    }),
  ]);

  const permits = permitsResult ? permitsResult.map(mapRecord) : undefined;

  return (
    <WorkPermits
      permits={permits}
      auth={{
        isSignedIn: adminAccess.signedIn,
        isOwner:    adminAccess.isOwner,
        userEmail:  auth.userEmail ?? null,
      }}
    />
  );
}
