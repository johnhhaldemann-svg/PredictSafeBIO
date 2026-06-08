import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, RefreshCw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { feedLessonToHazardRegisterAction } from "./actions";

export const metadata: Metadata = { title: "Lessons Learned – PredictSafeBIO" };

const LESSON_SOURCES = [
  { label: "Incident investigations",       desc: "Root cause findings that reveal systemic issues beyond the immediate event" },
  { label: "CAPA closures",                 desc: "What worked, what needed adjustment, and why the issue recurred (or did not)" },
  { label: "Audit observations",            desc: "Patterns across audits that point to process or culture gaps" },
  { label: "Near misses",                   desc: "High-value signals — the near miss that did not become a recordable" },
  { label: "Regulatory changes",            desc: "How rule changes forced a process update and what the transition revealed" },
  { label: "Management review outputs",     desc: "Strategic insights from leadership that should propagate to the team" },
  { label: "External benchmarking",         desc: "Industry incidents (OSHA enforcement actions, EPA enforcement) relevant to your operations" },
];

const LOOP_BACK = [
  { phase: "Phase 1 — Assess",   action: "New hazard identified → add to Hazard Register and re-score Risk Register" },
  { phase: "Phase 2 — Plan",     action: "Control gaps found → update Control Register and SOP library" },
  { phase: "Phase 3 — Operate",  action: "Procedural failures → revise work instructions and retrain" },
  { phase: "Phase 4 — Monitor",  action: "KPI weakness surfaced → add monitoring frequency or new leading indicator" },
  { phase: "Phase 5 — CAPA",     action: "Recurring issue pattern → systemic CAPA targeting root system" },
];

type Props = { searchParams: Promise<{ message?: string }> };

export default async function LessonsLearnedPage({ searchParams }: Props) {
  const { message } = await searchParams;
  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Monitor · Phase 6 — Review &amp; Improve</p>
            <h1>Lessons Learned</h1>
            <p className="muted">
              Capture, share, and act on insights from incidents, CAPAs, audits, and near misses.
              Lessons Learned closes the loop — every insight feeds back into Phase 1 to make the
              next cycle smarter. Required documentation under ICH Q10 and ISO 45001.
            </p>
          </div>
          <Link className="button-secondary" href="/management-review">Management Review →</Link>
        </header>

        <div className="ai-context-bar ai-context-bar--warning">
          <BookOpen size={15} />
          <span>
            <strong>Module in Development.</strong>{" "}
            A structured lessons learned registry — tagging entries by phase, hazard type, and affected
            program, with auto-distribution to relevant team members — is on the roadmap. Today, capture
            lessons as CAPA notes or in the Documents library and share in Management Review.
          </span>
        </div>

        <nav className="command-center-link-strip" aria-label="Related modules">
          <Link className="button-secondary compact" href="/operations/capa">Open CAPA →</Link>
          <Link className="button-secondary compact" href="/management-review">Management Review →</Link>
        </nav>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Inputs</p>
              <h2>Where Lessons Come From</h2>
            </div>
          </div>
          <div className="action-list">
            {LESSON_SOURCES.map((s) => (
              <article className="action-row" key={s.label}>
                <div>
                  <strong>{s.label}</strong>
                  <small className="muted">{s.desc}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Loop-back</p>
              <h2>How Lessons Feed Back into the Cycle</h2>
            </div>
            <RefreshCw size={20} />
          </div>
          <div className="action-list">
            {LOOP_BACK.map((l) => (
              <article className="action-row" key={l.phase}>
                <div>
                  <strong>{l.phase}</strong>
                  <small className="muted">{l.action}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="ai-context-bar ai-context-bar--success">
            <ShieldCheck size={14} />
            <span>
              <strong>ICH Q10 §2.7:</strong> The pharmaceutical quality system should include a process
              for knowledge management, including the sharing of knowledge and lessons learned across
              products, processes, and sites.
            </span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Phase 6 → Phase 1 Loop-back</p>
              <h2>Feed this lesson to the Hazard Register</h2>
            </div>
            <RefreshCw size={22} />
          </div>
          <p className="muted">
            When a lesson identifies an uncontrolled or new risk, push it directly into Phase 1.
            The Predictive Engine will score it as a leading indicator immediately on creation.
          </p>
          {message && <p className="form-message">{message}</p>}
          <form action={feedLessonToHazardRegisterAction} className="stacked-form">
            <div className="form-grid">
              <label>
                Hazard / risk name
                <input name="name" type="text" placeholder="e.g. No procedure for cryogen vessel inspection" required />
              </label>
              <label>
                Hazard type
                <select name="hazardType" defaultValue="other">
                  <option value="biological">Biological</option>
                  <option value="chemical">Chemical</option>
                  <option value="ergonomic">Ergonomic</option>
                  <option value="radiation">Radiation</option>
                  <option value="equipment">Equipment</option>
                  <option value="environmental">Environmental</option>
                  <option value="fire">Fire / flammable</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Location (optional)
                <input name="location" type="text" placeholder="e.g. Cryogenic storage room" />
              </label>
            </div>
            <label>
              Lesson / context
              <textarea name="description" rows={2} placeholder="What was learned and why this risk needs to be formally assessed" />
            </label>
            <button className="button-primary" type="submit">
              Add to Hazard Register
            </button>
          </form>
          <p className="muted">
            Created as <strong>Identified — Draft, Human Review Required</strong>. A qualified
            reviewer must confirm and classify before it enters the risk scoring cycle.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
