export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Flag, Mail, Palette, Settings } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { canViewPlatform } from "@/lib/role-permissions";
import { listFeatureFlags } from "@/lib/supabase/feature-flag-service";
import { getPlatformBranding } from "@/lib/supabase/platform-config-service";

/**
 * /admin/config — Platform Configuration hub.
 * Quick-status cards linking to flags, branding, and email sub-pages.
 */
export default async function ConfigHubPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, organization_id").eq("id", user.id).single();

  const access = { signedIn: true, userId: user.id, organizationId: profile?.organization_id, role: profile?.role };
  if (!canViewPlatform(access)) redirect("/");

  const [flags, branding] = await Promise.all([
    listFeatureFlags(),
    getPlatformBranding(),
  ]);

  const enabledCount  = flags.filter(f => f.enabled).length;
  const disabledCount = flags.length - enabledCount;

  const sections = [
    {
      href:        "/admin/config/flags",
      label:       "Feature Flags",
      icon:        Flag,
      description: "Toggle features on/off without redeploying code.",
      meta:        `${enabledCount} enabled · ${disabledCount} disabled`,
      variant:     "platform-blue",
    },
    {
      href:        "/admin/config/branding",
      icon:        Palette,
      label:       "Platform Branding",
      description: "Update the platform name, colors, logo, and footer.",
      meta:        `Name: ${branding.platform_name}`,
      variant:     "platform-navy",
    },
    {
      href:        "/admin/config/emails",
      icon:        Mail,
      label:       "Email Templates",
      description: "Edit subject lines and body copy for all system emails.",
      meta:        "Welcome · Bio approved · Bio flagged · Trial expiring · Payment failed",
      variant:     "platform-green",
    },
  ];

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Admin</p>
            <h1>Platform Configuration</h1>
            <p className="muted">Manage feature flags, branding, and system emails — no code deploy needed.</p>
          </div>
          <Link href="/admin/dashboard" className="button-secondary">← Command Center</Link>
        </header>

        <div className="command-card-grid">
          {sections.map(({ href, label, icon: Icon, description, meta, variant }) => (
            <Link key={href} href={href} className="provider-card-link">
              <article className={`command-card ${variant}`}>
                <div>
                  <span><Icon size={16} /></span>
                  <strong>{label}</strong>
                </div>
                <p className="muted">{description}</p>
                <code className="muted">{meta}</code>
              </article>
            </Link>
          ))}
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Quick reference</p><h2>Configuration checklist</h2></div>
            <Settings size={20} />
          </div>
          <div className="action-list">
            {[
              { label: "Audit log enabled",            ok: flags.find(f => f.key === "audit_log")?.enabled ?? false },
              { label: "Stripe billing configured",    ok: Boolean(process.env.STRIPE_SECRET_KEY) },
              { label: "Email provider configured",    ok: Boolean(process.env.RESEND_API_KEY) },
              { label: "Support email set",             ok: Boolean(branding.support_email) },
              { label: "Platform name customized",      ok: branding.platform_name !== "PredictSafeBIO" },
              { label: "Invite-only signup enabled",    ok: flags.find(f => f.key === "invite_only_signup")?.enabled ?? false },
            ].map(({ label, ok }) => (
              <article key={label} className="action-row">
                <div>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: ok ? "var(--green)" : "var(--red)", flexShrink: 0, display: "inline-block" }} />
                  <span style={{ color: ok ? "inherit" : "var(--muted)" }}>{label}</span>
                  <span className={`status-chip ${ok ? "status-current" : "status-missing"}`}>
                    {ok ? "✓" : "Not set"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
