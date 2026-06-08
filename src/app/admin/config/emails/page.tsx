export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Mail, ShieldAlert, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlatformConfigError } from "@/components/PlatformConfigError";
import { createServerClient } from "@/lib/supabase/server";
import { canViewPlatform } from "@/lib/role-permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import { saveEmailTemplateAction } from "../actions";

type Props = { searchParams: Promise<{ success?: string; error?: string; tab?: string }> };

type EmailTemplate = {
  key: string;
  label: string;
  description: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
};

async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const admin = getSupabaseAdminClient();
   
  const { data } = await (admin as any)
    .from("email_templates")
    .select("*")
    .order("key");
   
  return ((data ?? []) as any[]).map((t: any) => ({
    key: t.key,
    label: t.label,
    description: t.description,
    subject: t.subject,
    body_html: t.body_html,
    body_text: t.body_text ?? "",
    variables: (t.variables as string[]) ?? [],
    is_active: t.is_active,
    updated_at: t.updated_at,
  }));
}

export default async function EmailTemplatesPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, organization_id").eq("id", user.id).single();

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!canViewPlatform(access)) redirect("/");

  if (!isSupabaseServiceConfigured()) return <PlatformConfigError feature="Email Templates" />;

  const sp = await searchParams;
  const templates = await listEmailTemplates();
  const activeTab = sp.tab ?? templates[0]?.key ?? "";
  const activeTemplate = templates.find(t => t.key === activeTab) ?? templates[0];

  const hasResend = Boolean(process.env.RESEND_API_KEY);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Admin › Config</p>
            <h1>Email Templates</h1>
            <p className="muted">Edit the subject and body of every system email. Use <code>{"{{variable}}"}</code> placeholders.</p>
          </div>
          <Link href="/admin/config" className="button-secondary">← Config</Link>
        </header>

        {sp.success && (
          <div className="verification-pass-box"><CheckCircle2 size={15} /><span>{decodeURIComponent(sp.success)}</span></div>
        )}
        {sp.error && (
          <div className="verification-fail-box"><ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span></div>
        )}

        {!hasResend && (
          <div className="verification-pending-box">
            <Zap size={14} />
            <span>
              <strong>Email delivery not configured.</strong> Add <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> to your Vercel environment variables to activate sending. Templates can still be edited now.
            </span>
          </div>
        )}

        {/* Template tabs */}
        <nav className="command-center-link-strip">
          {templates.map(t => (
            <Link
              key={t.key}
              href={`/admin/config/emails?tab=${t.key}`}
              className={t.key === activeTab ? "button-primary" : "button-secondary"}
            >
              <Mail size={12} className="icon-mr" />
              {t.label}
              {!t.is_active && <span style={{ opacity: 0.6 }}>(off)</span>}
            </Link>
          ))}
        </nav>

        {activeTemplate && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Template · <code style={{ fontSize: "0.8rem" }}>{activeTemplate.key}</code></p>
                <h2>{activeTemplate.label}</h2>
                <p className="muted">{activeTemplate.description}</p>
              </div>
              <span className={`status-chip ${activeTemplate.is_active ? "status-current" : "status-missing"}`}>
                {activeTemplate.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            {activeTemplate.variables.length > 0 && (
              <div style={{ marginBottom: "1rem", padding: "0.6rem 0.85rem", background: "var(--surface-2, #f8fafc)", borderRadius: 6, border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4 }}>Available variables:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {activeTemplate.variables.map(v => (
                    <code key={v} style={{ fontSize: "0.72rem", background: "var(--bg)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            <form action={saveEmailTemplateAction} className="stacked-form">
              <input type="hidden" name="key" value={activeTemplate.key} />

              <label>
                Subject line
                <input name="subject" defaultValue={activeTemplate.subject} required />
              </label>

              <label>
                HTML body
                <span className="muted">Supports basic HTML tags. Use {"{{variable}}"} for dynamic content.</span>
                <textarea
                  name="body_html"
                  defaultValue={activeTemplate.body_html}
                  required
                  rows={10}
                  style={{ fontFamily: "monospace" }}
                />
              </label>

              <label>
                Plain-text fallback
                <span className="muted">For email clients that do not render HTML.</span>
                <textarea
                  name="body_text"
                  defaultValue={activeTemplate.body_text}
                  rows={4}
                  style={{ fontFamily: "monospace" }}
                />
              </label>

              <label className="check-row">
                <input
                  type="checkbox"
                  name="is_active"
                  value="true"
                  defaultChecked={activeTemplate.is_active}
                />
                Template active (send this email when triggered)
              </label>

              <div className="form-action-row">
                <button className="button-primary" type="submit">Save template</button>
                <p className="muted">
                  Last saved: {new Date(activeTemplate.updated_at).toLocaleString()}
                </p>
              </div>
            </form>
          </section>
        )}
      </div>
    </AppShell>
  );
}
