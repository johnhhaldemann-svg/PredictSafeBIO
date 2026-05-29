import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const foundationPage = readFileSync(join(process.cwd(), "src/app/foundation/page.tsx"), "utf8");
const foundationClient = readFileSync(join(process.cwd(), "src/app/foundation/FoundationWorkflowClient.tsx"), "utf8");
const foundationActions = readFileSync(join(process.cwd(), "src/app/foundation/actions.ts"), "utf8");
const foundationData = readFileSync(join(process.cwd(), "src/lib/supabase/data.ts"), "utf8");
const companyProfilePage = readFileSync(join(process.cwd(), "src/app/company-profile/page.tsx"), "utf8");
const notesMigration = readFileSync(join(process.cwd(), "supabase/migrations/20260529143000_audit_readiness_notes.sql"), "utf8");

describe("foundation UI alignment", () => {
  it("surfaces BioType, core component, AI workflow, and human validation sections", () => {
    expect(foundationPage).toContain("Core Compliance Components");
    expect(foundationPage).toContain("BioType Foundation Packages");
    expect(foundationPage).toContain("AI Workflow Map");
    expect(foundationPage).toContain("Human Validation Workflow");
  });

  it("shows BioType selections on the company profile surface", () => {
    expect(companyProfilePage).toContain("BioType Foundation Packages");
    expect(companyProfilePage).toContain("Selected operating profile");
  });

  it("adds MVP edit workflows without restoring one-click NorthStar seeding", () => {
    expect(foundationPage).toContain("FoundationWorkflowClient");
    expect(foundationClient).toContain("updateFoundationBioTypeSelectionAction");
    expect(foundationClient).toContain("updateFoundationIntakeResponseAction");
    expect(foundationClient).toContain("updateFoundationEvidenceReadinessAction");
    expect(foundationClient).toContain("Generate Review Actions");
    expect(foundationClient).toContain("SEED NORTHSTAR");
    expect(foundationClient).toContain("Current foundation counts");
    expect(foundationActions).toContain("seedNorthStarWithConfirmationAction");
    expect(foundationActions).not.toContain("seedIntelligenceFoundationAction");
    expect(foundationData).toContain("hasOpenFoundationRecommendation");
    expect(foundationData).toContain("actionType: \"foundation_review_action\"");
  });

  it("adds audit readiness notes with org scope, RLS, grants, and no user metadata authorization", () => {
    expect(notesMigration).toContain("create table public.audit_readiness_notes");
    expect(notesMigration).toContain("organization_id uuid not null");
    expect(notesMigration).toContain("grant select, insert, update, delete on public.audit_readiness_notes to authenticated");
    expect(notesMigration).toContain("alter table public.audit_readiness_notes enable row level security");
    expect(notesMigration).toContain("profiles.id = (select auth.uid())");
    expect(notesMigration).not.toMatch(/user_metadata/i);
  });
});
