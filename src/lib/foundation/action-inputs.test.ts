import { describe, expect, it } from "vitest";
import {
  isUuid,
  normalizeBioTypeKeys,
  normalizeFoundationDueDate,
  normalizeFoundationEvidenceStatus,
  normalizeFoundationTaskPriority,
  normalizeFoundationTaskStatus
} from "./action-inputs";

describe("foundation action input helpers", () => {
  it("normalizes BioType key arrays and drops unknown values", () => {
    expect(normalizeBioTypeKeys(["rd_biotech", "unknown", "diagnostics_clinical_lab"])).toEqual([
      "rd_biotech",
      "diagnostics_clinical_lab"
    ]);
    expect(normalizeBioTypeKeys("cell_gene_therapy")).toEqual(["cell_gene_therapy"]);
    expect(normalizeBioTypeKeys(null)).toEqual([]);
  });

  it("normalizes evidence, task status, priority, and due-date inputs", () => {
    expect(normalizeFoundationEvidenceStatus("current")).toBe("current");
    expect(normalizeFoundationEvidenceStatus("not-real")).toBe("review_needed");
    expect(normalizeFoundationTaskStatus("blocked")).toBe("blocked");
    expect(normalizeFoundationTaskStatus("done")).toBeNull();
    expect(normalizeFoundationTaskPriority("urgent")).toBe("urgent");
    expect(normalizeFoundationTaskPriority("later")).toBeNull();
    expect(normalizeFoundationDueDate("2026-06-10")).toBe("2026-06-10");
    expect(normalizeFoundationDueDate("June 10")).toBeNull();
  });

  it("validates UUID source records for owner-created review actions", () => {
    expect(isUuid("8c9f9d7a-1234-4bcd-9abc-123456789abc")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});
