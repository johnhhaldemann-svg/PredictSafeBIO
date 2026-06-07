"use server";

import { redirect } from "next/navigation";
import { saveQuestionnaireResponses } from "@/lib/supabase/questionnaire-service";
import { runApplicabilityEngine } from "@/lib/supabase/applicability-engine";
import { SETUP_QUESTIONS } from "@/lib/manual/setup-questions";
import { authMessage, authSuccess } from "@/lib/auth-routing";

const PATH = "/assess/setup-questionnaire";

export async function saveQuestionnaireAction(formData: FormData) {
  const answers = SETUP_QUESTIONS.map((q) => ({
    questionNumber: q.number,
    answer: String(formData.get(`q_${q.number}`) ?? "").trim(),
    notes: String(formData.get(`note_${q.number}`) ?? "").trim() || undefined,
  })).filter((a) => a.answer !== "");

  if (answers.length === 0) {
    redirect(authMessage(PATH, "Answer at least one question before saving."));
  }

  const saved = await saveQuestionnaireResponses(answers);
  if (!saved.ok) redirect(authMessage(PATH, saved.message));

  const runEngine = String(formData.get("runEngine") ?? "") === "1";
  if (runEngine) {
    const eng = await runApplicabilityEngine();
    redirect(eng.ok ? authSuccess(PATH, eng.message) : authMessage(PATH, eng.message));
  }
  redirect(authSuccess(PATH, saved.message));
}
