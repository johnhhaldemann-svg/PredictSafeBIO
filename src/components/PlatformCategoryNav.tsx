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
  Stethoscope,
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
  Server
} from "lucide-react";

type SubItem = { href: string; label: string; icon: React.ElementType };
type Category = {
  title: string;
  href: string;
  icon: React.ElementType;
  subItems: SubItem[];
};

const categories: Category[] = [
  {
    title: "Document Control",
    href: "/documents",
    icon: FileText,
    subItems: [
      { href: "/documents",                 label: "All Documents",     icon: FileText      },
      { href: "/documents/version-control", label: "Version Control",  icon: GitBranch     },
    ]
  },
  {
    title: "Risk Intelligence",
    href: "/workbench",
    icon: ShieldCheck,
    subItems: [
      { href: "/workbench",   label: "Command Center",    icon: Gauge        },
      { href: "/assessments", label: "Assessments",       icon: ShieldCheck  },
      { href: "/providers",   label: "Provider Directory",icon: Stethoscope  },
      { href: "/bios/new",    label: "Add Patient Bio",   icon: ClipboardList},
      { href: "/my-work",     label: "My Work",           icon: ClipboardList},
    ]
  },
  {
    title: "Compliance",
    href: "/foundation",
    icon: ClipboardCheck,
    subItems: [
      { href: "/foundation", label: "Compliance Map", icon: ClipboardCheck },
      { href: "/programs",   label: "Programs",       icon: BookOpen       },
    ]
  },
  {
    title: "HSE Management",
    href: "/operations",
    icon: HardHat,
    subItems: [
      { href: "/risk-command-center",         label: "Risk Command",    icon: Gauge         },
      { href: "/operations",                  label: "Operations",      icon: Activity      },
      { href: "/operations/capa",             label: "CAPA",            icon: AlertCircle   },
      { href: "/inspections",                 label: "Inspections",     icon: Stethoscope   },
      { href: "/training-matrix",             label: "Training Matrix", icon: GraduationCap },
      { href: "/ergonomics/self-assessment",  label: "Ergonomics",      icon: Activity      },
      { href: "/chemical-inventory",          label: "Chemical & SDS",  icon: FlaskConical  },
      { href: "/waste-management",            label: "Waste Mgmt",      icon: Wrench        },
      { href: "/permits",                     label: "Work Permits",    icon: Lock          },
      { href: "/pesticide",                   label: "Pest & Disinfect",icon: ShieldCheck   },
    ]
  },
  {
    title: "System Reliance",
    href: "/admin/audit",
    icon: Server,
    subItems: [
      { href: "/admin/audit",        label: "Reports & Audit", icon: BarChart3 },
      { href: "/admin/ai-knowledge", label: "AI Knowledge",    icon: Brain     },
      { href: "/admin/billing",      label: "Billing",         icon: Wrench    },
      { href: "/admin/config",       label: "Platform Config", icon: Settings  },
      { href: "/admin/platform",     label: "Platform Admin",  icon: Lock      },
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

export function PlatformCategoryNav() {
  const pathname = usePathname();
  const activeCategory = getActiveCategoryTitle(pathname);
  const [expanded, setExpanded] = useState<string | null>(activeCategory);

  const toggle = (e: React.MouseEvent, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => (prev === title ? null : title));
  };

  return (
    <nav className="sidebar-nav" aria-label="Platform navigation">
      {categories.map((cat) => {
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
                        <span>{sub.label}</span>
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
