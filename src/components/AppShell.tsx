import Link from "next/link";
import {
  Activity,
  Boxes,
  BrainCircuit,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserCircle
} from "lucide-react";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/auth/actions";
import { getAuthSummary } from "@/lib/supabase/data";

const navItems = [
  { href: "/workbench", label: "BioRisk Scoring", icon: FlaskConical, section: "Risk Intelligence" },
  { href: "/my-work", label: "My Work", icon: ClipboardList, section: "Risk Intelligence" },
  { href: "/assessments", label: "Risk Register", icon: ClipboardCheck, section: "Risk Intelligence" },
  { href: "/documents", label: "SOPs & Templates", icon: FileText, section: "Document Control" },
  { href: "/documents/version-control", label: "Version Control", icon: GitBranch, section: "Document Control" },
  { href: "/foundation", label: "Compliance Map", icon: BrainCircuit, section: "Compliance" },
  { href: "/operations", label: "HSE Operations", icon: Boxes, section: "HSE Management" },
  { href: "/training-matrix", label: "Training Matrix", icon: ClipboardCheck, section: "HSE Management" },
  { href: "/ergonomics/self-assessment", label: "Hazard Tracking", icon: HeartPulse, section: "HSE Management" },
  { href: "/inspections", label: "Inspection / Audit", icon: ClipboardList, section: "HSE Management" },
  { href: "/company-profile", label: "Company Profile", icon: LayoutDashboard, section: "Common Utilities" },
  { href: "/change-plan", label: "Change Plan", icon: GitBranch, section: "Common Utilities" },
  { href: "/admin/audit", label: "Immutable Audit Log", icon: Activity, section: "System Reliance" },
  { href: "/admin/demo", label: "Admin Utilities", icon: Settings, section: "System Reliance" }
];

export async function AppShell({ children }: { children: ReactNode }) {
  const auth = await getAuthSummary();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/workbench" className="brand" aria-label="PredictSafeBIO platform">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          <span>
            <strong>PredictSafeBIO</strong>
            <small>One Platform. Every BioType.</small>
          </span>
        </Link>
        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item, index) => {
            const showSection = index === 0 || navItems[index - 1].section !== item.section;
            return (
              <div className="nav-group" key={item.href}>
                {showSection ? <span className="nav-section">{item.section}</span> : null}
                <Link href={item.href} className="nav-link">
                  <item.icon size={17} />
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="main-panel">
        <header className="app-header" aria-label="Account status">
          <div>
            <p className="header-kicker">{auth.configured ? "Supabase connected" : "Demo mode"}</p>
            <strong>{auth.signedIn ? auth.userEmail : "Public workbench"}</strong>
          </div>
          <div className="auth-actions">
            {auth.signedIn ? (
              <>
                {auth.needsOnboarding ? (
                  <Link className="button-secondary compact" href="/onboarding">
                    Finish onboarding
                  </Link>
                ) : (
                  <span className="auth-pill">
                    <UserCircle size={15} />
                    Org workspace
                  </span>
                )}
                <form action={signOutAction}>
                  <button className="icon-button" type="submit" aria-label="Sign out" title="Sign out">
                    <LogOut size={17} />
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link className="button-secondary compact" href="/login?next=/workbench">
                  Sign in
                </Link>
                <Link className="button-primary compact" href="/signup?next=/onboarding">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
