import { describe, expect, it } from "vitest";
import { programData } from "./program-data";
import { manufacturingProgramNotes } from "./manufacturing-notes";

// Programs that are lab/biosafety-specific and intentionally have NO manufacturing
// note — the program page shows a neutral placeholder for these under MFG.
const LAB_ONLY_IDS = ["biosafety", "bloodborne-pathogens", "chemical-hygiene", "vivarium"];

describe("manufacturing program notes", () => {
  it("every note key maps to a real program", () => {
    const ids = new Set(programData.map((p) => p.id));
    for (const key of Object.keys(manufacturingProgramNotes)) {
      expect(ids.has(key)).toBe(true);
    }
  });

  it("every note is substantive (not a stub)", () => {
    for (const note of Object.values(manufacturingProgramNotes)) {
      expect(note.length).toBeGreaterThan(60);
    }
  });

  it("omits the lab/biosafety-only programs on purpose", () => {
    for (const id of LAB_ONLY_IDS) {
      expect(manufacturingProgramNotes[id]).toBeUndefined();
    }
  });

  it("covers every general-industry program (no silent gaps)", () => {
    const uncovered = programData
      .map((p) => p.id)
      .filter((id) => !LAB_ONLY_IDS.includes(id) && !manufacturingProgramNotes[id]);
    expect(uncovered).toEqual([]);
  });
});
