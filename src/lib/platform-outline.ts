export type PlatformCategory = {
  number: string;
  title: string;
  shortTitle: string;
  href: string;
  accent: "blue" | "green" | "navy";
  features: string[];
  primaryWorkflow: string;
  statusLabel: string;
};

export type CommandCenterCard = PlatformCategory & {
  metricLabel: string;
  metricFallback: string;
};

export const changePlanPriorities = ["High", "Medium", "Low"] as const;
export type ChangePlanPriority = (typeof changePlanPriorities)[number];

export const changePlanStatuses = ["Planned", "In discovery", "Ready for demo", "Backlog"] as const;
export type ChangePlanStatus = (typeof changePlanStatuses)[number];

export type ChangePlanRow = {
  category: PlatformCategory["title"];
  feature: string;
  owner: string;
  priority: ChangePlanPriority;
  status: ChangePlanStatus;
  notes: string;
  href: string;
};

export const platformCategories: PlatformCategory[] = [
  {
    number: "1",
    title: "Document Control",
    shortTitle: "Document Control",
    href: "/documents",
    accent: "blue",
    features: [
      "SOPs, Forms & Templates",
      "Version Control",
      "Approvals & Review Workflow",
      "Drafting & AI-Assisted Updates",
      "Training Impact Documents",
      "Controlled Records Linkage"
    ],
    primaryWorkflow: "Upload, review, update, and trace SOP metadata and draft recommendations.",
    statusLabel: "Controlled documents"
  },
  {
    number: "2",
    title: "Risk Intelligence",
    shortTitle: "Risk Intelligence",
    href: "/workbench",
    accent: "blue",
    features: [
      "BioRisk Scoring Engine",
      "Hazard & Exposure Tracking",
      "Predictive Risk Alerts",
      "Trend Analysis",
      "Risk Register / Risk Factors",
      "Action Planning"
    ],
    primaryWorkflow: "Score BioRisk, track risk register records, and surface owner action planning.",
    statusLabel: "BioRisk records"
  },
  {
    number: "3",
    title: "Compliance",
    shortTitle: "Compliance",
    href: "/foundation",
    accent: "green",
    features: [
      "Regulatory Mapping",
      "Obligation Tracking",
      "Audit Readiness",
      "Evidence Map",
      "Gap Analysis",
      "Reporting & Exports"
    ],
    primaryWorkflow: "Map obligations to evidence, gaps, audit readiness, and reportable proof.",
    statusLabel: "Readiness score"
  },
  {
    number: "4",
    title: "HSE Management Systems",
    shortTitle: "HSE Management",
    href: "/operations",
    accent: "navy",
    features: [
      "Incident Management",
      "CAPA Workflow",
      "Training & Competency",
      "Inspection / Audit Management",
      "Change Impact Management",
      "Programs & Methods Library"
    ],
    primaryWorkflow: "Coordinate incidents, CAPA, training, inspections, and change impact.",
    statusLabel: "HSE signals"
  },
  {
    number: "5",
    title: "System Reliance",
    shortTitle: "System Reliance",
    href: "/admin/audit",
    accent: "green",
    features: [
      "Secure Data Infrastructure",
      "Immutable Audit Log",
      "Human Validation Workflow",
      "Roles & Permissions",
      "AI Guardrails",
      "Integrations & APIs"
    ],
    primaryWorkflow: "Protect audit traceability, roles, guardrails, and planned integrations.",
    statusLabel: "Open actions"
  }
];

export const commonUtilities = [
  "Company Profile Intelligence",
  "BioType Branching Engine",
  "Document Gap Engine",
  "Training Matrix",
  "CAPA Screening",
  "Evidence Tracking",
  "Reference Knowledge Base",
  "Audit Dashboard"
];

export const changePlanRows: ChangePlanRow[] = [
  {
    category: "Document Control",
    feature: "Version Control",
    owner: "Quality Unit",
    priority: "High",
    status: "Planned",
    notes: "Expose document version history and review state beside SOP metadata without replacing controlled-document approval.",
    href: "/documents"
  },
  {
    category: "System Reliance",
    feature: "Roles & Permissions",
    owner: "Platform Owner",
    priority: "High",
    status: "In discovery",
    notes: "Surface owner-only controls, member read/write boundaries, and human validation responsibilities from existing profiles.",
    href: "/admin/audit"
  },
  {
    category: "System Reliance",
    feature: "Integrations & APIs",
    owner: "Platform Owner",
    priority: "Medium",
    status: "Backlog",
    notes: "Plan integration readiness for document, training, audit, and external evidence feeds after demo workflows stabilize.",
    href: "/admin/demo"
  },
  {
    category: "Risk Intelligence",
    feature: "Trend Analysis",
    owner: "Biosafety Officer",
    priority: "Medium",
    status: "Ready for demo",
    notes: "Use saved BioRisk records and audit readiness score history to show directional risk and readiness movement.",
    href: "/assessments"
  },
  {
    category: "HSE Management Systems",
    feature: "Training Matrix",
    owner: "QA / Training",
    priority: "High",
    status: "Planned",
    notes: "Connect BioType requirements, document changes, and training assignments into one readiness matrix.",
    href: "/foundation#training-drilldown"
  }
];

export const gapModuleCards = [
  {
    title: "Version Control",
    category: "Document Control",
    href: "/documents",
    summary: "Document metadata and planned version history for SOPs, forms, templates, and controlled records."
  },
  {
    title: "Roles & Permissions",
    category: "System Reliance",
    href: "/admin/audit",
    summary: "Owner-only controls, organization workspace boundaries, and human validation responsibility."
  },
  {
    title: "Integrations & APIs",
    category: "System Reliance",
    href: "/admin/demo",
    summary: "Planned integration surface for external document, training, audit, and evidence systems."
  },
  {
    title: "Trend Analysis",
    category: "Risk Intelligence",
    href: "/assessments",
    summary: "Saved BioRisk records and readiness score history for directional risk movement."
  },
  {
    title: "Training Matrix",
    category: "HSE Management Systems",
    href: "/foundation#training-drilldown",
    summary: "BioType requirements, document impact, and training assignment readiness in one view."
  }
];
