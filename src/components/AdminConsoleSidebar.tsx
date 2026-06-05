"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Users,
  AlertTriangle,
  Flag,
  ScrollText,
  CalendarClock,
  Brain,
  ShieldCheck,
  Settings,
  CreditCard,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavSection = { title: string; items: NavItem[] };

// Grouped console nav. Every entry resolves to a distinct, real admin page —
// no duplicate destinations or dead links.
const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Command Center", icon: LayoutDashboard },
      { href: "/admin/analytics", label: "Platform Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Tenants & Users",
    items: [
      { href: "/admin/organizations", label: "Organizations", icon: Building2 },
      { href: "/admin/users", label: "User Management", icon: Users },
    ],
  },
  {
    title: "Compliance",
    items: [
      { href: "/admin/escalations", label: "Escalations", icon: AlertTriangle },
      { href: "/admin/moderation", label: "Content Moderation", icon: Flag },
      { href: "/admin/audit", label: "Audit Logs", icon: ScrollText },
      { href: "/admin/deadlines", label: "Reg. Deadlines", icon: CalendarClock },
    ],
  },
  {
    title: "Security & Tools",
    items: [
      { href: "/admin/superadmin", label: "AI Engine & Diagnostics", icon: Brain },
      { href: "/admin/security", label: "Security Audits", icon: ShieldCheck },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/config", label: "Configuration", icon: Settings },
      { href: "/admin/billing", label: "Billing & Usage", icon: CreditCard },
    ],
  },
];

/** Path portion of an href (drop the query string) for active matching. */
function pathOf(href: string): string {
  const q = href.indexOf("?");
  return q === -1 ? href : href.slice(0, q);
}

export function AdminConsoleSidebar() {
  const pathname = usePathname();

  // Highlight exactly one item: the longest path-prefix match. This keeps a
  // single active row even when several entries share a base route.
  let activeHref: string | null = null;
  let bestLen = -1;
  for (const section of SECTIONS) {
    for (const item of section.items) {
      const p = pathOf(item.href);
      if (pathname === p || pathname.startsWith(`${p}/`)) {
        if (p.length > bestLen) {
          bestLen = p.length;
          activeHref = item.href;
        }
      }
    }
  }

  return (
    <nav aria-label="Platform console navigation">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="psb-navsec">{section.title}</div>
          {section.items.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`psb-navitem${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="psb-ic" aria-hidden="true">
                  <Icon size={15} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
