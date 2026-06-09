export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { ClipboardList, CheckCircle2, Pencil } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AiDraftBanner } from "@/components/AiDraftBanner";
import { SETUP_QUESTIONS } from "@/lib/manual/setup-questions";
import { listQuestionnaireResponses } from "@/lib/supabase/questionnaire-service";
import { saveQuestionnaireAction } from "./actions";

export const metadata: Metadata = { title: "Setup Questionnaire – PredictSafeBIO" };

type Props = { searchParams: Promise<{ message?: string; success?: string; edit?: string }> };

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

  const completed = answeredCount > 0;        // setup has been done at least once
  const editMode = params.edit === "1";
  const locked = completed && !editMode;       // read-only unless the user chose to update

  const domains = DOMAIN_ORDER.filter((d) => SETUP_QUESTIONS.some((q) => q.domain === d));

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Assess · Setup</p>
            <h1>Client Setup Questionnaire</h1>
            <p className="muted">
              The 26 questions from the platform manual decide which safety programs apply, and seed your
              Risk Register and Compliance Calendar.
            </p>
          </div>
          <Link className="button-secondary" href="/assessments">Risk Register →</Link>
        </header>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {locked ? (
          <>
            {/* Locked / completed state */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-label">Setup complete</p>
                  <h2>Your answers are locked</h2>
                </div>
                <CheckCircle2 size={22} />
              </div>
              <p className="muted">
                Answers are read-only to keep your Risk Register and Compliance Calendar stable. Update
                them when your operations, materials, equipment, or scale change.
              </p>
              <div className="form-action-row">
                <Link className="button-primary" href="/assess/setup-questionnaire?edit=1">
                  <Pencil size={14} aria-hidden="true" /> Update answers
                </Link>
                <Link className="button-secondary" href="/">Go to workspace</Link>
              </div>
            </section>

            {domains.map((domain) => (
              <section className="panel" key={domain}>
                <div className="panel-heading"><div><p className="section-label">{domain}</p></div></div>
                <div className="action-list">
                  {SETUP_QUESTIONS.filter((q) => q.domain === domain).map((q) => (
                    <article className="action-row" key={q.number}>
                      <div>
                        <strong>{q.number}. {q.text}</strong>
                        <small className="muted">
                          {answerMap.get(q.number) || "—"}
                          {noteMap.get(q.number) ? ` · ${noteMap.get(q.number)}` : ""}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          <>
            <AiDraftBanner>
              Program activation is a recommendation based on your answers. A qualified reviewer confirms
              applicability before any program is treated as active.
            </AiDraftBanner>

            {/* Answer progress */}
            <div className="answer-progress">
              <div className="answer-progress-bar">
                <div
                  className="answer-progress-fill"
                  style={{ width: `${Math.round((answeredCount / SETUP_QUESTIONS.length) * 100)}%` }}
                />
              </div>
              <span className="answer-progress-label">
                {answeredCount} / {SETUP_QUESTIONS.length} answered
              </span>
            </div>

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
                          <div key={q.number} className="qn-block">
                            <label>
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
                              className="qn-notes"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              <section className="panel">
                <div className="form-action-row">
                  <button className="button-secondary" type="submit" name="runEngine" value="0">Save answers</button>
                  <button className="button-primary" type="submit" name="runEngine" value="1">
                    {completed ? "Save & re-run engine" : "Save & run applicability engine"}
                  </button>
                  {editMode && <Link className="button-secondary" href="/assess/setup-questionnaire">Cancel</Link>}
                </div>
                <p className="muted">
                  Running the engine enables applicable programs and creates your Risk Register entries and
                  Compliance Calendar tasks. On first completion you&apos;ll be taken to your workspace, and
                  this questionnaire becomes read-only until you choose to update it.
                </p>
              </section>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
