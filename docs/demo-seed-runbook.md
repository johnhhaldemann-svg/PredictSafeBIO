# Demo Seed Runbook

This runbook creates demo data for MVP demonstrations. It is intentionally a local/operator script, not a public UI control.

## Requirements

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `PREDICTSAFE_DEMO_USER_ID` to link seeded data to a real Supabase Auth user profile.
- Optional: `PREDICTSAFE_DEMO_ORG_ID` to override the default deterministic demo organization ID.

Do not commit service role keys, test passwords, one-time email links, or generated `.env` files.

## Run

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://mygxjnvzdljmdriokvvx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
$env:PREDICTSAFE_DEMO_USER_ID="<auth-user-uuid>"
npm run demo:seed
```

## Seeded Records

- Demo organization and optional owner profile link.
- Company profile seeded from the PredictSafeBIO demo biotech context.
- One critical draft assessment with signals and audit event.
- One SOP document metadata record.
- Draft gap and update recommendations labeled `Draft - Human Review Required`.

## Safety Boundary

- The script is non-destructive and does not reset existing data.
- It uses the service role key and must only be run by an operator.
- Seeded recommendations are demo artifacts and remain draft-only.
- This is not a validation or production data migration workflow.
