"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FileText,
  ShieldCheck,
  ClipboardCheck,
  Activity,
  Lock,
  BookOpen,
  GitBranch,
  BarChart3,
  Briefcase,
  AlertCircle,
  GraduationCap,
  ClipboardList,
  Wrench,
  Gauge,
  Settings,
  Brain,
  FlaskConical,
  ChevronDown,
  HardHat,
  Server,
  Building2,
  Users,
  CreditCard
} from "lucide-react";

type SubItem = { href: string; label: string; icon: React.ElementType; desc: string };
type Category = {
  title: string;
  href: string;
  icon: React.ElementType;
  subItems: SubItem[];
  /** Platform Utilities (/admin/*) — only platform_staff/superadmin may see these. */
  platformOnly?: boolean;
};

const categories: Category[] = [
  {
    // ── 1. ASSESS — what are my risks? ──────────────────────────────────────
    title: "Assess",
    href: "/workbench",
    icon: ShieldCheck,
    subItems: [
      { href: "/workbench",                   label: "BioRisk Workbench",    icon: Gauge,         desc: "Score and review your biosafety risks" },
      { href: "/workbench?tab=risk-register", label: "Risk Register",        icon: ShieldCheck,   desc: "All assessed risks and their status" },
      { href: "/bios",                        label: "Personnel",            icon: Users,         desc: "People records used in risk scoring" },
      { href: "/bios/new",                    label: "Add Personnel Record", icon: ClipboardList, desc: "Create a new personnel record" },
      { href: "/providers",                   label: "Provider Directory",   icon: Briefcase,     desc: "Biosafety & EHS consultants and experts" },
    ]
  },
  {
    // ── 2. PLAN — what do I need to do? ─────────────────────────────────────
    title: "Plan",
    href: "/foundation",
    icon: ClipboardCheck,
    subItems: [
      { href: "/foundation",                label: "Compliance Map",  icon: ClipboardCheck, desc: "Coverage, gaps, and readiness by area" },
      { href: "/my-work",                   label: "My Work",         icon: ClipboardList,  desc: "Tasks and follow-ups assigned to you" },
      { href: "/programs",                  label: "Programs",        icon: BookOpen,       desc: "Safety program tools and checklists" },
      { href: "/change-plan",               label: "Change Plan",     icon: GitBranch,      desc: "Planned changes and their impact" },
      { href: "/documents",                 label: "Documents",       icon: FileText,       desc: "Controlled SOPs, records, and files" },
      { href: "/documents/version-control", label: "Version Control", icon: GitBranch,      desc: "Revisions, approvals, and change history" },
    ]
  },
  {
    // ── 3. OPERATE — do the work ────────────────────────────────────────────
    title: "Operate",
    href: "/operations",
    icon: HardHat,
    subItems: [
      { href: "/operations",                  label: "Operations",      icon: Activity,      desc: "Day-to-day HSE operational records" },
      { href: "/inspections",                 label: "Inspections",     icon: ClipboardCheck, desc: "Scheduled and completed inspections" },
      { href: "/operations/capa",             label: "CAPA",            icon: AlertCircle,   desc: "Corrective and preventive actions" },
      { href: "/permits",                     label: "Work Permits",    icon: Lock,          desc: "Permits for high-hazard work" },
      { href: "/chemical-inventory",          label: "Chemical & SDS",  icon: FlaskConical,  desc: "Chemical inventory and safety data sheets" },
      { href: "/waste-management",            label: "Waste Mgmt",      icon: Wrench,        desc: "Hazardous and biohazard waste tracking" },
      { href: "/training-matrix",             label: "Training Matrix", icon: GraduationCap, desc: "Role-based training and expiries" },
      { href: "/ergonomics/self-assessment",  label: "Ergonomics",      icon: Activity,      desc: "Ergonomic self-assessments" },
      { href: "/pesticide",                   label: "Pest & Disinfect",icon: ShieldCheck,   desc: "Pest control and disinfection logs" },
    ]
  },
  {
    // ── 4. MONITOR — am I on track? ─────────────────────────────────────────
    title: "Monitor",
    href: "/",
    icon: Activity,
    subItems: [
      { href: "/",                    label: "Safety Loop",  icon: Gauge,    desc: "Assess → Plan → Operate → Monitor overview" },
      { href: "/risk-command-center", label: "Risk Monitor", icon: Activity, desc: "Prioritized HSE risk signals" },
    ]
  },
  {
    title: "Workspace",
    href: "/account/company",
    icon: Settings,
    subItems: [
      { href: "/account/company", label: "Company Settings", icon: Building2,   desc: "Operating context, programs, review owners" },
      { href: "/account/team",    label: "Team",             icon: Users,       desc: "Members, roles, and invitations" },
      { href: "/account/billing", label: "Billing",          icon: CreditCard,  desc: "Plan, invoices, and usage" },
    ]
  },
  {
    title: "System Reliance",
    href: "/admin/audit",
    icon: Server,
    platformOnly: true,
    subItems: [
      { href: "/admin/audit",        label: "Reports & Audit", icon: BarChart3, desc: "Audit log and platform reporting" },
      { href: "/admin/ai-knowledge", label: "AI Knowledge",    icon: Brain,     desc: "Review and curate the AI knowledge base" },
      { href: "/admin/billing",      label: "Billing",         icon: Wrench,    desc: "Plans, invoices, and overrides" },
      { href: "/admin/config",       label: "Platform Config", icon: Settings,  desc: "Feature flags, branding, and emails" },
      { href: "/admin/platform",     label: "Platform Admin",  icon: Lock,      desc: "Platform operations and security" },
    ]
  }
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/workbench" || href === "/") return pathname === href;
  return pathname.startsWith(href);
}

