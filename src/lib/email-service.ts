/**
 * email-service.ts
 *
 * Phase 5 — System email delivery.
 * Templates are stored in the email_templates DB table (editable by superadmin).
 * Delivery uses Resend when RESEND_API_KEY is set; logs to console otherwise.
 *
 * PII / HIPAA: Never include PHI (diagnoses, lab results, clinical notes) in email.
 * Allowed: names, org names, role labels, URLs, dates, generic status strings.
 *
 * Usage:
 *   await sendSystemEmail("welcome", { name: "Jane", org_name: "BioLab", ... });
 */

import { getSupabaseAdminClient } from "./supabase/admin";

type EmailVars = Record<string, string>;

// ── Fetch template from DB ────────────────────────────────────────────────────

async function getTemplate(key: string): Promise<{ subject: string; body_html: string; body_text: string } | null> {
  const admin = getSupabaseAdminClient();
   
  const { data } = await (admin as any)
    .from("email_templates")
    .select("subject, body_html, body_text, is_active")
    .eq("key", key)
    .maybeSingle();

   
  if (!data || !(data as any).is_active) return null;
   
  const d = data as any;
  return { subject: d.subject, body_html: d.body_html, body_text: d.body_text };
}

// ── Variable substitution — replaces {{key}} with values ─────────────────────

function interpolate(template: string, vars: EmailVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ── Send via Resend ───────────────────────────────────────────────────────────

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}): Promise<{ error: string | null }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { error: "RESEND_API_KEY not set" };

  const fromAddress = opts.from ?? process.env.EMAIL_FROM ?? "noreply@predictsafe-bio.com";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { error: `Resend error ${res.status}: ${body}` };
  }

  return { error: null };
}

// ── Main send function ────────────────────────────────────────────────────────

export async function sendSystemEmail(
  templateKey: string,
  to: string,
  vars: EmailVars = {}
): Promise<{ error: string | null; skipped?: boolean }> {
  // Merge platform defaults into vars
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://predictsafe-bio.vercel.app";
  const mergedVars: EmailVars = {
    platform_name: "PredictSafeBIO",
    app_url: appUrl,
    support_email: process.env.SUPPORT_EMAIL ?? "support@predictsafe-bio.com",
    ...vars,
  };

  const template = await getTemplate(templateKey);

  if (!template) {
    console.warn(`[email-service] Template "${templateKey}" not found or inactive.`);
    return { error: null, skipped: true };
  }

  const subject  = interpolate(template.subject,   mergedVars);
  const bodyHtml = interpolate(template.body_html,  mergedVars);
  const bodyText = interpolate(template.body_text,  mergedVars);

  // If Resend is configured, send for real
  if (process.env.RESEND_API_KEY) {
    return sendViaResend({ to, subject, html: bodyHtml, text: bodyText });
  }

  // Dev / unconfigured — log instead
  console.info(
    `[email-service] DEV — would send "${templateKey}" to ${to}\n` +
    `  Subject: ${subject}\n` +
    `  Body: ${bodyText.slice(0, 120)}...`
  );

  return { error: null, skipped: true };
}

// ── Convenience helpers ───────────────────────────────────────────────────────

export const EmailTemplates = {
  WELCOME:        "welcome",
  BIO_APPROVED:   "bio_approved",
  BIO_FLAGGED:    "bio_flagged",
  TRIAL_EXPIRING: "trial_expiring",
  PAYMENT_FAILED: "payment_failed",
} as const;
