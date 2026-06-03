import Link from "next/link";
import {
  Brain,
  LogOut,
  ShieldCheck
} from "lucide-react";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/auth/actions";
import { getAuthSummary } from "@/lib/supabase/data";
import { getKnowledgePendingCount } from "@/lib/supabase/knowledge-service";
import { getNavTier, getRoleLabel, getRoleBadgeClass } from "@/lib/role-permissions";
import { PlatformCategoryNav } from "./PlatformCategoryNav";

function getInitials(email: string | null | undefined): string {
  if (!email) return "JH";
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export async function AppShell({ children }: { children: ReactNode }) {
  const auth = await getAuthSummary();
  const initials = getInitials(auth.userEmail);
  const tier = getNavTier(auth.role);
  const roleLabel = getRoleLabel(auth.role);
  const roleBadgeClass = getRoleBadgeClass(auth.role);

  const isOwner = tier === "admin" || tier === "superadmin";
  const pendingCount = isOwner && auth.organizationId
    ? await getKnowledgePendingCount(auth.organizationId)
    : 0;

  return (
    <div className="app-shell">
      {/* ── Skip navigation ── */}
      <a href="#main-content" className="skip-nav">Skip to main content</a>
      {/* ── Top bar ── */}
      <header className="top-nav" aria-label="Primary navigation">
        <Link href="/workbench" className="logo-area" aria-label="PredictSafeBIO platform">
          <div className="logo-box">
            <ShieldCheck size={16} color="#fff" aria-hidden="true" />
          </div>
          <div className="logo-text">
            <strong>PredictSafeBIO</strong>
            <small>Biosafety Intelligence</small>
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
          <PlatformCategoryNav />
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
