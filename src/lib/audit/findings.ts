// ---------------------------------------------------------------------------
// Audit finding lifecycle.
//
// Models the reference "MASTER Audit Findings" workbook: each audit question is
// scored 1 (pass) / 0 (fail) / N/A; a fail produces a Finding with a
// Recommendation for Closure, a Responsible Party, and a Target Date, then moves
// through a closure lifecycle. Modules are categorized and scoped (core 10-element
// vs. full audit), and repeat findings across audits are flagged.
//
// Pure functions; `now` is always supplied for deterministic overdue checks.
// ---------------------------------------------------------------------------

export type QuestionResult = "pass" | "fail" | "na";

export type ModuleCategory = "critical" | "management" | "prevention" | "management_discretion";

export const MODULE_CATEGORY_LABELS: Record<ModuleCategory, string> = {
  critical: "Critical",
  management: "Management",
  prevention: "Prevention",
  management_discretion: "Management Discretion"
};

/** Audit scope: the quick "core elements" pass vs. the full audit. */
export type AuditScope = "core" | "full";

export type FindingStatus = "open" | "in_progress" | "closed";

export type AuditFinding = {
  questionId: string;
  result: QuestionResult;
  /** Required when result is "pass" (evidence of conformance). */
  comment?: string | null;
  /** Required when result is "fail" (what was non-conforming). */
  finding?: string | null;
  /** Required when result is "fail" (how to close it). */
  recommendation?: string | null;
  responsibleParty?: string | null;
  targetDate?: string | null;
  dateCompleted?: string | null;
  /** Flagged when the same question failed in a prior audit. */
  repeat?: boolean;
};

export type FindingView = AuditFinding & {
  status: FindingStatus;
  overdue: boolean;
};

/** Derive a finding's lifecycle status. Passes/NA are not open findings. */
export function findingStatus(finding: AuditFinding): FindingStatus {
  if (finding.result !== "fail") return "closed";
  if (finding.dateCompleted) return "closed";
  if (finding.recommendation || finding.responsibleParty || finding.targetDate) return "in_progress";
  return "open";
}

export function viewFinding(finding: AuditFinding, now: string): FindingView {
  const status = findingStatus(finding);
  const overdue =
    status !== "closed" && Boolean(finding.targetDate) && (finding.targetDate as string) < now.slice(0, 10);
  return { ...finding, status, overdue };
}

// ── Module scoring roll-up ──────────────────────────────────────────────────

export type ModuleScore = {
  /** Conformance percentage = passes / applicable (non-NA) questions, 0–100. */
  score: number;
  passed: number;
  failed: number;
  applicable: number;
  notApplicable: number;
  openFindings: number;
};

/** Roll a module's findings up into a conformance score. */
export function scoreModule(findings: AuditFinding[]): ModuleScore {
  let passed = 0;
  let failed = 0;
  let notApplicable = 0;
  let openFindings = 0;

  for (const finding of findings) {
    if (finding.result === "na") {
      notApplicable += 1;
      continue;
    }
    if (finding.result === "pass") passed += 1;
    else {
      failed += 1;
      if (findingStatus(finding) !== "closed") openFindings += 1;
    }
  }

  const applicable = passed + failed;
  const score = applicable === 0 ? 0 : Math.round((passed / applicable) * 100);
  return { score, passed, failed, applicable, notApplicable, openFindings };
}

// ── Repeat-finding detection ────────────────────────────────────────────────

/**
 * Mark current findings as repeats when the same question failed in a prior
 * audit. Returns a new array (does not mutate input).
 */
export function flagRepeatFindings(
  current: AuditFinding[],
  priorFailedQuestionIds: Iterable<string>
): AuditFinding[] {
  const priorFails = new Set(priorFailedQuestionIds);
  return current.map((finding) => ({
    ...finding,
    repeat: finding.result === "fail" && priorFails.has(finding.questionId)
  }));
}

/** Question ids that failed in a set of findings — feed into the next audit. */
export function failedQuestionIds(findings: AuditFinding[]): string[] {
  return findings.filter((f) => f.result === "fail").map((f) => f.questionId);
}

// ── Audit summary ───────────────────────────────────────────────────────────

export type AuditSummary = {
  overallScore: number;
  totalOpenFindings: number;
  totalRepeatFindings: number;
  overdueFindings: number;
};

/** Summarize an entire audit across all its modules' findings. */
export function summarizeAudit(findings: AuditFinding[], now: string): AuditSummary {
  const moduleScore = scoreModule(findings);
  return {
    overallScore: moduleScore.score,
    totalOpenFindings: moduleScore.openFindings,
    totalRepeatFindings: findings.filter((f) => f.repeat).length,
    overdueFindings: findings.filter((f) => viewFinding(f, now).overdue).length
  };
}
