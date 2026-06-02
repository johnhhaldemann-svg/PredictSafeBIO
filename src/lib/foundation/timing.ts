const MS_PER_DAY = 86400000;

export const FIELD_REPORT_DUE_SOON_DAYS = 3;

const FIELD_REPORT_ALLOWED_DAYS_BY_PRIORITY: Record<string, number> = {
  urgent: 2,
  high: 7,
  medium: 14,
  low: 14
};

export type FieldReportDueState = "overdue" | "due_soon" | "scheduled" | "unscheduled";

export function getFieldReportAllowedDays(priority?: string | null) {
  const normalizedPriority = priority?.toLowerCase() ?? "medium";
  return FIELD_REPORT_ALLOWED_DAYS_BY_PRIORITY[normalizedPriority] ?? FIELD_REPORT_ALLOWED_DAYS_BY_PRIORITY.medium;
}

export function getFieldReportDueDate(priority?: string | null, now = new Date()) {
  const localDate = new Date(now);
  localDate.setHours(0, 0, 0, 0);
  return addDays(localDate, getFieldReportAllowedDays(priority));
}

export function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDaysUntilDate(dateOnly?: string | null, now = new Date()) {
  if (!dateOnly || !/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  const due = new Date(`${dateOnly}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / MS_PER_DAY);
}

export function getFieldReportDueState(dateOnly?: string | null, now = new Date()): FieldReportDueState {
  const days = getDaysUntilDate(dateOnly, now);
  if (days === null) return "unscheduled";
  if (days < 0) return "overdue";
  if (days <= FIELD_REPORT_DUE_SOON_DAYS) return "due_soon";
  return "scheduled";
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}
