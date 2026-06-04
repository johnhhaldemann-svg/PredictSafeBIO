/**
 * Supabase Edge Function: inspection-scheduler
 *
 * Runs daily via Supabase cron to auto-create planned inspection records
 * for every org that has overdue or upcoming compliance obligations.
 * Also sends assignee notification emails via Resend.
 *
 * Cron schedule: 0 8 * * *  (08:00 UTC daily)
 *
 * Manual trigger (e.g. on onboarding):
 *   POST /functions/v1/inspection-scheduler
 *   Body: { "org_id": "<uuid>" }   ← scope to one org
 *   Body: {}                        ← run for all active orgs
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://predictsafebio.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Scheduling rules (mirror of inspection-service.ts — kept in sync manually)
// ---------------------------------------------------------------------------

type InspectionType = string;

const SCHEDULE_RULES: Record<InspectionType, { frequencyDays: number; label: string; rationale: string; category: string }> = {
  eyewash:             { frequencyDays: 7,   label: "Weekly",      rationale: "ANSI Z358.1 requires weekly eyewash activation.",                            category: "Physical Safety" },
  waste_management:    { frequencyDays: 7,   label: "Weekly",      rationale: "EPA 40 CFR 262.15 requires weekly satellite area inspections.",               category: "Environmental" },
  lab_safety:          { frequencyDays: 30,  label: "Monthly",     rationale: "OSHA 29 CFR 1910.1450 requires monthly lab safety walkthroughs.",             category: "Lab & Biosafety" },
  chemical_hygiene:    { frequencyDays: 30,  label: "Monthly",     rationale: "Chemical hygiene plan requires monthly chemical storage review.",             category: "Lab & Biosafety" },
  fire_safety:         { frequencyDays: 30,  label: "Monthly",     rationale: "NFPA 10 requires monthly fire extinguisher inspection.",                      category: "Physical Safety" },
  emergency_equipment: { frequencyDays: 30,  label: "Monthly",     rationale: "OSHA requires monthly emergency equipment readiness checks.",                 category: "Physical Safety" },
  first_aid:           { frequencyDays: 30,  label: "Monthly",     rationale: "OSHA 29 CFR 1910.151 requires monthly first aid kit checks.",                 category: "Physical Safety" },
  spill_kit:           { frequencyDays: 30,  label: "Monthly",     rationale: "Spill kits must be inventoried monthly.",                                     category: "Lab & Biosafety" },
  incident_followup:   { frequencyDays: 30,  label: "Within 30d",  rationale: "OSHA best practices require follow-up within 30 days of any incident.",       category: "Compliance" },
  biosafety:           { frequencyDays: 90,  label: "Quarterly",   rationale: "CDC/NIH guidelines recommend quarterly biosafety cabinet certification.",     category: "Lab & Biosafety" },
  ppe:                 { frequencyDays: 90,  label: "Quarterly",   rationale: "OSHA 29 CFR 1910.132 requires regular PPE assessment.",                       category: "Physical Safety" },
  self:                { frequencyDays: 90,  label: "Quarterly",   rationale: "Quarterly self-inspections provide ongoing EHS compliance verification.",     category: "Audit" },
  training_records:    { frequencyDays: 90,  label: "Quarterly",   rationale: "OSHA training requirements need quarterly compliance gap checks.",            category: "Compliance" },
  facility:            { frequencyDays: 90,  label: "Quarterly",   rationale: "Quarterly facility inspections identify infrastructure deficiencies.",        category: "Facility" },
  stormwater:          { frequencyDays: 90,  label: "Quarterly",   rationale: "EPA NPDES SWPPP regulations require quarterly inspections.",                  category: "Environmental" },
  waste_disposal:      { frequencyDays: 90,  label: "Quarterly",   rationale: "EPA RCRA requires quarterly hazardous waste disposal review.",                category: "Environmental" },
  equipment:           { frequencyDays: 180, label: "Semi-annual", rationale: "Equipment calibration review every 6 months per GLP/GMP standards.",         category: "Facility" },
  bloodborne_pathogens:{ frequencyDays: 365, label: "Annual",      rationale: "OSHA 29 CFR 1910.1030 mandates annual Exposure Control Plan review.",         category: "Lab & Biosafety" },
  loto:                { frequencyDays: 365, label: "Annual",      rationale: "OSHA 29 CFR 1910.147 requires annual LOTO certification.",                    category: "Physical Safety" },
  ergonomics:          { frequencyDays: 365, label: "Annual",      rationale: "Annual ergonomics walkthroughs reduce MSD risk.",                             category: "Physical Safety" },
  internal:            { frequencyDays: 365, label: "Annual",      rationale: "ISO 45001 requires at least one annual internal EHS audit.",                  category: "Audit" },
  regulatory:          { frequencyDays: 365, label: "Annual",      rationale: "Annual readiness assessment for regulatory agency inspections.",              category: "Audit" },
  supplier:            { frequencyDays: 365, label: "Annual",      rationale: "ISO 14001 / 45001 mandate at least annual supplier EHS audits.",              category: "Audit" },
  pre_regulatory:      { frequencyDays: 365, label: "Annual",      rationale: "Annual mock regulatory inspection catches gaps before agency visit.",         category: "Audit" },
  external:            { frequencyDays: 730, label: "Every 2 yrs", rationale: "External third-party EHS audits required every 2 years.",                     category: "Audit" },
};

const CATEGORY_ROLES: Record<string, string[]> = {
  "Lab & Biosafety":  ["safety_manager", "auditor", "owner", "admin"],
  "Physical Safety":  ["safety_manager", "owner", "admin"],
  "Environmental":    ["safety_manager", "auditor", "owner", "admin"],
  "Audit":            ["auditor", "safety_manager", "owner", "admin"],
  "Compliance":       ["auditor", "safety_manager", "owner", "admin"],
  "Facility":         ["safety_manager", "owner", "admin"],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeRecommendations(
  completed: Array<{ auditType: string; completedAt: string | null; scheduledFor: string | null }>
) {
  const now = Date.now();
  const lastMap = new Map<string, Date>();
  for (const r of completed) {
    const d = new Date(r.completedAt ?? r.scheduledFor ?? "");
    if (isNaN(d.getTime())) continue;
    const existing = lastMap.get(r.auditType);
    if (!existing || d > existing) lastMap.set(r.auditType, d);
  }

  const recs: Array<{ type: string; label: string; dueDate: string; daysUntilDue: number; category: string }> = [];

  for (const [type, rule] of Object.entries(SCHEDULE_RULES)) {
    const last = lastMap.get(type) ?? null;
    const dueDate = last
      ? new Date(last.getTime() + rule.frequencyDays * 86400000)
      : new Date(now - rule.frequencyDays * 86400000);
    const daysUntilDue = Math.floor((dueDate.getTime() - now) / 86400000);
    if (daysUntilDue > 30) continue;
    recs.push({ type, label: rule.label, dueDate: dueDate.toISOString().slice(0, 10), daysUntilDue, category: rule.category });
  }

  return recs.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

function pickAssignee(category: string, members: Array<{ id: string; role: string | null }>): string | null {
  const preferred = CATEGORY_ROLES[category] ?? ["owner", "admin", "safety_manager"];
  for (const role of preferred) {
    const m = members.find((u) => u.role === role);
    if (m) return m.id;
  }
  return members[0]?.id ?? null;
}

async function sendAssigneeEmail(opts: {
  to: string;
  name: string;
  inspections: Array<{ label: string; dueDate: string; daysUntilDue: number }>;
}) {
  if (!RESEND_API_KEY) return;
  const overdueList = opts.inspections.filter((i) => i.daysUntilDue < 0);
  const upcomingList = opts.inspections.filter((i) => i.daysUntilDue >= 0);

  const rows = (items: typeof opts.inspections) =>
    items
      .map(
        (i) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i.label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${i.daysUntilDue < 0 ? "#b91c1c" : "#1d4ed8"}">
              ${i.daysUntilDue < 0 ? `${Math.abs(i.daysUntilDue)}d overdue` : `Due in ${i.daysUntilDue}d`}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i.dueDate}</td>
          </tr>`
      )
      .join("");

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#111827">
      <div style="background:#1e3a5f;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">PredictSafeBIO — Compliance Calendar</h1>
        <p style="color:#93c5fd;margin:4px 0 0">AI-generated inspection assignments</p>
      </div>
      <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p>Hi ${opts.name},</p>
        <p>The AI compliance calendar has assigned the following inspections to you:</p>
        ${
          overdueList.length > 0
            ? `<h3 style="color:#b91c1c;margin-top:24px">⚠ Overdue (${overdueList.length})</h3>
               <table style="width:100%;border-collapse:collapse;font-size:14px">
                 <thead><tr style="background:#fef2f2"><th style="text-align:left;padding:8px 12px">Inspection</th><th style="text-align:left;padding:8px 12px">Status</th><th style="text-align:left;padding:8px 12px">Due Date</th></tr></thead>
                 <tbody>${rows(overdueList)}</tbody>
               </table>`
            : ""
        }
        ${
          upcomingList.length > 0
            ? `<h3 style="color:#1d4ed8;margin-top:24px">📋 Upcoming (${upcomingList.length})</h3>
               <table style="width:100%;border-collapse:collapse;font-size:14px">
                 <thead><tr style="background:#eff6ff"><th style="text-align:left;padding:8px 12px">Inspection</th><th style="text-align:left;padding:8px 12px">Status</th><th style="text-align:left;padding:8px 12px">Due Date</th></tr></thead>
                 <tbody>${rows(upcomingList)}</tbody>
               </table>`
            : ""
        }
        <div style="margin-top:32px">
          <a href="${APP_URL}/inspections" style="background:#1e3a5f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
            Open Inspection Dashboard →
          </a>
        </div>
        <p style="margin-top:24px;font-size:13px;color:#6b7280">
          These assignments were auto-generated based on regulatory requirements and your organization's inspection history.
          You can reassign or reschedule from the Inspections page.
        </p>
      </div>
    </div>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "PredictSafeBIO <notifications@predictsafebio.com>",
      to: opts.to,
      subject: `[PredictSafeBIO] ${opts.inspections.length} inspection${opts.inspections.length !== 1 ? "s" : ""} assigned to you`,
      html,
    }),
  });
}

// ---------------------------------------------------------------------------
// Per-org scheduling
// ---------------------------------------------------------------------------

async function scheduleForOrg(
  supabase: ReturnType<typeof createClient>,
  orgId: string
): Promise<{ created: number; skipped: number; orgId: string }> {
  // Completed inspections
  const { data: completedRows } = await supabase
    .from("audits")
    .select("audit_type, completed_at, scheduled_for")
    .eq("organization_id", orgId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(500);

  const recs = computeRecommendations(
    (completedRows ?? []).map((r: { audit_type: string; completed_at: string | null; scheduled_for: string | null }) => ({
      auditType: r.audit_type,
      completedAt: r.completed_at,
      scheduledFor: r.scheduled_for,
    }))
  );
  if (!recs.length) return { created: 0, skipped: 0, orgId };

  // Existing pending records
  const { data: existingRows } = await supabase
    .from("audits")
    .select("audit_type")
    .eq("organization_id", orgId)
    .in("status", ["planned", "in_progress"]);

  const alreadyScheduled = new Set<string>((existingRows ?? []).map((r: { audit_type: string }) => r.audit_type));

  // Members for assignment
  const { data: members } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  const orgMembers: Array<{ id: string; role: string | null; full_name: string | null; email: string | null }> =
    members ?? [];

  // Create planned records
  const toCreate = recs.filter((r) => !alreadyScheduled.has(r.type));
  let created = 0;
  const skipped = recs.length - toCreate.length;

  // Group by assignee for email batching
  const assigneeInspections = new Map<string, { name: string; email: string; inspections: typeof toCreate }>();

  for (const rec of toCreate) {
    const assigneeId = pickAssignee(rec.category, orgMembers);
    const { data, error } = await supabase
      .from("audits")
      .insert({
        organization_id: orgId,
        title: SCHEDULE_RULES[rec.type]
          ? `${rec.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — AI Scheduled`
          : rec.type,
        audit_type: rec.type,
        status: "planned",
        scheduled_for: rec.dueDate,
        next_due_date: rec.dueDate,
        auto_generated: true,
        assigned_to: assigneeId,
        created_by: assigneeId,
      })
      .select("id")
      .single();

    if (error || !data) continue;
    created++;

    if (assigneeId) {
      const member = orgMembers.find((m) => m.id === assigneeId);
      if (member?.email) {
        const key = assigneeId;
        if (!assigneeInspections.has(key)) {
          assigneeInspections.set(key, {
            name: member.full_name ?? "Team member",
            email: member.email,
            inspections: [],
          });
        }
        assigneeInspections.get(key)!.inspections.push(rec);
      }
    }
  }

  // Send email per assignee (best-effort)
  if (RESEND_API_KEY) {
    for (const { name, email, inspections } of assigneeInspections.values()) {
      try {
        await sendAssigneeEmail({
          to: email,
          name,
          inspections: inspections.map((i) => ({
            label: i.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            dueDate: i.dueDate,
            daysUntilDue: i.daysUntilDue,
          })),
        });
      } catch {
        // best-effort — never block on email failure
      }
    }
  }

  return { created, skipped, orgId };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Allow cron invocation (no auth header) OR service-role auth
  const authHeader = req.headers.get("Authorization");
  if (authHeader && !authHeader.includes(SUPABASE_SERVICE_ROLE_KEY)) {
    // Validate it's a valid user token via Supabase
    const supabaseCheck = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabaseCheck.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let targetOrgId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    targetOrgId = body.org_id ?? null;
  } catch {
    // no body — run for all orgs
  }

  const results: Array<{ created: number; skipped: number; orgId: string }> = [];

  if (targetOrgId) {
    // Single org mode (onboarding / manual trigger)
    const result = await scheduleForOrg(supabase, targetOrgId);
    results.push(result);
  } else {
    // All-orgs mode (daily cron)
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id")
      .eq("status", "active")
      .limit(500);

    for (const org of orgs ?? []) {
      try {
        const result = await scheduleForOrg(supabase, org.id);
        results.push(result);
      } catch {
        // Never let one org failure break the rest
      }
    }
  }

  const totalCreated = results.reduce((n, r) => n + r.created, 0);
  const totalSkipped = results.reduce((n, r) => n + r.skipped, 0);

  return new Response(
    JSON.stringify({
      ok: true,
      orgs: results.length,
      totalCreated,
      totalSkipped,
      results,
    }),
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
