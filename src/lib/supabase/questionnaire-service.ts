// Manual v1.1 — Client Setup Questionnaire responses service.
import { createSupabaseServerClient } from "./server";
import { getProfileContext } from "./data-helpers";
import { isSupabaseConfigured } from "./env";
import { SETUP_QUESTIONS } from "@/lib/manual/setup-questions";

export type QuestionnaireResponse = {
  questionNumber: number;
  questionDomain: string | null;
  questionText: string | null;
  answer: string | null;
  notes: string | null;
  answeredAt?: string | null;
};

export type ServiceResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function listQuestionnaireResponses(): Promise<QuestionnaireResponse[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const ctx = await getProfileContext();
    if (!ctx) return [];
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("client_setup_questionnaire_responses")
      .select("question_number,question_domain,question_text,answer,notes,answered_at")
      .eq("organization_id", ctx.organizationId)
      .order("question_number", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      questionNumber: r.question_number as number,
      questionDomain: (r.question_domain as string) ?? null,
      questionText: (r.question_text as string) ?? null,
      answer: (r.answer as string) ?? null,
      notes: (r.notes as string) ?? null,
      answeredAt: (r.answered_at as string) ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * Cheap gate check: has this org saved any questionnaire answers yet? Used to
 * require first-time setup before the workspace opens. Fails open — a missing
 * connection or transient error never traps the user behind the gate.
 */
export async function hasCompletedSetupQuestionnaire(): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  try {
    const ctx = await getProfileContext();
    if (!ctx) return true; // not signed in / no org — other guards handle this
    const supabase = await createSupabaseServerClient();
    const { count, error } = await supabase
      .from("client_setup_questionnaire_responses")
      .select("question_number", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId);
    if (error) throw error;
    return (count ?? 0) > 0;
  } catch {
    return true;
  }
}

/** Upsert all answers from a submitted questionnaire (one row per question). */
export async function saveQuestionnaireResponses(
  answers: { questionNumber: number; answer: string; notes?: string }[]
): Promise<ServiceResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Workspace not connected. Sign in to save your questionnaire." };
  const ctx = await getProfileContext();
  if (!ctx) return { ok: false, message: "Sign in to save your questionnaire." };
  const supabase = await createSupabaseServerClient();

  const rows = answers.map((a) => {
    const q = SETUP_QUESTIONS.find((x) => x.number === a.questionNumber);
    return {
      organization_id: ctx.organizationId,
      question_number: a.questionNumber,
      question_domain: q?.domain ?? null,
      question_text: q?.text ?? null,
      answer: a.answer,
      notes: a.notes ?? null,
      answered_by: ctx.userId,
      answered_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase
    .from("client_setup_questionnaire_responses")
    .upsert(rows, { onConflict: "organization_id,question_number" });

  if (error) return { ok: false, message: `Could not save: ${error.message}` };
  return { ok: true, message: "Setup questionnaire saved." };
}
