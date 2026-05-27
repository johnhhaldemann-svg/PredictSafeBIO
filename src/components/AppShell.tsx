import Link from "next/link";
import { Activity, ClipboardCheck, FileText, FlaskConical, LayoutDashboard, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/workbench", label: "Workbench", icon: FlaskConical },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/company-profile", label: "Company Profile", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/admin/audit", label: "Audit", icon: Activity }
];

export function AppShell({ children }: { children: ReactNode }) {
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
          {navItems.map((item) => (
            <Link href={item.href} className="nav-link" key={item.href}>
              <item.icon size={17} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
