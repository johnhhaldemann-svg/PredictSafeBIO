/**
 * Continuous scoring service stub.
 * Full implementation pending — exports no-op stubs used by inspection-service.
 */

export function scoreInspectionFinding(finding: { findingLevel: string }): number {
  const scores: Record<string, number> = {
    observation: 1,
    minor: 3,
    major: 7,
    critical: 10,
  };
  return scores[finding.findingLevel] ?? 1;
}

export function resolveRiskCell(args: {
  organizationId: string;
  source: string;
  sourceId: string;
  score: number;
}): Promise<void> {
  return Promise.resolve();
}
