import { describe, expect, it } from "vitest";
import { formatDateOnly, getFieldReportAllowedDays, getFieldReportDueDate, getFieldReportDueState } from "./timing";

describe("field report timing", () => {
  const now = new Date("2026-05-31T12:00:00Z");

  it("assigns allowed time by report priority", () => {
    expect(getFieldReportAllowedDays("urgent")).toBe(2);
    expect(getFieldReportAllowedDays("high")).toBe(7);
    expect(getFieldReportAllowedDays("medium")).toBe(14);
    expect(getFieldReportAllowedDays("low")).toBe(14);
    expect(getFieldReportAllowedDays("unknown")).toBe(14);
  });

  it("formats due dates from the shared allowed-time rule", () => {
    expect(formatDateOnly(getFieldReportDueDate("urgent", now))).toBe("2026-06-02");
    expect(formatDateOnly(getFieldReportDueDate("high", now))).toBe("2026-06-07");
    expect(formatDateOnly(getFieldReportDueDate("medium", now))).toBe("2026-06-14");
  });

  it("keeps date-only formatting stable near local day boundaries", () => {
    const lateLocalDate = new Date(2026, 4, 31, 23, 30, 0);
    expect(formatDateOnly(lateLocalDate)).toBe("2026-05-31");
    expect(formatDateOnly(getFieldReportDueDate("urgent", lateLocalDate))).toBe("2026-06-02");
  });

  it("classifies due dates with the shared due-soon window", () => {
    expect(getFieldReportDueState(null, now)).toBe("unscheduled");
    expect(getFieldReportDueState("not-a-date", now)).toBe("unscheduled");
    expect(getFieldReportDueState("2026-05-30", now)).toBe("overdue");
    expect(getFieldReportDueState("2026-06-03", now)).toBe("due_soon");
    expect(getFieldReportDueState("2026-06-04", now)).toBe("scheduled");
  });
});
