import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Brain,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { signOutAction } from "@/app/auth/actions";
import { getAuthSummary } from "@/lib/supabase/data";
import { resolvePack } from "@/lib/foundation/vertical-registry";
import { getKnowledgePendingCount } from "@/lib/supabase/knowledge-service";
import { hasCompletedSetupQuestionnaire } from "@/lib/supabase/questionnaire-service";
import { getNavTier, getRoleLabel, getRoleBadgeClass, isPlatformRole } from "@/lib/role-permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";
import { PlatformCategoryNav } from "./PlatformCategoryNav";
import { AdminConsoleSidebar } from "./AdminConsoleSidebar";
import { TenantSwitcher } from "./TenantSwitcher";

function getInitials(email: string | null | undefined): string {
  if (!email) return "JH";
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export async function AppShell({
  children,
  // The Setup Questionnaire page passes this so the first-login gate below does
  // not redirect onto itself. Everywhere else it stays false.
  bypassSetupGate = false,
}: {
  children: ReactNode;
  bypassSetupGate?: boolean;
}) {
  const auth = await getAuthSummary();
  const pack = resolvePack(auth.vertical);
  const initials = getInitials(auth.userEmail);
  const tier = getNavTier(auth.role);
  const roleLabel = getRoleLabel(auth.role);
  const roleBadgeClass = getRoleBadgeClass(auth.role);

  const isSuperAdmin = tier === "superadmin";
  const isOwner = tier === "owner" || tier === "platform_staff" || isSuperAdmin;
  const pendingCount = isOwner && auth.organizationId
    ? await getKnowledgePendingCount(auth.organizationId)
    : 0;

  // ── Superadmin: dark "Platform Console v2.4" shell ────────────────────────
  if (isSuperAdmin) {
    // Customer list for the tenant switcher (cheap id+name query).
    let orgs: { id: string; name: string }[] = [];
    if (isSupabaseServiceConfigured()) {
      try {
        const admin = getSupabaseAdminClient();
        const { data } = await admin.from("organizations").select("id, name").order("name");
        orgs = (data ?? []) as { id: string; name: string }[];
      } catch {
        /* switcher is best-effort */
      }
    }

    return (
      <div className="app-shell psb-console psb-shell">
        <a href="#main-content" className="skip-nav">Skip to main content</a>
        <div className="psb-layout">
          {/* Left rail: brand block + grouped console nav */}
          <aside className="psb-aside" aria-label="Superadmin navigation">
            <div className="psb-brand">
              <Link href="/admin/dashboard" className="psb-logo" aria-label="PredictSafe platform console">
                PREDICTSAFE
              </Link>
              <div className="psb-sub">Platform Console v2.4</div>
              <div className="psb-badge-sa">◆ Super Admin</div>
            </div>
            <AdminConsoleSidebar />
          </aside>

          {/* Right: topbar + page content */}
          <div>
            <div className="psb-console-main" style={{ paddingBottom: 0 }}>
              <div className="psb-topbar">
                <Link href="/admin/dashboard" className="psb-logo" style={{ fontSize: 15 }} aria-label="Home">
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck size={16} aria-hidden="true" /> Console
                  </span>
                </Link>
                <div className="psb-topright">
                  <Suspense fallback={null}>
                    <TenantSwitcher orgs={orgs} />
                  </Suspense>
                  <Link className="psb-iconbtn" href="/admin/escalations" aria-label="Escalations inbox" title="Escalations inbox">
                    <Bell size={16} />
                  </Link>
                  <span className="psb-role-chip">{roleLabel}</span>
                  <span className="psb-iconbtn avatar" aria-label={`User: ${auth.userEmail ?? "Admin"}`} title={auth.userEmail ?? "Admin"}>
                    {initials}
                  </span>
                  <form action={signOutAction} style={{ display: "inline" }}>
                    <button className="psb-iconbtn" type="submit" aria-label="Sign out" title="Sign out">
                      <LogOut size={16} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
            <main className="psb-console-main" id="main-content" style={{ paddingTop: 6 }}>
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }

  // ── First-login requirement: complete the Setup Questionnaire ─────────────
  // A signed-in org user (non-platform) must answer the questionnaire before the
  // workspace opens. The questionnaire page bypasses this so it can render and
  // still offer sign-out — the user is never trapped without an exit.
  if (
    !bypassSetupGate &&
    auth.signedIn &&
    auth.organizationId &&
    !isPlatformRole(auth.role) &&
    !(await hasCompletedSetupQuestionnaire())
  ) {
    redirect("/assess/setup-questionnaire");
  }

  // ── Standard shell with sidebar ───────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* ── Skip navigation ── */}
      <a href="#main-content" className="skip-nav">Skip to main content</a>
      {/* ── Top bar ── */}
      <header className="top-nav" aria-label="Primary navigation">
        <Link href="/workbench" className="logo-area" aria-label={`${pack.brandLabel} platform`}>
          <div className="logo-box">
            <ShieldCheck size={16} color="#fff" aria-hidden="true" />
          </div>
          <div className="logo-text">
            <strong>{pack.brandLabel}</strong>
            <small>{pack.tagline}</small>
          </div>
        </Link>

        <div className="tnav-spacer" aria-hidden="true" />

        <div className="user-area">
          {auth.signedIn ? (
            <>
              {isOwner && pendingCount > 0 && (
                <Link
                  href="/admin/ai-knowledge"
                  className="tnav-badge-link"
                  title={`${pendingCount} entries pending review`}
                >
                  <Brain size={13} aria-hidden="true" />
                  <span className="nav-badge" aria-label={`${pendingCount} pending`}>
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                </Link>
              )}
              <span className={`role-chip ${roleBadgeClass}`} title={`Your role: ${roleLabel}`}>
                {roleLabel}
              </span>
              <div className="u-avatar" aria-label={`User: ${auth.userEmail ?? ""}`}>{initials}</div>
              <Link href="/account" className="tnav-auth-link" aria-label="Account settings">
                {auth.userEmail ?? "Account"}
              </Link>
              <form action={signOutAction} style={{ display: "inline" }}>
                <button className="icon-button tnav-icon-btn" type="submit" aria-label="Sign out" title="Sign out">
                  <LogOut size={16} />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="tnav-auth-link" href="/login?next=/workbench">Sign in</Link>
              <Link className="tnav-auth-primary" href="/signup?next=/onboarding">Get started</Link>
            </>
          )}
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="app-body">
        <aside className="app-sidebar">
          <PlatformCategoryNav canViewPlatform={tier === "platform_staff"} />
        </aside>

        <div className="app-content">
          {/* Demo / disconnected banner */}
          {!auth.signedIn && (
            <div className="demo-mode-banner" role="alert" aria-label="Demo mode notice">
              <span>
                You are viewing sample data.{" "}
                <Link href="/signup">Sign up</Link> or{" "}
                <Link href="/login?next=/workbench">sign in</Link> to connect your workspace.
              </span>
            </div>
          )}

          {/* Workspace context strip */}
          {auth.signedIn && auth.organizationId && (
            <div className="workspace-bar" aria-label="Workspace context">
              <span className="muted">
                Workspace connected · {auth.fullName ?? auth.userEmail ?? "Signed in"} ·{" "}
                <span className={roleBadgeClass} style={{ fontWeight: 600 }}>{roleLabel}</span>
              </span>
            </div>
          )}

          <main className="app-main" id="main-content">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
