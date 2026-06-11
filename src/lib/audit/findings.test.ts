import { describe, expect, it } from "vitest";
import {
  type AuditFinding,
  failedQuestionIds,
  findingStatus,
  flagRepeatFindings,
  scoreModule,
  summarizeAudit,
  viewFinding
} from "./findings";

const pass = (id: string): AuditFinding => ({ questionId: id, result: "pass", comment: "ok" });
const na = (id: string): AuditFinding => ({ questionId: id, result: "na" });
const failOpen = (id: string): AuditFinding => ({ questionId: id, result: "fail" });
const failInProgress = (id: string, target: string): AuditFinding => ({
  questionId: id,
  result: "fail",
  finding: "Gap found",
  recommendation: "Fix it",
  responsibleParty: "EHS",
  targetDate: target
});
const failClosed = (id: string): AuditFinding => ({
  questionId: id,
  result: "fail",
  recommendation: "Fixed",
  dateCompleted: "2026-05-01"
});

describe("findingStatus", () => {
  it("treats pass and NA as closed", () => {
    expect(findingStatus(pass("q1"))).toBe("closed");
    expect(findingStatus(na("q2"))).toBe("closed");
  });

  it("is open for a bare fail, in_progress once it has a plan, closed once completed", () => {
    expect(findingStatus(failOpen("q3"))).toBe("open");
    expect(findingStatus(failInProgress("q4", "2026-12-31"))).toBe("in_progress");
    expect(findingStatus(failClosed("q5"))).toBe("closed");
  });
});

describe("viewFinding", () => {
  it("marks an unclosed finding past its target date as overdue", () => {
    expect(viewFinding(failInProgress("q1", "2026-01-01"), "2026-06-11").overdue).toBe(true);
    expect(viewFinding(failInProgress("q2", "2026-12-31"), "2026-06-11").overdue).toBe(false);
  });

  it("never marks a closed finding overdue", () => {
    expect(viewFinding(failClosed("q3"), "2026-06-11").overdue).toBe(false);
  });
});

describe("scoreModule", () => {
  it("scores conformance as passes over applicable (NA excluded)", () => {
    const moduleScore = scoreModule([pass("a"), pass("b"), pass("c"), failOpen("d"), na("e")]);
    expect(moduleScore.passed).toBe(3);
    expect(moduleScore.failed).toBe(1);
    expect(moduleScore.notApplicable).toBe(1);
    expect(moduleScore.applicable).toBe(4);
    expect(moduleScore.score).toBe(75);
    expect(moduleScore.openFindings).toBe(1);
  });

  it("returns 0 when nothing is applicable", () => {
    expect(scoreModule([na("a"), na("b")]).score).toBe(0);
  });

  it("does not count a closed fail as an open finding", () => {
    expect(scoreModule([failClosed("a")]).openFindings).toBe(0);
  });
});

describe("flagRepeatFindings", () => {
  it("flags only current fails that failed previously", () => {
    const flagged = flagRepeatFindings([failOpen("q1"), failOpen("q2"), pass("q3")], ["q1", "q9"]);
    expect(flagged.find((f) => f.questionId === "q1")!.repeat).toBe(true);
    expect(flagged.find((f) => f.questionId === "q2")!.repeat).toBe(false);
    expect(flagged.find((f) => f.questionId === "q3")!.repeat).toBe(false);
  });

  it("extracts failed question ids for the next audit cycle", () => {
    expect(failedQuestionIds([failOpen("q1"), pass("q2"), failClosed("q3")])).toEqual(["q1", "q3"]);
  });
});

describe("summarizeAudit", () => {
  it("aggregates score, open, repeat, and overdue counts", () => {
    const findings = flagRepeatFindings(
      [pass("a"), failInProgress("b", "2026-01-01"), failOpen("c"), na("d")],
      ["b"]
    );
    const summary = summarizeAudit(findings, "2026-06-11");
    expect(summary.overallScore).toBe(33); // 1 pass / 3 applicable
    expect(summary.totalOpenFindings).toBe(2);
    expect(summary.totalRepeatFindings).toBe(1);
    expect(summary.overdueFindings).toBe(1);
  });
});
