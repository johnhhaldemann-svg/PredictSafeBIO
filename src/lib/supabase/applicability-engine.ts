// Manual v1.1 — Program Applicability Engine (§5).
// Reads questionnaire answers, decides which catalog programs apply (+ why),
// writes program_applicability_log + per-org compliance_programs, and seeds
// starter risk_register_entries and compliance_calendar_items.
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { SETUP_QUESTIONS, ALWAYS_ON_PROGRAMS, answerIsAffirmative } from "@/lib/manual/setup-questions";

const RR_FREQ = ["daily","weekly","monthly","quarterly","annual","event_triggered","per_change","before_use","per_batch"];

export type EngineResult = {
  ok: boolean;
  message: string;
  enabledCount: number;
  disabledCount: number;
  riskEntriesCreated: number;
  calendarItemsCreated: number;
};

function coerceFreq(f: string | null | undefined): string | null {
  if (!f) return null;
  return RR_FREQ.includes(f) ? f : null;
}

function taskTypeForProgram(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("training")) return "training";
  if (n.includes("committee") || n.includes("management review")) return "committee_meeting";
  if (n.includes("capa")) return "capa";
  if (n.includes("waste")) return "waste_pickup";
  if (n.includes("permit")) return "permit";
  if (n.includes("bsc") || n.includes("fume") || n.includes("autoclave") || n.includes("equipment") || n.includes("cold chain")) return "equipment_check";
  if (n.includes("certification") || n.includes("calibration")) return "certification";
  return "inspection";
}

function dueDateFor(freq: string | null): string {
  const days = freq === "daily" ? 1 : freq === "weekly" ? 7 : freq === "monthly" ? 30
    : freq === "quarterly" ? 90 : freq === "annual" ? 365 : 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function runApplicabilityEngine(): Promise<EngineResult> {
  const base: EngineResult = { ok: false, message: "", enabledCount: 0, disabledCount: 0, riskEntriesCreated: 0, calendarItemsCreated: 0 };
  if (!isSupabaseConfigured()) return { ...base, message: "Workspace not connected." };
  const ctx = await getProfileContext();
  if (!ctx) return { ...base, message: "Sign in to run the applicability engine." };
  const supabase = await createSupabaseServerClient();
  const org = ctx.organizationId;

  // 1. Read answers
  const { data: respData } = await supabase
    .from("client_setup_questionnaire_responses")
    .select("question_number,answer")
    .eq("organization_id", org);
  const answers = new Map<number, string>();
  (respData ?? []).forEach((r: Record<string, unknown>) => answers.set(r.question_number as number, (r.answer as string) ?? ""));

  // 2. Compute enabled set + reasons
  const enabled = new Map<string, string>(); // program -> trigger description
  ALWAYS_ON_PROGRAMS.forEach((p) => enabled.set(p, "All clients (baseline program)."));
  for (const q of SETUP_QUESTIONS) {
    const ans = answers.get(q.number);
    if (answerIsAffirmative(ans)) {
      for (const prog of q.triggers) {
        if (!enabled.has(prog)) enabled.set(prog, `Setup answer Q${q.number}: "${q.text}" = ${ans}`);
      }
    }
  }

  // 3. Read catalog
  const { data: catalog } = await supabase
    .from("program_catalog")
    .select("program_name,activation_trigger,default_frequency,requires_qualified_review,layer");
  const cat = (catalog ?? []) as Record<string, unknown>[];

  // 4. Refresh applicability log + compliance_programs
  await supabase.from("program_applicability_log").delete().eq("organization_id", org);

  const logRows: Record<string, unknown>[] = [];
  const programRows: Record<string, unknown>[] = [];
  let enabledCount = 0, disabledCount = 0;

  for (const c of cat) {
    const name = c.program_name as string;
    const isOn = enabled.has(name);
    const reason = isOn ? (enabled.get(name) as string) : "No matching setup trigger recorded; left disabled but re-activatable.";
    if (isOn) enabledCount++; else disabledCount++;
    logRows.push({
      organization_id: org,
      program_name: name,
      status: isOn ? "enabled" : "disabled",
      trigger_type: isOn ? (ALWAYS_ON_PROGRAMS.includes(name) ? "regulatory" : "setup_answer") : null,
      trigger_description: reason,
      activated_by: ctx.userId,
      activated_at: new Date().toISOString(),
      disabled_rationale: isOn ? null : reason,
      revalidation_required: false,
    });
    programRows.push({
      organization_id: org,
      program_name: name,
      program_type: (c.layer as string) ?? "core",
      status: isOn ? "draft_human_review_required" : "disabled",
      activation_trigger: (c.activation_trigger as string) ?? null,
      disabled_rationale: isOn ? null : reason,
      requires_qualified_review: (c.requires_qualified_review as boolean) ?? true,
      human_review_required: true,
    });
  }

  if (logRows.length) await supabase.from("program_applicability_log").insert(logRows);
  if (programRows.length) await supabase.from("compliance_programs").upsert(programRows, { onConflict: "organization_id,program_name" });

  // 5. Seed starter risk_register_entries for newly enabled programs
  const { data: existingRR } = await supabase
    .from("risk_register_entries").select("program_name").eq("organization_id", org);
  const seeded = new Set((existingRR ?? []).map((r: Record<string, unknown>) => r.program_name as string));

  let riskEntriesCreated = 0, calendarItemsCreated = 0;
  for (const c of cat) {
    const name = c.program_name as string;
    if (!enabled.has(name) || seeded.has(name)) continue;
    const freq = coerceFreq(c.default_frequency as string);
    const { data: ins, error: insErr } = await supabase
      .from("risk_register_entries")
      .insert({
        organization_id: org,
        program_name: name,
        risk_item: `${name} — program requirement`,
        source_basis: `Activated by setup: ${enabled.get(name)}`,
        control_type: "administrative",
        control_description: `Maintain ${name} controls per program requirements.`,
        frequency: freq,
        evidence_required: ["checklist"],
        inherent_risk: "medium",
        residual_risk: "medium",
        status: "draft",
        audit_question: `Is the ${name} program current and evidenced?`,
        created_by: ctx.userId,
      })
      .select("id").single();
    if (insErr || !ins) continue;
    riskEntriesCreated++;
    const due = dueDateFor(freq);
    const { error: calErr } = await supabase.from("compliance_calendar_items").insert({
      organization_id: org,
      risk_register_entry_id: (ins as Record<string, unknown>).id as string,
      task_name: `${name} — ${taskTypeForProgram(name).replace("_", " ")}`,
      task_type: taskTypeForProgram(name),
      frequency: freq,
      due_date: due,
      status: "scheduled",
    });
    if (!calErr) calendarItemsCreated++;
  }

  return {
    ok: true,
    message: `Applicability engine complete: ${enabledCount} programs enabled, ${disabledCount} disabled, ${riskEntriesCreated} risk register entries and ${calendarItemsCreated} calendar tasks created.`,
    enabledCount, disabledCount, riskEntriesCreated, calendarItemsCreated,
  };
}
