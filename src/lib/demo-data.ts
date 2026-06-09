import type { AuditEvent, CompanyProfile, DocumentMetadata } from "@/lib/bio-ai/types";

export const demoCompanyProfile: CompanyProfile = {
  companyName: "PredictSafeBIO Demo Biotech",
  primarySite: "Demo Biotech Site",
  operatingAreas: ["BSL-2 Research Lab", "Cell Therapy Suite", "Chemical Storage & Warehouse"],
  programs: ["BIO-001", "BIO-002"],
  qualitySystemScope: ["SOPs", "Hazard Assessments", "Incidents", "Corrective Actions", "Training"],
  biosafetyLevels: ["BSL-1", "BSL-2"],
  reviewOwnerRoles: ["ehs", "biosafety_officer", "responsible_scientist"],
  documentFamilies: ["SOP", "Safe-Work Procedure", "Hazard Assessment", "Training", "Inspection"]
};

export const demoDocuments: DocumentMetadata[] = [
  {
    id: "doc-sterility-001",
    title: "Aseptic Work & Containment SOP",
    documentType: "sop",
    status: "in_review",
    ownerRole: "ehs",
    area: "BSL-2 Research Lab",
    relatedProcess: "Aseptic work and containment review",
    revision: "0.3",
    nextReviewDate: "2026-06-30",
    gaps: ["EHS review timing not explicit", "Exposure-control language needs owner review"]
  },
  {
    id: "doc-chain-001",
    title: "Critical Sample Chain of Custody",
    documentType: "sop",
    status: "unknown",
    ownerRole: "responsible_scientist",
    area: "Sample Management",
    relatedProcess: "Sample storage and transfer",
    revision: "unknown",
    gaps: ["Temperature excursion decision tree missing"]
  }
];

export const demoAuditEvents: AuditEvent[] = [
  {
    eventType: "assessment_run",
    summary: "Demo exposure/contamination assessment generated a critical draft result.",
    createdAt: "2026-05-27T14:00:00.000Z"
  },
  {
    eventType: "document_recommendation_generated",
    summary: "Document gap recommendations generated for Aseptic Work & Containment SOP.",
    createdAt: "2026-05-27T14:04:00.000Z"
  }
];
