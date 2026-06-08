"use server";

import { redirect } from "next/navigation";
import { saveQuestionnaireResponses } from "@/lib/supabase/questionnaire-service";
import { runApplicabilityEngine } from "@/lib/supabase/applicability-engine";
import { SETUP_QUESTIONS } from "@/lib/manual/setup-questions";
import { authMessage, authSuccess } from "@/lib/auth-routing";

const PATH = "/assess/setup-questionnaire";
// Where the user lands once first-time setup is complete.
const WORKSPACE = "/";

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
    if (eng.ok) {
      // Setup complete → move the user into the workspace; questionnaire becomes locked.
      redirect(authSuccess(WORKSPACE, `Setup complete. ${eng.message}`));
    }
    redirect(authMessage(PATH, eng.message));
  }

  // Plain save (editing later) → return to the now-locked questionnaire view.
  redirect(authSuccess(PATH, saved.message));
}
