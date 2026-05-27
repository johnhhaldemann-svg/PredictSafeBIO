import type { BioRiskLevel } from "@/lib/bio-ai/types";

export function StatusBadge({ level }: { level: BioRiskLevel }) {
  return <span className={`status-badge status-${level}`}>{level}</span>;
}
