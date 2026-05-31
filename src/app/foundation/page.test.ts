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
const workbenchClient = readFileSync(join(process.cwd(), "src/components/WorkbenchClient.tsx"), "utf8");
const auditPage = readFileSync(join(process.cwd(), "src/app/admin/audit/page.tsx"), "utf8");
const reviewActionsPanel = readFileSync(join(process.cwd(), "src/components/FoundationReviewActionsPanel.tsx"), "utf8");
const copyVerificationButton = readFileSync(join(process.cwd(), "src/components/CopyVerificationSummaryButton.tsx"), "utf8");
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
    expect(foundationClient).toContain("Create starter Foundation rows");
    expect(foundationActions).toContain("createFoundationStarterRecordsAction");
    expect(foundationData).toContain("createFoundationStarterRecords");
    expect(foundationData).toContain("foundation_starter_records_created");
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
    expect(foundationData).toContain("getFoundationVerificationStatusSummary");
    expect(foundationData).toContain("getFoundationOperationsDashboardSummary");
    expect(foundationData).toContain("getAuditReadinessConsoleSummary");
    expect(foundationData).toContain("foundationActionKey");
    expect(foundationData).toContain("foundationReviewSourceModules");
    expect(foundationPage).toContain("audit-readiness-console");
    expect(foundationPage).toContain("Generated review actions");
    expect(foundationPage).toContain("Owner verification status");
    expect(foundationPage).toContain("Run verification mode");
    expect(foundationPage).toContain("Duplicate prevention visibility");
    expect(foundationPage).toContain("verificationStatus.checklist");
    expect(foundationPage).toContain("Verification export summary");
    expect(foundationPage).toContain("Production readiness gate");
    expect(foundationPage).toContain("Verification passed");
    expect(foundationPage).toContain("Final preview signoff note");
    expect(foundationPage).toContain("CopyVerificationSummaryButton");
    expect(copyVerificationButton).toContain("navigator.clipboard.writeText");
    expect(foundationPage).toContain("sourceRecordAnchor");
    expect(operationsPage).toContain("getFoundationReviewActionsSummary");
    expect(operationsPage).toContain("getFoundationOperationsDashboardSummary");
    expect(operationsPage).toContain("Foundation operations dashboard");
    expect(operationsPage).toContain("Blocked task quick actions");
    expect(workbenchPage).toContain("getFoundationReviewActionsSummary");
    expect(auditPage).toContain("getFoundationReviewActionsSummary");
    expect(auditPage).toContain("Audit filters");
    expect(auditPage).toContain("listAuditEvents({ eventType, sourceModule })");
  });

  it("adds owner-only task status controls and source drilldowns", () => {
    expect(foundationData).toContain("updateFoundationReviewTaskStatus");
    expect(foundationData).toContain("getFoundationSourceDrilldownSummary");
    expect(foundationData).toContain("foundation_review_task_status_updated");
    expect(foundationData).toContain("Only generated Foundation review tasks can be updated");
    expect(foundationActions).toContain("updateFoundationReviewTaskStatusAction");
    expect(foundationActions).toContain("createFoundationReviewActionFromSourceAction");
    expect(foundationActions).toContain("addFoundationFinalPreviewSignoffAction");
    expect(foundationData).toContain("createFoundationReviewActionFromSource");
    expect(foundationData).toContain("final_preview_signoff");
    expect(foundationData).toContain("productionPromotionAllowed");
    expect(foundationData).toContain("assigned_to");
    expect(foundationData).toContain("due_date");
    expect(reviewActionsPanel).toContain("updateFoundationReviewTaskStatusAction");
    expect(reviewActionsPanel).toContain("canManage && action.taskId");
    expect(reviewActionsPanel).toContain("action-filter-bar");
    expect(reviewActionsPanel).toContain("Action detail and source trace");
    expect(reviewActionsPanel).toContain("returnTo");
    expect(reviewActionsPanel).toContain("Open source section");
    expect(reviewActionsPanel).toContain("Status history");
    expect(foundationData).toContain("getFoundationExactSourceHref");
    expect(foundationData).toContain("getFoundationTaskStatusHistory");
    expect(foundationData).toContain("getFoundationActionNextStep");
    expect(foundationData).toContain("operatingState");
    expect(reviewActionsPanel).toContain("assignedTo");
    expect(reviewActionsPanel).toContain("dueDate");
    expect(reviewActionsPanel).toContain("task-aging-badge");
    expect(foundationActions).toContain("normalizeFoundationReturnTo");
    expect(operationsPage).toContain("returnTo=\"/operations\"");
    expect(auditPage).toContain("returnTo=\"/admin/audit\"");
    expect(foundationPage).toContain("returnTo=\"/foundation\"");
    expect(workbenchPage).toContain("getFoundationReviewActionsSummary");
    expect(workbenchClient).toContain("getWorkbenchTaskAgingClass");
    expect(workbenchClient).toContain("Open source section");
    expect(workbenchClient).toContain("action.nextStep");
    expect(foundationPage).toContain("Compliance source drilldowns");
    expect(foundationPage).toContain("source-drilldown-grid");
    expect(foundationPage).toContain("getFoundationSourceDrilldownSummary");
    expect(foundationPage).toContain("Recommended action");
    expect(foundationPage).toContain("createFoundationReviewActionFromSourceAction");
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
