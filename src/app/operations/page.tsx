import Link from "next/link";
import { AlertTriangle, Boxes, ClipboardList, DatabaseZap, FlaskConical, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FoundationReviewActionsPanel } from "@/components/FoundationReviewActionsPanel";
import { createMapOperationsBundleAction } from "./actions";
import { assessBioRisk } from "@/lib/bio-ai/engine";
import { draftAiRecommendationGuardrail } from "@/lib/bio-ai/source-artifacts";
import {
  getFoundationAdminAccessSummary,
  getFoundationAssigneeOptions,
  getFoundationOperationsDashboardSummary,
  getFoundationReviewActionsSummary,
  getAuthSummary,
  getMapOperationsSummary
} from "@/lib/supabase/data";
import { canCreateWorkspaceRecord } from "@/lib/role-permissions";

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const [summary, foundationActions, adminAccess, assignees, foundationOps, auth] = await Promise.all([
    getMapOperationsSummary(),
    getFoundationReviewActionsSummary(),
    getFoundationAdminAccessSummary(),
    getFoundationAssigneeOptions(),
    getFoundationOperationsDashboardSummary(),
    getAuthSummary()
  ]);
  const assessment = assessBioRisk(summary.latestAssessmentInput);
  const blockedFoundationActions = foundationActions.filter((action) => action.status === "blocked");
  const canCreateOperationsBundle = canCreateWorkspaceRecord(auth);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">HSE Management Systems</p>
          <h1>Incident, CAPA & operating graph</h1>
        </header>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Incident Management + CAPA Workflow</p>
              <h2>Create linked HSE source records</h2>
            </div>
            <DatabaseZap size={22} />
          </div>
          {params.message ? <p className="form-message">{params.message}</p> : null}
          {canCreateOperationsBundle ? (
            <form action={createMapOperationsBundleAction} className="document-form">
              <div className="form-grid">
                <label>
                  Site
                  <input name="siteName" placeholder="e.g. Main Campus Lab" />
                </label>
                <label>
                  Lab
                  <input name="labName" placeholder="e.g. QC Microbiology Lab" />
                </label>
                <label>
                  Workflow
                  <input name="workflow" placeholder="e.g. Biosafety readiness review" />
                </label>
                <label>
                  Reference
                  <input name="referenceTitle" placeholder="e.g. Biosafety reference document" />
                </label>
                <label>
                  Document
                  <input name="documentTitle" placeholder="e.g. Biosafety and BBP SOP" />
                </label>
                <label>
                  Training
                  <input name="trainingTitle" placeholder="e.g. Annual biosafety training" />
                </label>
                <label>
                  Incident
                  <input name="incidentTitle" placeholder="e.g. Biosafety deviation — investigation" />
                </label>
                <label>
                  Equipment tag
                  <input name="equipmentTag" placeholder="e.g. BSC-001" />
                </label>
                <label>
                  Sample ID
                  <input name="sampleIdentifier" placeholder="e.g. SAMPLE-001" />
                </label>
              </div>
              <button className="button-primary" type="submit">
                <Boxes size={16} />
                Create HSE operations bundle
              </button>
            </form>
          ) : (
            <p className="form-message">
              Sign in and finish onboarding before creating HSE operations records.{" "}
              <Link href="/login?next=/operations">Go to sign in</Link>
            </p>
          )}
        </section>

        <section className="summary-strip" aria-label="Operations counts">
          {summary.counts.map((count) => (
            <span key={count.label}>
              {count.label}: {count.value}
            </span>
          ))}
        </section>

        <section className="ops-foundation-grid" aria-label="Foundation operations dashboard">
          <article>
            <span>Foundation readiness</span>
            <strong>{foundationOps.readinessScore}</strong>
            <small>Latest audit-readiness score</small>
          </article>
          <article>
            <span>Open generated actions</span>
            <strong>{foundationOps.openActions}</strong>
            <small>Open or in progress</small>
          </article>
          <article>
            <span>Blocked tasks</span>
            <strong>{foundationOps.blockedTasks}</strong>
            <small>Needs owner attention</small>
          </article>
          <article>
            <span>Duplicate preserved</span>
            <strong>{foundationOps.duplicatePreserved}</strong>
            <small>{foundationOps.latestRunSummary ?? "No generated action run yet"}</small>
          </article>
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Training, CAPA, Equipment, Samples</p>
                <h2>Live HSE module signals</h2>
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
                <p className="section-label">Risk Intelligence</p>
                <h2>BioRisk live context</h2>
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
              Open in BioRisk Scoring
            </Link>
          </div>
        </section>

        <FoundationReviewActionsPanel
          actions={foundationActions.slice(0, 6)}
          assignees={assignees}
          canManage={adminAccess.signedIn}
          canEditAssignment={adminAccess.isOwner}
          canEditDueDate={adminAccess.isOwner}
          canEditPriority={adminAccess.isOwner}
          emptyMessage="No open Foundation review actions yet. Generate them from the Foundation page."
          returnTo="/operations"
          title="Open review actions"
        />

        {adminAccess.isOwner && blockedFoundationActions.length > 0 ? (
          <FoundationReviewActionsPanel
            actions={blockedFoundationActions.slice(0, 6)}
            assignees={assignees}
            canManage={adminAccess.signedIn}
            canEditAssignment={adminAccess.isOwner}
            canEditDueDate={adminAccess.isOwner}
            canEditPriority={adminAccess.isOwner}
            emptyMessage="No blocked Foundation tasks need quick action."
            returnTo="/operations"
            title="Blocked task quick actions"
          />
        ) : null}
      </div>
    </AppShell>
  );
}
