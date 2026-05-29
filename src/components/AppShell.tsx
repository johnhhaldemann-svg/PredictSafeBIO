import Link from "next/link";
import {
  Activity,
  Boxes,
  BrainCircuit,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FlaskConical,
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
  { href: "/workbench", label: "Workbench", icon: FlaskConical, section: "Platform" },
  { href: "/foundation", label: "Foundation", icon: BrainCircuit, section: "Platform" },
  { href: "/operations", label: "Operations", icon: Boxes, section: "Platform" },
  { href: "/ergonomics/self-assessment", label: "Level 1 Screening", icon: HeartPulse, section: "Ergonomics" },
  { href: "/inspections", label: "Inspections", icon: ClipboardList, section: "Safety tools" },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheck, section: "Safety tools" },
  { href: "/company-profile", label: "Company Profile", icon: LayoutDashboard, section: "Workspace" },
  { href: "/documents", label: "Documents", icon: FileText, section: "Workspace" },
  { href: "/admin/audit", label: "Audit", icon: Activity, section: "Admin" },
  { href: "/admin/demo", label: "Demo Ops", icon: Settings, section: "Admin" }
];

export async function AppShell({ children }: { children: ReactNode }) {
  const auth = await getAuthSummary();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/workbench" className="brand" aria-label="PredictSafeBIO Workbench">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          <span>
            <strong>PredictSafeBIO</strong>
            <small>AI Engine MVP</small>
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
