# MVP Smoke Test Checklist

Use a real email inbox for the test account. Do not commit passwords, tokens, or one-time links.

## Auth And Onboarding

1. Open `https://predictsafe-bio.vercel.app/signup`.
2. Create a test user with email/password auth.
3. If Supabase requires email confirmation, complete the confirmation link from the inbox.
4. Sign in at `/login`.
5. Complete `/onboarding` using the seeded demo company profile fields.
6. Confirm `/company-profile` shows the signed-in organization's company profile instead of demo fallback data.

## Assessment Persistence

1. Open `/workbench`.
2. Run the default deterministic biotech risk assessment.
3. Save the assessment.
4. Confirm `/assessments` lists the saved assessment.
5. Open the assessment detail page and confirm it shows score, risk level, confidence, snapshots, drivers, gaps, signals, and audit trail.
6. Confirm `/admin/audit` includes an `assessment_saved` event.

## Document Persistence

1. Open `/documents`.
2. Save a document metadata record with known gaps.
3. Attach a small source file and confirm upload succeeds against the private `biotech-documents` bucket.
4. Open the document detail page.
5. Confirm gap recommendations and draft update recommendations are labeled as draft/human-review work.
6. Persist document recommendations.
7. Download the document demo report and confirm it includes the draft-only boundary.
8. Confirm `/admin/audit` includes a `document_recommendation_generated` event.

## Demo Reports

1. Open a saved assessment detail page.
2. Download the assessment demo report.
3. Confirm the report includes score, risk, confidence, drivers, gaps, and the draft-only boundary.
4. Do not treat downloaded reports as controlled records or validated release artifacts.

## Expected Supabase Evidence Counts

- MVP release smoke test baseline: 1 user, 1 profile, 1 company profile, 1 assessment, 2 signals, 1 document, 6 draft recommendations, and 4 audit events.
- Document upload smoke should add a storage object under `biotech-documents/{organization_id}/{document_id}/...` when a file is attached and persist matching `storage_bucket` / `storage_path` metadata.

## Expected Boundaries

- Public users can browse demo data and run the deterministic engine.
- Public users cannot save assessments or document metadata.
- Signed-in users only see organization-scoped Supabase records.
- No screen claims product release, regulatory acceptance, diagnosis, or validated GxP/Part 11 status.
