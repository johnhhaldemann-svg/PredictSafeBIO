import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const foundationPage = readFileSync(join(process.cwd(), "src/app/foundation/page.tsx"), "utf8");
const foundationClient = readFileSync(join(process.cwd(), "src/app/foundation/FoundationWorkflowClient.tsx"), "utf8");
const foundationActions = readFileSync(join(process.cwd(), "src/app/foundation/actions.ts"), "utf8");
const foundationData = readFileSync(join(process.cwd(), "src/lib/supabase/data.ts"), "utf8");
const companyProfilePage = readFileSync(join(process.cwd(), "src/app/company-profile/page.tsx"), "utf8");
const operationsPage = readFileSync(join(process.cwd(), "src/app/operations/page.tsx"), "utf8");
const workbenchPage = readFileSync(join(process.cwd(), "src/app/workbench/page.tsx"), "utf8");
const auditPage = readFileSync(join(process.cwd(), "src/app/admin/audit/page.tsx"), "utf8");
const reviewActionsPanel = readFileSync(join(process.cwd(), "src/components/FoundationReviewActionsPanel.tsx"), "utf8");
const notesMigration = readFileSync(join(process.cwd(), "supabase/migrations/20260529143000_audit_readiness_notes.sql"), "utf8");

describe("foundation UI alignment", () => {
  it("surfaces BioType, core component, AI workflow, and human validation sections", () => {
    expect(foundationPage).toContain("Common Utilities");
    expect(foundationPage).toContain("BioType Branching Engine");
    expect(foundationPage).toContain("AI Guardrails");
    expect(foundationPage).toContain("Human Validation Workflow");
  });

  it("shows BioType selections on the company profile surface", () => {
    expect(companyProfilePage).toContain("BioType Branching Engine");
    expect(companyProfilePage).toContain("Selected operating profile");
  });

  it("adds MVP edit workflows without restoring one-click NorthStar seeding", () => {
    expect(foundationPage).toContain("FoundationWorkflowClient");
    expect(foundationPage).toContain("getFoundationAdminAccessSummary");
    expect(foundationPage).toContain("canManage={adminAccess.isOwner}");
    expect(foundationClient).toContain("updateFoundationBioTypeSelectionAction");
    expect(foundationClient).toContain("updateFoundationIntakeResponseAction");
    expect(foundationClient).toContain("updateFoundationEvidenceReadinessAction");
    expect(foundationClient).toContain("System Reliance edit workflows are locked");
    expect(foundationClient).toContain("Generate Action Plan");
    expect(foundationClient).toContain("SEED NORTHSTAR");
    expect(foundationClient).toContain("Current foundation counts");
    expect(foundationActions).toContain("seedNorthStarWithConfirmationAction");
    expect(foundationActions).not.toContain("seedIntelligenceFoundationAction");
    expect(foundationData).toContain("hasOpenFoundationRecommendation");
    expect(foundationData).toContain("actionType: \"foundation_review_action\"");
    expect(foundationData).toContain("Only organization owners can update Foundation");
    expect(foundationData).toContain("Only organization owners can generate Foundation review actions");
  });

  it("surfaces source-traced review actions and audit readiness console", () => {
    expect(foundationData).toContain("getFoundationReviewActionsSummary");
    expect(foundationData).toContain("getAuditReadinessConsoleSummary");
    expect(foundationData).toContain("foundationActionKey");
    expect(foundationData).toContain("foundationReviewSourceModules");
    expect(foundationPage).toContain("audit-readiness-console");
    expect(foundationPage).toContain("Generated review actions");
    expect(operationsPage).toContain("getFoundationReviewActionsSummary");
    expect(workbenchPage).toContain("getFoundationReviewActionsSummary");
    expect(auditPage).toContain("getFoundationReviewActionsSummary");
  });

  it("adds owner-only task status controls and source drilldowns", () => {
    expect(foundationData).toContain("updateFoundationReviewTaskStatus");
    expect(foundationData).toContain("getFoundationSourceDrilldownSummary");
    expect(foundationData).toContain("foundation_review_task_status_updated");
    expect(foundationData).toContain("Only generated Foundation review tasks can be updated");
    expect(foundationActions).toContain("updateFoundationReviewTaskStatusAction");
    expect(reviewActionsPanel).toContain("updateFoundationReviewTaskStatusAction");
    expect(reviewActionsPanel).toContain("canManage && action.taskId");
    expect(foundationPage).toContain("Compliance source drilldowns");
    expect(foundationPage).toContain("source-drilldown-grid");
    expect(foundationPage).toContain("getFoundationSourceDrilldownSummary");
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
