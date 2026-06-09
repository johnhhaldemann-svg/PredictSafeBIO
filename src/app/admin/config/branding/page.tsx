export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Palette, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { canViewPlatform } from "@/lib/role-permissions";
import { getPlatformBranding } from "@/lib/supabase/platform-config-service";
import { saveBrandingAction } from "../actions";

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function BrandingPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, organization_id").eq("id", user.id).single();

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!canViewPlatform(access)) redirect("/");

  const sp = await searchParams;
  const branding = await getPlatformBranding();

  const field = (name: keyof typeof branding, label: string, hint?: string, type = "text") => ({
    name, label, hint, type, value: branding[name],
  });

  const brandingFields = [
    field("platform_name",   "Platform Name",   "Shown in top nav, emails, and page titles."),
    field("platform_tagline","Tagline",          "Short descriptor under the platform name."),
    field("primary_color",   "Primary Color",    "Hex color for buttons and accents. e.g. #2563eb", "color"),
    field("logo_url",        "Logo URL",         "Full URL to your logo (PNG/SVG). Leave blank for the default shield icon."),
    field("footer_text",     "Footer Text",      "Shown at the bottom of the app."),
  ];

  const contactFields = [
    field("support_email",      "Support Email",      "Shown in emails and on error pages."),
    field("support_url",        "Support URL",        "Link to your help center or docs site."),
    field("privacy_policy_url", "Privacy Policy URL", "Linked in emails and signup flow."),
    field("terms_url",          "Terms of Service URL","Linked in emails and signup flow."),
  ];

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Admin › Config</p>
            <h1>Platform Branding</h1>
            <p className="muted">Update name, colors, logo, and contact info — live, no code deploy needed.</p>
          </div>
          <Link href="/admin/config" className="button-secondary">← Config</Link>
        </header>

        {sp.success && (
          <div className="verification-pass-box"><CheckCircle2 size={15} /><span>{decodeURIComponent(sp.success)}</span></div>
        )}
        {sp.error && (
          <div className="verification-fail-box"><ShieldAlert size={15} /><span>{decodeURIComponent(sp.error)}</span></div>
        )}

        <form action={saveBrandingAction} className="stacked-form">

          <section className="panel">
            <div className="panel-heading">
              <div><p className="section-label">Identity</p><h2>Brand</h2></div>
              <Palette size={20} />
            </div>
            <div className="form-grid">
              {brandingFields.map(({ name, label, hint, type, value }) => (
                <label key={name} style={name === "footer_text" ? { gridColumn: "1 / -1" } : undefined}>
                  {label}
                  {hint && <span className="muted">{hint}</span>}
                  <input
                    name={name}
                    type={type}
                    defaultValue={value}
                    style={name === "logo_url" ? { fontFamily: "monospace" } : undefined}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div><p className="section-label">Contact &amp; legal</p><h2>Links</h2></div>
            </div>
            <div className="form-grid">
              {contactFields.map(({ name, label, hint, value }) => (
                <label key={name}>
                  {label}
                  {hint && <span className="muted">{hint}</span>}
                  <input name={name} defaultValue={value} style={{ fontFamily: "monospace" }} />
                </label>
              ))}
            </div>
          </section>

          <div className="guardrail-box">
            <ShieldCheck size={16} />
            <span>Branding changes take effect immediately and are recorded in the audit log.</span>
          </div>

          <div className="form-action-row">
            <button className="button-primary" type="submit">Save branding</button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
