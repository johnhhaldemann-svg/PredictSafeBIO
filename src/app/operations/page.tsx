import Link from "next/link";
import { AlertTriangle, Boxes, ClipboardList, DatabaseZap, FlaskConical, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FoundationReviewActionsPanel } from "@/components/FoundationReviewActionsPanel";
import { createMapOperationsBundleAction } from "./actions";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import { getFoundationAdminAccessSummary, getFoundationReviewActionsSummary, getMapOperationsSummary } from "@/lib/supabase/data";

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const [summary, foundationActions, adminAccess] = await Promise.all([
    getMapOperationsSummary(),
    getFoundationReviewActionsSummary(),
    getFoundationAdminAccessSummary()
  ]);
  const assessment = assessBioRisk(summary.latestAssessmentInput);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Map-aligned operations</p>
          <h1>Biotech operating graph</h1>
        </header>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Phases 1-3</p>
              <h2>Create linked source records</h2>
            </div>
            <DatabaseZap size={22} />
          </div>
          {params.message ? <p className="form-message">{params.message}</p> : null}
          <form action={createMapOperationsBundleAction} className="document-form">
            <div className="form-grid">
              <label>
                Site
                <input name="siteName" defaultValue="PredictSafeBIO Pilot Site" />
              </label>
              <label>
                Lab
                <input name="labName" defaultValue="QC Microbiology Lab" />
              </label>
              <label>
                Workflow
                <input name="workflow" defaultValue="Biosafety readiness review" />
              </label>
              <label>
                Reference
                <input name="referenceTitle" defaultValue="Pilot biosafety reference" />
              </label>
              <label>
                Document
                <input name="documentTitle" defaultValue="Biosafety and BBP SOP" />
              </label>
              <label>
                Training
                <input name="trainingTitle" defaultValue="Annual biosafety and BBP training" />
              </label>
              <label>
                Incident
                <input name="incidentTitle" defaultValue="Biosafety deviation readiness review" />
              </label>
              <label>
                Equipment tag
                <input name="equipmentTag" defaultValue="BSC-001" />
              </label>
              <label>
                Sample ID
                <input name="sampleIdentifier" defaultValue="SAMPLE-001" />
              </label>
            </div>
            <button className="button-primary" type="submit">
              <Boxes size={16} />
              Create operations bundle
            </button>
          </form>
        </section>

        <section className="summary-strip" aria-label="Operations counts">
          {summary.counts.map((count) => (
            <span key={count.label}>
              {count.label}: {count.value}
            </span>
          ))}
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Readiness graph</p>
                <h2>Live module signals</h2>
              </div>
              <ClipboardList size={22} />
            </div>
            <div className="action-list">
              {summary.readiness.map((item) => (
                <article className="action-row" key={`${item.module}-${item.title}`}>
                  <div>
                    <strong>{item.module}</strong>
                    <span>{item.status}</span>
                  </div>
                  <p>
                    {item.title}. {item.detail}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Phase 4</p>
                <h2>AI Engine live context</h2>
              </div>
              <FlaskConical size={22} />
            </div>
            <div className="score-wrap">
              <span className="score">{assessment.score}</span>
              <div>
                <p className="score-label">{assessment.level} risk</p>
                <p className="muted">Confidence: {assessment.confidence}</p>
              </div>
            </div>
            <p className="explanation">{assessment.explanation}</p>
            <div className="draft-banner">
              <AlertTriangle size={18} />
              Draft - Human Review Required
            </div>
            <ul>
              {assessment.recommendedActions.slice(0, 5).map((action) => (
                <li key={action.title}>
                  <strong>{action.title}</strong>
                  <span>{action.reason}</span>
                </li>
              ))}
            </ul>
            <div className="guardrail-box">
              <ShieldCheck size={18} />
              <span>{draftAiRecommendationGuardrail}</span>
            </div>
            <Link className="button-secondary" href="/workbench">
              Open in Workbench
            </Link>
          </div>
        </section>

        <FoundationReviewActionsPanel
          actions={foundationActions.slice(0, 6)}
          canManage={adminAccess.isOwner}
          emptyMessage="No open Foundation review actions yet. Generate them from the Foundation page."
          title="Open review actions"
        />
      </div>
    </AppShell>
  );
}
