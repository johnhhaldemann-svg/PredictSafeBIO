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
  CreditCard,
  TrendingUp
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
    // ── 1. ASSESS — identify & score all risks ──────────────────────────────
    title: "Assess",
    href: "/workbench",
    icon: ShieldCheck,
    subItems: [
      { href: "/workbench",                   label: "Risk Workbench",   icon: Gauge,         desc: "Score and review your safety risks" },
      { href: "/workbench?tab=risk-register", label: "Risk Register",       icon: ShieldCheck,   desc: "All assessed risks and their status" },
      { href: "/hazards",                     label: "Hazard Register",     icon: AlertCircle,   desc: "Identify hazards; feeds the Predictive Engine" },
      { href: "/exposure-map",                label: "Exposure Map",        icon: Building2,     desc: "People, labs, materials & exposure routes" },
      { href: "/bios",                        label: "Personnel",           icon: Users,         desc: "People records used in risk scoring" },
    ]
  },
  {
    // ── 2. PLAN — design controls, schedules & documents ────────────────────
    title: "Plan",
    href: "/foundation",
    icon: ClipboardCheck,
    subItems: [
      { href: "/foundation",               label: "Compliance Map",         icon: ClipboardCheck, desc: "Coverage, gaps, and readiness by area" },
      { href: "/plan/compliance-calendar", label: "Compliance Calendar",    icon: ClipboardCheck, desc: "Dated work generated from the register" },
      { href: "/training-matrix",          label: "Training Matrix",        icon: GraduationCap,  desc: "Role-based training calendar and expiries" },
      { href: "/plan/qualified-persons",   label: "Qualified Persons",      icon: Users,          desc: "Who may approve restricted decisions" },
      { href: "/controls",                 label: "Control Register",       icon: Wrench,         desc: "Controls by hierarchy; residual-risk forecast" },
      { href: "/change-management",        label: "Change Management",      icon: GitBranch,      desc: "Planned changes, impact review & revalidation" },
      { href: "/programs",                 label: "Programs",               icon: BookOpen,       desc: "Safety program tools and checklists" },
      { href: "/emergency-response",       label: "Emergency Response",     icon: ShieldCheck,    desc: "Emergency response plans and drills" },
      { href: "/documents",                label: "Documents",              icon: FileText,       desc: "Controlled SOPs, records, and files" },
    ]
  },
  {
    // ── 3. OPERATE — execute day-to-day safety work ─────────────────────────
    title: "Operate",
    href: "/inspections",
    icon: HardHat,
    subItems: [
      { href: "/inspections",                label: "Inspections",        icon: ClipboardCheck, desc: "Scheduled and completed inspections" },
      { href: "/incidents",                  label: "Incident Reporting", icon: AlertCircle,    desc: "Log and triage safety incidents" },
      { href: "/operations/capa",            label: "CAPA",               icon: Activity,       desc: "Corrective and preventive actions" },
      { href: "/permits",                    label: "Work Permits",       icon: Lock,           desc: "Permits for high-hazard work" },
      { href: "/chemical-inventory",         label: "Chemical & SDS",     icon: FlaskConical,   desc: "Chemical inventory and safety data sheets" },
      { href: "/waste-management",           label: "Waste Management",   icon: Wrench,         desc: "Hazardous and biohazard waste tracking" },
      { href: "/ergonomics/self-assessment", label: "Ergonomics",         icon: Activity,       desc: "Ergonomic self-assessments" },
      { href: "/pesticide",                  label: "Pest & Disinfect",   icon: ShieldCheck,    desc: "Pest control and disinfection logs" },
      { href: "/equipment-calibration",      label: "Equipment & Calibration", icon: Gauge,     desc: "Equipment PM logs and calibration records" },
    ]
  },
  {
    // ── 4. MONITOR — track KPIs, signals & trends ───────────────────────────
    title: "Monitor",
    href: "/",
    icon: Activity,
    subItems: [
      { href: "/",                    label: "Dashboard",           icon: Gauge,      desc: "Assess → Plan → Operate → Monitor overview" },
      { href: "/predictive-engine",   label: "Predictive Engine",   icon: Brain,      desc: "Forward-looking risk forecast & early warnings" },
      { href: "/risk-command-center", label: "Risk Monitor",        icon: Activity,   desc: "Prioritized HSE risk signals" },
      { href: "/monitoring/exposure", label: "Exposure Monitoring", icon: FlaskConical, desc: "Live air quality and biological exposure levels" },
      { href: "/trends",              label: "Trend Analysis",      icon: TrendingUp,    desc: "CAPA backlog, training completion & audit readiness over time" },
      { href: "/management-review",   label: "Management Review",   icon: BarChart3,     desc: "Quarterly & annual review; trend analysis" },
      { href: "/lessons-learned",     label: "Lessons Learned",     icon: BookOpen,      desc: "Capture and share insights from incidents and CAPAs" },
    ]
  },
  {
    // ── WORKSPACE — org settings & team ─────────────────────────────────────
    title: "Workspace",
    href: "/account/company",
    icon: Settings,
    subItems: [
      { href: "/my-work",         label: "My Work",           icon: ClipboardList, desc: "Tasks and follow-ups assigned to you" },
      { href: "/assess/setup-questionnaire", label: "Setup Questionnaire", icon: ClipboardList, desc: "26-question intake that activates programs & seeds your registers" },
      { href: "/account/company", label: "Company Settings",  icon: Building2,  desc: "Operating context, programs, review owners" },
      { href: "/account/team",    label: "Team",              icon: Users,       desc: "Members, roles, and invitations" },
      { href: "/providers",       label: "Provider Directory",icon: Briefcase,   desc: "Biosafety & EHS consultants and experts" },
      { href: "/account/billing", label: "Billing",           icon: CreditCard,  desc: "Plan, invoices, and usage" },
    ]
  },
  {
    // ── SYSTEM RELIANCE — platform_staff / superadmin only ──────────────────
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
  // Strip query string from href before comparing (pathname never includes query params)
  const hrefPath = href.split("?")[0];
  if (hrefPath === "/workbench" || hrefPath === "/") return pathname === hrefPath;
  return pathname.startsWith(hrefPath);
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
                        title={sub.desc}
                      >
                        <SubIcon size={13} aria-hidden="true" />
                        <span className="snav-subitem-label">{sub.label}</span>
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
