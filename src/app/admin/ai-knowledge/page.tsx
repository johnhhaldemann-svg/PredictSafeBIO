export const dynamic = "force-dynamic";

import Link from "next/link";
import { Brain, CheckCircle2, Flag, ShieldAlert, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getAuthSummary } from "@/lib/supabase/data";
import { getKnowledgeReviewSummary, listKnowledgeEntries } from "@/lib/supabase/knowledge-service";
import type { AiKnowledgeEntry, AiKnowledgeReviewStatus } from "@/lib/bio-ai/types";
import { isAdminRole } from "@/lib/role-permissions";
import { approveEntryAction, flagEntryAction, rejectEntryAction } from "./actions";

// ── Label/style maps ─────────────────────────────────────────────────────────

const statusLabel: Record<AiKnowledgeReviewStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  flagged: "Flagged",
  rejected: "Rejected"
};

const statusClass: Record<AiKnowledgeReviewStatus, string> = {
  pending: "badge-warn",
  approved: "badge-pass",
  flagged: "badge-warn",
  rejected: "badge-fail"
};

const riskClass: Record<string, string> = {
  critical: "risk-critical",
  high: "risk-high",
  moderate: "risk-moderate",
  low: "risk-low"
};

const typeLabel: Record<string, string> = {
  assessment_input:   "Assessment input",
  risk_signal:        "Risk signal",
  foundation_context: "Foundation context",
  applicability_rule: "Applicability rule",
  biotype_context:    "BioType context",
  reference_rule:     "Reference rule",
  change_impact:      "Change impact",
  evidence_map:       "Evidence map",
  ergonomic_assessment: "Ergonomic assessment"
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AiKnowledgePage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; type?: string; human?: string }>;
}) {
  const params = await searchParams;
  const auth = await getAuthSummary();

  // Gate: owners only
  if (!auth.signedIn || !isAdminRole(auth.role)) {
    return (
      <AppShell>
        <div className="page-stack">
          <header className="page-header">
            <p className="section-label">AI Safety Engine</p>
            <h1>Knowledge Review</h1>
          </header>
          <section className="panel">
            <p className="muted">
              Only workspace owners can review AI engine knowledge entries.
              Contact your owner to request access.
            </p>
            <Link className="button-secondary" href="/workbench">Return to Dashboard</Link>
          </section>
        </div>
      </AppShell>
    );
  }

  const filterStatus = params.status ?? "all";
  const filterType   = params.type   ?? "all";
  const humanOnly    = params.human  === "1";

  const [summary, entries] = await Promise.all([
    getKnowledgeReviewSummary(),
    listKnowledgeEntries({
      reviewStatus:    filterStatus === "all" ? undefined : filterStatus,
      knowledgeType:   filterType   === "all" ? undefined : filterType,
      humanReviewOnly: humanOnly || undefined,
    })
  ]);

  return (
    <AppShell>
      <div className="page-stack">

        <header className="page-header">
          <p className="section-label">AI Safety Engine</p>
          <h1>AI Knowledge Review</h1>
          <p className="muted">
            Every payload submitted to the Safety Engine is captured here.
            Owners approve valid knowledge, flag low-quality entries, or reject
            junk so it cannot influence risk scores or recommendations.
          </p>
        </header>

        {/* Summary KPI strip */}
        <section className="panel">
          <div className="panel-heading">
            <Brain size={16} aria-hidden="true" />
            <h2>Review queue</h2>
          </div>
          <div className="kpi-row">
            <div className="kpi-card kpi-warn">
              <span className="kpi-value">{summary.pendingCount}</span>
              <span className="kpi-label">Pending</span>
            </div>
            <div className="kpi-card kpi-pass">
              <span className="kpi-value">{summary.approvedCount}</span>
              <span className="kpi-label">Approved</span>
            </div>
            <div className="kpi-card kpi-flag">
              <span className="kpi-value">{summary.flaggedCount}</span>
              <span className="kpi-label">Flagged</span>
            </div>
            <div className="kpi-card kpi-fail">
              <span className="kpi-value">{summary.rejectedCount + summary.junkCount}</span>
              <span className="kpi-label">Rejected / Junk</span>
            </div>
            <div className="kpi-card kpi-alert">
              <span className="kpi-value">{summary.humanReviewRequiredCount}</span>
              <span className="kpi-label">Human review required</span>
            </div>
          </div>
          {summary.pendingCount > 0 && (
            <div className="alert alert-warn" role="alert">
              <ShieldAlert size={14} aria-hidden="true" />
              <strong>{summary.pendingCount} {summary.pendingCount === 1 ? "entry" : "entries"} awaiting owner review.</strong>
              {" Approve or reject each entry to confirm it is safe to use in engine scoring."}
            </div>
          )}
        </section>

        {/* Filters */}
        <section className="panel">
          <div className="panel-heading"><h2>Filter entries</h2></div>
          <form className="audit-filter-form">
            <label>
              Review status
              <select name="status" defaultValue={filterStatus}>
                <option value="all">All statuses</option>
                <option value="pending">Pending review</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flagged</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label>
              Knowledge type
              <select name="type" defaultValue={filterType}>
                <option value="all">All types</option>
                {Object.entries(typeLabel).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="filter-checkbox">
              <input type="checkbox" name="human" value="1" defaultChecked={humanOnly} />
              Human review required only
            </label>
            <button className="button-secondary" type="submit">Apply filters</button>
            <Link className="button-secondary" href="/admin/ai-knowledge">Clear</Link>
          </form>
        </section>

        {/* Entry list */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Knowledge entries ({entries.length})</h2>
          </div>
          {entries.length === 0 ? (
            <p className="muted">No entries match the selected filters.</p>
          ) : (
            <div className="knowledge-review-list">
              {entries.map((entry) => (
                <KnowledgeEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>

        {/* Guidance */}
        <section className="panel">
          <div className="panel-heading"><h2>How knowledge review works</h2></div>
          <div className="guidance-grid">
            <div className="guidance-item">
              <CheckCircle2 size={16} className="icon-pass" aria-hidden="true" />
              <div>
                <strong>Approve</strong>
                <p className="muted">
                  Mark as <em>Validated</em> (confirmed by QA or expert) or <em>Reasonable</em>
                  (plausible, not yet verified). Approved entries inform risk scoring.
                </p>
              </div>
            </div>
            <div className="guidance-item">
              <Flag size={16} className="icon-warn" aria-hidden="true" />
              <div>
                <strong>Flag</strong>
                <p className="muted">
                  Mark as <em>Low quality</em>. The entry is logged but requires follow-up.
                  Engine still sees it; reviewers know it needs attention.
                </p>
              </div>
            </div>
            <div className="guidance-item">
              <XCircle size={16} className="icon-fail" aria-hidden="true" />
              <div>
                <strong>Reject</strong>
                <p className="muted">
                  Mark as <em>Junk</em>. Test data, placeholders, or errors.
                  Excluded from all engine scoring; exclusion is recorded in the immutable audit log.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </AppShell>
  );
}

// ── Entry card component ─────────────────────────────────────────────────────

function KnowledgeEntryCard({ entry }: { entry: AiKnowledgeEntry }) {
  const isPending = entry.reviewStatus === "pending";
  const id = entry.id ?? "";

  // Bind server actions to this entry's ID — Next.js recommended pattern
  const approveValidated = approveEntryAction.bind(null, id, "validated_knowledge");
  const approveReasonable = approveEntryAction.bind(null, id, "reasonable_knowledge");
  const flagLowQuality = flagEntryAction.bind(null, id);
  const rejectJunk = rejectEntryAction.bind(null, id);

  return (
    <article className="knowledge-card" aria-label={entry.label}>

      <div className="knowledge-card-header">
        <div className="knowledge-card-meta">
          <span className="knowledge-type-badge">
            {typeLabel[entry.knowledgeType] ?? entry.knowledgeType}
          </span>
          {entry.aiRiskLevel && (
            <span className={`risk-badge ${riskClass[entry.aiRiskLevel] ?? ""}`}>
              {entry.aiRiskLevel.toUpperCase()}
            </span>
          )}
          {entry.aiHumanReviewRequired && (
            <span className="badge-alert">Human review required</span>
          )}
        </div>
        <span className={`badge ${statusClass[entry.reviewStatus]}`}>
          {statusLabel[entry.reviewStatus]}
        </span>
      </div>

      <h3 className="knowledge-card-title">{entry.label}</h3>
      <p className="knowledge-card-summary">{entry.contentSummary}</p>

      <div className="knowledge-card-details">
        {entry.sourceModule && (
          <span className="detail-chip">Source: {entry.sourceModule.replace(/_/g, " ")}</span>
        )}
        {entry.aiConfidence && (
          <span className="detail-chip">Confidence: {entry.aiConfidence}</span>
        )}
        {entry.qualityClassification && (
          <span className="detail-chip quality-chip">
            {entry.qualityClassification.replace(/_/g, " ")}
          </span>
        )}
        {entry.createdAt && (
          <span className="detail-chip">
            {new Date(entry.createdAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric"
            })}
          </span>
        )}
      </div>

      {entry.reviewNotes && (
        <blockquote className="review-note">
          <strong>Review note: </strong>{entry.reviewNotes}
        </blockquote>
      )}

      {/* Action buttons — pending entries only */}
      {isPending && id && (
        <div className="knowledge-card-actions">
          <form action={approveValidated}>
            <button className="button-primary compact" type="submit">
              <CheckCircle2 size={13} aria-hidden="true" />
              Approve — Validated
            </button>
          </form>
          <form action={approveReasonable}>
            <button className="button-secondary compact" type="submit">
              <CheckCircle2 size={13} aria-hidden="true" />
              Approve — Reasonable
            </button>
          </form>
          <form action={flagLowQuality}>
            <button className="button-secondary compact" type="submit">
              <Flag size={13} aria-hidden="true" />
              Flag
            </button>
          </form>
          <form action={rejectJunk}>
            <button className="button-danger compact" type="submit">
              <XCircle size={13} aria-hidden="true" />
              Reject — Junk
            </button>
          </form>
        </div>
      )}

      {!isPending && entry.reviewedAt && (
        <p className="review-timestamp muted">
          Reviewed{" "}
          {new Date(entry.reviewedAt).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric"
          })}
          {entry.excludedFromEngine ? " · Excluded from engine" : ""}
        </p>
      )}
    </article>
  );
}
