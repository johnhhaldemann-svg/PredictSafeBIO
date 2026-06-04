import { normalizeBioTypeKey, type BioTypeKey } from "@/lib/foundation/biotypes";

export const foundationEvidenceStatuses = ["current", "ready", "review_needed", "missing", "expired", "open", "out_of_tolerance"] as const;
export type FoundationEvidenceStatus = (typeof foundationEvidenceStatuses)[number];

export type FoundationTaskStatus = "open" | "in_progress" | "complete" | "blocked";
export type FoundationTaskPriority = "low" | "medium" | "high" | "urgent";

export function normalizeFoundationEvidenceStatus(status: string): FoundationEvidenceStatus {
  return foundationEvidenceStatuses.includes(status as FoundationEvidenceStatus) ? (status as FoundationEvidenceStatus) : "review_needed";
}

export function normalizeFoundationTaskStatus(status: string): FoundationTaskStatus | null {
  return ["open", "in_progress", "complete", "blocked"].includes(status) ? (status as FoundationTaskStatus) : null;
}

export function normalizeFoundationTaskPriority(priority?: string | null): FoundationTaskPriority | null {
  const value = String(priority ?? "");
  return ["low", "medium", "high", "urgent"].includes(value) ? (value as FoundationTaskPriority) : null;
}

export function normalizeFoundationDueDate(dueDate?: string | null) {
  if (!dueDate) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null;
}

export function normalizeBioTypeKeys(value: unknown): BioTypeKey[] {
  const rawValues = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return rawValues.map((item) => normalizeBioTypeKey(String(item))).filter((item): item is BioTypeKey => Boolean(item));
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
