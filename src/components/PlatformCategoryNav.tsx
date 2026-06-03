"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  FileText,
  ShieldCheck,
  ClipboardCheck,
  Activity,
  Lock,
  BookOpen,
  GitBranch,
  BarChart3,
  Stethoscope,
  AlertCircle,
  GraduationCap,
  ClipboardList,
  Wrench,
  Gauge,
  Settings,
  Brain
} from "lucide-react";

type SubItem = { href: string; label: string; icon: React.ElementType; description: string };
type Category = {
  number: string;
  title: string;
  shortTitle: string;
  href: string;
  accent: "blue" | "green" | "navy";
  subItems: SubItem[];
};

const categories: Category[] = [
  {
    number: "1",
    title: "Document Control",
    shortTitle: "Docs",
    href: "/documents",
    accent: "blue",
    subItems: [
      { href: "/documents",                label: "All Documents",     icon: FileText,      description: "SOPs, forms, and controlled records" },
      { href: "/documents/version-control", label: "Version Control",  icon: GitBranch,     description: "History, approvals, and review workflow" },
    ]
  },
  {
    number: "2",
    title: "Risk Intelligence",
    shortTitle: "Risk",
    href: "/workbench",
    accent: "blue",
    subItems: [
      { href: "/workbench",    label: "Command Center",   icon: Gauge,        description: "BioRisk scoring and workbench overview" },
      { href: "/assessments",  label: "Assessments",      icon: ShieldCheck,  description: "Saved risk records and trend analysis" },
      { href: "/my-work",      label: "My Work",          icon: ClipboardList, description: "Assigned follow-through tasks" },
    ]
  },
  {
    number: "3",
    title: "Compliance",
    shortTitle: "Compliance",
    href: "/foundation",
    accent: "green",
    subItems: [
      { href: "/foundation",   label: "Compliance Map",   icon: ClipboardCheck, description: "Obligations, evidence, and audit readiness" },
      { href: "/programs",     label: "Programs",         icon: BookOpen,       description: "Regulatory programs and methods library" },
    ]
  },
  {
    number: "4",
    title: "HSE Management",
    shortTitle: "HSE",
    href: "/operations",
    accent: "navy",
    subItems: [
      { href: "/operations",        label: "Operations",       icon: Activity,       description: "Incidents, CAPA, and change impact" },
      { href: "/operations/capa",   label: "CAPA",             icon: AlertCircle,    description: "Corrective and preventive action workflow" },
      { href: "/inspections",       label: "Inspections",      icon: Stethoscope,    description: "Audit and inspection management" },
      { href: "/training-matrix",   label: "Training Matrix",  icon: GraduationCap,  description: "Competency and training assignments" },
    ]
  },
  {
    number: "5",
    title: "System Reliance",
    shortTitle: "System",
    href: "/admin/audit",
    accent: "green",
    subItems: [
      { href: "/admin/audit",        label: "Reports & Audit",  icon: BarChart3,   description: "Immutable audit log and exports" },
      { href: "/admin/ai-knowledge", label: "AI Knowledge",     icon: Brain,       description: "Guardrails and knowledge review" },
      { href: "/admin/platform",     label: "Platform Admin",   icon: Settings,    description: "Roles, permissions, and integrations" },
    ]
  }
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/workbench" || href === "/") return pathname === href;
  return pathname.startsWith(href);
}

function getCategoryForPath(pathname: string): string | null {
  for (const cat of categories) {
    if (isActivePath(pathname, cat.href)) return cat.title;
    for (const sub of cat.subItems) {
      if (isActivePath(pathname, sub.href)) return cat.title;
    }
  }
  return null;
}

export function PlatformCategoryNav() {
  const pathname = usePathname();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const activeCategory = getCategoryForPath(pathname);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpenCategory(null);
  }, [pathname]);

  return (
    <div className="category-nav-bar" ref={navRef} aria-label="Platform category navigation">
      {categories.map((cat) => {
        const isActive = activeCategory === cat.title;
        const isOpen = openCategory === cat.title;

        return (
          <div
            key={cat.title}
            className={`cat-nav-item${isActive ? " cat-nav-item--active" : ""}${isOpen ? " cat-nav-item--open" : ""}`}
            onMouseEnter={() => setOpenCategory(cat.title)}
            onMouseLeave={() => setOpenCategory(null)}
          >
            {/* Category tab – clicking goes to the primary href */}
            <Link
              href={cat.href}
              className="cat-nav-tab"
              aria-expanded={isOpen}
              aria-haspopup="true"
            >
              <span className={`cat-nav-num accent-${cat.accent}`}>{cat.number}</span>
              <span className="cat-nav-label">{cat.title}</span>
              <svg className="cat-nav-chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            {/* Dropdown panel */}
            {isOpen && (
              <div className={`cat-nav-dropdown accent-${cat.accent}`} role="menu">
                <div className="cat-nav-dropdown-header">
                  <span className={`cat-nav-dropdown-num accent-${cat.accent}`}>{cat.number}</span>
                  <strong>{cat.title}</strong>
                </div>
                <ul className="cat-nav-subitems" role="none">
                  {cat.subItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const subActive = isActivePath(pathname, sub.href);
                    return (
                      <li key={sub.href} role="none">
                        <Link
                          href={sub.href}
                          className={`cat-nav-subitem${subActive ? " cat-nav-subitem--active" : ""}`}
                          role="menuitem"
                        >
                          <span className="cat-nav-subitem-icon">
                            <SubIcon size={14} aria-hidden="true" />
                          </span>
                          <span className="cat-nav-subitem-text">
                            <strong>{sub.label}</strong>
                            <small>{sub.description}</small>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
