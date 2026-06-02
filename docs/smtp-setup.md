# SMTP Setup Guide

Email-dependent flows (account confirmation, password reset, team invites) require
custom SMTP configured in your Supabase project. Supabase's built-in email sender
is rate-limited and not suitable for production or heavier testing.

## What requires SMTP

| Flow | Triggered by |
|------|-------------|
| Account confirmation | User signs up at `/signup` |
| Password reset | User requests reset at `/forgot-password` |
| Team invite | Owner sends invite at `/account/team` |

## Supabase dashboard steps

1. Go to your Supabase project dashboard → **Authentication** → **Settings**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Fill in the fields below

### Required fields

| Field | Value |
|-------|-------|
| Host | Your SMTP server hostname (e.g. `smtp.resend.com`) |
| Port | Usually `465` (TLS) or `587` (STARTTLS) |
| Username | Your SMTP username or API key |
| Password | Your SMTP password or API key secret |
| Sender name | `PredictSafeBIO` |
| Sender email | A verified email address from your domain |

## Recommended SMTP providers

**Resend** (recommended for simplicity)
- Sign up at resend.com
- Add and verify your domain
- Create an API key
- Host: `smtp.resend.com`, Port: `465`, Username: `resend`, Password: `<api-key>`

**SendGrid**
- Sign up at sendgrid.com
- Verify a sender identity or domain
- Create an API key with Mail Send permission
- Host: `smtp.sendgrid.net`, Port: `587`, Username: `apikey`, Password: `<api-key>`

**Postmark**
- Sign up at postmarkapp.com
- Create a server and verify your sender signature
- Host: `smtp.postmarkapp.com`, Port: `587`, Username/Password: your server API token

## After configuring SMTP

1. **Re-enable email confirmation** — Authentication → Settings → toggle on "Enable email confirmations"
2. **Test with a real inbox** — sign up with a real email, verify confirmation arrives
3. **Test password reset** — request a reset at `/forgot-password`, verify the link works
4. **Test team invites** — owner sends invite at `/account/team`, verify the invite email arrives

## Environment variable

No additional environment variables are needed in `.env.local` — SMTP is configured
entirely through the Supabase dashboard.

## Invite-only mode

If you want to restrict signups to invited users only, set this in `.env.local`:

```
NEXT_PUBLIC_INVITE_ONLY=true
```

When this is enabled, users who reach `/onboarding` without a valid pending invite
will see a warning message and cannot complete onboarding.

## Smoke test checklist (after SMTP is live)

- [ ] Sign up with a real email → confirmation email arrives in under 2 minutes
- [ ] Click the confirmation link → redirected to onboarding
- [ ] Complete onboarding → redirected to workbench
- [ ] Request password reset → reset email arrives
- [ ] Click reset link → `/account/password` loads with session active
- [ ] Owner invites a team member → invite email arrives
- [ ] Invited user clicks link → lands on onboarding with org pre-filled
