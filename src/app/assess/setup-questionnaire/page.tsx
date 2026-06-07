export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AiDraftBanner } from "@/components/AiDraftBanner";
import { SETUP_QUESTIONS } from "@/lib/manual/setup-questions";
import { listQuestionnaireResponses } from "@/lib/supabase/questionnaire-service";
import { saveQuestionnaireAction } from "./actions";

export const metadata: Metadata = { title: "Setup Questionnaire – PredictSafeBIO" };

type Props = { searchParams: Promise<{ message?: string; success?: string }> };

const DOMAIN_ORDER = [
  "Company & Facility", "Operations & Processes", "Biological Materials",
  "Chemicals", "High-Risk Exposures", "Equipment & Controls",
  "Manufacturing & Quality", "Waste & Environmental", "People & Governance",
];

export default async function SetupQuestionnairePage({ searchParams }: Props) {
  const params = await searchParams;
  const existing = await listQuestionnaireResponses().catch(() => []);
  const answerMap = new Map(existing.map((r) => [r.questionNumber, r.answer ?? ""]));
  const noteMap = new Map(existing.map((r) => [r.questionNumber, r.notes ?? ""]));
  const answeredCount = existing.filter((r) => (r.answer ?? "").trim() !== "").length;

  const domains = DOMAIN_ORDER.filter((d) => SETUP_QUESTIONS.some((q) => q.domain === d));

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Assess · Setup</p>
          <h1>Client Setup Questionnaire</h1>
          <p className="muted">
            Answer the 26 questions from the platform manual. Your answers decide which safety programs
            apply, and seed your Risk Register and Compliance Calendar. {answeredCount} of {SETUP_QUESTIONS.length} answered.
          </p>
        </header>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        <AiDraftBanner>
          Program activation is a recommendation based on your answers. A qualified reviewer confirms
          applicability before any program is treated as active.
        </AiDraftBanner>

        <form action={saveQuestionnaireAction}>
          {domains.map((domain, idx) => {
            const qs = SETUP_QUESTIONS.filter((q) => q.domain === domain);
            return (
              <section className="panel" key={domain}>
                <div className="panel-heading">
                  <div>
                    <p className="section-label">Step {idx + 1} of {domains.length}</p>
                    <h2>{domain}</h2>
                  </div>
                  <ClipboardList size={20} />
                </div>
                <div className="stacked-form">
                  {qs.map((q) => {
                    const current = answerMap.get(q.number) ?? "";
                    return (
                      <div key={q.number} className="qn-block" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                          {q.number}. {q.text}
                        </label>
                        {q.kind === "boolean" ? (
                          <select name={`q_${q.number}`} defaultValue={current}>
                            <option value="">— Select —</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        ) : (
                          <input name={`q_${q.number}`} type="text" defaultValue={current} placeholder="Enter details" />
                        )}
                        <input
                          name={`note_${q.number}`}
                          type="text"
                          defaultValue={noteMap.get(q.number) ?? ""}
                          placeholder="Notes (optional)"
                          style={{ marginTop: 6 }}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <section className="panel">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="button-secondary" type="submit" name="runEngine" value="0">Save answers</button>
              <button className="button-primary" type="submit" name="runEngine" value="1">
                Save &amp; run applicability engine
              </button>
            </div>
            <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Running the engine enables applicable programs, logs why, and creates starter Risk Register
              entries and Compliance Calendar tasks. Programs are created as Draft — Human Review Required.
            </p>
          </section>
        </form>
      </div>
    </AppShell>
  );
}
