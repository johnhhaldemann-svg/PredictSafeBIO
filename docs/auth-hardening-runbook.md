# Supabase Auth Hardening Runbook

Use this runbook before heavier signup or password-recovery testing. Do not commit SMTP credentials, Management API tokens, passwords, or one-time auth links.

## Dashboard Settings

1. Configure a custom SMTP provider in Supabase Auth settings.
2. Re-enable email confirmation for new users.
3. Enable leaked-password protection for the project.
4. Confirm the site URL points to the production app.
5. Add allowed redirect URLs for:
   - `https://predictsafe-bio.vercel.app/auth/confirm`
   - preview deployment `/auth/confirm` URLs used for release testing
   - local `http://localhost:3000/auth/confirm` only when doing local inbox smoke

## Email Templates

Use Supabase Auth templates for confirmation and recovery emails. The confirmation/recovery links should preserve the `redirect_to` value sent by the app, because signup routes users through `/auth/confirm?next=/onboarding` and password recovery routes users through `/auth/confirm?next=/account/password`.

Disable email tracking in the SMTP provider for Auth emails so confirmation and recovery links are not rewritten.

## Real-Inbox Smoke

1. Open `/signup`.
2. Create a user with a real inbox.
3. Confirm the email and verify the app lands on `/onboarding`.
4. Complete onboarding.
5. Open `/account` and update the full name.
6. Update company profile basics from `/account` or `/company-profile`.
7. Sign out.
8. Open `/forgot-password` and request a reset email.
9. Open the reset link, set a new password at `/account/password`, then sign in with the new password.
10. Confirm `/admin/audit` includes account/company profile update events.

## Boundaries

- App code does not configure SMTP, leaked-password protection, or dashboard Auth toggles.
- Account profile updates never use `user_metadata` for authorization.
- Role and organization assignment remain read-only in the account UI.
- Keep all AI outputs draft-only and human-review required.
