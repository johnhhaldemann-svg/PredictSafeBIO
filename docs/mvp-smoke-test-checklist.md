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
3. Open the document detail page.
4. Confirm gap recommendations and draft update recommendations are labeled as draft/human-review work.
5. Persist document recommendations.
6. Confirm `/admin/audit` includes a `document_recommendation_generated` event.

## Expected Boundaries

- Public users can browse demo data and run the deterministic engine.
- Public users cannot save assessments or document metadata.
- Signed-in users only see organization-scoped Supabase records.
- No screen claims product release, regulatory acceptance, diagnosis, or validated GxP/Part 11 status.
