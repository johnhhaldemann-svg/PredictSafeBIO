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
      {/* ── Top bar: logo + quick links + user ── */}
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

      {/* ── Category nav bar: 5 platform categories with sub-dropdowns ── */}
      <PlatformCategoryNav />

      {/* ── Demo / disconnected banner ── */}
      {!auth.signedIn && (
        <div className="demo-mode-banner" role="alert" aria-label="Demo mode notice">
          <span>
            You are viewing sample data.{" "}
            <Link href="/signup">Sign up</Link> or{" "}
            <Link href="/login?next=/workbench">sign in</Link> to connect your workspace.
          </span>
        </div>
      )}

      {/* ── Breadcrumb / context strip ── */}
      {auth.signedIn && (
        <div className="breadcrumb-bar" aria-label="Page context">
          {auth.organizationId ? (
            <span className="muted" style={{ fontSize: "0.78em" }}>
              {/* Workspace connected */}
              Workspace connected ·{" "}
              {auth.fullName ?? auth.userEmail ?? "Signed in"} ·{" "}
              <span className={roleBadgeClass} style={{ fontWeight: 600 }}>{roleLabel}</span>
            </span>
          ) : (
            <span className="muted" style={{ fontSize: "0.78em" }}>
              Not signed in ·{" "}
              <a href="/signup" className="text-link">Sign up</a> to get started ·{" "}
              <Link href="/onboarding" className="button-primary compact">Complete setup</Link>
            </span>
          )}
        </div>
      )}
      {/* Quick nav references: My Work /my-work · Change Plan /change-plan */}

      <main className="app-main" id="main-content">
        {children}
      </main>
    </div>
  );
}