function getActiveCategoryTitle(pathname: string): string | null {
  for (const cat of categories) {
    if (isActivePath(pathname, cat.href)) return cat.title;
    for (const sub of cat.subItems) {
      if (isActivePath(pathname, sub.href)) return cat.title;
    }
  }
  return null;
}

export function PlatformCategoryNav({ canViewPlatform = false }: { canViewPlatform?: boolean }) {
  const pathname = usePathname();
  const visibleCategories = canViewPlatform
    ? categories
    : categories.filter((cat) => !cat.platformOnly);
  const activeCategory = getActiveCategoryTitle(pathname);
  const [expanded, setExpanded] = useState<string | null>(activeCategory);

  const toggle = (e: React.MouseEvent, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => (prev === title ? null : title));
  };

  return (
    <nav className="sidebar-nav" aria-label="Platform navigation">
      {visibleCategories.map((cat) => {
        const isCatActive = activeCategory === cat.title;
        const isOpen = expanded === cat.title;
        const CatIcon = cat.icon;

        return (
          <div key={cat.title} className="snav-group">
            {/* Category header: icon+label navigates, chevron toggles */}
            <div className={`snav-cat${isCatActive ? " snav-cat--active" : ""}`}>
              <Link
                href={cat.href}
                className="snav-cat-link"
                onClick={() => setExpanded(cat.title)}
              >
                <span className="snav-icon">
                  <CatIcon size={15} aria-hidden="true" />
                </span>
                <span className="snav-cat-label">{cat.title}</span>
              </Link>
              <button
                className="snav-chevron-btn"
                onClick={(e) => toggle(e, cat.title)}
                aria-expanded={isOpen}
                aria-label={`Toggle ${cat.title}`}
                type="button"
              >
                <ChevronDown
                  size={13}
                  className={`snav-chevron${isOpen ? " snav-chevron--open" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Sub-items */}
            {isOpen && (
              <ul className="snav-subitems">
                {cat.subItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = isActivePath(pathname, sub.href);
                  return (
                    <li key={sub.href}>
                      <Link
                        href={sub.href}
                        className={`snav-subitem${isSubActive ? " snav-subitem--active" : ""}`}
                      >
                        <SubIcon size={13} aria-hidden="true" />
                        <span className="snav-subitem-text">
                          <span className="snav-subitem-label">{sub.label}</span>
                          <span className="snav-subitem-desc">{sub.desc}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
