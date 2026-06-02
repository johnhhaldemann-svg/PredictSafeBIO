# data.ts Service Split Plan

`src/lib/supabase/data.ts` is being split into focused domain service files.
All consumers importing from `@/lib/supabase/data` continue to work — the barrel
re-exports from each service file. Extraction happens incrementally per PR.

## Completed

| Service file | Extracted functions |
|---|---|
| `assessment-service.ts` | `listAssessments`, `getAssessmentDetail`, `updateAssessmentReview`, `saveAssessment` |
| `document-service.ts` | `listDocuments`, `getDocument`, `getDocumentRecommendationHistory`, `saveDocumentMetadata`, `persistDocumentRecommendations` |
| `data-helpers.ts` | `getProfileContext`, `mapAuditEvent`, `mapDocument`, `normalizeOptionalText`, `countRows`, `latestRow`, `latestRows` |

## Remaining domains — extract in follow-on PRs

Each PR should:
1. Create the new service file.
2. Move the relevant functions and private helpers (with imports from data-helpers.ts).
3. Add re-exports to data.ts and remove the originals.
4. Run `npm run typecheck && npm test && npm run build` before merging.

### foundation-read-service.ts

Functions to extract:
- `getIntelligenceFoundationSummary`
- `getFoundationAdminAccessSummary`
- `getFoundationAssigneeOptions`
- `getFoundationVerificationStatusSummary`
- `getFoundationProductionVerificationSummary`
- `getFoundationSourceDrilldownSummary`
- `getAuditReadinessConsoleSummary`
- `getFoundationOperationsDashboardSummary`
- `getFoundationNotificationSummary`
- `updateFoundationNotificationReadState`
- `markAllFoundationNotificationsRead`
- `addAuditReadinessNote`
- `createFoundationStarterRecords`

Private helpers to move: `demoIntelligenceFoundationSummary` wrappers, `buildFoundationVerificationChecklist`,
`demoFoundationVerificationStatusSummary`, `demoAuditReadinessConsoleSummary`,
`demoFoundationSourceDrilldownSummary`, `getFoundationSourceResolutionStates`,
`mapFoundationWorkflowSave`, `mapFoundationReviewRun`, `mapFoundationLatestAudit`,
`mapFoundationFinalSignoff`, `normalizeSkippedDuplicates`, `dedupeReadinessGaps`,
`getReadinessTrend`, `writeFoundationAuditEvent`.

### foundation-review-service.ts

Functions to extract:
- `generateFoundationReviewActions`
- `createFoundationReviewActionFromSource`
- `updateFoundationReviewTaskStatus`
- `updateFoundationReviewTasksStatus`
- `addFoundationReviewTaskNote`
- `addFoundationReviewTasksNote`
- `refreshFoundationSourceResolution`
- `seedNorthStarWithConfirmation`

Private helpers: `foundationActionKey`, `hasOpenFoundationTask`, `hasOpenFoundationRecommendation`.

### ergonomic-service.ts

Functions to extract:
- `getErgonomicLevel1Summary`
- `getErgonomicLevel2LaunchContext`
- `saveErgonomicSelfAssessment`
- `requestAdvancedErgonomicEvaluation`
- `saveErgonomicLevel2Inspection`

Private helpers: `countRiskRows`, `hasRepeatedModerateErgoPattern`,
`createErgonomicCorrectiveActionRecommendation`, `mapErgonomicRecord`, `demoErgonomicRecord`,
`normalizeTaskType`, `mapLevel2Recent`.

### map-operations-service.ts

Functions to extract:
- `getMapOperationsSummary`
- `getMapAlignedWorkbenchInput`
- `createMapOperationsBundle`

Private helpers: `demoMapOperationsSummary`, `summarizeJson`.

### training-service.ts

Functions to extract:
- `getTrainingMatrixSummary`

Private helpers: `trainingReadinessFromStatus`, `calculateTrainingMatrixReadiness`,
`demoTrainingMatrixSummary`.

### change-plan-service.ts

Functions to extract:
- `listChangePlanItems`
- `seedDefaultChangePlanItems`
- `createChangePlanItem`
- `updateChangePlanItem`

Private helpers: `fallbackChangePlanItems`, `normalizeChangePlanPriority`,
`normalizeChangePlanStatus`, `normalizeChangePlanText`, `mapChangePlanItem`.

### foundation-seed-service.ts

Functions to extract:
- `seedIntelligenceFoundation`
- `seedDemoWorkspace`

## Shared helpers (data-helpers.ts)

Already exported. Each new service file should import from `./data-helpers` rather
than defining its own copy of `getProfileContext`, `mapAuditEvent`, `mapDocument`, etc.

## Guard rails

- Run `npx tsc --noEmit` after each extraction to catch import errors before PR.
- Never remove a function from data.ts before adding the re-export — broken imports
  are a deploy blocker.
- Keep data.ts as a pure barrel once all domains are extracted; no logic should remain.
