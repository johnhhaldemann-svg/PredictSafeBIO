import type { AuditEvent, CompanyProfile, DocumentMetadata } from "@/lib/bio-ai/types";

export const demoCompanyProfile: CompanyProfile = {
  companyName: "PredictSafeBIO Demo Biotech",
  primarySite: "Demo Biotech Site",
  operatingAreas: ["QC Microbiology Lab", "Cell Therapy Suite", "GMP Warehouse"],
  programs: ["BIO-001", "BIO-002"],
  qualitySystemScope: ["SOPs", "Deviations", "CAPA", "Change Control", "Training"],
  biosafetyLevels: ["BSL-1", "BSL-2"],
  reviewOwnerRoles: ["qa", "quality_unit", "biosafety_officer", "responsible_scientist"],
  documentFamilies: ["SOP", "Batch record", "Protocol", "Training", "Validation"]
};

export const demoDocuments: DocumentMetadata[] = [
  {
    id: "doc-sterility-001",
    title: "Sterility Assay Review SOP",
    documentType: "sop",
    status: "in_review",
    ownerRole: "qa",
    area: "QC Microbiology Lab",
    relatedProcess: "Sterility assay review",
    revision: "0.3",
    nextReviewDate: "2026-06-30",
    gaps: ["QA assessment timing not explicit", "Batch impact language needs owner review"]
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
    summary: "Demo contamination assessment generated a critical draft result.",
    createdAt: "2026-05-27T14:00:00.000Z"
  },
  {
    eventType: "document_recommendation_generated",
    summary: "Document gap recommendations generated for Sterility Assay Review SOP.",
    createdAt: "2026-05-27T14:04:00.000Z"
  }
];
