import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dataModule = readFileSync(join(process.cwd(), "src", "lib", "supabase", "data.ts"), "utf8");
const foundationWriteService = readFileSync(join(process.cwd(), "src", "lib", "supabase", "foundation-write-service.ts"), "utf8");

describe("foundation write service extraction", () => {
  it("keeps the first owner-only Foundation write operations behind data module re-exports", () => {
    expect(dataModule).toContain('from "./foundation-write-service"');
    expect(dataModule).not.toContain("export async function updateFoundationBioTypeSelection");
    expect(dataModule).not.toContain("export async function updateFoundationIntakeResponse");
    expect(dataModule).not.toContain("export async function updateFoundationEvidenceReadiness");
    expect(foundationWriteService).toContain("export async function updateFoundationBioTypeSelection");
    expect(foundationWriteService).toContain("export async function updateFoundationIntakeResponse");
    expect(foundationWriteService).toContain("export async function updateFoundationEvidenceReadiness");
  });

  it("keeps owner guards, normalized inputs, and field-scoped audit payloads in the write service", () => {
    expect(foundationWriteService).toContain("canManageWorkspace(context)");
    expect(foundationWriteService).toContain("normalizeBioTypeKeys");
    expect(foundationWriteService).toContain("normalizeFoundationEvidenceStatus");
    expect(foundationWriteService).toContain("foundation_biotype_selection_updated");
    expect(foundationWriteService).toContain("foundation_intake_response_updated");
    expect(foundationWriteService).toContain("foundation_evidence_readiness_updated");
    expect(foundationWriteService).not.toContain("getSession");
    expect(foundationWriteService).not.toContain("user_metadata");
  });
});
