export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { BookOpen, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  listLessons,
  sourceTypeLabels,
  lessonPhaseLabels,
  lessonStatusLabels,
  type LessonStatus,
  type LessonPhase,
} from "@/lib/supabase/lessons-learned-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import {
  createLessonAction,
  publishLessonAction,
  feedLessonToHazardRegisterAction,
} from "./actions";
import { DataLoadError } from "@/components/DataLoadError";

export const metadata: Metadata = { title: "Lessons Learned – PredictSafe" };

const STATUS_CLASS: Record<LessonStatus, string> = {
  draft:     "status-needs-review",
  published: "status-current",
  archived:  "status-current",
};

type Props = {
  searchParams: Promise<{
    message?: string;
    success?: string;
    filter?: string;
    phase?: string;
  }>;
};

export default async function LessonsLearnedPage({ searchParams }: Props) {
  const params      = await searchParams;
  const filter      = params.filter ?? "all";
  const phaseFilter = params.phase as LessonPhase | undefined;

  const [allLessonsResult, adminAccess] = await Promise.all([
    listLessons().catch(() => null),
    getFoundationAdminAccessSummary().catch(() => ({
      configured: false, signedIn: false, isOwner: false, message: "",
    })),
  ]);

  const loadFailed  = allLessonsResult === null;
  const allLessons  = allLessonsResult ?? [];

  const published   = allLessons.filter((l) => l.status === "published");
  const drafts      = allLessons.filter((l) => l.status === "draft");

  const lessons = allLessons.filter((l) => {
    if (filter === "draft"     && l.status !== "draft")     return false;
    if (filter === "published" && l.status !== "published") return false;
    if (phaseFilter && l.phase !== phaseFilter)             return false;
    return l.status !== "archived";
  });

  const filterCounts = {
    all:       allLessons.filter((l) => l.status !== "archived").length,
    draft:     drafts.length,
    published: published.length,
  };

  const PHASES: LessonPhase[] = ["assess", "plan", "operate", "monitor"];

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Monitor · Lessons Learned</p>
            <h1>Lessons Learned</h1>
            <p className="muted">
              Capture, share, and act on insights from incidents, CAPAs, audits, and near misses.
              Required under ICH Q10 §2.7 and ISO 45001.
            </p>
          </div>
          <Link className="button-secondary" href="/management-review">Management Review →</Link>
        </header>

        {/* KPI strip */}
        <section className="kpi-grid" aria-label="Lessons summary">
          <div className={`kpi-card ${published.length > 0 ? "kpi-card--green" : "kpi-card--blue"}`}>
            <div className="kpi-label">Published</div>
            <div className="kpi-value">{published.length}</div>
            <div className="kpi-sub">{published.length > 0 ? "Shared with team" : "None published yet"}</div>
          </div>
          <div className={`kpi-card ${drafts.length > 0 ? "kpi-card--amber" : "kpi-card--green"}`}>
            <div className="kpi-label">Drafts</div>
            <div className="kpi-value">{drafts.length}</div>
            <div className="kpi-sub">{drafts.length > 0 ? "Awaiting publish" : "No drafts"}</div>
          </div>
          <div className="kpi-card kpi-card--blue">
            <div className="kpi-label">Total Captured</div>
            <div className="kpi-value">{filterCounts.all}</div>
            <div className="kpi-sub">From all sources</div>
          </div>
          <div className="kpi-card kpi-card--purple">
            <div className="kpi-label">Archived</div>
            <div className="kpi-value">{allLessons.filter(l => l.status === "archived").length}</div>
            <div className="kpi-sub">Historical record</div>
          </div>
        </section>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
        {params.message && <p className="form-message">{params.message}</p>}

        {/* Filter strip */}
        <nav className="command-center-link-strip" aria-label="Lessons filter">
          {(["all", "draft", "published"] as const).map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/lessons-learned" : `/lessons-learned?filter=${f}`}
              className={`button-secondary compact ${filter === f && !phaseFilter ? "active-filter" : ""}`}
            >
              {f === "all" ? "All" : f === "draft" ? "Drafts" : "Published"}
              <span className="filter-count-badge">{filterCounts[f] ?? 0}</span>
            </Link>
          ))}
          <span className="muted" style={{ alignSelf: "center", fontSize: 12, marginLeft: 8 }}>Phase:</span>
          {PHASES.map((p) => (
            <Link
              key={p}
              href={`/lessons-learned?phase=${p}`}
              className={`button-secondary compact ${phaseFilter === p ? "active-filter" : ""}`}
            >
              {lessonPhaseLabels[p]}
            </Link>
          ))}
        </nav>

        {/* Lessons list */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Lessons registry</p>
              <h2>
                {lessons.length === filterCounts.all
                  ? `${filterCounts.all} lesson${filterCounts.all !== 1 ? "s" : ""}`
                  : `${lessons.length} of ${filterCounts.all} shown`}
              </h2>
            </div>
          </div>

          {loadFailed ? (
            <DataLoadError resource="lessons learned" />
          ) : lessons.length === 0 ? (
            <div className="empty-state-card">
              <p className="empty-state-title">No lessons found for this filter</p>
              <p className="muted">Capture one below to start building the registry.</p>
            </div>
          ) : (
            <div className="action-list">
              {lessons.map((lesson) => (
                <article className="action-row" key={lesson.id}>
                  <div>
                    <strong>{lesson.title}</strong>
                    <span className={STATUS_CLASS[lesson.status]}>{lessonStatusLabels[lesson.status]}</span>
                    <span>{sourceTypeLabels[lesson.sourceType]}</span>
                    <span className="muted">{lessonPhaseLabels[lesson.phase]}</span>
                    {lesson.hazardType && <span className="muted">{lesson.hazardType}</span>}
                  </div>
                  <p className="muted">{lesson.description}</p>
                  {lesson.programTags.length > 0 && (
                    <p className="muted">Tags: {lesson.programTags.join(", ")}</p>
                  )}
                  {adminAccess.signedIn && lesson.status === "draft" && (
                    <form action={publishLessonAction} className="inline-form">
                      <input type="hidden" name="id" value={lesson.id} />
                      <button className="button-secondary compact" type="submit">Publish</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Capture lesson form */}
        {adminAccess.signedIn && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Capture a lesson</p>
                <h2>Add to the lessons registry</h2>
              </div>
              <Plus size={22} />
            </div>
            <form action={createLessonAction} className="stacked-form">
              <div className="form-grid">
                <label>
                  Title <span aria-hidden="true">*</span>
                  <input name="title" type="text" placeholder="e.g. Cryogen vessel inspection gap" required />
                </label>
                <label>
                  Source type <span aria-hidden="true">*</span>
                  <select name="sourceType" defaultValue="other" required>
                    <option value="incident">Incident Investigation</option>
                    <option value="capa">CAPA Closure</option>
                    <option value="inspection">Inspection Observation</option>
                    <option value="audit">Audit Finding</option>
                    <option value="near_miss">Near Miss</option>
                    <option value="external">External / Industry</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  PDCA phase <span aria-hidden="true">*</span>
                  <select name="phase" defaultValue="operate" required>
                    <option value="assess">Assess</option>
                    <option value="plan">Plan</option>
                    <option value="operate">Operate</option>
                    <option value="monitor">Monitor</option>
                  </select>
                </label>
                <label>
                  Hazard type (optional)
                  <input name="hazardType" type="text" placeholder="e.g. chemical, biological" />
                </label>
                <label>
                  Source reference (optional)
                  <input name="sourceId" type="text" placeholder="e.g. INC-2024-045 or CAPA-083" />
                </label>
              </div>
              <label>
                Description &amp; insight <span aria-hidden="true">*</span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="What happened, what was learned, and what change it triggered"
                  required
                />
              </label>
              <button className="button-primary" type="submit">Capture lesson (saved as draft)</button>
            </form>
          </section>
        )}

        {/* Phase 6 → Phase 1 loop-back */}
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
              <textarea name="description" rows={2} placeholder="What was learned and why this risk needs formal assessment" />
            </label>
            <button className="button-primary" type="submit">Add to Hazard Register</button>
          </form>
          <p className="muted">
            Created as <strong>Identified — Draft, Human Review Required</strong>. A qualified
            reviewer must confirm and classify before it enters the risk scoring cycle.
          </p>
        </section>

        {/* AI guardrail */}
        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">AI Guardrail</p>
            <h2>Knowledge sharing requires human judgment and review</h2>
            <p className="muted">
              Lessons are captured as <strong>Draft</strong> and must be reviewed before publishing.
              ICH Q10 §2.7 requires that knowledge management includes sharing across products,
              processes, and sites. AI may surface patterns but cannot determine which lessons are
              material or require regulatory notification.
            </p>
          </div>
          <ShieldCheck size={24} />
        </section>
      </div>
    </AppShell>
  );
}
